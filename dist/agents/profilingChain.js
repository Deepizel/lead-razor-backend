"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runProfilingChain = runProfilingChain;
const openai_1 = require("@langchain/openai");
const zod_1 = require("zod");
const env_1 = require("../config/env");
const ProfilingOutputSchema = zod_1.z.object({
    summary: zod_1.z.string().describe("Plain-language lead profile for sales"),
    currentIntent: zod_1.z.enum(["high", "medium", "low"]),
    lastMeaningfulEvent: zod_1.z.string(),
    suggestedEmail: zod_1.z.object({
        subject: zod_1.z
            .string()
            .describe("Short, personalized email subject line for first outreach"),
        body: zod_1.z
            .string()
            .describe("Plain-text outreach email body. Professional, concise, under 200 words. No markdown."),
    }),
});
async function runProfilingChain(ctx) {
    (0, env_1.assertOpenAiConfigured)();
    const model = new openai_1.ChatOpenAI({
        model: env_1.env.openaiModel,
        apiKey: env_1.env.openaiApiKey,
        temperature: 0.3,
    }).withStructuredOutput(ProfilingOutputSchema);
    const { lead, category, eventMetadata } = ctx;
    const systemPrompt = `You are a B2B sales qualification assistant. Your job is to assess whether a lead is a good fit for our business, judge their intent, and draft a personalized first-touch outreach email.

Our business:
  Offering: ${category.offering}
  Ideal customer profile: ${category.statement}

Use the lead's business_detail (when provided) to decide fit against our offering and ideal customer. Mention fit clearly in the summary.

Return structured output only. The suggested email should reference the lead's role/company when known and match their tier and intent.`;
    let userPrompt = `Generate a lead snapshot and suggested outreach email.

Lead profile:
  Name: ${lead.first_name} ${lead.last_name}
  Title: ${lead.job_title ?? "unknown"}
  Company: ${lead.company ?? "unknown"}
  Source: ${lead.source ?? "unknown"}
  Initial message: ${lead.initial_message ?? "none"}
  Business detail (for fit matching): ${lead.business_detail ?? "none provided"}

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
