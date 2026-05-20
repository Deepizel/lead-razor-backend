"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadsRouter = void 0;
const express_1 = require("express");
const upload_1 = require("../middleware/upload");
const leadRepository_1 = require("../repositories/leadRepository");
const snapshotRepository_1 = require("../repositories/snapshotRepository");
const uploadService_1 = require("../services/uploadService");
const snapshotService_1 = require("../services/snapshotService");
const leadEmailService_1 = require("../services/leadEmailService");
exports.leadsRouter = (0, express_1.Router)();
function leadIdParam(req) {
    const id = req.params.id;
    return Array.isArray(id) ? id[0] : id;
}
exports.leadsRouter.post("/upload", upload_1.excelUpload.single("file"), async (req, res) => {
    try {
        if (!req.file?.buffer) {
            res.status(400).json({
                error: "Missing file. Send multipart field `file` (.xlsx).",
            });
            return;
        }
        const categoryId = typeof req.body?.categoryId === "string" && req.body.categoryId.trim()
            ? req.body.categoryId.trim()
            : undefined;
        const result = await (0, uploadService_1.processLeadsUpload)(req.user.id, req.file.buffer, categoryId);
        res.status(202).json({
            uploadId: result.uploadId,
            rowCount: result.rowCount,
            status: "processing",
            processed: result.processed,
            created: result.created,
            updated: result.updated,
            errors: result.errors,
            profilingQueued: result.profilingQueued,
        });
    }
    catch (err) {
        console.error(err);
        const message = err instanceof Error ? err.message : "Upload failed";
        const status = message.includes("Missing required columns") ? 400 : 500;
        res.status(status).json({ error: message });
    }
});
exports.leadsRouter.get("/", async (req, res) => {
    try {
        const tier = req.query.tier;
        const sort = req.query.sort;
        if (tier && !["hot", "warm", "cold"].includes(tier)) {
            res.status(400).json({ error: "tier must be hot, warm, or cold" });
            return;
        }
        if (sort && sort !== "score" && sort !== "created_at") {
            res.status(400).json({ error: "sort must be score or created_at" });
            return;
        }
        const leads = await (0, leadRepository_1.listLeads)(req.user.id, {
            tier: tier,
            sort: sort ?? "score",
        });
        res.json({ leads });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to list leads" });
    }
});
exports.leadsRouter.get("/:id", async (req, res) => {
    try {
        const userId = req.user.id;
        const lead = await (0, leadRepository_1.getLeadById)(userId, leadIdParam(req));
        if (!lead) {
            res.status(404).json({ error: "Lead not found" });
            return;
        }
        const snapshot = await (0, snapshotRepository_1.getSnapshotByLeadId)(userId, lead.id);
        res.json(snapshot ? (0, snapshotService_1.formatSnapshotResponse)(lead, snapshot) : { lead, snapshot: null });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch lead" });
    }
});
exports.leadsRouter.patch("/:id", async (req, res) => {
    try {
        const userId = req.user.id;
        const body = req.body ?? {};
        const lead = await (0, leadRepository_1.updateLead)(userId, leadIdParam(req), {
            category_id: body.category_id,
            first_name: body.first_name,
            last_name: body.last_name,
            email: body.email,
            company: body.company,
            job_title: body.job_title,
            phone: body.phone,
            source: body.source,
            initial_message: body.initial_message,
            business_detail: body.business_detail,
        });
        if (!lead) {
            res.status(404).json({ error: "Lead not found" });
            return;
        }
        const snapshot = await (0, snapshotRepository_1.getSnapshotByLeadId)(userId, lead.id);
        res.json(snapshot ? (0, snapshotService_1.formatSnapshotResponse)(lead, snapshot) : { lead, snapshot: null });
    }
    catch (err) {
        console.error(err);
        const message = err instanceof Error ? err.message : "Failed to update lead";
        const status = message.includes("Email already") ? 409 : 500;
        res.status(status).json({ error: message });
    }
});
exports.leadsRouter.patch("/:id/snapshot", async (req, res) => {
    try {
        const { lead, snapshot } = await (0, snapshotService_1.refreshLeadSnapshot)(leadIdParam(req), {
            userId: req.user.id,
            eventMetadata: req.body?.metadata,
        });
        res.json((0, snapshotService_1.formatSnapshotResponse)(lead, snapshot));
    }
    catch (err) {
        console.error(err);
        const message = err instanceof Error ? err.message : "Snapshot refresh failed";
        const status = message.includes("not found") ? 404 : 500;
        res.status(status).json({ error: message });
    }
});
exports.leadsRouter.post("/:id/email/send", async (req, res) => {
    try {
        const result = await (0, leadEmailService_1.sendSuggestedEmailFromSnapshot)(req.user.id, leadIdParam(req));
        res.status(200).json({
            status: "sent",
            ...result,
        });
    }
    catch (err) {
        console.error(err);
        const message = err instanceof Error ? err.message : "Email send failed";
        let status = 500;
        if (message.includes("not found"))
            status = 404;
        if (message.includes("No suggested email"))
            status = 400;
        if (message.includes("RESEND") || message.includes("Resend"))
            status = 502;
        res.status(status).json({ error: message });
    }
});
