import { Router } from "express";
import { leadsRouter } from "./leads";

export const apiRouter = Router();

apiRouter.use("/leads", leadsRouter);
