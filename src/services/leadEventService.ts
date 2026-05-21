import { recordLeadEvent } from "../repositories/eventRepository";
import type { LeadTier } from "../types/lead";

export async function recordTierChange(
  userId: string,
  leadId: string,
  fromTier: LeadTier,
  toTier: LeadTier
): Promise<void> {
  if (fromTier === toTier) return;
  await recordLeadEvent({
    userId,
    leadId,
    eventType: "tier_change",
    fromTier,
    toTier,
  });
}

export async function recordLeadCreated(
  userId: string,
  leadId: string,
  tier: LeadTier,
  uploadId?: string
): Promise<void> {
  await recordLeadEvent({
    userId,
    leadId,
    eventType: "lead_created",
    toTier: tier,
    metadata: uploadId ? { uploadId } : undefined,
  });
}

export async function recordEmailSent(
  userId: string,
  leadId: string
): Promise<void> {
  await recordLeadEvent({
    userId,
    leadId,
    eventType: "email_sent",
  });
}
