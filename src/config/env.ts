import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function readEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function requireEnv(name: string): string {
  const value = readEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback = ""): string {
  return readEnv(name) ?? fallback;
}

export const env = {
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

export function assertDatabaseConfigured(): void {
  requireEnv("DATABASE_URL");
}

export function assertOpenAiConfigured(): void {
  requireEnv("OPENAI_API_KEY");
}

export function assertResendConfigured(): void {
  requireEnv("RESEND_API_KEY");
  requireEnv("RESEND_FROM_EMAIL");
}

export function assertAuthConfigured(): void {
  requireEnv("JWT_SECRET");
}

export type ConfigStatus = {
  database: boolean;
  auth: boolean;
  resend: boolean;
};

/** Non-secret flags for debugging deploy vs local .env mismatches */
export function getConfigStatus(): ConfigStatus {
  return {
    database: Boolean(readEnv("DATABASE_URL")),
    auth: Boolean(readEnv("JWT_SECRET")),
    resend: Boolean(readEnv("RESEND_API_KEY") && readEnv("RESEND_FROM_EMAIL")),
  };
}

export function isMissingEnvError(err: unknown): boolean {
  return (
    err instanceof Error &&
    err.message.includes("Missing required environment variable")
  );
}
