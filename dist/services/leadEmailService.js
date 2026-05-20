"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuggestedEmailFromSnapshot = sendSuggestedEmailFromSnapshot;
const resendEmailService_1 = require("./email/resendEmailService");
const leadRepository_1 = require("../repositories/leadRepository");
const snapshotRepository_1 = require("../repositories/snapshotRepository");
async function sendSuggestedEmailFromSnapshot(userId, leadId) {
    const lead = await (0, leadRepository_1.getLeadById)(userId, leadId);
    if (!lead) {
        throw new Error(`Lead not found: ${leadId}`);
    }
    const snapshot = await (0, snapshotRepository_1.getSnapshotByLeadId)(userId, leadId);
    if (!snapshot || !(0, snapshotRepository_1.snapshotHasSuggestedEmail)(snapshot)) {
        throw new Error("No suggested email on snapshot. Refresh the snapshot via PATCH /api/leads/:id/snapshot first.");
    }
    const { messageId } = await (0, resendEmailService_1.sendLeadEmail)({
        to: lead.email,
        subject: snapshot.suggested_email_subject,
        body: snapshot.suggested_email_body,
    });
    await (0, leadRepository_1.incrementEmailsSent)(userId, leadId);
    await (0, snapshotRepository_1.markSuggestedEmailSent)(userId, leadId);
    return {
        leadId,
        to: lead.email,
        resendMessageId: messageId,
        subject: snapshot.suggested_email_subject,
    };
}
