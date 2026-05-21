-- Pipeline analytics: upload batches, lead events, link leads to uploads

CREATE TABLE "lead_uploads" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "external_upload_id" VARCHAR(36) NOT NULL,
    "default_category_id" UUID,
    "row_count" INTEGER NOT NULL DEFAULT 0,
    "created_count" INTEGER NOT NULL DEFAULT 0,
    "updated_count" INTEGER NOT NULL DEFAULT 0,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "source_label" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_uploads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lead_uploads_user_id_external_upload_id_key"
    ON "lead_uploads"("user_id", "external_upload_id");
CREATE INDEX "lead_uploads_user_id_created_at_idx"
    ON "lead_uploads"("user_id", "created_at" DESC);

ALTER TABLE "lead_uploads"
    ADD CONSTRAINT "lead_uploads_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "lead_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "from_tier" VARCHAR(10),
    "to_tier" VARCHAR(10),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lead_events_user_id_created_at_idx"
    ON "lead_events"("user_id", "created_at" DESC);
CREATE INDEX "lead_events_user_id_event_type_created_at_idx"
    ON "lead_events"("user_id", "event_type", "created_at" DESC);
CREATE INDEX "lead_events_lead_id_created_at_idx"
    ON "lead_events"("lead_id", "created_at" DESC);

ALTER TABLE "lead_events"
    ADD CONSTRAINT "lead_events_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lead_events"
    ADD CONSTRAINT "lead_events_lead_id_fkey"
    FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "leads" ADD COLUMN "upload_id" UUID;

CREATE INDEX "leads_upload_id_idx" ON "leads"("upload_id");

ALTER TABLE "leads"
    ADD CONSTRAINT "leads_upload_id_fkey"
    FOREIGN KEY ("upload_id") REFERENCES "lead_uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
