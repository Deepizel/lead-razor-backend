import { Router, Request, Response } from "express";
import * as authService from "../services/auth/authService";
import { authenticate } from "../middleware/authenticate";

export const authRouter = Router();

function authError(res: Response, err: unknown, fallback: string): void {
  const message = err instanceof Error ? err.message : fallback;
  const status =
    err instanceof Error && "statusCode" in err
      ? (err as Error & { statusCode: number }).statusCode
      : message.includes("already exists") ||
          message.includes("required") ||
          message.includes("at least") ||
          message.includes("Invalid or expired")
        ? 400
        : message.includes("Invalid email or password")
          ? 401
          : message.includes("not verified")
            ? 403
            : 500;
  res.status(status).json({ error: message });
}

authRouter.post("/signup", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string") {
      res.status(400).json({ error: "email and password are required" });
      return;
    }
    const result = await authService.signup(email, password);
    res.status(201).json(result);
  } catch (err) {
    authError(res, err, "Signup failed");
  }
});

/** One-click email verification from link in inbox */
authRouter.get("/verify-email", async (req: Request, res: Response) => {
  try {
    const token = String(req.query.token ?? "");
    if (!token) {
      res.status(400).json({ error: "token query parameter is required" });
      return;
    }
    const result = await authService.verifyEmail(token);
    res.status(200).send(
      `<html><body><h1>Email verified</h1><p>${result.message}</p><p>You can close this tab and log in to the app.</p></body></html>`
    );
  } catch (err) {
    authError(res, err, "Verification failed");
  }
});

authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string") {
      res.status(400).json({ error: "email and password are required" });
      return;
    }
    const tokens = await authService.login(email, password);
    res.json(tokens);
  } catch (err) {
    authError(res, err, "Login failed");
  }
});

authRouter.post("/refresh", async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body ?? {};
    if (typeof refreshToken !== "string" || !refreshToken) {
      res.status(400).json({ error: "refreshToken is required" });
      return;
    }
    const tokens = await authService.refresh(refreshToken);
    res.json(tokens);
  } catch (err) {
    authError(res, err, "Refresh failed");
  }
});

authRouter.post("/logout", async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body ?? {};
    if (typeof refreshToken === "string" && refreshToken) {
      await authService.logout(refreshToken);
    }
    res.status(204).send();
  } catch (err) {
    authError(res, err, "Logout failed");
  }
});

authRouter.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { email } = req.body ?? {};
    if (typeof email !== "string" || !email.trim()) {
      res.status(400).json({ error: "email is required" });
      return;
    }
    const result = await authService.forgotPassword(email);
    res.json(result);
  } catch (err) {
    authError(res, err, "Request failed");
  }
});

authRouter.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { token, password, newPassword } = req.body ?? {};
    const pwd = typeof newPassword === "string" ? newPassword : password;
    if (typeof token !== "string" || typeof pwd !== "string") {
      res.status(400).json({ error: "token and newPassword are required" });
      return;
    }
    const result = await authService.resetPassword(token, pwd);
    res.json(result);
  } catch (err) {
    authError(res, err, "Reset failed");
  }
});

authRouter.get("/me", authenticate, async (req: Request, res: Response) => {
  res.json({ user: req.user });
});
