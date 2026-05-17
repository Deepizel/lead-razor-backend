import { prisma } from "../db/prisma";
import { toLeadDto } from "../lib/prismaMappers";
import type { Lead } from "../types/lead";

export async function getLeadById(id: string): Promise<Lead | null> {
  const lead = await prisma.lead.findUnique({ where: { id } });
  return lead ? toLeadDto(lead) : null;
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
