import { Router } from "express";
import { categoriesRouter } from "./categories";
import { leadsRouter } from "./leads";

export const apiRouter = Router();

apiRouter.use("/categories", categoriesRouter);
apiRouter.use("/leads", leadsRouter);
