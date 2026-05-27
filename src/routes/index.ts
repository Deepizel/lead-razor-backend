import { Router } from "express";
import { authRouter } from "./auth";
import { categoriesRouter } from "./categories";
import { leadsRouter } from "./leads";
import { analyticsRouter } from "./analytics";
import { emailsRouter } from "./emails";
import { reportsRouter } from "./reports";
import { settingsRouter } from "./settings";
import { trackingRouter } from "./tracking";
import { resendWebhookRouter } from "./webhooks/resend";
import { authenticate } from "../middleware/authenticate";
import { getConfigStatus } from "../config/env";

export const apiRouter = Router();

/** Public — open pixel & click redirects (no auth) */
apiRouter.use("/track", trackingRouter);
apiRouter.use("/webhooks/resend", resendWebhookRouter);

/** Which secrets are set on this running instance (values never returned) */
apiRouter.get("/health/config", (_req, res) => {
  res.json(getConfigStatus());
});

apiRouter.use("/auth", authRouter);

const protectedRouter = Router();
protectedRouter.use(authenticate);
protectedRouter.use("/categories", categoriesRouter);
protectedRouter.use("/leads", leadsRouter);
protectedRouter.use("/analytics", analyticsRouter);
protectedRouter.use("/emails", emailsRouter);
protectedRouter.use("/reports", reportsRouter);
protectedRouter.use("/settings", settingsRouter);

apiRouter.use(protectedRouter);
