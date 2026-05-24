import { prisma } from "../db/prisma";
import { parseOptionalTierFilter } from "../constants/leadTiers";
import type { LeadTier } from "../types/lead";
import {
  buildReportExportBuffer,
  type ReportLeadRecord,
} from "../ingestion/reportExcelExport";

export const REPORT_LIMIT_OPTIONS = [10, 20, 50, 100] as const;
export type ReportLimit = (typeof REPORT_LIMIT_OPTIONS)[number] | "all";

export interface ReportExportFilters {
  categoryId?: string | null;
  tier?: LeadTier | null;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  limit?: ReportLimit;
}

function parseDateOnly(value: string, endOfDay: boolean): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    throw new Error("Dates must be YYYY-MM-DD");
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  if (endOfDay) {
    return new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
  }
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

export function parseReportExportQuery(query: Record<string, unknown>): ReportExportFilters {
  const categoryIdRaw = query.categoryId;
  let categoryId: string | null | undefined;
  if (
    categoryIdRaw === undefined ||
    categoryIdRaw === null ||
    categoryIdRaw === "" ||
    categoryIdRaw === "null"
  ) {
    categoryId = null;
  } else if (typeof categoryIdRaw === "string" && categoryIdRaw.trim()) {
    categoryId = categoryIdRaw.trim();
  } else {
    throw new Error("categoryId must be a UUID or null");
  }

  const dateFrom =
    typeof query.dateFrom === "string" && query.dateFrom.trim()
      ? parseDateOnly(query.dateFrom, false)
      : null;
  const dateTo =
    typeof query.dateTo === "string" && query.dateTo.trim()
      ? parseDateOnly(query.dateTo, true)
      : null;

  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new Error("dateFrom must be on or before dateTo");
  }

  let limit: ReportLimit = "all";
  if (typeof query.limit === "string" && query.limit.trim()) {
    const raw = query.limit.trim().toLowerCase();
    if (raw === "all") {
      limit = "all";
    } else {
      const n = Number.parseInt(raw, 10);
      if (!REPORT_LIMIT_OPTIONS.includes(n as (typeof REPORT_LIMIT_OPTIONS)[number])) {
        throw new Error("limit must be 10, 20, 50, 100, or all");
      }
      limit = n as ReportLimit;
    }
  }

  const tier = parseOptionalTierFilter(query.tier);

  return { categoryId, tier, dateFrom, dateTo, limit };
}

export async function fetchReportLeadRecords(
  userId: string,
  filters: ReportExportFilters
): Promise<ReportLeadRecord[]> {
  if (filters.categoryId) {
    const cat = await prisma.category.findFirst({
      where: { id: filters.categoryId, userId },
    });
    if (!cat) throw new Error("Category not found");
  }

  const createdAtFilter =
    filters.dateFrom || filters.dateTo
      ? {
          ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
          ...(filters.dateTo ? { lte: filters.dateTo } : {}),
        }
      : undefined;

  const leads = await prisma.lead.findMany({
    where: {
      userId,
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.tier ? { tier: filters.tier } : {}),
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
    },
    orderBy: { score: "desc" },
    ...(filters.limit !== "all" ? { take: filters.limit } : {}),
    include: {
      category: { select: { name: true } },
      snapshot: { select: { summary: true, currentIntent: true } },
    },
  });

  return leads.map((lead) => ({
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    company: lead.company,
    jobTitle: lead.jobTitle,
    linkedinUrl: lead.linkedinUrl,
    source: lead.source,
    score: lead.score,
    tier: lead.tier,
    emailsSent: lead.emailsSent,
    emailsOpened: lead.emailsOpened,
    repliesReceived: lead.repliesReceived,
    bookingClicks: lead.bookingClicks,
    lastEventType: lead.lastEventType,
    lastEventAt: lead.lastEventAt,
    categoryName: lead.category?.name ?? null,
    snapshotSummary: lead.snapshot?.summary ?? null,
    snapshotIntent: lead.snapshot?.currentIntent ?? null,
  }));
}

export async function exportLeadsReportXlsx(
  userId: string,
  filters: ReportExportFilters
): Promise<{ buffer: Buffer; rowCount: number }> {
  const records = await fetchReportLeadRecords(userId, filters);
  return {
    buffer: buildReportExportBuffer(records),
    rowCount: records.length,
  };
}
