import type { Lead, LeadTier } from "../types/lead";

const EXEC_TITLES = ["ceo", "cto", "coo", "vp", "vice president", "director"];
const MANAGER_TITLES = ["manager", "lead", "head of"];

export function calculateScore(lead: Pick<
  Lead,
  | "job_title"
  | "company"
  | "initial_message"
  | "source"
  | "emails_opened"
  | "links_clicked"
  | "replies_received"
  | "booking_clicks"
>): { score: number; tier: LeadTier } {
  let score = 0;
  const title = (lead.job_title ?? "").toLowerCase();

  if (EXEC_TITLES.some((t) => title.includes(t))) {
    score += 20;
  } else if (MANAGER_TITLES.some((t) => title.includes(t))) {
    score += 10;
  }

  if (lead.company) score += 5;
  if (lead.initial_message) score += 10;
  if (lead.source === "referral") score += 5;

  if (lead.emails_opened >= 1) score += 10;
  if (lead.emails_opened >= 3) score += 5;
  if (lead.links_clicked >= 1) score += 10;
  if (lead.replies_received >= 1) score += 20;
  if (lead.booking_clicks >= 1) score += 15;

  score = Math.min(score, 100);

  const tier: LeadTier =
    score >= 70 ? "hot" : score >= 40 ? "warm" : "cold";

  return { score, tier };
}
