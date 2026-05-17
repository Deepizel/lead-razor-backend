-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(100) NOT NULL,
    "offering" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category_id" UUID,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "company" VARCHAR(255),
    "job_title" VARCHAR(255),
    "phone" VARCHAR(50),
    "source" VARCHAR(100),
    "initial_message" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "tier" VARCHAR(10) NOT NULL DEFAULT 'cold',
    "emails_sent" INTEGER NOT NULL DEFAULT 0,
    "emails_opened" INTEGER NOT NULL DEFAULT 0,
    "links_clicked" INTEGER NOT NULL DEFAULT 0,
    "replies_received" INTEGER NOT NULL DEFAULT 0,
    "booking_clicks" INTEGER NOT NULL DEFAULT 0,
    "last_event_at" TIMESTAMPTZ(6),
    "last_event_type" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "lead_id" UUID NOT NULL,
    "current_score" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "current_intent" VARCHAR(20) NOT NULL,
    "last_meaningful_event" VARCHAR(50),
    "suggested_email_subject" TEXT,
    "suggested_email_body" TEXT,
    "suggested_email_sent_at" TIMESTAMPTZ(6),
    "llm_model" VARCHAR(100),
    "token_cost" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leads_email_key" ON "leads"("email");

-- CreateIndex
CREATE UNIQUE INDEX "lead_snapshots_lead_id_key" ON "lead_snapshots"("lead_id");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_snapshots" ADD CONSTRAINT "lead_snapshots_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
