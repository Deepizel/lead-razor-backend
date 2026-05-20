"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendLeadEmail = sendLeadEmail;
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
/**
 * Sends outreach email to a lead via Resend using the LLM-suggested copy from the snapshot.
 */
async function sendLeadEmail(input) {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
        from: env_1.env.resendFromEmail,
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
function plainTextToHtml(text) {
    const escaped = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    return `<div style="font-family: sans-serif; line-height: 1.5;">${escaped
        .split("\n")
        .join("<br>")}</div>`;
}
