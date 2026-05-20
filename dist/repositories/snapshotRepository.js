"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSnapshotByLeadId = getSnapshotByLeadId;
exports.upsertSnapshot = upsertSnapshot;
exports.markSuggestedEmailSent = markSuggestedEmailSent;
exports.snapshotHasSuggestedEmail = snapshotHasSuggestedEmail;
const prisma_1 = require("../db/prisma");
const prismaMappers_1 = require("../lib/prismaMappers");
async function getSnapshotByLeadId(userId, leadId) {
    const snapshot = await prisma_1.prisma.leadSnapshot.findFirst({
        where: { leadId, userId },
    });
    return snapshot ? (0, prismaMappers_1.toLeadSnapshotDto)(snapshot) : null;
}
async function upsertSnapshot(input) {
    const { userId, leadId, currentScore, result, llmModel, tokenCost } = input;
    const snapshot = await prisma_1.prisma.leadSnapshot.upsert({
        where: { leadId },
        create: {
            userId,
            leadId,
            currentScore,
            summary: result.summary,
            currentIntent: result.currentIntent,
            lastMeaningfulEvent: result.lastMeaningfulEvent,
            suggestedEmailSubject: result.suggestedEmail.subject,
            suggestedEmailBody: result.suggestedEmail.body,
            llmModel,
            tokenCost: tokenCost ?? null,
        },
        update: {
            userId,
            currentScore,
            summary: result.summary,
            currentIntent: result.currentIntent,
            lastMeaningfulEvent: result.lastMeaningfulEvent,
            suggestedEmailSubject: result.suggestedEmail.subject,
            suggestedEmailBody: result.suggestedEmail.body,
            llmModel,
            tokenCost: tokenCost ?? null,
        },
    });
    return (0, prismaMappers_1.toLeadSnapshotDto)(snapshot);
}
async function markSuggestedEmailSent(userId, leadId) {
    const existing = await prisma_1.prisma.leadSnapshot.findFirst({
        where: { leadId, userId },
    });
    if (!existing) {
        throw new Error(`Snapshot not found for lead: ${leadId}`);
    }
    const snapshot = await prisma_1.prisma.leadSnapshot.update({
        where: { leadId },
        data: { suggestedEmailSentAt: new Date() },
    });
    return (0, prismaMappers_1.toLeadSnapshotDto)(snapshot);
}
function snapshotHasSuggestedEmail(snapshot) {
    return Boolean(snapshot.suggested_email_subject?.trim() &&
        snapshot.suggested_email_body?.trim());
}
