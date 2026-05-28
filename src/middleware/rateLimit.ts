import type { Request, Response } from "express";
import rateLimit, { type Options, type RateLimitRequestHandler } from "express-rate-limit";
import { env } from "../config/env";

function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip ?? "unknown";
}

function standardHandler(
  message: string
): Options["handler"] {
  return (req, res: Response) => {
    const retryAfter = res.getHeader("Retry-After");
    res.status(429).json({
      error: message,
      retryAfter:
        typeof retryAfter === "string"
          ? Number.parseInt(retryAfter, 10)
          : retryAfter,
    });
  };
}

function createLimiter(options: Partial<Options>): RateLimitRequestHandler {
  if (!env.rateLimitEnabled) {
    return (_req, _res, next) => next();
  }

  return rateLimit({
    windowMs: env.rateLimitWindowMs,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => clientIp(req),
    ...options,
  });
}

/** Login, signup, password reset — per IP */
export const authRateLimiter = createLimiter({
  max: env.rateLimitMaxAuth,
  handler: standardHandler("Too many auth attempts. Try again later."),
});

/** Open pixel & click redirects — higher volume per IP */
export const trackingRateLimiter = createLimiter({
  max: env.rateLimitMaxTracking,
  handler: standardHandler("Too many tracking requests. Try again later."),
});

/** Inbound webhooks (e.g. Resend) */
export const webhookRateLimiter = createLimiter({
  max: env.rateLimitMaxWebhook,
  handler: standardHandler("Too many webhook requests. Try again later."),
});

/** Authenticated API — per user when available, else IP */
export const apiRateLimiter = createLimiter({
  max: env.rateLimitMaxApi,
  keyGenerator: (req) => {
    const userId = req.user?.id;
    if (userId) return `user:${userId}`;
    return `ip:${clientIp(req)}`;
  },
  handler: standardHandler("Too many requests. Try again later."),
});

/** Email send & identity test — stricter per user/IP */
export const sendRateLimiter = createLimiter({
  max: env.rateLimitMaxSend,
  keyGenerator: (req) => {
    const userId = req.user?.id;
    if (userId) return `send:user:${userId}`;
    return `send:ip:${clientIp(req)}`;
  },
  handler: standardHandler("Too many send attempts. Try again later."),
});
