import { Resend } from "resend";
import { env, assertResendConfigured } from "../../config/env";

let resendClient: Resend | null = null;

function getResend(): Resend {
  assertResendConfigured();
  if (!resendClient) {
    resendClient = new Resend(env.resendApiKey);
  }
  return resendClient;
}

export interface SendLeadEmailInput {
  to: string;
  subject: string;
  body: string;
}

export interface SendLeadEmailResult {
  messageId: string;
}

/**
 * Sends outreach email to a lead via Resend using the LLM-suggested copy from the snapshot.
 */
export async function sendLeadEmail(
  input: SendLeadEmailInput
): Promise<SendLeadEmailResult> {
  const resend = getResend();

  const { data, error } = await resend.emails.send({
    from: env.resendFromEmail,
    to: [input.to],
    subject: input.subject,
    text: input.body,
    html: plainTextToHtml(input.body),
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }

  if (!data?.id) {
    throw new Error("Resend send succeeded but no message id was returned");
  }

  return { messageId: data.id };
}

function plainTextToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div style="font-family: sans-serif; line-height: 1.5;">${escaped
    .split("\n")
    .join("<br>")}</div>`;
}
