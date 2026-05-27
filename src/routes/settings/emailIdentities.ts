import { Router, Request, Response } from "express";
import { isMissingEnvError } from "../../config/env";
import {
  createUserEmailIdentity,
  deleteUserEmailIdentity,
  getDefaultUserEmailIdentity,
  getUserEmailIdentity,
  listUserEmailIdentities,
  sendTestEmailForIdentity,
  setUserDefaultEmailIdentity,
  updateUserEmailIdentity,
} from "../../services/emailIdentityService";
import type {
  CreateEmailIdentityInput,
  UpdateEmailIdentityInput,
} from "../../types/emailIdentity";

export const emailIdentitiesRouter = Router();

function identityIdParam(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

function settingsError(res: Response, err: unknown, fallback: string): void {
  const message = err instanceof Error ? err.message : fallback;
  if (isMissingEnvError(err)) {
    res.status(503).json({
      error: message,
      hint: "Set EMAIL_CREDENTIALS_ENCRYPTION_KEY on the server (64-char hex recommended).",
    });
    return;
  }
  const status = message.includes("not found")
    ? 404
    : message.includes("required") ||
        message.includes("must be") ||
        message.includes("Invalid")
      ? 400
      : message.includes("failed") ||
          message.includes("Resend") ||
          message.includes("SMTP") ||
          message.includes("Brevo")
        ? 502
        : 500;
  res.status(status).json({ error: message });
}

/** All identities for the logged-in user (masked credentials). */
emailIdentitiesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const identities = await listUserEmailIdentities(req.user!.id);
    res.json({ identities });
  } catch (err) {
    settingsError(res, err, "Failed to list email identities");
  }
});

/** Default identity only (alias for settings UI). */
emailIdentitiesRouter.get("/default", async (req: Request, res: Response) => {
  try {
    const identity = await getDefaultUserEmailIdentity(req.user!.id);
    if (!identity) {
      res.status(404).json({ error: "No default email identity configured" });
      return;
    }
    res.json({ identity });
  } catch (err) {
    settingsError(res, err, "Failed to fetch default identity");
  }
});

emailIdentitiesRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const identity = await getUserEmailIdentity(req.user!.id, identityIdParam(req));
    if (!identity) {
      res.status(404).json({ error: "Email identity not found" });
      return;
    }
    res.json({ identity });
  } catch (err) {
    settingsError(res, err, "Failed to fetch email identity");
  }
});

emailIdentitiesRouter.post("/", async (req: Request, res: Response) => {
  try {
    const body = req.body ?? {};
    const input: CreateEmailIdentityInput = {
      label: body.label,
      fromName: body.fromName,
      fromEmail: body.fromEmail,
      replyTo: body.replyTo,
      providerType: body.providerType,
      domainVerified: body.domainVerified,
      isDefault: body.isDefault,
      trackingEnabled: body.trackingEnabled,
      replyHandlingMode: body.replyHandlingMode,
      credentials: body.credentials,
    };
    const identity = await createUserEmailIdentity(req.user!.id, input);
    res.status(201).json({ identity });
  } catch (err) {
    settingsError(res, err, "Failed to create email identity");
  }
});

emailIdentitiesRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const body = req.body ?? {};
    const input: UpdateEmailIdentityInput = {
      label: body.label,
      fromName: body.fromName,
      fromEmail: body.fromEmail,
      replyTo: body.replyTo,
      domainVerified: body.domainVerified,
      isDefault: body.isDefault,
      trackingEnabled: body.trackingEnabled,
      replyHandlingMode: body.replyHandlingMode,
      credentials: body.credentials,
    };
    const identity = await updateUserEmailIdentity(
      req.user!.id,
      identityIdParam(req),
      input
    );
    if (!identity) {
      res.status(404).json({ error: "Email identity not found" });
      return;
    }
    res.json({ identity });
  } catch (err) {
    settingsError(res, err, "Failed to update email identity");
  }
});

emailIdentitiesRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const ok = await deleteUserEmailIdentity(req.user!.id, identityIdParam(req));
    if (!ok) {
      res.status(404).json({ error: "Email identity not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    settingsError(res, err, "Failed to delete email identity");
  }
});

emailIdentitiesRouter.post("/:id/default", async (req: Request, res: Response) => {
  try {
    const identity = await setUserDefaultEmailIdentity(
      req.user!.id,
      identityIdParam(req)
    );
    if (!identity) {
      res.status(404).json({ error: "Email identity not found" });
      return;
    }
    res.json({ identity });
  } catch (err) {
    settingsError(res, err, "Failed to set default identity");
  }
});

emailIdentitiesRouter.post("/:id/test", async (req: Request, res: Response) => {
  try {
    const to =
      typeof req.body?.to === "string" ? req.body.to : undefined;
    const result = await sendTestEmailForIdentity(
      req.user!.id,
      identityIdParam(req),
      to
    );
    res.json({ status: "sent", ...result });
  } catch (err) {
    settingsError(res, err, "Test send failed");
  }
});
