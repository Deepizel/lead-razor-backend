import { sendLeadEmail } from "./email/resendEmailService";
import {
  getLeadById,
  incrementEmailsSent,
} from "../repositories/leadRepository";
import {
  getSnapshotByLeadId,
  markSuggestedEmailSent,
  snapshotHasSuggestedEmail,
} from "../repositories/snapshotRepository";

export interface SendSuggestedEmailResult {
  leadId: string;
  to: string;
  resendMessageId: string;
  subject: string;
}

export async function sendSuggestedEmailFromSnapshot(
  userId: string,
  leadId: string
): Promise<SendSuggestedEmailResult> {
  const lead = await getLeadById(userId, leadId);
  if (!lead) {
    throw new Error(`Lead not found: ${leadId}`);
  }

  const snapshot = await getSnapshotByLeadId(userId, leadId);
  if (!snapshot || !snapshotHasSuggestedEmail(snapshot)) {
    throw new Error(
      "No suggested email on snapshot. Refresh the snapshot via PATCH /api/leads/:id/snapshot first."
    );
  }

  const { messageId } = await sendLeadEmail({
    to: lead.email,
    subject: snapshot.suggested_email_subject,
    body: snapshot.suggested_email_body,
  });

  await incrementEmailsSent(userId, leadId);
  await markSuggestedEmailSent(userId, leadId);

  return {
    leadId,
    to: lead.email,
    resendMessageId: messageId,
    subject: snapshot.suggested_email_subject,
  };
}
