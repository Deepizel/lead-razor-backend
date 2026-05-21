import nodemailer from "nodemailer";
import { env } from "../../config/env";
import type { OutreachEmailProvider, SendOutreachInput, SendOutreachResult } from "./types";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    });
  }
  return transporter;
}

export const smtpOutreachProvider: OutreachEmailProvider = {
  name: "gmail",

  async send(input: SendOutreachInput): Promise<SendOutreachResult> {
    const from = env.smtpFrom || env.smtpUser;
    const info = await getTransporter().sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      headers: input.headers,
    });

    const messageId =
      typeof info.messageId === "string" ? info.messageId : `smtp-${Date.now()}`;
    return { messageId };
  },
};
