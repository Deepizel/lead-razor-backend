import type { LeadTier } from "../types/lead";

/** Allowed tier values stored on `leads.tier` and used in filters. */
export const LEAD_TIERS: readonly LeadTier[] = ["hot", "warm", "cold"];

/**
 * Score → tier mapping (deterministic benchmark).
 * Defined in one place; used by scoringService and exposed to the frontend.
 */
export const TIER_SCORE_THRESHOLDS = {
  hot: { minScore: 70, maxScore: 100, label: "Hot" },
  warm: { minScore: 40, maxScore: 69, label: "Warm" },
  cold: { minScore: 0, maxScore: 39, label: "Cold" },
} as const satisfies Record<
  LeadTier,
  { minScore: number; maxScore: number; label: string }
>;

export function tierFromScore(score: number): LeadTier {
  if (score >= TIER_SCORE_THRESHOLDS.hot.minScore) return "hot";
  if (score >= TIER_SCORE_THRESHOLDS.warm.minScore) return "warm";
  return "cold";
}

export function isLeadTier(value: string): value is LeadTier {
  return (LEAD_TIERS as readonly string[]).includes(value);
}

/** API payload for tier dropdowns (Report modal, leads filters). */
export function getLeadTierDefinitions() {
  return {
    tiers: LEAD_TIERS.map((id) => ({
      id,
      label: TIER_SCORE_THRESHOLDS[id].label,
      minScore: TIER_SCORE_THRESHOLDS[id].minScore,
      maxScore: TIER_SCORE_THRESHOLDS[id].maxScore,
    })),
    allOption: { id: null as null, label: "All tiers" },
  };
}

export function parseOptionalTierFilter(
  raw: unknown
): LeadTier | null | undefined {
  if (
    raw === undefined ||
    raw === null ||
    raw === "" ||
    raw === "null" ||
    raw === "all"
  ) {
    return null;
  }
  if (typeof raw !== "string") {
    throw new Error("tier must be hot, warm, cold, or all");
  }
  const tier = raw.trim().toLowerCase();
  if (!isLeadTier(tier)) {
    throw new Error("tier must be hot, warm, or cold");
  }
  return tier;
}
