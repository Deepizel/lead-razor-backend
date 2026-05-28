import { Router, Request, Response } from "express";
import { prisma } from "../db/prisma";
import {
  draftEmailFromSnapshot,
  getSentEmailDetail,
  listOutreachEmails,
  sendOutreachToLead,
  sendOutreachToLeads,
} from "../services/email/outreachEmailService";
import { isMissingEnvError } from "../config/env";
import { sendRateLimiter } from "../middleware/rateLimit";

export const emailsRouter = Router();

function emailError(res: Response, err: unknown, fallback: string): void {
  const message = err instanceof Error ? err.message : fallback;
  if (isMissingEnvError(err)) {
    res.status(503).json({
      error: message,
      hint: "Set EMAIL_CREDENTIALS_ENCRYPTION_KEY and configure a sending identity under Settings → Email identities.",
    });
    return;
  }
  if (message.includes("No sending identity")) {
    res.status(400).json({
      error: message,
      hint: "POST /api/settings/email-identities to add a sender, then set one as default.",
    });
    return;
  }
  const status = message.includes("not found")
    ? 404
    : message.includes("required") || message.includes("No suggested")
      ? 400
      : message.includes("failed") || message.includes("Resend") || message.includes("SMTP")
        ? 502
        : 500;
  res.status(status).json({ error: message });
}

/** AI/snapshot draft for compose tab */
emailsRouter.post("/draft", async (req: Request, res: Response) => {
  try {
    const { leadId } = req.body ?? {};
    if (typeof leadId !== "string" || !leadId.trim()) {
      res.status(400).json({ error: "leadId is required" });
      return;
    }
    const draft = await draftEmailFromSnapshot(req.user!.id, leadId.trim());
    res.json(draft);
  } catch (err) {
    emailError(res, err, "Draft failed");
  }
});

/** Preview recipient count for bulk send */
emailsRouter.post("/recipients/preview", async (req: Request, res: Response) => {
  try {
    const { tier, categoryId } = req.body ?? {};
    const where: Record<string, unknown> = { userId: req.user!.id };
    if (typeof tier === "string" && ["hot", "warm", "cold"].includes(tier)) {
      where.tier = tier;
    }
    if (typeof categoryId === "string" && categoryId.trim()) {
      where.categoryId = categoryId.trim();
    }

    const leads = await prisma.lead.findMany({
      where,
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    res.json({
      count: leads.length,
      leads: leads.map((l) => ({
        id: l.id,
        email: l.email,
        name: `${l.firstName} ${l.lastName}`.trim(),
      })),
    });
  } catch (err) {
    emailError(res, err, "Preview failed");
  }
});

/** Send to one or many leads */
emailsRouter.post("/send", sendRateLimiter, async (req: Request, res: Response) => {
  try {
    const body = req.body ?? {};
    const userId = req.user!.id;
    const useSnapshot = body.useSnapshot === true;

    if (typeof body.leadId === "string" && body.leadId.trim()) {
      const emailIdentityId =
        typeof body.emailIdentityId === "string"
          ? body.emailIdentityId.trim()
          : undefined;

      const result = await sendOutreachToLead({
        userId,
        leadId: body.leadId.trim(),
        subject: typeof body.subject === "string" ? body.subject : undefined,
        body: typeof body.body === "string" ? body.body : undefined,
        useSnapshot,
        emailIdentityId,
      });
      res.status(200).json({ status: "sent", ...result });
      return;
    }

    const leadIds = Array.isArray(body.leadIds)
      ? body.leadIds.filter((id: unknown) => typeof id === "string" && id.trim())
      : [];

    if (leadIds.length === 0) {
      res.status(400).json({ error: "leadId or leadIds is required" });
      return;
    }

    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const textBody = typeof body.body === "string" ? body.body.trim() : "";

    if (!subject || !textBody) {
      res.status(400).json({
        error: "subject and body are required for bulk send",
      });
      return;
    }

    const emailIdentityId =
      typeof body.emailIdentityId === "string"
        ? body.emailIdentityId.trim()
        : undefined;

    const result = await sendOutreachToLeads({
      userId,
      leadIds,
      subject,
      body: textBody,
      emailIdentityId,
    });
    res.status(200).json({ status: "completed", ...result });
  } catch (err) {
    emailError(res, err, "Send failed");
  }
});

/** Outbox table — all sent emails */
emailsRouter.get("/", async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit
      ? Number.parseInt(String(req.query.limit), 10)
      : 50;
    const offset = req.query.offset
      ? Number.parseInt(String(req.query.offset), 10)
      : 0;
    const tier =
      typeof req.query.tier === "string" ? req.query.tier : undefined;
    const opened =
      req.query.opened === "true"
        ? true
        : req.query.opened === "false"
          ? false
          : undefined;
    const replied =
      req.query.replied === "true"
        ? true
        : req.query.replied === "false"
          ? false
          : undefined;
    const emailIdentityId =
      typeof req.query.emailIdentityId === "string"
        ? req.query.emailIdentityId
        : undefined;

    const data = await listOutreachEmails(req.user!.id, {
      limit: Number.isNaN(limit) ? 50 : limit,
      offset: Number.isNaN(offset) ? 0 : offset,
      tier,
      opened,
      replied,
      emailIdentityId,
    });
    res.json(data);
  } catch (err) {
    emailError(res, err, "Failed to list emails");
  }
});

/** Single email detail + tracking timeline */
emailsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const detail = await getSentEmailDetail(req.user!.id, id);
    if (!detail) {
      res.status(404).json({ error: "Sent email not found" });
      return;
    }
    res.json(detail);
  } catch (err) {
    emailError(res, err, "Failed to fetch email");
  }
});
