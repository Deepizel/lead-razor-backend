import { prisma } from "../db/prisma";
import {
  assertEmailCredentialsEncryptionConfigured,
  isEmailCredentialsEncryptionConfigured,
} from "../config/env";
import { encryptCredentials } from "../lib/credentialEncryption";
import {
  clearDefaultEmailIdentities,
  countEmailIdentitiesForUser,
  createEmailIdentityRecord,
  deleteEmailIdentityRecord,
  findDefaultEmailIdentityForUser,
  findEmailIdentityForUser,
  listEmailIdentitiesForUser,
  setDefaultEmailIdentity,
  updateEmailIdentityRecord,
  type EmailIdentityRow,
} from "../repositories/emailIdentityRepository";
import { sendWithEmailIdentity } from "./email/identityTransport";
import { buildTrackedEmailBodies } from "./email/trackingService";
import type {
  ApiKeyCredentials,
  CreateEmailIdentityInput,
  EmailIdentityPublic,
  EmailProviderType,
  IdentityCredentials,
  ReplyHandlingMode,
  SmtpCredentials,
  UpdateEmailIdentityInput,
} from "../types/emailIdentity";
import {
  EMAIL_PROVIDER_TYPES,
  REPLY_HANDLING_MODES,
} from "../types/emailIdentity";

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const visible = local.length <= 2 ? local[0] ?? "*" : local.slice(0, 2);
  return `${visible}***@${domain}`;
}

function maskApiKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length <= 8) return "****";
  return `${trimmed.slice(0, 3)}***${trimmed.slice(-4)}`;
}

export function maskCredentials(
  providerType: EmailProviderType,
  creds: IdentityCredentials
): Record<string, string> {
  if (providerType === "resend" || providerType === "brevo") {
    const c = creds as ApiKeyCredentials;
    return { apiKey: maskApiKey(c.apiKey) };
  }
  const c = creds as SmtpCredentials;
  return {
    host: c.host ?? (providerType === "gmail" ? "smtp.gmail.com" : ""),
    port: String(c.port ?? 587),
    secure: String(c.secure ?? false),
    user: maskEmail(c.user),
    pass: "********",
  };
}

