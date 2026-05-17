import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { env, assertOpenAiConfigured } from "../config/env";
import type { Category, Lead, ProfilingResult } from "../types/lead";

const ProfilingOutputSchema = z.object({
  summary: z.string().describe("Plain-language lead profile for sales"),
  currentIntent: z.enum(["high", "medium", "low"]),
  lastMeaningfulEvent: z.string(),
  suggestedEmail: z.object({
    subject: z
      .string()
      .describe("Short, personalized email subject line for first outreach"),
    body: z
      .string()
      .describe(
        "Plain-text outreach email body. Professional, concise, under 200 words. No markdown."
      ),
  }),
});

export interface ProfilingContext {
  lead: Lead;
  category: Category;
  eventMetadata?: {
    emailSubject?: string;
    replySnippet?: string;
    eventType?: string;
  };
}

export async function runProfilingChain(
  ctx: ProfilingContext
): Promise<{ result: ProfilingResult; tokenCost?: number }> {
  assertOpenAiConfigured();

  const model = new ChatOpenAI({
    model: env.openaiModel,
    apiKey: env.openaiApiKey,
    temperature: 0.3,
  }).withStructuredOutput(ProfilingOutputSchema);

  const { lead, category, eventMetadata } = ctx;

  const systemPrompt = `You are a B2B sales qualification assistant. Your job is to assess a lead's fit and intent and draft a personalized first-touch outreach email.

Business context:
  Offering: ${category.offering}
  Ideal customer: ${category.statement}

Return structured output only. The suggested email should reference the lead's role/company when known and match their tier and intent.`;

  let userPrompt = `Generate a lead snapshot and suggested outreach email.

Lead profile:
  Name: ${lead.first_name} ${lead.last_name}
  Title: ${lead.job_title ?? "unknown"}
  Company: ${lead.company ?? "unknown"}
  Source: ${lead.source ?? "unknown"}
  Initial message: ${lead.initial_message ?? "none"}

Engagement history:
  Emails sent: ${lead.emails_sent}
  Emails opened: ${lead.emails_opened}
  Links clicked: ${lead.links_clicked}
  Replies received: ${lead.replies_received}
  Booking link clicks: ${lead.booking_clicks}
  Last event: ${lead.last_event_type ?? "none"} at ${lead.last_event_at?.toISOString() ?? "n/a"}

Current deterministic score: ${lead.score}/100 (${lead.tier})`;

  if (eventMetadata?.eventType) {
    userPrompt += `

Most recent event context:
  Event type: ${eventMetadata.eventType}
  Email subject: ${eventMetadata.emailSubject ?? "n/a"}
  Reply snippet: ${eventMetadata.replySnippet ?? "n/a"}`;
  }

  const result = await model.invoke([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  return { result };
}
