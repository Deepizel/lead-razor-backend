import { prisma } from "../db/prisma";
import { toLeadDto } from "../lib/prismaMappers";
import type { ParsedLeadRow } from "../ingestion/excelParser";
import { calculateScore } from "../services/scoringService";
import type { Lead, LeadTier } from "../types/lead";

export interface ListLeadsOptions {
  tier?: LeadTier;
  sort?: "score" | "created_at";
}

export interface LeadListItem extends Lead {
  snapshot_summary: string | null;
  snapshot_intent: string | null;
}

export async function listLeads(
  userId: string,
  options: ListLeadsOptions = {}
): Promise<LeadListItem[]> {
  const { tier, sort = "score" } = options;

  const leads = await prisma.lead.findMany({
    where: { userId, ...(tier ? { tier } : {}) },
    orderBy:
      sort === "created_at" ? { createdAt: "desc" } : { score: "desc" },
    include: {
      snapshot: {
        select: { summary: true, currentIntent: true },
      },
    },
  });

  return leads.map((lead) => {
    const dto = toLeadDto(lead);
    return {
      ...dto,
      snapshot_summary: lead.snapshot?.summary ?? null,
      snapshot_intent: lead.snapshot?.currentIntent ?? null,
    };
  });
}

export async function getLeadById(
  userId: string,
  id: string
): Promise<Lead | null> {
  const lead = await prisma.lead.findFirst({
    where: { id, userId },
  });
  return lead ? toLeadDto(lead) : null;
}

export interface UpdateLeadInput {
  category_id?: string | null;
  first_name?: string;
  last_name?: string;
  email?: string;
  company?: string | null;
  job_title?: string | null;
  phone?: string | null;
  source?: string | null;
  initial_message?: string | null;
  business_detail?: string | null;
}

export async function updateLead(
  userId: string,
  id: string,
  input: UpdateLeadInput
): Promise<Lead | null> {
  const existing = await prisma.lead.findFirst({
    where: { id, userId },
  });
  if (!existing) return null;

  if (input.email && input.email.toLowerCase() !== existing.email) {
    const conflict = await prisma.lead.findUnique({
      where: {
        userId_email: { userId, email: input.email.toLowerCase() },
      },
    });
    if (conflict && conflict.id !== id) {
      throw new Error("Email already in use by another lead");
    }
  }

  if (input.category_id) {
    const cat = await prisma.category.findFirst({
      where: { id: input.category_id, userId },
    });
    if (!cat) throw new Error("Category not found");
  }

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      ...(input.category_id !== undefined && {
        categoryId: input.category_id,
      }),
      ...(input.first_name !== undefined && {
        firstName: input.first_name.trim(),
      }),
      ...(input.last_name !== undefined && {
        lastName: input.last_name.trim(),
      }),
      ...(input.email !== undefined && {
        email: input.email.toLowerCase().trim(),
      }),
      ...(input.company !== undefined && { company: input.company }),
      ...(input.job_title !== undefined && { jobTitle: input.job_title }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.source !== undefined && { source: input.source }),
      ...(input.initial_message !== undefined && {
        initialMessage: input.initial_message,
      }),
      ...(input.business_detail !== undefined && {
        businessDetail: input.business_detail,
      }),
    },
  });

  const dto = toLeadDto(lead);
  const { score, tier } = calculateScore(dto);

  const scored = await prisma.lead.update({
    where: { id },
    data: { score, tier },
  });

  return toLeadDto(scored);
}

export async function upsertLeadFromRow(
  userId: string,
  row: ParsedLeadRow,
  defaultCategoryId: string | null
): Promise<{ lead: Lead; isNew: boolean }> {
  const categoryId = row.category_id ?? defaultCategoryId ?? null;

  if (categoryId) {
    const cat = await prisma.category.findFirst({
      where: { id: categoryId, userId },
    });
    if (!cat) throw new Error("Category not found or does not belong to you");
  }

  const existing = await prisma.lead.findUnique({
    where: { userId_email: { userId, email: row.email } },
  });

  const data = {
    userId,
    categoryId,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    company: row.company ?? null,
    jobTitle: row.job_title ?? null,
    phone: row.phone ?? null,
    source: row.source ?? null,
    initialMessage: row.initial_message ?? null,
    businessDetail: row.business_detail ?? null,
  };

  const lead = existing
    ? await prisma.lead.update({
        where: { userId_email: { userId, email: row.email } },
        data,
      })
    : await prisma.lead.create({ data });

  const dto = toLeadDto(lead);
  const { score, tier } = calculateScore(dto);

  const scored = await prisma.lead.update({
    where: { id: lead.id },
    data: { score, tier },
  });

  return { lead: toLeadDto(scored), isNew: !existing };
}

export async function incrementEmailsSent(
  userId: string,
  leadId: string
): Promise<Lead> {
  const existing = await prisma.lead.findFirst({
    where: { id: leadId, userId },
  });
  if (!existing) throw new Error(`Lead not found: ${leadId}`);

  const lead = await prisma.lead.update({
    where: { id: leadId },
    data: {
      emailsSent: { increment: 1 },
      lastEventType: "email_sent",
      lastEventAt: new Date(),
    },
  });
  return toLeadDto(lead);
}