function toPublicIdentity(
  row: EmailIdentityRow,
  credentialsMasked: Record<string, string>
): EmailIdentityPublic {
  return {
    id: row.id,
    label: row.label,
    fromName: row.fromName,
    fromEmail: row.fromEmail,
    replyTo: row.replyTo,
    providerType: row.providerType as EmailProviderType,
    domainVerified: row.domainVerified,
    isDefault: row.isDefault,
    trackingEnabled: row.trackingEnabled,
    replyHandlingMode: row.replyHandlingMode as ReplyHandlingMode,
    credentialsMasked,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function validateEmail(value: string, field: string): void {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    throw new Error(`${field} must be a valid email address`);
  }
}

function validateCredentials(
  providerType: EmailProviderType,
  credentials: IdentityCredentials
): void {
  if (providerType === "resend" || providerType === "brevo") {
    const c = credentials as ApiKeyCredentials;
    if (!c.apiKey?.trim()) {
      throw new Error("credentials.apiKey is required");
    }
    return;
  }

  const c = credentials as SmtpCredentials;
  if (!c.user?.trim() || !c.pass?.trim()) {
    throw new Error("credentials.user and credentials.pass are required");
  }
  if (providerType === "smtp" && !c.host?.trim()) {
    throw new Error("credentials.host is required for smtp");
  }
}

function normalizeCreateInput(
  input: CreateEmailIdentityInput
): CreateEmailIdentityInput {
  if (!EMAIL_PROVIDER_TYPES.includes(input.providerType)) {
    throw new Error(
      `providerType must be one of: ${EMAIL_PROVIDER_TYPES.join(", ")}`
    );
  }
  if (
    input.replyHandlingMode &&
    !REPLY_HANDLING_MODES.includes(input.replyHandlingMode)
  ) {
    throw new Error(
      `replyHandlingMode must be one of: ${REPLY_HANDLING_MODES.join(", ")}`
    );
  }
  if (!input.label?.trim()) throw new Error("label is required");
  if (!input.fromName?.trim()) throw new Error("fromName is required");
  validateEmail(input.fromEmail, "fromEmail");
  if (input.replyTo) validateEmail(input.replyTo, "replyTo");
  validateCredentials(input.providerType, input.credentials);
  return input;
}

export async function listUserEmailIdentities(
  userId: string
): Promise<EmailIdentityPublic[]> {
  const rows = await listEmailIdentitiesForUser(userId);
  return rows.map((row) => {
    const masked = maskCredentialsForStoredRow(row);
    return toPublicIdentity(row, masked);
  });
}

function maskCredentialsForStoredRow(
  row: EmailIdentityRow
): Record<string, string> {
  const providerType = row.providerType as EmailProviderType;
  if (providerType === "resend" || providerType === "brevo") {
    return { apiKey: "********" };
  }
  return {
    host: providerType === "gmail" ? "smtp.gmail.com" : "(configured)",
    user: "(configured)",
    pass: "********",
  };
}

export async function getUserEmailIdentity(
  userId: string,
  id: string
): Promise<EmailIdentityPublic | null> {
  const row = await findEmailIdentityForUser(userId, id);
  if (!row) return null;
  return toPublicIdentity(row, maskCredentialsForStoredRow(row));
}

export async function getDefaultUserEmailIdentity(
  userId: string
): Promise<EmailIdentityPublic | null> {
  const row = await findDefaultEmailIdentityForUser(userId);
  if (!row) return null;
  return toPublicIdentity(row, maskCredentialsForStoredRow(row));
}

export async function createUserEmailIdentity(
  userId: string,
  input: CreateEmailIdentityInput
): Promise<EmailIdentityPublic> {
  assertEmailCredentialsEncryptionConfigured();
  const normalized = normalizeCreateInput(input);
  const count = await countEmailIdentitiesForUser(userId);
  const shouldDefault =
    normalized.isDefault === true || count === 0;

  if (shouldDefault) {
    await clearDefaultEmailIdentities(userId);
  }

  const encrypted = encryptCredentials(normalized.credentials);
  const row = await createEmailIdentityRecord({
    userId,
    label: normalized.label.trim(),
    fromName: normalized.fromName.trim(),
    fromEmail: normalized.fromEmail.trim().toLowerCase(),
    replyTo: normalized.replyTo?.trim() ?? null,
    providerType: normalized.providerType,
    domainVerified: normalized.domainVerified ?? false,
    credentialsEncrypted: encrypted,
    isDefault: shouldDefault,
    trackingEnabled: normalized.trackingEnabled !== false,
    replyHandlingMode: normalized.replyHandlingMode ?? "webhook",
  });

  return toPublicIdentity(
    row,
    maskCredentials(normalized.providerType, normalized.credentials)
  );
}

export async function updateUserEmailIdentity(
  userId: string,
  id: string,
  input: UpdateEmailIdentityInput
): Promise<EmailIdentityPublic | null> {
  const existing = await findEmailIdentityForUser(userId, id);
  if (!existing) return null;

  if (input.fromEmail) validateEmail(input.fromEmail, "fromEmail");
  if (input.replyTo) validateEmail(input.replyTo, "replyTo");

  const providerType = existing.providerType as EmailProviderType;
  if (input.credentials) {
    assertEmailCredentialsEncryptionConfigured();
    validateCredentials(providerType, input.credentials);
  }

  if (input.isDefault === true) {
    await clearDefaultEmailIdentities(userId);
  }

  const row = await updateEmailIdentityRecord(userId, id, {
    ...(input.label !== undefined ? { label: input.label.trim() } : {}),
    ...(input.fromName !== undefined
      ? { fromName: input.fromName.trim() }
      : {}),
    ...(input.fromEmail !== undefined
      ? { fromEmail: input.fromEmail.trim().toLowerCase() }
      : {}),
    ...(input.replyTo !== undefined ? { replyTo: input.replyTo?.trim() ?? null } : {}),
    ...(input.domainVerified !== undefined
      ? { domainVerified: input.domainVerified }
      : {}),
    ...(input.trackingEnabled !== undefined
      ? { trackingEnabled: input.trackingEnabled }
      : {}),
    ...(input.replyHandlingMode !== undefined
      ? { replyHandlingMode: input.replyHandlingMode }
      : {}),
    ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
    ...(input.credentials
      ? { credentialsEncrypted: encryptCredentials(input.credentials) }
      : {}),
  });

  if (!row) return null;

  const masked = input.credentials
    ? maskCredentials(providerType, input.credentials)
    : maskCredentialsForStoredRow(row);

  return toPublicIdentity(row, masked);
}

export async function deleteUserEmailIdentity(
  userId: string,
  id: string
): Promise<boolean> {
  const existing = await findEmailIdentityForUser(userId, id);
  if (!existing) return false;

  const wasDefault = existing.isDefault;
  const deleted = await deleteEmailIdentityRecord(userId, id);
  if (!deleted) return false;

  if (wasDefault) {
    const next = await prisma.emailIdentity.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    if (next) {
      await setDefaultEmailIdentity(userId, next.id);
    }
  }

  return true;
}

export async function setUserDefaultEmailIdentity(
  userId: string,
  id: string
): Promise<EmailIdentityPublic | null> {
  const row = await setDefaultEmailIdentity(userId, id);
  if (!row) return null;
  return toPublicIdentity(row, maskCredentialsForStoredRow(row));
}

export async function resolveEmailIdentityForSend(
  userId: string,
  emailIdentityId?: string | null
): Promise<EmailIdentityRow> {
  if (!isEmailCredentialsEncryptionConfigured()) {
    throw new Error(
      "Missing required environment variable: EMAIL_CREDENTIALS_ENCRYPTION_KEY"
    );
  }

  if (emailIdentityId) {
    const row = await findEmailIdentityForUser(userId, emailIdentityId);
    if (!row) {
      throw new Error("Email identity not found");
    }
    return row;
  }

  const defaultRow = await findDefaultEmailIdentityForUser(userId);
  if (!defaultRow) {
    throw new Error(
      "No sending identity configured. Add one under Settings → Email identities and set a default."
    );
  }
  return defaultRow;
}

export async function sendTestEmailForIdentity(
  userId: string,
  identityId: string,
  toEmail?: string
): Promise<{ to: string; messageId: string }> {
  const identity = await findEmailIdentityForUser(userId, identityId);
  if (!identity) throw new Error("Email identity not found");

  let to = toEmail?.trim();
  if (!to) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user?.email) throw new Error("to is required when user email is unknown");
    to = user.email;
  }
  validateEmail(to, "to");

  const subject = `Razor test — ${identity.label}`;
  const text =
    `This is a test message from your "${identity.label}" sending identity (${identity.fromEmail}).\n\nIf you received this, your credentials are working.`;

  const { messageId } = await sendWithEmailIdentity(identity, {
    to,
    subject,
    html: `<p>${text.replace(/\n/g, "<br>")}</p>`,
    text,
  });

  return { to, messageId };
}

export type SentEmailIdentitySummary = {
  id: string;
  label: string;
  fromName: string;
  fromEmail: string;
  providerType: string;
};

export function identitySummaryFromRow(
  row: EmailIdentityRow | null | undefined
): SentEmailIdentitySummary | null {
  if (!row) return null;
  return {
    id: row.id,
    label: row.label,
    fromName: row.fromName,
    fromEmail: row.fromEmail,
    providerType: row.providerType,
  };
}

/** Bodies with optional tracking (pixel + link wrap). */
export function buildBodiesForSend(
  sentEmailId: string,
  subject: string,
  body: string,
  trackingEnabled: boolean
): { html: string; text: string; links: import("../types/email").TrackedLink[] } {
  if (!trackingEnabled) {
    const text = body.trim();
    const html = text.includes("<")
      ? text
      : `<div style="font-family:sans-serif;line-height:1.5;">${text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .split("\n")
          .map((line) => (line.trim() ? `<p>${line}</p>` : "<br>"))
          .join("")}</div>`;
    return { html, text, links: [] };
  }
  return buildTrackedEmailBodies(sentEmailId, subject, body);
}
