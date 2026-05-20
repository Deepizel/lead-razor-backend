import { prisma } from "../db/prisma";
import { toLeadSnapshotDto } from "../lib/prismaMappers";
import type { LeadSnapshot, ProfilingResult } from "../types/lead";

export async function getSnapshotByLeadId(
  userId: string,
  leadId: string
): Promise<LeadSnapshot | null> {
  const snapshot = await prisma.leadSnapshot.findFirst({
    where: { leadId, userId },
  });
  return snapshot ? toLeadSnapshotDto(snapshot) : null;
}

export interface UpsertSnapshotInput {
  userId: string;
  leadId: string;
  currentScore: number;
  result: ProfilingResult;
  llmModel: string;
  tokenCost?: number;
}

export async function upsertSnapshot(
  input: UpsertSnapshotInput
): Promise<LeadSnapshot> {
  const { userId, leadId, currentScore, result, llmModel, tokenCost } = input;

  const snapshot = await prisma.leadSnapshot.upsert({
    where: { leadId },
    create: {
      userId,
      leadId,
      currentScore,
      summary: result.summary,
      currentIntent: result.currentIntent,
      lastMeaningfulEvent: result.lastMeaningfulEvent,
      suggestedEmailSubject: result.suggestedEmail.subject,
      suggestedEmailBody: result.suggestedEmail.body,
      llmModel,
      tokenCost: tokenCost ?? null,
    },
    update: {
      userId,
      currentScore,
      summary: result.summary,
      currentIntent: result.currentIntent,
      lastMeaningfulEvent: result.lastMeaningfulEvent,
      suggestedEmailSubject: result.suggestedEmail.subject,
      suggestedEmailBody: result.suggestedEmail.body,
      llmModel,
      tokenCost: tokenCost ?? null,
    },
  });

  return toLeadSnapshotDto(snapshot);
}

export async function markSuggestedEmailSent(
  userId: string,
  leadId: string
): Promise<LeadSnapshot> {
  const existing = await prisma.leadSnapshot.findFirst({
    where: { leadId, userId },
  });
  if (!existing) {
    throw new Error(`Snapshot not found for lead: ${leadId}`);
  }

  const snapshot = await prisma.leadSnapshot.update({
    where: { leadId },
    data: { suggestedEmailSentAt: new Date() },
  });
  return toLeadSnapshotDto(snapshot);
}

export function snapshotHasSuggestedEmail(
  snapshot: LeadSnapshot
): snapshot is LeadSnapshot & {
  suggested_email_subject: string;
  suggested_email_body: string;
} {
  return Boolean(
    snapshot.suggested_email_subject?.trim() &&
      snapshot.suggested_email_body?.trim()
  );
}
