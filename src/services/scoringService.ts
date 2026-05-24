import type { Lead, LeadTier, ScoreBreakdown, ScoreBreakdownItem } from "../types/lead";
import { tierFromScore } from "../constants/leadTiers";

const EXEC_TITLES = ["ceo", "cto", "coo", "vp", "vice president", "director"];
const MANAGER_TITLES = ["manager", "lead", "head of"];

export type { ScoreBreakdown, ScoreBreakdownItem };

export type ScoreInput = Pick<
  Lead,
  | "job_title"
  | "company"
  | "initial_message"
  | "source"
  | "emails_opened"
  | "links_clicked"
  | "replies_received"
  | "booking_clicks"
>;

/** Deterministic score + human-readable checklist (no LLM). */
export function calculateScoreWithBreakdown(lead: ScoreInput): ScoreBreakdown {
  const title = (lead.job_title ?? "").toLowerCase();
  const execMet = EXEC_TITLES.some((t) => title.includes(t));
  const managerMet =
    !execMet && MANAGER_TITLES.some((t) => title.includes(t));

  const breakdown: ScoreBreakdownItem[] = [
    {
      signal: "Job title — executive level (VP, director, C-suite)",
      points: 20,
      met: execMet,
    },
    {
      signal: "Job title — manager level",
      points: 10,
      met: managerMet,
    },
    {
      signal: "Has company name",
      points: 5,
      met: Boolean(lead.company?.trim()),
    },
    {
      signal: "Has initial message",
      points: 10,
      met: Boolean(lead.initial_message?.trim()),
    },
    {
      signal: "Source is referral",
      points: 5,
      met: lead.source === "referral",
    },
    {
      signal: "Opened at least one email",
      points: 10,
      met: lead.emails_opened >= 1,
    },
    {
      signal: "Opened 3+ emails",
      points: 5,
      met: lead.emails_opened >= 3,
    },
    {
      signal: "Clicked a link",
      points: 10,
      met: lead.links_clicked >= 1,
    },
    {
      signal: "Replied to email",
      points: 20,
      met: lead.replies_received >= 1,
    },
    {
      signal: "Clicked booking link",
      points: 15,
      met: lead.booking_clicks >= 1,
    },
  ];

  const rawTotal = breakdown.reduce(
    (sum, item) => sum + (item.met ? item.points : 0),
    0
  );
  const total = Math.min(rawTotal, 100);

  return {
    total,
    tier: tierFromScore(total),
    breakdown,
  };
}

export function calculateScore(lead: ScoreInput): { score: number; tier: LeadTier } {
  const { total, tier } = calculateScoreWithBreakdown(lead);
  return { score: total, tier };
}
