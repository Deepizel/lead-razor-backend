import { createLead, type CreateLeadInput } from "../repositories/leadRepository";
import { formatLeadDetailResponse } from "./snapshotService";
import { queueLeadProfiling } from "./profilingQueueService";

function optionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

/** Parse JSON body from add-lead form (snake_case fields). */
export function parseCreateLeadBody(body: unknown): CreateLeadInput {
  const b = (body ?? {}) as Record<string, unknown>;
  return {
    first_name: requiredString(b.first_name, "first_name"),
    last_name: requiredString(b.last_name, "last_name"),
    email: requiredString(b.email, "email"),
    category_id: optionalString(b.category_id),
    company: optionalString(b.company),
    job_title: optionalString(b.job_title),
    phone: optionalString(b.phone),
    source: optionalString(b.source),
    initial_message: optionalString(b.initial_message),
    business_detail: optionalString(b.business_detail),
  };
}

export async function createLeadFromForm(userId: string, body: unknown) {
  const input = parseCreateLeadBody(body);
  const lead = await createLead(userId, input);
  const profilingQueued = queueLeadProfiling(userId, [lead.id]);
  return {
    ...formatLeadDetailResponse(lead, null),
    profilingQueued,
  };
}
