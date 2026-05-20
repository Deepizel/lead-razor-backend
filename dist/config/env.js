"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
exports.assertDatabaseConfigured = assertDatabaseConfigured;
exports.assertOpenAiConfigured = assertOpenAiConfigured;
exports.assertResendConfigured = assertResendConfigured;
exports.assertAuthConfigured = assertAuthConfigured;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
function optionalEnv(name, fallback = "") {
    return process.env[name] ?? fallback;
}
exports.env = {
    port: Number(process.env.PORT ?? 5000),
    databaseUrl: optionalEnv("DATABASE_URL"),
    openaiApiKey: optionalEnv("OPENAI_API_KEY"),
    openaiModel: optionalEnv("OPENAI_MODEL", "gpt-4o-mini"),
    resendApiKey: optionalEnv("RESEND_API_KEY"),
    resendFromEmail: optionalEnv("RESEND_FROM_EMAIL"),
    jwtSecret: optionalEnv("JWT_SECRET"),
    jwtAccessExpires: optionalEnv("JWT_ACCESS_EXPIRES", "5m"),
    jwtRefreshExpiresDays: Number(process.env.JWT_REFRESH_EXPIRES_DAYS ?? 7),
    /** Backend URL for API verify/reset routes */
    appUrl: optionalEnv("APP_URL", "http://localhost:5000"),
    /** If set, email links open the frontend which calls the API */
    frontendUrl: optionalEnv("FRONTEND_URL"),
};
function assertDatabaseConfigured() {
    requireEnv("DATABASE_URL");
}
function assertOpenAiConfigured() {
    requireEnv("OPENAI_API_KEY");
}
function assertResendConfigured() {
    requireEnv("RESEND_API_KEY");
    requireEnv("RESEND_FROM_EMAIL");
}
function assertAuthConfigured() {
    requireEnv("JWT_SECRET");
}
