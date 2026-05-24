import { assertOutreachEmailConfigured, env } from "../../config/env";
import { getLeadById } from "../../repositories/leadRepository";
import {
  createSentEmail,
  findSentEmailForUser,
  listSentEmailsForLead,
  listSentEmailsForUser,
  markSentEmailDelivered,
  markSentEmailFailed,
  parseLinksJson,
  toLinksJson,
} from "../../repositories/sentEmailRepository";
import {
  getSnapshotByLeadId,
  markSuggestedEmailSent,
  snapshotHasSuggestedEmail,
} from "../../repositories/snapshotRepository";
import { prisma } from "../../db/prisma";
import { ingestEmailSent } from "../eventIngestionService";
import { getOutreachEmailProvider } from "./emailProvider";
import { buildTrackedEmailBodies } from "./trackingService";
import type {
  LeadEmailHistoryItem,
  SentEmailDetail,
  SentEmailListItem,
} from "../../types/email";
import type { EmailTimelineEvent } from "../../types/email";

const SENT_EMAIL_HEADER = "X-Razor-Sent-Email-Id";

export interface SendOutreachOptions {
  userId: string;
  leadId: string;
  subject?: string;
  body?: string;
  useSnapshot?: boolean;
}

export interface SendOutreachBatchResult {
  sent: Array<{ leadId: string; sentEmailId: string }>;
  failed: Array<{ leadId: string; error: string }>;
}

export async function draftEmailFromSnapshot(
  userId: string,
  leadId: string
): Promise<{ subject: string; body: string }> {
  const snapshot = await getSnapshotByLeadId(userId, leadId);
  if (!snapshot || !snapshotHasSuggestedEmail(snapshot)) {
    throw new Error(
      "No suggested email on snapshot. Refresh via PATCH /api/leads/:id/snapshot first."
    );
  }
  return {
    subject: snapshot.suggested_email_subject,
    body: snapshot.suggested_email_body,
  };
}

export async function sendOutreachToLead(
  options: SendOutreachOptions
): Promise<{ sentEmailId: string; leadId: string; to: string; subject: string }> {
  assertOutreachEmailConfigured();

  const lead = await getLeadById(options.userId, options.leadId);
  if (!lead) throw new Error(`Lead not found: ${options.leadId}`);

  let subject = options.subject?.trim() ?? "";
  let body = options.body?.trim() ?? "";

  if (options.useSnapshot || (!subject && !body)) {
    const draft = await draftEmailFromSnapshot(options.userId, options.leadId);
    subject = subject || draft.subject;
    body = body || draft.body;
  }

  if (!subject || !body) {
    throw new Error("subject and body are required (or use useSnapshot: true)");
  }

  const provider = getOutreachEmailProvider();
  const pending = await createSentEmail({
    userId: options.userId,
    leadId: options.leadId,
    provider: provider.name,
    subject,
    bodyHtml: "",
    bodyText: body,
  });

  const { html, text, links } = buildTrackedEmailBodies(
    pending.id,
    subject,
    body
  );

  await prisma.sentEmail.update({
    where: { id: pending.id },
    data: { bodyHtml: html, bodyText: text, linksJson: toLinksJson(links) },
  });

  try {
    const { messageId } = await provider.send({
      to: lead.email,
      subject,
      html,
      text,
      headers: { [SENT_EMAIL_HEADER]: pending.id },
    });

    await markSentEmailDelivered(pending.id, messageId);
    await ingestEmailSent(options.userId, options.leadId, pending.id);

    if (options.useSnapshot) {
      await markSuggestedEmailSent(options.userId, options.leadId).catch(() => {});
    }

    return {
      sentEmailId: pending.id,
      leadId: options.leadId,
      to: lead.email,
      subject,
    };
  } catch (err) {
    await markSentEmailFailed(pending.id);
    throw err;
  }
}

export async function sendOutreachToLeads(
  userId: string,
  leadIds: string[],
  subject: string,
  body: string
): Promise<SendOutreachBatchResult> {
  const sent: SendOutreachBatchResult["sent"] = [];
  const failed: SendOutreachBatchResult["failed"] = [];

  for (const leadId of leadIds) {
    try {
      const result = await sendOutreachToLead({
        userId,
        leadId,
        subject,
        body,
      });
      sent.push({ leadId, sentEmailId: result.sentEmailId });
    } catch (err) {
      failed.push({
        leadId,
        error: err instanceof Error ? err.message : "Send failed",
      });
    }
  }

  return { sent, failed };
}

