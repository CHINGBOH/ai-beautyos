CREATE TABLE "medical_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_name" varchar(200),
	"category" varchar(50) NOT NULL,
	"description" text,
	"price_range" varchar(100),
	"recovery_time" varchar(100),
	"keywords" text,
	"is_active" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "website_navigation" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_key" varchar(100),
	"nav_key" varchar(100) NOT NULL,
	"title" varchar(200) NOT NULL,
	"link" varchar(500),
	"icon" varchar(50),
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"is_external" integer DEFAULT 0 NOT NULL,
	"open_in_new_tab" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "hood" varchar(200);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "birthday" timestamp;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "important_holidays" text;