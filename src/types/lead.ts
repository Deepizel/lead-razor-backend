export type LeadTier = "hot" | "warm" | "cold";
export type LeadIntent = "high" | "medium" | "low";

export interface Lead {
  id: string;
  category_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  company: string | null;
  job_title: string | null;
  phone: string | null;
  source: string | null;
  initial_message: string | null;
  business_detail: string | null;
  score: number;
  tier: LeadTier;
  emails_sent: number;
  emails_opened: number;
  links_clicked: number;
  replies_received: number;
  booking_clicks: number;
  last_event_at: Date | null;
  last_event_type: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface LeadSnapshot {
  id: string;
  lead_id: string;
  current_score: number;
  summary: string;
  current_intent: LeadIntent;
  last_meaningful_event: string | null;
  suggested_email_subject: string | null;
  suggested_email_body: string | null;
  suggested_email_sent_at: Date | null;
  llm_model: string | null;
  token_cost: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface Category {
  id: string;
  name: string;
  offering: string;
  statement: string;
  created_at: Date;
  updated_at: Date;
}

export interface SuggestedEmail {
  subject: string;
  body: string;
}

export interface ProfilingResult {
  summary: string;
  currentIntent: LeadIntent;
  lastMeaningfulEvent: string;
  suggestedEmail: SuggestedEmail;
}
