import { env } from "../../config/env";
import { resendOutreachProvider } from "./resendOutreachProvider";
import { smtpOutreachProvider } from "./smtpEmailService";
import type { OutreachEmailProvider } from "./types";

export function getOutreachEmailProvider(): OutreachEmailProvider {
  return env.emailProvider === "resend"
    ? resendOutreachProvider
    : smtpOutreachProvider;
}
