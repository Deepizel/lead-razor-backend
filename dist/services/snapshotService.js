"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshLeadSnapshot = refreshLeadSnapshot;
exports.formatSnapshotResponse = formatSnapshotResponse;
const profilingChain_1 = require("../agents/profilingChain");
const categoryRepository_1 = require("../repositories/categoryRepository");
const leadRepository_1 = require("../repositories/leadRepository");
const snapshotRepository_1 = require("../repositories/snapshotRepository");
const scoringService_1 = require("./scoringService");
const env_1 = require("../config/env");
async function refreshLeadSnapshot(leadId, options) {
    const { userId } = options;
    const lead = await (0, leadRepository_1.getLeadById)(userId, leadId);
    if (!lead) {
        throw new Error(`Lead not found: ${leadId}`);
    }
    const category = await (0, categoryRepository_1.getCategoryById)(userId, lead.category_id);
    const { score } = (0, scoringService_1.calculateScore)(lead);
    const { result } = await (0, profilingChain_1.runProfilingChain)({
        lead: { ...lead, score },
        category,
        eventMetadata: options.eventMetadata,
    });
    const snapshot = await (0, snapshotRepository_1.upsertSnapshot)({
        userId,
        leadId,
        currentScore: score,
        result,
        llmModel: env_1.env.openaiModel,
    });
    return { lead, snapshot, profiling: result };
}
function formatSnapshotResponse(lead, snapshot) {
    return {
        lead,
        snapshot: {
            leadId: snapshot.lead_id,
            currentScore: snapshot.current_score,
            summary: snapshot.summary,
            currentIntent: snapshot.current_intent,
            lastMeaningfulEvent: snapshot.last_meaningful_event,
            suggestedEmail: {
                subject: snapshot.suggested_email_subject,
                body: snapshot.suggested_email_body,
                sentAt: snapshot.suggested_email_sent_at,
            },
            llmModel: snapshot.llm_model,
            updatedAt: snapshot.updated_at,
        },
    };
}
