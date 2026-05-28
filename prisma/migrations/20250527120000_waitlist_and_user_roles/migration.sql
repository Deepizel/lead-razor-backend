-- Waitlist onboarding + user role/status/profile

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "first_name" VARCHAR(100);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_name" VARCHAR(100);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "business_industry" VARCHAR(150);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" VARCHAR(20) NOT NULL DEFAULT 'user';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_setup_token" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_setup_expires" TIMESTAMPTZ(6);

ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "users_password_setup_token_key" ON "users"("password_setup_token");
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role");
CREATE INDEX IF NOT EXISTS "users_status_idx" ON "users"("status");

CREATE TABLE "waitlist_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "business_industry" VARCHAR(150) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "waitlist_entries_email_key" ON "waitlist_entries"("email");
CREATE UNIQUE INDEX "waitlist_entries_user_id_key" ON "waitlist_entries"("user_id");
CREATE INDEX "waitlist_entries_status_idx" ON "waitlist_entries"("status");

ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
