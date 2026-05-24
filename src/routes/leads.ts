import { Router, Request, Response } from "express";
import { excelUpload } from "../middleware/upload";
import {
  getLeadById,
  listLeads,
  updateLead,
} from "../repositories/leadRepository";
import { createLeadFromForm } from "../services/leadCreateService";
import { getSnapshotByLeadId } from "../repositories/snapshotRepository";
import { processLeadsUpload } from "../services/uploadService";
import {
  refreshLeadSnapshot,
  formatLeadDetailResponse,
  buildScoreBreakdownForLead,
} from "../services/snapshotService";
import { sendSuggestedEmailFromSnapshot } from "../services/leadEmailService";
import { listLeadEmailHistory } from "../services/email/outreachEmailService";
import {
  exportUserLeadsXlsx,
  getUploadTemplateXlsx,
} from "../services/leadExportService";
import type { LeadTier } from "../types/lead";

export const leadsRouter = Router();

function leadIdParam(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

function sendXlsxDownload(
  res: Response,
  buffer: Buffer,
  filename: string
): void {
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
}

/** Blank/sample upload template — same columns as POST /api/leads/upload expects */
leadsRouter.get("/upload/template", async (req: Request, res: Response) => {
  try {
    const includeSamples = req.query.samples !== "false";
    const buffer = getUploadTemplateXlsx(includeSamples);
    sendXlsxDownload(res, buffer, "leads_upload_template.xlsx");
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate upload template" });
  }
});

/** Export this user's leads as .xlsx (re-uploadable shape) */
leadsRouter.get("/export", async (req: Request, res: Response) => {
  try {
    const buffer = await exportUserLeadsXlsx(req.user!.id);
    const date = new Date().toISOString().slice(0, 10);
    sendXlsxDownload(res, buffer, `leads_export_${date}.xlsx`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to export leads" });
  }
});

leadsRouter.post(
  "/upload",
  excelUpload.single("file"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file?.buffer) {
        res.status(400).json({
          error: "Missing file. Send multipart field `file` (.xlsx).",
        });
        return;
      }

      const categoryId =
        typeof req.body?.categoryId === "string" && req.body.categoryId.trim()
          ? req.body.categoryId.trim()
          : undefined;

      const sourceLabel =
        typeof req.body?.sourceLabel === "string" && req.body.sourceLabel.trim()
          ? req.body.sourceLabel.trim()
          : typeof req.body?.source === "string" && req.body.source.trim()
            ? req.body.source.trim()
            : undefined;

      const result = await processLeadsUpload(
        req.user!.id,
        req.file.buffer,
        categoryId,
        sourceLabel
      );

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
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Upload failed";
      const status = message.includes("Missing required columns") ? 400 : 500;
      res.status(status).json({ error: message });
    }
  }
);

/** Create a single lead from a form (JSON body) */
leadsRouter.post("/", async (req: Request, res: Response) => {
  try {
    const result = await createLeadFromForm(req.user!.id, req.body);
    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Failed to create lead";
    const status =
      message.includes("required") || message.includes("Invalid email")
        ? 400
        : message.includes("already exists")
          ? 409
          : message.includes("Category not found")
            ? 400
            : 500;
    res.status(status).json({ error: message });
  }
});

leadsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const tier = req.query.tier as string | undefined;
    const sort = req.query.sort as string | undefined;

    if (tier && !["hot", "warm", "cold"].includes(tier)) {
      res.status(400).json({ error: "tier must be hot, warm, or cold" });
      return;
    }
    if (sort && sort !== "score" && sort !== "created_at") {
      res.status(400).json({ error: "sort must be score or created_at" });
      return;
    }

    const leads = await listLeads(req.user!.id, {
      tier: tier as LeadTier | undefined,
      sort: (sort as "score" | "created_at") ?? "score",
    });

    res.json({ leads });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list leads" });
  }
});

leadsRouter.get("/:id/emails", async (req: Request, res: Response) => {
  try {
    const emails = await listLeadEmailHistory(
      req.user!.id,
      leadIdParam(req)
    );
    res.json({ leadId: leadIdParam(req), emails });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Failed to load email history";
    const status = message.includes("not found") ? 404 : 500;
    res.status(status).json({ error: message });
  }
});

leadsRouter.get("/:id/score", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const lead = await getLeadById(userId, leadIdParam(req));
    if (!lead) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }
    res.json({ leadId: lead.id, scoreBreakdown: buildScoreBreakdownForLead(lead) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch score breakdown" });
  }
});

leadsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const lead = await getLeadById(userId, leadIdParam(req));
    if (!lead) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }
    const snapshot = await getSnapshotByLeadId(userId, lead.id);
    res.json(formatLeadDetailResponse(lead, snapshot));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch lead" });
  }
});

leadsRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const body = req.body ?? {};
    const lead = await updateLead(userId, leadIdParam(req), {
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

    const snapshot = await getSnapshotByLeadId(userId, lead.id);
    res.json(formatLeadDetailResponse(lead, snapshot));
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Failed to update lead";
    const status = message.includes("Email already") ? 409 : 500;
    res.status(status).json({ error: message });
  }
});

leadsRouter.patch("/:id/snapshot", async (req: Request, res: Response) => {
  try {
    const { lead, snapshot } = await refreshLeadSnapshot(leadIdParam(req), {
      userId: req.user!.id,
      eventMetadata: req.body?.metadata,
    });
    res.json(formatLeadDetailResponse(lead, snapshot));
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Snapshot refresh failed";
    const status = message.includes("not found") ? 404 : 500;
    res.status(status).json({ error: message });
  }
});

leadsRouter.post("/:id/email/send", async (req: Request, res: Response) => {
  try {
    const result = await sendSuggestedEmailFromSnapshot(
      req.user!.id,
      leadIdParam(req)
    );
    res.status(200).json({
      status: "sent",
      ...result,
    });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Email send failed";
    let status = 500;
    if (message.includes("not found")) status = 404;
    if (message.includes("No suggested") || message.includes("required")) status = 400;
    if (message.includes("Missing required environment")) status = 503;
    if (message.includes("RESEND") || message.includes("Resend") || message.includes("SMTP")) status = 502;
    res.status(status).json({ error: message });
  }
});
