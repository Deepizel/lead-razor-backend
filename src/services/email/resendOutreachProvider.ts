import { Resend } from "resend";
import { env } from "../../config/env";
import type { OutreachEmailProvider, SendOutreachInput, SendOutreachResult } from "./types";

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(env.resendApiKey);
  }
  return resendClient;
}

export const resendOutreachProvider: OutreachEmailProvider = {
  name: "resend",

  async send(input: SendOutreachInput): Promise<SendOutreachResult> {
    const { data, error } = await getResend().emails.send({
      from: env.resendFromEmail,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
      headers: input.headers,
    });

    if (error) {
      throw new Error(`Resend send failed: ${error.message}`);
    }
    if (!data?.id) {
      throw new Error("Resend send succeeded but no message id was returned");
    }
    return { messageId: data.id };
  },
};
