import { Router } from "express";
import { authRouter } from "./auth";
import { categoriesRouter } from "./categories";
import { leadsRouter } from "./leads";
import { analyticsRouter } from "./analytics";
import { emailsRouter } from "./emails";
import { reportsRouter } from "./reports";
import { settingsRouter } from "./settings";
import { waitlistRouter } from "./waitlist";
import { adminRouter } from "./admin";
import { trackingRouter } from "./tracking";
import { resendWebhookRouter } from "./webhooks/resend";
import { authenticate } from "../middleware/authenticate";
import {
  apiRateLimiter,
  authRateLimiter,
  trackingRateLimiter,
  webhookRateLimiter,
} from "../middleware/rateLimit";
import { getConfigStatus } from "../config/env";

export const apiRouter = Router();

/** Public — open pixel & click redirects (no auth) */
apiRouter.use("/track", trackingRateLimiter, trackingRouter);
apiRouter.use("/webhooks/resend", webhookRateLimiter, resendWebhookRouter);

/** Which secrets are set on this running instance (values never returned) */
apiRouter.get("/health/config", (_req, res) => {
  res.json(getConfigStatus());
});

apiRouter.use("/auth", authRateLimiter, authRouter);
apiRouter.use("/waitlist", waitlistRouter);

const protectedRouter = Router();
protectedRouter.use(authenticate);
protectedRouter.use(apiRateLimiter);
protectedRouter.use("/categories", categoriesRouter);
protectedRouter.use("/leads", leadsRouter);
protectedRouter.use("/analytics", analyticsRouter);
protectedRouter.use("/emails", emailsRouter);
protectedRouter.use("/reports", reportsRouter);
protectedRouter.use("/settings", settingsRouter);
protectedRouter.use("/admin", adminRouter);

apiRouter.use(protectedRouter);
