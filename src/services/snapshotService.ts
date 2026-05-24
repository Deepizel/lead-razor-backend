import { runProfilingChain } from "../agents/profilingChain";
import { getCategoryById } from "../repositories/categoryRepository";
import { getLeadById } from "../repositories/leadRepository";
import { upsertSnapshot } from "../repositories/snapshotRepository";
import { calculateScore, calculateScoreWithBreakdown } from "./scoringService";
import { env } from "../config/env";
import type { Lead, ProfilingResult, ScoreBreakdown } from "../types/lead";

export interface RefreshSnapshotOptions {
  userId: string;
  eventMetadata?: {
    emailSubject?: string;
    replySnippet?: string;
    eventType?: string;
  };
}

export async function refreshLeadSnapshot(
  leadId: string,
  options: RefreshSnapshotOptions
) {
  const { userId } = options;
  const lead = await getLeadById(userId, leadId);
  if (!lead) {
    throw new Error(`Lead not found: ${leadId}`);
  }

  const category = await getCategoryById(userId, lead.category_id);
  const { score } = calculateScore(lead);

  const { result } = await runProfilingChain({
    lead: { ...lead, score },
    category,
    eventMetadata: options.eventMetadata,
  });

  const snapshot = await upsertSnapshot({
    userId,
    leadId,
    currentScore: score,
    result,
    llmModel: env.openaiModel,
  });

  return { lead, snapshot, profiling: result };
}

export function buildScoreBreakdownForLead(lead: Lead): ScoreBreakdown {
  return calculateScoreWithBreakdown(lead);
}

function formatSnapshotBlock(
  snapshot: Awaited<ReturnType<typeof upsertSnapshot>>
) {
  return {
    leadId: snapshot.lead_id,
    currentScore: snapshot.current_score,
    summary: snapshot.summary,
    currentIntent: snapshot.current_intent,
    lastMeaningfulEvent: snapshot.last_meaningful_event,
    suggestedEmail: {
      subject: snapshot.suggested_email_subject,
      body: snapshot.suggested_email_body,
      sentAt: snapshot.suggested_email_sent_at,
    },
    llmModel: snapshot.llm_model,
    updatedAt: snapshot.updated_at,
  };
}

export function formatLeadDetailResponse(
  lead: Lead,
  snapshot: Awaited<ReturnType<typeof upsertSnapshot>> | null
) {
  return {
    lead,
    scoreBreakdown: buildScoreBreakdownForLead(lead),
    snapshot: snapshot ? formatSnapshotBlock(snapshot) : null,
  };
}

export function formatSnapshotResponse(
  lead: Lead,
  snapshot: Awaited<ReturnType<typeof upsertSnapshot>>
) {
  return formatLeadDetailResponse(lead, snapshot);
}

export type { ProfilingResult };
