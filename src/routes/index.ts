import { Router } from "express";
import { authRouter } from "./auth";
import { categoriesRouter } from "./categories";
import { leadsRouter } from "./leads";
import { analyticsRouter } from "./analytics";
import { authenticate } from "../middleware/authenticate";
import { getConfigStatus } from "../config/env";

export const apiRouter = Router();

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

apiRouter.use(protectedRouter);
