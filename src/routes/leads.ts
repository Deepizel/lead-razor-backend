import { Router, Request, Response } from "express";
import { getLeadById } from "../repositories/leadRepository";
import { getSnapshotByLeadId } from "../repositories/snapshotRepository";
import {
  refreshLeadSnapshot,
  formatSnapshotResponse,
} from "../services/snapshotService";
import { sendSuggestedEmailFromSnapshot } from "../services/leadEmailService";

export const leadsRouter = Router();

function leadIdParam(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

leadsRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const lead = await getLeadById(leadIdParam(req));
    if (!lead) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }
    const snapshot = await getSnapshotByLeadId(lead.id);
    res.json(
      snapshot ? formatSnapshotResponse(lead, snapshot) : { lead, snapshot: null }
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch lead" });
  }
});

/** Force LLM profiling; saves summary + suggested email on snapshot. */
leadsRouter.patch("/:id/snapshot", async (req: Request, res: Response) => {
  try {
    const { lead, snapshot } = await refreshLeadSnapshot(leadIdParam(req), {
      eventMetadata: req.body?.metadata,
    });
    res.json(formatSnapshotResponse(lead, snapshot));
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Snapshot refresh failed";
    const status = message.includes("not found") ? 404 : 500;
    res.status(status).json({ error: message });
  }
});

/** Send the snapshot's suggested email to the lead via Resend. */
leadsRouter.post("/:id/email/send", async (req: Request, res: Response) => {
  try {
    const result = await sendSuggestedEmailFromSnapshot(leadIdParam(req));
    res.status(200).json({
      status: "sent",
      ...result,
    });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Email send failed";
    let status = 500;
    if (message.includes("not found")) status = 404;
    if (message.includes("No suggested email")) status = 400;
    if (message.includes("RESEND") || message.includes("Resend")) status = 502;
    res.status(status).json({ error: message });
  }
});
