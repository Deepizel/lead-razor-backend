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
  options: ListLeadsOptions = {}
): Promise<LeadListItem[]> {
  const { tier, sort = "score" } = options;

  const leads = await prisma.lead.findMany({
    where: tier ? { tier } : undefined,
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

export async function getLeadById(id: string): Promise<Lead | null> {
  const lead = await prisma.lead.findUnique({ where: { id } });
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
  id: string,
  input: UpdateLeadInput
): Promise<Lead | null> {
  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) return null;

  if (input.email && input.email.toLowerCase() !== existing.email) {
    const conflict = await prisma.lead.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (conflict && conflict.id !== id) {
      throw new Error("Email already in use by another lead");
    }
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
      ...(input.email !== undefined && { email: input.email.toLowerCase().trim() }),
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
  row: ParsedLeadRow,
  defaultCategoryId: string | null
): Promise<{ lead: Lead; isNew: boolean }> {
  const categoryId = row.category_id ?? defaultCategoryId ?? null;

  const existing = await prisma.lead.findUnique({
    where: { email: row.email },
  });

  const data = {
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
    ? await prisma.lead.update({ where: { email: row.email }, data })
    : await prisma.lead.create({ data });

  const dto = toLeadDto(lead);
  const { score, tier } = calculateScore(dto);

  const scored = await prisma.lead.update({
    where: { id: lead.id },
    data: { score, tier },
  });

  return { lead: toLeadDto(scored), isNew: !existing };
}

export async function incrementEmailsSent(leadId: string): Promise<Lead> {
  try {
    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        emailsSent: { increment: 1 },
        lastEventType: "email_sent",
        lastEventAt: new Date(),
      },
    });
    return toLeadDto(lead);
  } catch {
    throw new Error(`Lead not found: ${leadId}`);
  }
}
