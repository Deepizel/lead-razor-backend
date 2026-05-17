import { runProfilingChain } from "../agents/profilingChain";
import { getCategoryById } from "../repositories/categoryRepository";
import { getLeadById } from "../repositories/leadRepository";
import { upsertSnapshot } from "../repositories/snapshotRepository";
import { calculateScore } from "./scoringService";
import { env } from "../config/env";
import type { Lead, ProfilingResult } from "../types/lead";

export interface RefreshSnapshotOptions {
  eventMetadata?: {
    emailSubject?: string;
    replySnippet?: string;
    eventType?: string;
  };
}

/**
 * Runs the LLM profiling chain and persists summary, intent, and suggested email on the snapshot.
 */
export async function refreshLeadSnapshot(
  leadId: string,
  options: RefreshSnapshotOptions = {}
) {
  const lead = await getLeadById(leadId);
  if (!lead) {
    throw new Error(`Lead not found: ${leadId}`);
  }

  const category = await getCategoryById(lead.category_id);
  const { score } = calculateScore(lead);

  const { result } = await runProfilingChain({
    lead: { ...lead, score },
    category,
    eventMetadata: options.eventMetadata,
  });

  const snapshot = await upsertSnapshot({
    leadId,
    currentScore: score,
    result,
    llmModel: env.openaiModel,
  });

  return { lead, snapshot, profiling: result };
}

export function formatSnapshotResponse(
  lead: Lead,
  snapshot: Awaited<ReturnType<typeof upsertSnapshot>>
) {
  return {
    lead,
    snapshot: {
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
    },
  };
}

export type { ProfilingResult };
