import { prisma } from "../db/prisma";
import { toLeadSnapshotDto } from "../lib/prismaMappers";
import type { LeadSnapshot, ProfilingResult } from "../types/lead";

export async function getSnapshotByLeadId(
  leadId: string
): Promise<LeadSnapshot | null> {
  const snapshot = await prisma.leadSnapshot.findUnique({
    where: { leadId },
  });
  return snapshot ? toLeadSnapshotDto(snapshot) : null;
}

export interface UpsertSnapshotInput {
  leadId: string;
  currentScore: number;
  result: ProfilingResult;
  llmModel: string;
  tokenCost?: number;
}

export async function upsertSnapshot(
  input: UpsertSnapshotInput
): Promise<LeadSnapshot> {
  const { leadId, currentScore, result, llmModel, tokenCost } = input;

  const snapshot = await prisma.leadSnapshot.upsert({
    where: { leadId },
    create: {
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
  leadId: string
): Promise<LeadSnapshot> {
  try {
    const snapshot = await prisma.leadSnapshot.update({
      where: { leadId },
      data: { suggestedEmailSentAt: new Date() },
    });
    return toLeadSnapshotDto(snapshot);
  } catch {
    throw new Error(`Snapshot not found for lead: ${leadId}`);
  }
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
