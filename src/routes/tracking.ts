import { Router, Request, Response } from "express";
import {
  ingestEmailOpened,
  ingestLinkClicked,
} from "../services/eventIngestionService";
import { TRACKING_PIXEL_GIF } from "../services/email/trackingService";

export const trackingRouter = Router();

trackingRouter.get("/open/:id.png", async (req: Request, res: Response) => {
  const id = String(req.params.id ?? "").replace(/\.png$/i, "");
  if (id) {
    try {
      await ingestEmailOpened(id);
    } catch (err) {
      console.error("Open tracking error:", err);
    }
  }

  res.setHeader("Content-Type", "image/gif");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.status(200).send(TRACKING_PIXEL_GIF);
});

trackingRouter.get(
  "/click/:sentEmailId/:linkIndex",
  async (req: Request, res: Response) => {
    const sentEmailId = String(req.params.sentEmailId ?? "");
    const linkIndex = Number.parseInt(String(req.params.linkIndex ?? ""), 10);

    if (!sentEmailId || Number.isNaN(linkIndex)) {
      res.status(400).send("Invalid tracking link");
      return;
    }

    try {
      const destination = await ingestLinkClicked(sentEmailId, linkIndex);
      if (destination) {
        res.redirect(302, destination);
        return;
      }
    } catch (err) {
      console.error("Click tracking error:", err);
    }

    res.status(404).send("Link not found");
  }
);
