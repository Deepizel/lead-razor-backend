import { getPool } from "../db/pool";
import type { Lead } from "../types/lead";

export async function getLeadById(id: string): Promise<Lead | null> {
  const { rows } = await getPool().query<Lead>(
    `SELECT * FROM leads WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function incrementEmailsSent(leadId: string): Promise<Lead> {
  const { rows } = await getPool().query<Lead>(
    `UPDATE leads
     SET emails_sent = emails_sent + 1,
         last_event_type = 'email_sent',
         last_event_at = NOW(),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [leadId]
  );
  if (!rows[0]) {
    throw new Error(`Lead not found: ${leadId}`);
  }
  return rows[0];
}
