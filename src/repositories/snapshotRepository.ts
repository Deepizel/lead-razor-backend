import { getPool } from "../db/pool";
import type { LeadIntent, LeadSnapshot, ProfilingResult } from "../types/lead";

export async function getSnapshotByLeadId(
  leadId: string
): Promise<LeadSnapshot | null> {
  const { rows } = await getPool().query<LeadSnapshot>(
    `SELECT * FROM lead_snapshots WHERE lead_id = $1`,
    [leadId]
  );
  return rows[0] ?? null;
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
  const { rows } = await getPool().query<LeadSnapshot>(
    `INSERT INTO lead_snapshots (
       lead_id, current_score, summary, current_intent, last_meaningful_event,
       suggested_email_subject, suggested_email_body,
       llm_model, token_cost, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     ON CONFLICT (lead_id) DO UPDATE SET
       current_score = EXCLUDED.current_score,
       summary = EXCLUDED.summary,
       current_intent = EXCLUDED.current_intent,
       last_meaningful_event = EXCLUDED.last_meaningful_event,
       suggested_email_subject = EXCLUDED.suggested_email_subject,
       suggested_email_body = EXCLUDED.suggested_email_body,
       llm_model = EXCLUDED.llm_model,
       token_cost = EXCLUDED.token_cost,
       updated_at = NOW()
     RETURNING *`,
    [
      leadId,
      currentScore,
      result.summary,
      result.currentIntent,
      result.lastMeaningfulEvent,
      result.suggestedEmail.subject,
      result.suggestedEmail.body,
      llmModel,
      tokenCost ?? null,
    ]
  );
  return rows[0];
}

export async function markSuggestedEmailSent(
  leadId: string
): Promise<LeadSnapshot> {
  const { rows } = await getPool().query<LeadSnapshot>(
    `UPDATE lead_snapshots
     SET suggested_email_sent_at = NOW(), updated_at = NOW()
     WHERE lead_id = $1
     RETURNING *`,
    [leadId]
  );
  if (!rows[0]) {
    throw new Error(`Snapshot not found for lead: ${leadId}`);
  }
  return rows[0];
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
