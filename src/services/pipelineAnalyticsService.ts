import { prisma } from "../db/prisma";
import { listTierChangeEvents } from "../repositories/eventRepository";
import { listLeadUploads } from "../repositories/uploadRepository";
import type {
  CategoryPipelineRow,
  EngagementRates,
  PipelineAnalyticsResponse,
  TierCounts,
  TierMovementBucket,
  TierTransitionKey,
  UploadHistoryRow,
} from "../types/analytics";
import type { LeadTier } from "../types/lead";

const TIERS: LeadTier[] = ["hot", "warm", "cold"];

function emptyTierCounts(): TierCounts {
  return { hot: 0, warm: 0, cold: 0 };
}

function tierCountsFromRows(
  rows: Array<{ tier: string; _count: number }>
): TierCounts {
  const counts = emptyTierCounts();
  for (const row of rows) {
    const tier = row.tier as LeadTier;
    if (TIERS.includes(tier)) counts[tier] = row._count;
  }
  return counts;
}

function transitionKey(from: string, to: string): TierTransitionKey | null {
  const key = `${from}_to_${to}` as TierTransitionKey;
  const valid: TierTransitionKey[] = [
    "cold_to_warm",
    "warm_to_hot",
    "cold_to_hot",
    "hot_to_warm",
    "warm_to_cold",
    "hot_to_cold",
  ];
  return valid.includes(key) ? key : null;
}

