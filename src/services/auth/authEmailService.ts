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

function verificationLink(token: string): string {
  if (env.frontendUrl) {
    return `${env.frontendUrl.replace(/\/$/, "")}/verify-email?token=${token}`;
  }
  return `${env.appUrl.replace(/\/$/, "")}/api/auth/verify-email?token=${token}`;
}

function resetLink(token: string): string {
  if (env.frontendUrl) {
    return `${env.frontendUrl.replace(/\/$/, "")}/reset-password?token=${token}`;
  }
  return `${env.appUrl.replace(/\/$/, "")}/api/auth/reset-password?token=${token}`;
}

export async function sendVerificationEmail(
  to: string,
  token: string
): Promise<void> {
  const link = verificationLink(token);
  const resend = getResend();

  const { error } = await resend.emails.send({
    from: env.resendFromEmail,
    to: [to],
    subject: "Verify your Lead Qualifier account",
    html: `
      <p>Thanks for signing up. Click the link below to verify your email:</p>
      <p><a href="${link}">Verify email address</a></p>
      <p>This link expires in 24 hours. If you did not sign up, ignore this email.</p>
      <p style="color:#666;font-size:12px;">Or copy: ${link}</p>
    `,
    text: `Verify your email: ${link}\n\nThis link expires in 24 hours.`,
  });

  if (error) {
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
}

export async function sendPasswordResetEmail(
  to: string,
  token: string
): Promise<void> {
  const link = resetLink(token);
  const resend = getResend();

  const { error } = await resend.emails.send({
    from: env.resendFromEmail,
    to: [to],
    subject: "Reset your Lead Qualifier password",
    html: `
      <p>We received a request to reset your password.</p>
      <p><a href="${link}">Reset password</a></p>
      <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
      <p style="color:#666;font-size:12px;">Or copy: ${link}</p>
    `,
    text: `Reset your password: ${link}\n\nThis link expires in 1 hour.`,
  });

  if (error) {
    throw new Error(`Failed to send reset email: ${error.message}`);
  }
}
