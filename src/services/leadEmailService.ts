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
  leadId: string,
  emailIdentityId?: string | null
): Promise<SendSuggestedEmailResult> {
  const result = await sendOutreachToLead({
    userId,
    leadId,
    useSnapshot: true,
    emailIdentityId,
  });

  return {
    leadId: result.leadId,
    to: result.to,
    sentEmailId: result.sentEmailId,
    subject: result.subject,
  };
}