/** Monday 00:00 UTC for the week containing `date` */
function weekStartUtc(date: Date): Date {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

function buildTierMovement(
  events: Array<{ fromTier: string | null; toTier: string | null; createdAt: Date }>
): TierMovementBucket[] {
  const buckets = new Map<string, TierMovementBucket>();

  for (const ev of events) {
    if (!ev.fromTier || !ev.toTier) continue;
    const key = transitionKey(ev.fromTier, ev.toTier);
    if (!key) continue;

    const start = weekStartUtc(ev.createdAt);
    const periodStart = start.toISOString().slice(0, 10);
    let bucket = buckets.get(periodStart);
    if (!bucket) {
      bucket = { periodStart, transitions: {}, netHotDelta: 0 };
      buckets.set(periodStart, bucket);
    }
    bucket.transitions[key] = (bucket.transitions[key] ?? 0) + 1;

    if (ev.toTier === "hot" && ev.fromTier !== "hot") bucket.netHotDelta += 1;
    if (ev.fromTier === "hot" && ev.toTier !== "hot") bucket.netHotDelta -= 1;
  }

  return [...buckets.values()].sort((a, b) =>
    a.periodStart.localeCompare(b.periodStart)
  );
}

function countHotInWeek(
  events: Array<{ toTier: string | null; createdAt: Date }>,
  weekStart: Date,
  weekEnd: Date
): number {
  return events.filter(
    (e) =>
      e.toTier === "hot" &&
      e.createdAt >= weekStart &&
      e.createdAt < weekEnd
  ).length;
}

export async function getPipelineAnalytics(
  userId: string,
  days = 30
): Promise<PipelineAnalyticsResponse> {
  const safeDays = Math.min(365, Math.max(7, Math.floor(days)));
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - safeDays);

  const [tierGroups, leads, categories, uploads, tierEvents, tierToHotEvents] =
    await Promise.all([
      prisma.lead.groupBy({
        by: ["tier"],
        where: { userId },
        _count: { _all: true },
      }),
      prisma.lead.findMany({
        where: { userId },
        select: {
          tier: true,
          emailsSent: true,
          emailsOpened: true,
          linksClicked: true,
          repliesReceived: true,
          bookingClicks: true,
          categoryId: true,
        },
      }),
      prisma.category.findMany({
        where: { userId },
        select: { id: true, name: true },
      }),
      listLeadUploads(userId, 25),
      listTierChangeEvents(userId, from),
      prisma.leadEvent.findMany({
        where: {
          userId,
          eventType: "tier_change",
          toTier: "hot",
        },
        select: { toTier: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const tierDistribution = tierCountsFromRows(
    tierGroups.map((g) => ({ tier: g.tier, _count: g._count._all }))
  );

  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));
  const byCategoryMap = new Map<string | null, CategoryPipelineRow>();

  for (const lead of leads) {
    const catId = lead.categoryId;
    let row = byCategoryMap.get(catId);
    if (!row) {
      row = {
        categoryId: catId,
        categoryName: catId
          ? (categoryNames.get(catId) ?? "Unknown")
          : "Uncategorized",
        hot: 0,
        warm: 0,
        cold: 0,
        total: 0,
      };
      byCategoryMap.set(catId, row);
    }
    const tier = lead.tier as LeadTier;
    if (TIERS.includes(tier)) row[tier] += 1;
    row.total += 1;
  }

  const byCategory = [...byCategoryMap.values()].sort(
    (a, b) => b.hot - a.hot || b.total - a.total
  );

  const totalLeads = leads.length;
  const leadsEmailed = leads.filter((l) => l.emailsSent > 0).length;
  const engagement: EngagementRates = {
    totalLeads,
    leadsEmailed,
    openRate:
      leadsEmailed > 0
        ? leads.filter((l) => l.emailsSent > 0 && l.emailsOpened > 0).length /
          leadsEmailed
        : 0,
    replyRate:
      leadsEmailed > 0
        ? leads.filter((l) => l.emailsSent > 0 && l.repliesReceived > 0)
            .length / leadsEmailed
        : 0,
    clickRate:
      leadsEmailed > 0
        ? leads.filter((l) => l.emailsSent > 0 && l.linksClicked > 0).length /
          leadsEmailed
        : 0,
    bookingRate:
      leadsEmailed > 0
        ? leads.filter((l) => l.emailsSent > 0 && l.bookingClicks > 0).length /
          leadsEmailed
        : 0,
  };

  const uploadRows: UploadHistoryRow[] = await Promise.all(
    uploads.map(async (u) => {
      const [sourceRows, tierRows] = await Promise.all([
        prisma.lead.findMany({
          where: { userId, uploadId: u.id },
          select: { source: true },
          distinct: ["source"],
        }),
        prisma.lead.groupBy({
          by: ["tier"],
          where: { userId, uploadId: u.id },
          _count: { _all: true },
        }),
      ]);

      return {
        id: u.id,
        externalUploadId: u.externalUploadId,
        createdAt: u.createdAt.toISOString(),
        rowCount: u.rowCount,
        createdCount: u.createdCount,
        updatedCount: u.updatedCount,
        errorCount: u.errorCount,
        sourceLabel: u.sourceLabel,
        leadSources: sourceRows
          .map((r) => r.source)
          .filter((s): s is string => Boolean(s)),
        tierCounts: tierCountsFromRows(
          tierRows.map((t) => ({ tier: t.tier, _count: t._count._all }))
        ),
      };
    })
  );

  const currentWeekStart = weekStartUtc(to);
  const previousWeekStart = new Date(currentWeekStart);
  previousWeekStart.setUTCDate(previousWeekStart.getUTCDate() - 7);
  const nextWeekStart = new Date(currentWeekStart);
  nextWeekStart.setUTCDate(nextWeekStart.getUTCDate() + 7);

  const hotLeadsWeekOverWeek = {
    currentWeek: countHotInWeek(tierToHotEvents, currentWeekStart, nextWeekStart),
    previousWeek: countHotInWeek(
      tierToHotEvents,
      previousWeekStart,
      currentWeekStart
    ),
  };

  return {
    period: {
      days: safeDays,
      from: from.toISOString(),
      to: to.toISOString(),
    },
    tierDistribution,
    tierMovement: buildTierMovement(tierEvents),
    engagement,
    byCategory,
    uploads: uploadRows,
    hotLeadsWeekOverWeek,
  };
}
