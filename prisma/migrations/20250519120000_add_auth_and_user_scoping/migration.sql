-- CreateTable
CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "email_verified_at" TIMESTAMPTZ(6),
    "email_verification_token" TEXT,
    "email_verification_expires" TIMESTAMPTZ(6),
    "password_reset_token" TEXT,
    "password_reset_expires" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_verification_token_key" ON "users"("email_verification_token");
CREATE UNIQUE INDEX IF NOT EXISTS "users_password_reset_token_key" ON "users"("password_reset_token");

CREATE TABLE IF NOT EXISTS "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- Categories: add user_id (nullable for existing rows; new rows require it in app)
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "user_id" UUID;
CREATE INDEX IF NOT EXISTS "categories_user_id_idx" ON "categories"("user_id");

-- Leads: add user_id, change email uniqueness to per-user
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "user_id" UUID;
-- Prisma created leads_email_key as a UNIQUE CONSTRAINT, not a standalone index
ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "leads_email_key";
CREATE UNIQUE INDEX IF NOT EXISTS "leads_user_id_email_key" ON "leads"("user_id", "email");
CREATE INDEX IF NOT EXISTS "leads_user_id_idx" ON "leads"("user_id");

-- Snapshots: add user_id
ALTER TABLE "lead_snapshots" ADD COLUMN IF NOT EXISTS "user_id" UUID;
CREATE INDEX IF NOT EXISTS "lead_snapshots_user_id_idx" ON "lead_snapshots"("user_id");

-- Optional FKs (only if you have no orphan rows)
-- ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- ALTER TABLE "leads" ADD CONSTRAINT "leads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- ALTER TABLE "lead_snapshots" ADD CONSTRAINT "lead_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
