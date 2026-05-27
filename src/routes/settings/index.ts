import { Router, Request, Response } from "express";
import { isMissingEnvError } from "../../config/env";
import { getDefaultUserEmailIdentity } from "../../services/emailIdentityService";
import { emailIdentitiesRouter } from "./emailIdentities";

export const settingsRouter = Router();

settingsRouter.use("/email-identities", emailIdentitiesRouter);

/** Singular alias — default identity only. */
settingsRouter.get("/email-identity", async (req: Request, res: Response) => {
  try {
    const identity = await getDefaultUserEmailIdentity(req.user!.id);
    if (!identity) {
      res.status(404).json({ error: "No default email identity configured" });
      return;
    }
    res.json({ identity });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch identity";
    if (isMissingEnvError(err)) {
      res.status(503).json({ error: message });
      return;
    }
    res.status(500).json({ error: message });
  }
});
