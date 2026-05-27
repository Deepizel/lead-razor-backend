import { prisma } from "../db/prisma";
import type { EmailProviderType } from "../types/emailIdentity";

export type EmailIdentityRow = {
  id: string;
  userId: string;
  label: string;
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
  providerType: string;
  domainVerified: boolean;
  credentialsEncrypted: string;
  isDefault: boolean;
  trackingEnabled: boolean;
  replyHandlingMode: string;
  createdAt: Date;
  updatedAt: Date;
};

function mapRow(row: {
  id: string;
  userId: string;
  label: string;
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
  providerType: string;
  domainVerified: boolean;
  credentialsEncrypted: string;
  isDefault: boolean;
  trackingEnabled: boolean;
  replyHandlingMode: string;
  createdAt: Date;
  updatedAt: Date;
}): EmailIdentityRow {
  return {
    id: row.id,
    userId: row.userId,
    label: row.label,
    fromName: row.fromName,
    fromEmail: row.fromEmail,
    replyTo: row.replyTo,
    providerType: row.providerType,
    domainVerified: row.domainVerified,
    credentialsEncrypted: row.credentialsEncrypted,
    isDefault: row.isDefault,
    trackingEnabled: row.trackingEnabled,
    replyHandlingMode: row.replyHandlingMode,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listEmailIdentitiesForUser(
  userId: string
): Promise<EmailIdentityRow[]> {
  const rows = await prisma.emailIdentity.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  return rows.map(mapRow);
}

export async function findEmailIdentityForUser(
  userId: string,
  id: string
): Promise<EmailIdentityRow | null> {
  const row = await prisma.emailIdentity.findFirst({
    where: { id, userId },
  });
  return row ? mapRow(row) : null;
}

export async function findDefaultEmailIdentityForUser(
  userId: string
): Promise<EmailIdentityRow | null> {
  const row = await prisma.emailIdentity.findFirst({
    where: { userId, isDefault: true },
  });
  return row ? mapRow(row) : null;
}

export async function countEmailIdentitiesForUser(
  userId: string
): Promise<number> {
  return prisma.emailIdentity.count({ where: { userId } });
}

export async function createEmailIdentityRecord(input: {
  userId: string;
  label: string;
  fromName: string;
  fromEmail: string;
  replyTo: string | null;
  providerType: EmailProviderType;
  domainVerified: boolean;
  credentialsEncrypted: string;
  isDefault: boolean;
  trackingEnabled: boolean;
  replyHandlingMode: string;
}): Promise<EmailIdentityRow> {
  const row = await prisma.emailIdentity.create({
    data: {
      userId: input.userId,
      label: input.label,
      fromName: input.fromName,
      fromEmail: input.fromEmail,
      replyTo: input.replyTo,
      providerType: input.providerType,
      domainVerified: input.domainVerified,
      credentialsEncrypted: input.credentialsEncrypted,
      isDefault: input.isDefault,
      trackingEnabled: input.trackingEnabled,
      replyHandlingMode: input.replyHandlingMode,
    },
  });
  return mapRow(row);
}

export async function updateEmailIdentityRecord(
  userId: string,
  id: string,
  data: {
    label?: string;
    fromName?: string;
    fromEmail?: string;
    replyTo?: string | null;
    domainVerified?: boolean;
    credentialsEncrypted?: string;
    isDefault?: boolean;
    trackingEnabled?: boolean;
    replyHandlingMode?: string;
  }
): Promise<EmailIdentityRow | null> {
  const existing = await prisma.emailIdentity.findFirst({
    where: { id, userId },
  });
  if (!existing) return null;

  const row = await prisma.emailIdentity.update({
    where: { id },
    data,
  });
  return mapRow(row);
}

export async function deleteEmailIdentityRecord(
  userId: string,
  id: string
): Promise<boolean> {
  const result = await prisma.emailIdentity.deleteMany({
    where: { id, userId },
  });
  return result.count > 0;
}

export async function clearDefaultEmailIdentities(userId: string): Promise<void> {
  await prisma.emailIdentity.updateMany({
    where: { userId, isDefault: true },
    data: { isDefault: false },
  });
}

export async function setDefaultEmailIdentity(
  userId: string,
  id: string
): Promise<EmailIdentityRow | null> {
  const existing = await prisma.emailIdentity.findFirst({
    where: { id, userId },
  });
  if (!existing) return null;

  await prisma.$transaction([
    prisma.emailIdentity.updateMany({
      where: { userId },
      data: { isDefault: false },
    }),
    prisma.emailIdentity.update({
      where: { id },
      data: { isDefault: true },
    }),
  ]);

  return findEmailIdentityForUser(userId, id);
}
