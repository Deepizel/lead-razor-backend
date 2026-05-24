import { Router, Request, Response } from "express";
import { getLeadTierDefinitions } from "../constants/leadTiers";
import {
  exportLeadsReportXlsx,
  parseReportExportQuery,
  REPORT_LIMIT_OPTIONS,
} from "../services/reportExportService";

export const reportsRouter = Router();

/** Tier benchmark + filter options for Report modal dropdowns */
reportsRouter.get("/tiers", (_req: Request, res: Response) => {
  res.json({
    ...getLeadTierDefinitions(),
    reportLimits: [...REPORT_LIMIT_OPTIONS, "all"],
  });
});

reportsRouter.get("/export", async (req: Request, res: Response) => {
  try {
    const filters = parseReportExportQuery(
      req.query as Record<string, unknown>
    );
    const { buffer } = await exportLeadsReportXlsx(req.user!.id, filters);
    const date = new Date().toISOString().slice(0, 10);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="leads_report_${date}.xlsx"`
    );
    res.send(buffer);
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Report export failed";
    const status =
      message.includes("must be") ||
      message.includes("not found") ||
      message.includes("dateFrom")
        ? 400
        : 500;
    res.status(status).json({ error: message });
  }
});
