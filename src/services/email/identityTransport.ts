import nodemailer from "nodemailer";
import { Resend } from "resend";
import { decryptCredentials } from "../../lib/credentialEncryption";
import type { EmailIdentityRow } from "../../repositories/emailIdentityRepository";
import type {
  ApiKeyCredentials,
  EmailProviderType,
  SmtpCredentials,
} from "../../types/emailIdentity";
import type { SendOutreachInput, SendOutreachResult } from "./types";

const GMAIL_SMTP = {
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
};

function formatFromAddress(fromName: string, fromEmail: string): string {
  const safeName = fromName.replace(/"/g, '\\"');
  return `"${safeName}" <${fromEmail}>`;
}

function smtpCredsForProvider(
  providerType: EmailProviderType,
  creds: SmtpCredentials
): SmtpCredentials {
  if (providerType === "gmail") {
    return {
      host: creds.host?.trim() || GMAIL_SMTP.host,
      port: creds.port ?? GMAIL_SMTP.port,
      secure: creds.secure ?? GMAIL_SMTP.secure,
      user: creds.user,
      pass: creds.pass,
    };
  }
  return creds;
}

async function sendViaSmtp(
  identity: EmailIdentityRow,
  creds: SmtpCredentials,
  input: SendOutreachInput
): Promise<SendOutreachResult> {
  const smtp = smtpCredsForProvider(
    identity.providerType as EmailProviderType,
    creds
  );
  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: { user: smtp.user, pass: smtp.pass },
  });

  const from = formatFromAddress(identity.fromName, identity.fromEmail);
  const info = await transport.sendMail({
    from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
    headers: input.headers,
    replyTo: identity.replyTo ?? undefined,
  });

  const messageId =
    typeof info.messageId === "string" ? info.messageId : `smtp-${Date.now()}`;
  return { messageId };
}

async function sendViaResend(
  identity: EmailIdentityRow,
  creds: ApiKeyCredentials,
  input: SendOutreachInput
): Promise<SendOutreachResult> {
  const resend = new Resend(creds.apiKey);
  const from = formatFromAddress(identity.fromName, identity.fromEmail);
  const { data, error } = await resend.emails.send({
    from,
    to: [input.to],
    subject: input.subject,
    text: input.text,
    html: input.html,
    headers: input.headers,
    replyTo: identity.replyTo ?? undefined,
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }
  if (!data?.id) {
    throw new Error("Resend send succeeded but no message id was returned");
  }
  return { messageId: data.id };
}

async function sendViaBrevo(
  identity: EmailIdentityRow,
  creds: ApiKeyCredentials,
  input: SendOutreachInput
): Promise<SendOutreachResult> {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": creds.apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: identity.fromName, email: identity.fromEmail },
      to: [{ email: input.to }],
      subject: input.subject,
      htmlContent: input.html,
      textContent: input.text,
      replyTo: identity.replyTo
        ? { email: identity.replyTo }
        : undefined,
      headers: input.headers,
    }),
  });

  const body = (await res.json().catch(() => ({}))) as {
    messageId?: string;
    message?: string;
  };

  if (!res.ok) {
    throw new Error(
      `Brevo send failed: ${body.message ?? res.statusText ?? res.status}`
    );
  }

  return {
    messageId: body.messageId ?? `brevo-${Date.now()}`,
  };
}

/** Send using decrypted identity credentials (no in-memory cache). */
export async function sendWithEmailIdentity(
  identity: EmailIdentityRow,
  input: SendOutreachInput
): Promise<SendOutreachResult> {
  const providerType = identity.providerType as EmailProviderType;

  if (providerType === "gmail" || providerType === "smtp") {
    const creds = decryptCredentials<SmtpCredentials>(
      identity.credentialsEncrypted
    );
    return sendViaSmtp(identity, creds, input);
  }

  if (providerType === "resend") {
    const creds = decryptCredentials<ApiKeyCredentials>(
      identity.credentialsEncrypted
    );
    return sendViaResend(identity, creds, input);
  }

  if (providerType === "brevo") {
    const creds = decryptCredentials<ApiKeyCredentials>(
      identity.credentialsEncrypted
    );
    return sendViaBrevo(identity, creds, input);
  }

  throw new Error(`Unsupported provider type: ${identity.providerType}`);
}

export function providerNameForIdentity(
  providerType: string
): "gmail" | "smtp" | "resend" | "brevo" {
  if (providerType === "gmail") return "gmail";
  if (providerType === "smtp") return "smtp";
  if (providerType === "resend") return "resend";
  return "brevo";
}
