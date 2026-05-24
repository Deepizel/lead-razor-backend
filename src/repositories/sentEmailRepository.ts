import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import type { TrackedLink } from "../types/email";

export async function createSentEmail(input: {
  userId: string;
  leadId: string;
  provider: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  linksJson?: TrackedLink[];
}) {
  return prisma.sentEmail.create({
    data: {
      userId: input.userId,
      leadId: input.leadId,
      provider: input.provider,
      subject: input.subject,
      bodyHtml: input.bodyHtml,
      bodyText: input.bodyText,
      linksJson: toLinksJson(input.linksJson ?? []),
      status: "pending",
    },
    include: {
      lead: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          company: true,
        },
      },
    },
  });
}

export async function markSentEmailDelivered(
  id: string,
  providerMessageId: string
) {
  return prisma.sentEmail.update({
    where: { id },
    data: {
      status: "sent",
      sentAt: new Date(),
      providerMessageId,
    },
  });
}

export async function markSentEmailFailed(id: string) {
  return prisma.sentEmail.update({
    where: { id },
    data: { status: "failed" },
  });
}

export async function findSentEmailById(id: string) {
  return prisma.sentEmail.findUnique({
    where: { id },
    include: {
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          company: true,
        },
      },
    },
  });
}

export async function findSentEmailForUser(userId: string, id: string) {
  return prisma.sentEmail.findFirst({
    where: { id, userId },
    include: {
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          company: true,
        },
      },
    },
  });
}

export async function listSentEmailsForUser(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    leadId?: string;
    tier?: string;
    opened?: boolean;
    replied?: boolean;
  } = {}
) {
  const { limit = 50, offset = 0, leadId, tier, opened, replied } = options;

  const where: Prisma.SentEmailWhereInput = {
    userId,
    ...(leadId ? { leadId } : {}),
    ...(opened === true ? { firstOpenedAt: { not: null } } : {}),
    ...(opened === false ? { firstOpenedAt: null } : {}),
    ...(replied === true ? { repliedAt: { not: null } } : {}),
    ...(replied === false ? { repliedAt: null } : {}),
    ...(tier
      ? {
          lead: { tier },
        }
      : {}),
  };

  const [emails, total] = await Promise.all([
    prisma.sentEmail.findMany({
      where,
      orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
      take: limit,
      skip: offset,
      include: {
        lead: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    }),
    prisma.sentEmail.count({ where }),
  ]);

  return { emails, total };
}

export async function listSentEmailsForLead(userId: string, leadId: string) {
  return prisma.sentEmail.findMany({
    where: { userId, leadId },
    orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
  });
}

export async function recordSentEmailOpen(id: string) {
  const existing = await prisma.sentEmail.findUnique({ where: { id } });
  if (!existing) return null;

  const now = new Date();
  return prisma.sentEmail.update({
    where: { id },
    data: {
      openCount: { increment: 1 },
      firstOpenedAt: existing.firstOpenedAt ?? now,
    },
  });
}

export async function recordSentEmailClick(id: string, linkIndex: number) {
  const existing = await prisma.sentEmail.findUnique({ where: { id } });
  if (!existing) return null;

  const links = parseLinksJson(existing.linksJson);
  if (links[linkIndex]) {
    links[linkIndex].clickedAt = new Date().toISOString();
  }

  const now = new Date();
  return prisma.sentEmail.update({
    where: { id },
    data: {
      clickCount: { increment: 1 },
      firstClickedAt: existing.firstClickedAt ?? now,
      linksJson: toLinksJson(links),
    },
  });
}

export async function recordSentEmailReply(
  id: string,
  replySnippet?: string
) {
  return prisma.sentEmail.update({
    where: { id },
    data: {
      repliedAt: new Date(),
      replySnippet: replySnippet ?? null,
    },
  });
}

export function parseLinksJson(value: Prisma.JsonValue | null): TrackedLink[] {
  if (!value || !Array.isArray(value)) return [];
  return value as unknown as TrackedLink[];
}

export function toLinksJson(links: TrackedLink[]): Prisma.InputJsonValue {
  return links as unknown as Prisma.InputJsonValue;
}