async function buildTimelineForSentEmail(
  userId: string,
  leadId: string,
  sentEmailId: string
): Promise<EmailTimelineEvent[]> {
  const events = await prisma.leadEvent.findMany({
    where: { userId, leadId },
    orderBy: { createdAt: "asc" },
  });

  return events
    .filter((e) => {
      const meta = e.metadata as { sentEmailId?: string } | null;
      return meta?.sentEmailId === sentEmailId;
    })
    .map((e) => ({
      type: e.eventType,
      at: e.createdAt.toISOString(),
      metadata: (e.metadata as Record<string, unknown> | null) ?? undefined,
    }));
}

function previewText(body: string, max = 120): string {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : `${flat.slice(0, max)}…`;
}

export async function getSentEmailDetail(
  userId: string,
  sentEmailId: string
): Promise<SentEmailDetail | null> {
  const row = await findSentEmailForUser(userId, sentEmailId);
  if (!row) return null;

  const timeline = await buildTimelineForSentEmail(
    userId,
    row.leadId,
    sentEmailId
  );
  const links = parseLinksJson(row.linksJson);

  return {
    id: row.id,
    lead: {
      id: row.lead.id,
      name: `${row.lead.firstName} ${row.lead.lastName}`.trim(),
      email: row.lead.email,
      company: row.lead.company,
    },
    subject: row.subject,
    bodyHtml: row.bodyHtml,
    bodyText: row.bodyText,
    sentAt: row.sentAt?.toISOString() ?? null,
    provider: row.provider,
    status: row.status as SentEmailDetail["status"],
    tracking: {
      opened: Boolean(row.firstOpenedAt),
      firstOpenedAt: row.firstOpenedAt?.toISOString() ?? null,
      openCount: row.openCount,
      clicked: Boolean(row.firstClickedAt),
      firstClickedAt: row.firstClickedAt?.toISOString() ?? null,
      clickCount: row.clickCount,
      replied: Boolean(row.repliedAt),
      repliedAt: row.repliedAt?.toISOString() ?? null,
      replySnippet: row.replySnippet,
    },
    timeline,
    links,
  };
}

export async function listOutreachEmails(
  userId: string,
  query: {
    limit?: number;
    offset?: number;
    tier?: string;
    opened?: boolean;
    replied?: boolean;
  }
): Promise<{ emails: SentEmailListItem[]; total: number }> {
  const { emails, total } = await listSentEmailsForUser(userId, query);

  return {
    total,
    emails: emails.map((row) => ({
      id: row.id,
      leadId: row.leadId,
      leadName: `${row.lead.firstName} ${row.lead.lastName}`.trim(),
      leadEmail: row.lead.email,
      subject: row.subject,
      sentAt: row.sentAt?.toISOString() ?? null,
      opened: Boolean(row.firstOpenedAt),
      firstOpenedAt: row.firstOpenedAt?.toISOString() ?? null,
      clicked: Boolean(row.firstClickedAt),
      firstClickedAt: row.firstClickedAt?.toISOString() ?? null,
      replied: Boolean(row.repliedAt),
      repliedAt: row.repliedAt?.toISOString() ?? null,
      status: row.status as SentEmailListItem["status"],
    })),
  };
}

export async function listLeadEmailHistory(
  userId: string,
  leadId: string
): Promise<LeadEmailHistoryItem[]> {
  const lead = await getLeadById(userId, leadId);
  if (!lead) throw new Error(`Lead not found: ${leadId}`);

  const rows = await listSentEmailsForLead(userId, leadId);
  const items: LeadEmailHistoryItem[] = [];

  for (const row of rows) {
    const events = await buildTimelineForSentEmail(userId, leadId, row.id);
    items.push({
      id: row.id,
      subject: row.subject,
      sentAt: row.sentAt?.toISOString() ?? null,
      opened: Boolean(row.firstOpenedAt),
      firstOpenedAt: row.firstOpenedAt?.toISOString() ?? null,
      openCount: row.openCount,
      clicked: Boolean(row.firstClickedAt),
      firstClickedAt: row.firstClickedAt?.toISOString() ?? null,
      replied: Boolean(row.repliedAt),
      repliedAt: row.repliedAt?.toISOString() ?? null,
      replySnippet: row.replySnippet,
      previewText: previewText(row.bodyText),
      status: row.status as LeadEmailHistoryItem["status"],
      events,
    });
  }

  return items;
}

export function resolveSentEmailIdFromHeaders(
  headers: Record<string, string | undefined>
): string | null {
  const direct =
    headers[SENT_EMAIL_HEADER] ??
    headers[SENT_EMAIL_HEADER.toLowerCase()] ??
    headers["x-razor-sent-email-id"];
  return direct?.trim() || null;
}
