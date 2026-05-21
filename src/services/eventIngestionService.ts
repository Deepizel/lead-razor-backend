import { prisma } from "../db/prisma";
import { recordLeadEvent } from "../repositories/eventRepository";
import {
  findSentEmailById,
  recordSentEmailClick,
  recordSentEmailOpen,
  recordSentEmailReply,
} from "../repositories/sentEmailRepository";
import { calculateScore } from "./scoringService";
import { toLeadDto } from "../lib/prismaMappers";
import { recordTierChange } from "./leadEventService";

async function rescoreLead(userId: string, leadId: string): Promise<void> {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, userId } });
  if (!lead) return;

  const dto = toLeadDto(lead);
  const previousTier = dto.tier;
  const { score, tier } = calculateScore(dto);

  await prisma.lead.update({
    where: { id: leadId },
    data: { score, tier },
  });
  await recordTierChange(userId, leadId, previousTier, tier);
}

export async function ingestEmailSent(
  userId: string,
  leadId: string,
  sentEmailId: string
): Promise<void> {
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      emailsSent: { increment: 1 },
      lastEventType: "email_sent",
      lastEventAt: new Date(),
    },
  });

  await recordLeadEvent({
    userId,
    leadId,
    eventType: "email_sent",
    metadata: { sentEmailId },
  });
}

export async function ingestEmailOpened(sentEmailId: string): Promise<boolean> {
  const sent = await findSentEmailById(sentEmailId);
  if (!sent || sent.status !== "sent") return false;

  const wasFirstOpen = !sent.firstOpenedAt;
  await recordSentEmailOpen(sentEmailId);

  if (!wasFirstOpen) return true;

  await prisma.lead.update({
    where: { id: sent.leadId },
    data: {
      emailsOpened: { increment: 1 },
      lastEventType: "email_opened",
      lastEventAt: new Date(),
    },
  });

  await recordLeadEvent({
    userId: sent.userId,
    leadId: sent.leadId,
    eventType: "email_opened",
    metadata: { sentEmailId },
  });

  await rescoreLead(sent.userId, sent.leadId);
  return true;
}

export async function ingestLinkClicked(
  sentEmailId: string,
  linkIndex: number
): Promise<string | null> {
  const sent = await findSentEmailById(sentEmailId);
  if (!sent || sent.status !== "sent") return null;

  const wasFirstClick = !sent.firstClickedAt;
  const updated = await recordSentEmailClick(sentEmailId, linkIndex);
  if (!updated) return null;

  const links = Array.isArray(updated.linksJson)
    ? (updated.linksJson as { index: number; url: string }[])
    : [];
  const destination = links[linkIndex]?.url ?? null;

  if (wasFirstClick) {
    await prisma.lead.update({
      where: { id: sent.leadId },
      data: {
        linksClicked: { increment: 1 },
        lastEventType: "link_clicked",
        lastEventAt: new Date(),
      },
    });
  }

  await recordLeadEvent({
    userId: sent.userId,
    leadId: sent.leadId,
    eventType: "link_clicked",
    metadata: { sentEmailId, linkIndex, url: destination },
  });

  await rescoreLead(sent.userId, sent.leadId);
  return destination;
}

export async function ingestEmailReply(
  sentEmailId: string,
  replySnippet?: string
): Promise<boolean> {
  const sent = await findSentEmailById(sentEmailId);
  if (!sent || sent.repliedAt) return false;

  await recordSentEmailReply(sentEmailId, replySnippet);

  await prisma.lead.update({
    where: { id: sent.leadId },
    data: {
      repliesReceived: { increment: 1 },
      lastEventType: "reply_received",
      lastEventAt: new Date(),
    },
  });

  await recordLeadEvent({
    userId: sent.userId,
    leadId: sent.leadId,
    eventType: "reply_received",
    metadata: { sentEmailId, replySnippet: replySnippet ?? null },
  });

  await rescoreLead(sent.userId, sent.leadId);
  return true;
}
