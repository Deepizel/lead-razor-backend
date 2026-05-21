import { Router, Request, Response } from "express";
import { env } from "../../config/env";
import { ingestEmailReply } from "../../services/eventIngestionService";
import { resolveSentEmailIdFromHeaders } from "../../services/email/outreachEmailService";
import { prisma } from "../../db/prisma";

export const resendWebhookRouter = Router();

/**
 * Resend inbound / email.received webhook (custom domain).
 * Configure in Resend dashboard → Webhooks → POST {APP_URL}/api/webhooks/resend/inbound
 */
resendWebhookRouter.post("/inbound", async (req: Request, res: Response) => {
  try {
    if (env.resendWebhookSecret) {
      const provided = req.headers["x-resend-signature"] ?? req.headers.authorization;
      if (provided !== env.resendWebhookSecret) {
        res.status(401).json({ error: "Invalid webhook secret" });
        return;
      }
    }

    const body = req.body ?? {};
    const type = body.type ?? body.event;

    if (type === "email.received" || type === "inbound.email.received") {
      const data = body.data ?? body.payload ?? body;
      const headers: Record<string, string | undefined> = {};
      const rawHeaders = data.headers ?? data.email?.headers ?? {};
      for (const [k, v] of Object.entries(rawHeaders)) {
        headers[k] = typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined;
      }

      let sentEmailId = resolveSentEmailIdFromHeaders(headers);

      const inReplyTo = headers["In-Reply-To"] ?? headers["in-reply-to"];
      if (!sentEmailId && typeof inReplyTo === "string") {
        const match = inReplyTo.match(/<([^>]+)>/);
        if (match?.[1]) {
          const byProvider = await findSentEmailByProviderMessageId(match[1]);
          if (byProvider) sentEmailId = byProvider.id;
        }
      }

      const text =
        data.text ??
        data.body ??
        data.snippet ??
        (typeof data.html === "string" ? data.html.slice(0, 500) : "");

      if (sentEmailId) {
        await ingestEmailReply(sentEmailId, String(text).slice(0, 2000));
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("Resend webhook error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

async function findSentEmailByProviderMessageId(messageId: string) {
  return prisma.sentEmail.findFirst({
    where: { providerMessageId: messageId },
  });
}
