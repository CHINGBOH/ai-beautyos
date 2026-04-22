CREATE TABLE "content_quality_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_id" integer NOT NULL,
	"completeness_score" numeric(3, 2) DEFAULT '0.00',
	"reliability_score" numeric(3, 2) DEFAULT '0.00',
	"credibility_score" numeric(3, 2) DEFAULT '0.00',
	"richness_score" numeric(3, 2) DEFAULT '0.00',
	"engagement_score" numeric(3, 2) DEFAULT '0.00',
	"overall_score" numeric(3, 2) DEFAULT '0.00',
	"issues" jsonb DEFAULT '[]'::jsonb,
	"recommendations" jsonb DEFAULT '[]'::jsonb,
	"status" varchar(20) DEFAULT 'pending',
	"reviewed_by" varchar(100),
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "content_quality_metrics_content_id_key" UNIQUE("content_id"),
	CONSTRAINT "content_quality_metrics_completeness_score_check" CHECK ((completeness_score >= (0)::numeric) AND (completeness_score <= (1)::numeric)),
	CONSTRAINT "content_quality_metrics_reliability_score_check" CHECK ((reliability_score >= (0)::numeric) AND (reliability_score <= (1)::numeric)),
	CONSTRAINT "content_quality_metrics_credibility_score_check" CHECK ((credibility_score >= (0)::numeric) AND (credibility_score <= (1)::numeric)),
	CONSTRAINT "content_quality_metrics_richness_score_check" CHECK ((richness_score >= (0)::numeric) AND (richness_score <= (1)::numeric)),
	CONSTRAINT "content_quality_metrics_engagement_score_check" CHECK ((engagement_score >= (0)::numeric) AND (engagement_score <= (1)::numeric)),
	CONSTRAINT "content_quality_metrics_overall_score_check" CHECK ((overall_score >= (0)::numeric) AND (overall_score <= (1)::numeric)),
	CONSTRAINT "content_quality_metrics_status_check" CHECK ((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'needs_revision'::character varying])::text[])));
--> statement-breakpoint
CREATE TABLE "expert_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_id" integer NOT NULL,
	"expert_id" varchar(100) NOT NULL,
	"expert_name" varchar(200) NOT NULL,
	"credentials" text,
	"review_date" timestamp DEFAULT now(),
	"overall_rating" integer NOT NULL,
	"comments" text,
	"recommendations" text[],
	"approved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "expert_reviews_overall_rating_check" CHECK ((overall_rating >= 1) AND (overall_rating <= 10)));
--> statement-breakpoint
CREATE TABLE "learning_analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"content_id" integer,
	"session_id" varchar(100),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now());
--> statement-breakpoint
CREATE TABLE "user_learning_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"preferred_difficulty" varchar(20) DEFAULT 'beginner',
	"preferred_content_types" text[],
	"learning_goals" text[],
	"time_preference" varchar(20) DEFAULT 'medium',
	"interests" text[],
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_learning_preferences_user_id_key" UNIQUE("user_id"),
	CONSTRAINT "user_learning_preferences_preferred_difficulty_check" CHECK ((preferred_difficulty)::text = ANY ((ARRAY['beginner'::character varying, 'intermediate'::character varying, 'advanced'::character varying])::text[])),
	CONSTRAINT "user_learning_preferences_time_preference_check" CHECK ((time_preference)::text = ANY ((ARRAY['short'::character varying, 'medium'::character varying, 'long'::character varying])::text[])));
--> statement-breakpoint
CREATE TABLE "user_learning_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"content_id" integer NOT NULL,
	"status" varchar(20) DEFAULT 'started' NOT NULL,
	"time_spent" integer DEFAULT 0,
	"rating" integer,
	"feedback" text,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_learning_progress_user_id_content_id_key" UNIQUE("user_id","content_id"),
	CONSTRAINT "user_learning_progress_status_check" CHECK ((status)::text = ANY ((ARRAY['started'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'skipped'::character varying])::text[])),
	CONSTRAINT "user_learning_progress_rating_check" CHECK ((rating >= 1) AND (rating <= 5)));
