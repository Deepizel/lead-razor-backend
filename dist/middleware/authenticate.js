"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.requireVerifiedEmail = requireVerifiedEmail;
const tokenService_1 = require("../services/auth/tokenService");
const authService_1 = require("../services/auth/authService");
async function authenticate(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
        res.status(401).json({ error: "Authentication required" });
        return;
    }
    const token = header.slice(7);
    try {
        const payload = (0, tokenService_1.verifyAccessToken)(token);
        const user = await (0, authService_1.getUserById)(payload.sub);
        if (!user) {
            res.status(401).json({ error: "User not found" });
            return;
        }
        req.user = user;
        next();
    }
    catch {
        res.status(401).json({ error: "Invalid or expired access token" });
    }
}
function requireVerifiedEmail(req, res, next) {
    if (!req.user?.emailVerified) {
        res.status(403).json({
            error: "Email not verified. Check your inbox for the verification link.",
        });
        return;
    }
    next();
}
