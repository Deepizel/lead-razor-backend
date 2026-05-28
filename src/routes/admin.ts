import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/authenticate";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  approveUserAccount,
  deactivateUserAccount,
  listAllUsersForAdmin,
  updateUserRole,
} from "../services/adminUserService";
import {
  approveWaitlistEntry,
  listWaitlistEntries,
  rejectWaitlistEntry,
} from "../services/waitlistService";

export const adminRouter = Router();

adminRouter.use(authenticate);
adminRouter.use(requireAdmin);

function adminError(res: Response, err: unknown, fallback: string): void {
  const message = err instanceof Error ? err.message : fallback;
  const status = message.includes("not found")
    ? 404
    : message.includes("Cannot") ||
        message.includes("already") ||
        message.includes("must")
      ? 400
      : message.includes("Failed to send")
        ? 502
        : 500;
  res.status(status).json({ error: message });
}

/** Tab 1 — all waitlist applications */
adminRouter.get("/waitlist", async (_req: Request, res: Response) => {
  try {
    const entries = await listWaitlistEntries();
    res.json({ entries });
  } catch (err) {
    adminError(res, err, "Failed to list waitlist");
  }
});

/** Approve waitlist → status active, email setup link (24h) */
adminRouter.post("/waitlist/:id/approve", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const entry = await approveWaitlistEntry(id);
    res.json({ entry });
  } catch (err) {
    adminError(res, err, "Failed to approve waitlist entry");
  }
});

adminRouter.post("/waitlist/:id/reject", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const entry = await rejectWaitlistEntry(id);
    res.json({ entry });
  } catch (err) {
    adminError(res, err, "Failed to reject waitlist entry");
  }
});

/** Tab 2 — all user accounts */
adminRouter.get("/users", async (_req: Request, res: Response) => {
  try {
    const users = await listAllUsersForAdmin();
    res.json({ users });
  } catch (err) {
    adminError(res, err, "Failed to list users");
  }
});

/** Activate user (must have password set) */
adminRouter.post("/users/:id/approve", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const user = await approveUserAccount(id);
    res.json({ user });
  } catch (err) {
    adminError(res, err, "Failed to approve user");
  }
});

adminRouter.post("/users/:id/deactivate", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const user = await deactivateUserAccount(id);
    res.json({ user });
  } catch (err) {
    adminError(res, err, "Failed to deactivate user");
  }
});

adminRouter.patch("/users/:id/role", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { role } = req.body ?? {};
    if (typeof role !== "string") {
      res.status(400).json({ error: "role is required" });
      return;
    }
    const user = await updateUserRole(id, role as "admin" | "user");
    res.json({ user });
  } catch (err) {
    adminError(res, err, "Failed to update role");
  }
});
