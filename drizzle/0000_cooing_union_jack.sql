CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" varchar(64) NOT NULL,
	"visitor_name" varchar(100),
	"visitor_phone" varchar(20),
	"visitor_wechat" varchar(100),
	"source" varchar(50) DEFAULT 'web' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"lead_id" varchar(100),
	"psychology_type" varchar(20),
	"psychology_tags" text,
	"budget_level" varchar(20),
	"customer_tier" varchar(10),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "conversations_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "knowledge_base" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(20) DEFAULT 'customer' NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"category" varchar(100) NOT NULL,
	"tags" text,
	"embedding" text,
	"view_count" integer DEFAULT 0 NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"airtable_id" varchar(100),
	"name" varchar(100) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"wechat" varchar(100),
	"age" integer,
	"interested_services" text,
	"budget" varchar(50),
	"budget_level" varchar(20),
	"message" text,
	"source" varchar(50) NOT NULL,
	"source_content" varchar(255),
	"status" varchar(50) DEFAULT 'new' NOT NULL,
	"psychology_type" varchar(50),
	"psychology_tags" text,
	"customer_tier" varchar(10),
	"notes" text,
	"follow_up_date" timestamp,
	"conversation_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"synced_at" timestamp,
	CONSTRAINT "leads_airtable_id_unique" UNIQUE("airtable_id")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"knowledge_used" text,
	"extracted_info" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_key" varchar(100) NOT NULL,
	"config_value" text,
	"description" text,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "system_config_config_key_unique" UNIQUE("config_key")
);
--> statement-breakpoint
CREATE TABLE "trigger_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"trigger_id" integer NOT NULL,
	"lead_id" integer,
	"executed_at" timestamp DEFAULT now() NOT NULL,
	"status" varchar(20) NOT NULL,
	"result" text,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "triggers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" varchar(20) NOT NULL,
	"time_config" text,
	"behavior_config" text,
	"weather_config" text,
	"action" varchar(30) NOT NULL,
	"action_config" text,
	"target_filter" text,
	"is_active" integer DEFAULT 1 NOT NULL,
	"execution_count" integer DEFAULT 0 NOT NULL,
	"last_executed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "wework_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"corp_id" varchar(100),
	"corp_secret" varchar(200),
	"agent_id" integer,
	"token" varchar(100),
	"encoding_aes_key" varchar(200),
	"access_token" text,
	"token_expires_at" timestamp,
	"is_active" integer DEFAULT 1 NOT NULL,
	"is_mock_mode" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wework_contact_way" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_id" varchar(100) NOT NULL,
	"type" varchar(10) DEFAULT 'single' NOT NULL,
	"scene" varchar(10) DEFAULT '1' NOT NULL,
	"qr_code" text,
	"remark" varchar(255),
	"skip_verify" integer DEFAULT 1 NOT NULL,
	"state" varchar(100),
	"user_ids" text,
	"is_active" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wework_contact_way_config_id_unique" UNIQUE("config_id")
);
--> statement-breakpoint
CREATE TABLE "wework_customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_user_id" varchar(100) NOT NULL,
	"name" varchar(100),
	"avatar" text,
	"type" varchar(10) DEFAULT '1' NOT NULL,
	"gender" varchar(10) DEFAULT '0' NOT NULL,
	"union_id" varchar(100),
	"position" varchar(100),
	"corp_name" varchar(200),
	"corp_full_name" varchar(200),
	"external_profile" text,
	"follow_user_id" varchar(100),
	"remark" varchar(255),
	"description" text,
	"create_time" timestamp,
	"tags" text,
	"state" varchar(100),
	"conversation_id" integer,
	"lead_id" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wework_customers_external_user_id_unique" UNIQUE("external_user_id")
);
--> statement-breakpoint
CREATE TABLE "wework_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_user_id" varchar(100) NOT NULL,
	"send_user_id" varchar(100) NOT NULL,
	"msg_type" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"error_msg" text,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "xiaohongshu_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"author_name" varchar(100) NOT NULL,
	"author_avatar" varchar(500),
	"content" text NOT NULL,
	"reply_content" text,
	"reply_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"sentiment" varchar(20),
	"is_filtered" integer DEFAULT 0 NOT NULL,
	"commented_at" timestamp NOT NULL,
	"replied_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "xiaohongshu_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"images" text,
	"tags" text,
	"content_type" varchar(50) NOT NULL,
	"project" varchar(100),
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"scheduled_at" timestamp,
	"view_count" integer DEFAULT 0 NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"share_count" integer DEFAULT 0 NOT NULL,
	"collect_count" integer DEFAULT 0 NOT NULL,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
