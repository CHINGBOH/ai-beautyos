CREATE TABLE "agent_messages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"role" varchar(16) NOT NULL,
	"content" text,
	"invocation_id" uuid,
	"token_usage" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"policy_id" varchar(64) NOT NULL,
	"policy_version" varchar(32) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"model" varchar(64),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"actor_kind" varchar(16) NOT NULL,
	"actor_ref" varchar(128) NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"context_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"outcome" jsonb
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"kind" varchar(64) NOT NULL,
	"actor_kind" varchar(16) NOT NULL,
	"actor_ref" varchar(128),
	"subject_kind" varchar(32),
	"subject_ref" varchar(128),
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"request_id" varchar(64),
	"trace_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"invocation_id" uuid NOT NULL,
	"policy_id" varchar(64) NOT NULL,
	"policy_version" varchar(32) NOT NULL,
	"rule_path" varchar(255) NOT NULL,
	"decision" varchar(20) NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"plan" varchar(32) DEFAULT 'trial' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tool_invocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"session_id" uuid,
	"caller_kind" varchar(16) NOT NULL,
	"caller_ref" varchar(128) NOT NULL,
	"tool_name" varchar(64) NOT NULL,
	"tool_version" varchar(32),
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dry_run" boolean DEFAULT false NOT NULL,
	"status" varchar(20) NOT NULL,
	"latency_ms" integer,
	"result_summary" jsonb,
	"error_code" varchar(64),
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"request_id" varchar(64),
	"trace_id" varchar(64)
);
--> statement-breakpoint
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_invocation_id_tool_invocations_id_fk" FOREIGN KEY ("invocation_id") REFERENCES "public"."tool_invocations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_profiles" ADD CONSTRAINT "agent_profiles_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_profile_id_agent_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."agent_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_decisions" ADD CONSTRAINT "policy_decisions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_decisions" ADD CONSTRAINT "policy_decisions_invocation_id_tool_invocations_id_fk" FOREIGN KEY ("invocation_id") REFERENCES "public"."tool_invocations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_invocations" ADD CONSTRAINT "tool_invocations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_invocations" ADD CONSTRAINT "tool_invocations_session_id_agent_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_messages_session_created_idx" ON "agent_messages" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_messages_tenant_created_idx" ON "agent_messages" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_profiles_tenant_policy_uq" ON "agent_profiles" USING btree ("tenant_id","policy_id");--> statement-breakpoint
CREATE INDEX "agent_profiles_tenant_idx" ON "agent_profiles" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "agent_sessions_tenant_status_activity_idx" ON "agent_sessions" USING btree ("tenant_id","status","last_activity_at");--> statement-breakpoint
CREATE INDEX "agent_sessions_profile_idx" ON "agent_sessions" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "agent_sessions_actor_idx" ON "agent_sessions" USING btree ("actor_kind","actor_ref");--> statement-breakpoint
CREATE INDEX "audit_log_tenant_created_idx" ON "audit_log" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_kind_created_idx" ON "audit_log" USING btree ("kind","created_at");--> statement-breakpoint
CREATE INDEX "audit_log_subject_idx" ON "audit_log" USING btree ("subject_kind","subject_ref");--> statement-breakpoint
CREATE INDEX "policy_decisions_tenant_decision_idx" ON "policy_decisions" USING btree ("tenant_id","decision","created_at");--> statement-breakpoint
CREATE INDEX "policy_decisions_invocation_idx" ON "policy_decisions" USING btree ("invocation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tenants_slug_uq" ON "tenants" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "tenants_status_idx" ON "tenants" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tool_invocations_tenant_started_idx" ON "tool_invocations" USING btree ("tenant_id","started_at");--> statement-breakpoint
CREATE INDEX "tool_invocations_tool_status_idx" ON "tool_invocations" USING btree ("tool_name","status");--> statement-breakpoint
CREATE INDEX "tool_invocations_session_idx" ON "tool_invocations" USING btree ("session_id","started_at");--> statement-breakpoint
CREATE INDEX "tool_invocations_request_idx" ON "tool_invocations" USING btree ("request_id");