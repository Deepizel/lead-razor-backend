import { Router, Request, Response } from "express";
import { isMissingEnvError } from "../config/env";
import { authRateLimiter } from "../middleware/rateLimit";
import {
  completePasswordSetup,
  joinWaitlist,
  validatePasswordSetupToken,
} from "../services/waitlistService";

export const waitlistRouter = Router();

function waitlistError(res: Response, err: unknown, fallback: string): void {
  const message = err instanceof Error ? err.message : fallback;
  if (isMissingEnvError(err)) {
    res.status(503).json({ error: message });
    return;
  }
  const status =
    message.includes("already") ||
    message.includes("required") ||
    message.includes("valid email")
      ? 400
      : message.includes("Invalid or expired")
        ? 400
        : message.includes("Failed to send")
          ? 502
          : 500;
  res.status(status).json({ error: message });
}

/** Public — join the waitlist */
waitlistRouter.post("/", authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, businessIndustry } = req.body ?? {};
    const entry = await joinWaitlist({
      firstName,
      lastName,
      email,
      businessIndustry,
    });
    res.status(201).json({ entry });
  } catch (err) {
    waitlistError(res, err, "Waitlist signup failed");
  }
});

/** Public — check setup token (for FE form) */
waitlistRouter.get("/set-password", async (req: Request, res: Response) => {
  try {
    const token = String(req.query.token ?? "");
    if (!token) {
      res.status(400).json({ error: "token query parameter is required" });
      return;
    }
    const info = await validatePasswordSetupToken(token);
    res.json(info);
  } catch (err) {
    waitlistError(res, err, "Invalid setup link");
  }
});

/** Public — set password after waitlist approval */
waitlistRouter.post("/set-password", authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body ?? {};
    if (typeof token !== "string" || typeof password !== "string") {
      res.status(400).json({ error: "token and password are required" });
      return;
    }
    const result = await completePasswordSetup(token, password);
    res.json(result);
  } catch (err) {
    waitlistError(res, err, "Password setup failed");
  }
});
