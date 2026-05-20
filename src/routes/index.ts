import { Router } from "express";
import { authRouter } from "./auth";
import { categoriesRouter } from "./categories";
import { leadsRouter } from "./leads";
import { authenticate } from "../middleware/authenticate";
import { requireVerifiedEmail } from "../middleware/authenticate";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);

const protectedRouter = Router();
protectedRouter.use(authenticate);
protectedRouter.use(requireVerifiedEmail);
protectedRouter.use("/categories", categoriesRouter);
protectedRouter.use("/leads", leadsRouter);

apiRouter.use(protectedRouter);
