import { prisma } from "../db/prisma";
import type { LeadTier } from "../types/lead";

export type LeadEventType =
  | "tier_change"
  | "email_sent"
  | "email_opened"
  | "link_clicked"
  | "reply_received"
  | "booking_click"
  | "lead_created";

export async function recordLeadEvent(input: {
  userId: string;
  leadId: string;
  eventType: LeadEventType;
  fromTier?: LeadTier | null;
  toTier?: LeadTier | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await prisma.leadEvent.create({
    data: {
      userId: input.userId,
      leadId: input.leadId,
      eventType: input.eventType,
      fromTier: input.fromTier ?? null,
      toTier: input.toTier ?? null,
      metadata: input.metadata ?? undefined,
    },
  });
}

export async function listTierChangeEvents(
  userId: string,
  since: Date
): Promise<
  Array<{
    fromTier: string | null;
    toTier: string | null;
    createdAt: Date;
  }>
> {
  return prisma.leadEvent.findMany({
    where: {
      userId,
      eventType: "tier_change",
      createdAt: { gte: since },
    },
    select: {
      fromTier: true,
      toTier: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}
