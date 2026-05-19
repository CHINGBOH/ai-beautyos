-- 0011 — tenant_config_drafts
-- Issue #26 acceptance criterion 3: Hermes 可建议变更，高风险需人审。
-- Drafts are append-only with status transitions: pending → approved | rejected.
-- Approval is recorded but the actual YAML file write is intentionally
-- out of scope of this migration (see server-side handler).

CREATE TABLE IF NOT EXISTS "tenant_config_drafts" (
    "id" bigserial PRIMARY KEY NOT NULL,
    "tenant_id" uuid NOT NULL,
    "proposed_by" varchar(64) NOT NULL,
    "proposer_ref" varchar(128),
    "reason" text NOT NULL,
    "patch" jsonb NOT NULL,
    "risk_level" varchar(16) DEFAULT 'low' NOT NULL,
    "status" varchar(16) DEFAULT 'pending' NOT NULL,
    "reviewed_by" varchar(64),
    "reviewer_ref" varchar(128),
    "review_note" text,
    "applied_at" timestamptz,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    "updated_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "tenant_config_drafts_tenant_fk"
        FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
    CONSTRAINT "tenant_config_drafts_status_chk"
        CHECK ("status" IN ('pending','approved','rejected')),
    CONSTRAINT "tenant_config_drafts_risk_chk"
        CHECK ("risk_level" IN ('low','medium','high','very_high'))
);

CREATE INDEX IF NOT EXISTS "tenant_config_drafts_tenant_status_idx"
    ON "tenant_config_drafts" ("tenant_id", "status");

CREATE INDEX IF NOT EXISTS "tenant_config_drafts_status_created_idx"
    ON "tenant_config_drafts" ("status", "created_at");
