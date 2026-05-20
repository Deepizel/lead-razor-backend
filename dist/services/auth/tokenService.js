"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSecureToken = generateSecureToken;
exports.hashToken = hashToken;
exports.signAccessToken = signAccessToken;
exports.verifyAccessToken = verifyAccessToken;
exports.refreshTokenExpiresAt = refreshTokenExpiresAt;
exports.verificationExpiresAt = verificationExpiresAt;
exports.passwordResetExpiresAt = passwordResetExpiresAt;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../../config/env");
function generateSecureToken() {
    return crypto_1.default.randomBytes(32).toString("hex");
}
function hashToken(token) {
    return crypto_1.default.createHash("sha256").update(token).digest("hex");
}
function signAccessToken(user) {
    (0, env_1.assertAuthConfigured)();
    const payload = {
        sub: user.id,
        email: user.email,
        type: "access",
    };
    return jsonwebtoken_1.default.sign(payload, env_1.env.jwtSecret, {
        expiresIn: env_1.env.jwtAccessExpires,
    });
}
function verifyAccessToken(token) {
    (0, env_1.assertAuthConfigured)();
    const payload = jsonwebtoken_1.default.verify(token, env_1.env.jwtSecret);
    if (payload.type !== "access") {
        throw new Error("Invalid token type");
    }
    return payload;
}
function refreshTokenExpiresAt() {
    const d = new Date();
    d.setDate(d.getDate() + env_1.env.jwtRefreshExpiresDays);
    return d;
}
function verificationExpiresAt() {
    const d = new Date();
    d.setHours(d.getHours() + 24);
    return d;
}
function passwordResetExpiresAt() {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    return d;
}
