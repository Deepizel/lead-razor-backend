import dotenv from "dotenv";

dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
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
