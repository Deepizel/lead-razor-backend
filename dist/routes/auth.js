"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const authService = __importStar(require("../services/auth/authService"));
const authenticate_1 = require("../middleware/authenticate");
exports.authRouter = (0, express_1.Router)();
function authError(res, err, fallback) {
    const message = err instanceof Error ? err.message : fallback;
    const status = err instanceof Error && "statusCode" in err
        ? err.statusCode
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
exports.authRouter.post("/signup", async (req, res) => {
    try {
        const { email, password } = req.body ?? {};
        if (typeof email !== "string" || typeof password !== "string") {
            res.status(400).json({ error: "email and password are required" });
            return;
        }
        const result = await authService.signup(email, password);
        res.status(201).json(result);
    }
    catch (err) {
        authError(res, err, "Signup failed");
    }
});
/** One-click email verification from link in inbox */
exports.authRouter.get("/verify-email", async (req, res) => {
    try {
        const token = String(req.query.token ?? "");
        if (!token) {
            res.status(400).json({ error: "token query parameter is required" });
            return;
        }
        const result = await authService.verifyEmail(token);
        res.status(200).send(`<html><body><h1>Email verified</h1><p>${result.message}</p><p>You can close this tab and log in to the app.</p></body></html>`);
    }
    catch (err) {
        authError(res, err, "Verification failed");
    }
});
exports.authRouter.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body ?? {};
        if (typeof email !== "string" || typeof password !== "string") {
            res.status(400).json({ error: "email and password are required" });
            return;
        }
        const tokens = await authService.login(email, password);
        res.json(tokens);
    }
    catch (err) {
        authError(res, err, "Login failed");
    }
});
exports.authRouter.post("/refresh", async (req, res) => {
    try {
        const { refreshToken } = req.body ?? {};
        if (typeof refreshToken !== "string" || !refreshToken) {
            res.status(400).json({ error: "refreshToken is required" });
            return;
        }
        const tokens = await authService.refresh(refreshToken);
        res.json(tokens);
    }
    catch (err) {
        authError(res, err, "Refresh failed");
    }
});
exports.authRouter.post("/logout", async (req, res) => {
    try {
        const { refreshToken } = req.body ?? {};
        if (typeof refreshToken === "string" && refreshToken) {
            await authService.logout(refreshToken);
        }
        res.status(204).send();
    }
    catch (err) {
        authError(res, err, "Logout failed");
    }
});
exports.authRouter.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body ?? {};
        if (typeof email !== "string" || !email.trim()) {
            res.status(400).json({ error: "email is required" });
            return;
        }
        const result = await authService.forgotPassword(email);
        res.json(result);
    }
    catch (err) {
        authError(res, err, "Request failed");
    }
});
exports.authRouter.post("/reset-password", async (req, res) => {
    try {
        const { token, password, newPassword } = req.body ?? {};
        const pwd = typeof newPassword === "string" ? newPassword : password;
        if (typeof token !== "string" || typeof pwd !== "string") {
            res.status(400).json({ error: "token and newPassword are required" });
            return;
        }
        const result = await authService.resetPassword(token, pwd);
        res.json(result);
    }
    catch (err) {
        authError(res, err, "Reset failed");
    }
});
exports.authRouter.get("/me", authenticate_1.authenticate, async (req, res) => {
    res.json({ user: req.user });
});