--> statement-breakpoint
CREATE TABLE "website_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"page_key" varchar(100) NOT NULL,
	"section_key" varchar(100),
	"content_type" varchar(50) NOT NULL,
	"title" varchar(255),
	"content" text NOT NULL,
	"image_url" text,
	"link_url" text,
	"link_text" varchar(255),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "xiaohongshu_content_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"tags" text,
	"content_type" varchar(50) NOT NULL,
	"project" varchar(100),
	"quality_score" numeric(5, 2),
	"validation_errors" text,
	"validation_warnings" text,
	"generated_by" varchar(50) DEFAULT 'ai' NOT NULL,
	"generation_params" text,
	"from_cache" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL);
--> statement-breakpoint
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_session_id_unique";--> statement-breakpoint
ALTER TABLE "leads" DROP CONSTRAINT "leads_airtable_id_unique";--> statement-breakpoint
ALTER TABLE "system_config" DROP CONSTRAINT "system_config_config_key_unique";--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_openId_unique";--> statement-breakpoint
ALTER TABLE "wework_contact_way" DROP CONSTRAINT "wework_contact_way_config_id_unique";--> statement-breakpoint
ALTER TABLE "wework_customers" DROP CONSTRAINT "wework_customers_external_user_id_unique";--> statement-breakpoint
ALTER TABLE "knowledge_base" ALTER COLUMN "category" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD COLUMN "embedding_json" text;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD COLUMN "quality_score" numeric(3, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD COLUMN "estimated_read_time" integer DEFAULT 5;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD COLUMN "version" varchar(20) DEFAULT '1.0';--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD COLUMN "last_reviewed_at" timestamp;--> statement-breakpoint
ALTER TABLE "content_quality_metrics" ADD CONSTRAINT "content_quality_metrics_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."knowledge_base"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expert_reviews" ADD CONSTRAINT "expert_reviews_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."knowledge_base"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_analytics" ADD CONSTRAINT "learning_analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_analytics" ADD CONSTRAINT "learning_analytics_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."knowledge_base"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_learning_preferences" ADD CONSTRAINT "user_learning_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_learning_progress" ADD CONSTRAINT "user_learning_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_learning_progress" ADD CONSTRAINT "user_learning_progress_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "public"."knowledge_base"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xiaohongshu_content_history" ADD CONSTRAINT "xiaohongshu_content_history_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."xiaohongshu_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_content_quality_metrics_content_id" ON "content_quality_metrics" USING btree ("content_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_content_quality_metrics_overall_score" ON "content_quality_metrics" USING btree ("overall_score" numeric_ops);--> statement-breakpoint
CREATE INDEX "idx_content_quality_metrics_status" ON "content_quality_metrics" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_expert_reviews_approved" ON "expert_reviews" USING btree ("approved" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_expert_reviews_content_id" ON "expert_reviews" USING btree ("content_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_expert_reviews_expert_id" ON "expert_reviews" USING btree ("expert_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_learning_analytics_content_id" ON "learning_analytics" USING btree ("content_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_learning_analytics_created_at" ON "learning_analytics" USING btree ("created_at" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_learning_analytics_event_type" ON "learning_analytics" USING btree ("event_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_learning_analytics_user_id" ON "learning_analytics" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_user_learning_preferences_user_id" ON "user_learning_preferences" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_user_learning_progress_content_id" ON "user_learning_progress" USING btree ("content_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_user_learning_progress_status" ON "user_learning_progress" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_user_learning_progress_user_id" ON "user_learning_progress" USING btree ("user_id" int4_ops);--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_session_id_key" UNIQUE("session_id");--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_airtable_id_key" UNIQUE("airtable_id");--> statement-breakpoint
ALTER TABLE "system_config" ADD CONSTRAINT "system_config_config_key_key" UNIQUE("config_key");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_openId_key" UNIQUE("openId");--> statement-breakpoint
ALTER TABLE "wework_contact_way" ADD CONSTRAINT "wework_contact_way_config_id_key" UNIQUE("config_id");--> statement-breakpoint
ALTER TABLE "wework_customers" ADD CONSTRAINT "wework_customers_external_user_id_key" UNIQUE("external_user_id");--> statement-breakpoint
