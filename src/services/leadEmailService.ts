import { sendOutreachToLead } from "./email/outreachEmailService";

export interface SendSuggestedEmailResult {
  leadId: string;
  to: string;
  sentEmailId: string;
  subject: string;
}

/** Sends snapshot-suggested copy via the provider-agnostic outreach pipeline. */
export async function sendSuggestedEmailFromSnapshot(
  userId: string,
  leadId: string
): Promise<SendSuggestedEmailResult> {
  const result = await sendOutreachToLead({
    userId,
    leadId,
    useSnapshot: true,
  });

  return {
    leadId: result.leadId,
    to: result.to,
    sentEmailId: result.sentEmailId,
    subject: result.subject,
  };
}
