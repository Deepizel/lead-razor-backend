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

export type EmailProvider = "gmail" | "resend";

function emailProviderFromEnv(): EmailProvider {
  const raw = (readEnv("EMAIL_PROVIDER") ?? "gmail").toLowerCase();
  return raw === "resend" ? "resend" : "gmail";
}

export const env = {
  port: Number(process.env.PORT ?? 5000),
  databaseUrl: optionalEnv("DATABASE_URL"),
  openaiApiKey: optionalEnv("OPENAI_API_KEY"),
  openaiModel: optionalEnv("OPENAI_MODEL", "gpt-4o-mini"),
  resendApiKey: optionalEnv("RESEND_API_KEY"),
  resendFromEmail: optionalEnv("RESEND_FROM_EMAIL"),
  resendWebhookSecret: optionalEnv("RESEND_WEBHOOK_SECRET"),
  emailProvider: emailProviderFromEnv(),
  smtpHost: optionalEnv("SMTP_HOST", "smtp.gmail.com"),
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: optionalEnv("SMTP_USER"),
  smtpPass: optionalEnv("SMTP_PASS"),
  smtpFrom: optionalEnv("SMTP_FROM"),
  jwtSecret: optionalEnv("JWT_SECRET"),
  jwtAccessExpires: optionalEnv("JWT_ACCESS_EXPIRES", "5m"),
  jwtRefreshExpiresDays: Number(process.env.JWT_REFRESH_EXPIRES_DAYS ?? 7),
  /** Backend URL for tracking pixels, click redirects, auth links */
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

/** Outreach emails (not auth mail) */
export function assertOutreachEmailConfigured(): void {
  if (env.emailProvider === "resend") {
    assertResendConfigured();
    return;
  }
  requireEnv("SMTP_USER");
  requireEnv("SMTP_PASS");
  requireEnv("SMTP_FROM");
}

export function assertAuthConfigured(): void {
  requireEnv("JWT_SECRET");
}

export type ConfigStatus = {
  database: boolean;
  auth: boolean;
  resend: boolean;
  outreachEmail: boolean;
  emailProvider: EmailProvider;
};

/** Non-secret flags for debugging deploy vs local .env mismatches */
export function getConfigStatus(): ConfigStatus {
  const provider = emailProviderFromEnv();
  const outreachEmail =
    provider === "resend"
      ? Boolean(readEnv("RESEND_API_KEY") && readEnv("RESEND_FROM_EMAIL"))
      : Boolean(
          readEnv("SMTP_USER") && readEnv("SMTP_PASS") && readEnv("SMTP_FROM")
        );

  return {
    database: Boolean(readEnv("DATABASE_URL")),
    auth: Boolean(readEnv("JWT_SECRET")),
    resend: Boolean(readEnv("RESEND_API_KEY") && readEnv("RESEND_FROM_EMAIL")),
    outreachEmail,
    emailProvider: provider,
  };
}

export function isMissingEnvError(err: unknown): boolean {
  return (
    err instanceof Error &&
    err.message.includes("Missing required environment variable")
  );
}
