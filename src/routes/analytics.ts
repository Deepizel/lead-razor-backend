import { Router, Request, Response } from "express";
import { getPipelineAnalytics } from "../services/pipelineAnalyticsService";

export const analyticsRouter = Router();

/**
 * Pipeline Analytics dashboard payload (read-only aggregations).
 * Query: ?days=7|30|90 (default 30, clamped 7–365)
 */
analyticsRouter.get("/pipeline", async (req: Request, res: Response) => {
  try {
    const rawDays = req.query.days;
    const days =
      typeof rawDays === "string" && rawDays.trim()
        ? Number.parseInt(rawDays, 10)
        : 30;

    if (Number.isNaN(days)) {
      res.status(400).json({ error: "days must be a number" });
      return;
    }

    const data = await getPipelineAnalytics(req.user!.id, days);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load pipeline analytics" });
  }
});
