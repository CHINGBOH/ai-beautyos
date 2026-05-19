CREATE TABLE "outbox" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"channel" varchar(32) NOT NULL,
	"target" varchar(255) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"not_before" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "knowledge_base" ALTER COLUMN "embedding" SET DATA TYPE vector(1536);--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "agent_session_id" uuid;--> statement-breakpoint
ALTER TABLE "outbox" ADD CONSTRAINT "outbox_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "outbox_due_idx" ON "outbox" USING btree ("status","not_before");--> statement-breakpoint
CREATE INDEX "outbox_tenant_created_idx" ON "outbox" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "outbox_channel_status_idx" ON "outbox" USING btree ("channel","status");