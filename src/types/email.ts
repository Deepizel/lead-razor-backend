export type SentEmailStatus = "pending" | "sent" | "failed";

export interface TrackedLink {
  index: number;
  url: string;
  clickedAt?: string;
}

export interface EmailTimelineEvent {
  type: string;
  at: string;
  metadata?: Record<string, unknown>;
}

export interface SentEmailListItem {
  id: string;
  leadId: string;
  leadName: string;
  leadEmail: string;
  subject: string;
  sentAt: string | null;
  opened: boolean;
  firstOpenedAt: string | null;
  clicked: boolean;
  firstClickedAt: string | null;
  replied: boolean;
  repliedAt: string | null;
  status: SentEmailStatus;
}

export interface SentEmailDetail {
  id: string;
  lead: {
    id: string;
    name: string;
    email: string;
    company: string | null;
  };
  subject: string;
  bodyHtml: string;
  bodyText: string;
  sentAt: string | null;
  provider: string;
  status: SentEmailStatus;
  tracking: {
    opened: boolean;
    firstOpenedAt: string | null;
    openCount: number;
    clicked: boolean;
    firstClickedAt: string | null;
    clickCount: number;
    replied: boolean;
    repliedAt: string | null;
    replySnippet: string | null;
  };
  timeline: EmailTimelineEvent[];
  links: TrackedLink[];
}

export interface LeadEmailHistoryItem {
  id: string;
  subject: string;
  sentAt: string | null;
  opened: boolean;
  firstOpenedAt: string | null;
  openCount: number;
  clicked: boolean;
  firstClickedAt: string | null;
  replied: boolean;
  repliedAt: string | null;
  replySnippet: string | null;
  previewText: string;
  status: SentEmailStatus;
  events: EmailTimelineEvent[];
}
