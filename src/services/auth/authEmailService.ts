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

function waitlistSetupLink(token: string): string {
  if (env.frontendUrl) {
    return `${env.frontendUrl.replace(/\/$/, "")}/waitlist/set-password?token=${token}`;
  }
  return `${env.appUrl.replace(/\/$/, "")}/api/waitlist/set-password?token=${token}`;
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

export async function sendWaitlistSetupEmail(
  to: string,
  firstName: string,
  token: string
): Promise<void> {
  const link = waitlistSetupLink(token);
  const resend = getResend();
  const name = firstName.trim() || "there";

  const { error } = await resend.emails.send({
    from: env.resendFromEmail,
    to: [to],
    subject: "You're approved — set your Lead Qualifier password",
    html: `
      <p>Hi ${name},</p>
      <p>Your waitlist application has been approved. Click below to set your password and access your account:</p>
      <p><a href="${link}">Set your password</a></p>
      <p>This link expires in <strong>24 hours</strong>.</p>
      <p style="color:#666;font-size:12px;">Or copy: ${link}</p>
    `,
    text: `Hi ${name},\n\nYour application was approved. Set your password: ${link}\n\nThis link expires in 24 hours.`,
  });

  if (error) {
    throw new Error(`Failed to send waitlist setup email: ${error.message}`);
  }
}
