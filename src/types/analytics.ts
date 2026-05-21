import type { LeadTier } from "./lead";

export type TierCounts = Record<LeadTier, number>;

export type TierTransitionKey =
  | "cold_to_warm"
  | "warm_to_hot"
  | "cold_to_hot"
  | "hot_to_warm"
  | "warm_to_cold"
  | "hot_to_cold";

export interface PipelineAnalyticsPeriod {
  days: number;
  from: string;
  to: string;
}

export interface TierMovementBucket {
  /** ISO date (UTC) for week start (Monday) */
  periodStart: string;
  transitions: Partial<Record<TierTransitionKey, number>>;
  netHotDelta: number;
}

export interface EngagementRates {
  totalLeads: number;
  leadsEmailed: number;
  openRate: number;
  replyRate: number;
  clickRate: number;
  bookingRate: number;
}

export interface CategoryPipelineRow {
  categoryId: string | null;
  categoryName: string;
  hot: number;
  warm: number;
  cold: number;
  total: number;
}

export interface UploadHistoryRow {
  id: string;
  externalUploadId: string;
  createdAt: string;
  rowCount: number;
  createdCount: number;
  updatedCount: number;
  errorCount: number;
  sourceLabel: string | null;
  /** Distinct lead.source values in this batch */
  leadSources: string[];
  tierCounts: TierCounts;
}

export interface PipelineAnalyticsResponse {
  period: PipelineAnalyticsPeriod;
  tierDistribution: TierCounts;
  tierMovement: TierMovementBucket[];
  engagement: EngagementRates;
  byCategory: CategoryPipelineRow[];
  uploads: UploadHistoryRow[];
  /** Hot leads in the latest week vs previous week (for headline KPI) */
  hotLeadsWeekOverWeek: {
    currentWeek: number;
    previousWeek: number;
  };
}
