"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendVerificationEmail = sendVerificationEmail;
exports.sendPasswordResetEmail = sendPasswordResetEmail;
const resend_1 = require("resend");
const env_1 = require("../../config/env");
let resendClient = null;
function getResend() {
    (0, env_1.assertResendConfigured)();
    if (!resendClient) {
        resendClient = new resend_1.Resend(env_1.env.resendApiKey);
    }
    return resendClient;
}
function verificationLink(token) {
    if (env_1.env.frontendUrl) {
        return `${env_1.env.frontendUrl.replace(/\/$/, "")}/verify-email?token=${token}`;
    }
    return `${env_1.env.appUrl.replace(/\/$/, "")}/api/auth/verify-email?token=${token}`;
}
function resetLink(token) {
    if (env_1.env.frontendUrl) {
        return `${env_1.env.frontendUrl.replace(/\/$/, "")}/reset-password?token=${token}`;
    }
    return `${env_1.env.appUrl.replace(/\/$/, "")}/api/auth/reset-password?token=${token}`;
}
async function sendVerificationEmail(to, token) {
    const link = verificationLink(token);
    const resend = getResend();
    const { error } = await resend.emails.send({
        from: env_1.env.resendFromEmail,
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
async function sendPasswordResetEmail(to, token) {
    const link = resetLink(token);
    const resend = getResend();
    const { error } = await resend.emails.send({
        from: env_1.env.resendFromEmail,
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
