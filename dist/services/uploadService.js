"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processLeadsUpload = processLeadsUpload;
const uuid_1 = require("uuid");
const excelParser_1 = require("../ingestion/excelParser");
const leadRepository_1 = require("../repositories/leadRepository");
const snapshotService_1 = require("./snapshotService");
const env_1 = require("../config/env");
async function processLeadsUpload(userId, fileBuffer, defaultCategoryId) {
    const uploadId = (0, uuid_1.v4)();
    const parsed = (0, excelParser_1.parseLeadsExcel)(fileBuffer);
    if (parsed.missingRequiredColumns.length > 0) {
        throw new Error(`Missing required columns: ${parsed.missingRequiredColumns.join(", ")}`);
    }
    let created = 0;
    let updated = 0;
    const rowErrors = [...parsed.errors];
    const leadIdsForProfiling = [];
    for (const row of parsed.rows) {
        try {
            const categoryId = row.category_id ?? defaultCategoryId ?? null;
            const { lead, isNew } = await (0, leadRepository_1.upsertLeadFromRow)(userId, row, categoryId);
            if (isNew)
                created += 1;
            else
                updated += 1;
            leadIdsForProfiling.push(lead.id);
        }
        catch (err) {
            rowErrors.push({
                rowNumber: row.rowNumber,
                email: row.email,
                error: err instanceof Error ? err.message : "Failed to save lead",
            });
        }
    }
    const profilingQueued = queueProfiling(userId, leadIdsForProfiling);
    return {
        uploadId,
        rowCount: parsed.rows.length + parsed.errors.length,
        processed: created + updated,
        created,
        updated,
        errors: rowErrors,
        profilingQueued,
    };
}
function queueProfiling(userId, leadIds) {
    if (!env_1.env.openaiApiKey || leadIds.length === 0)
        return 0;
    for (const leadId of leadIds) {
        setImmediate(() => {
            (0, snapshotService_1.refreshLeadSnapshot)(leadId, { userId }).catch((err) => {
                console.error(`Profiling failed for lead ${leadId}:`, err);
            });
        });
    }
    return leadIds.length;
}
