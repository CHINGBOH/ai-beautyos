ALTER TABLE "knowledge_base" ALTER COLUMN "category" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD COLUMN "parent_id" integer;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD COLUMN "level" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD COLUMN "path" text;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD COLUMN "order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD COLUMN "module" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD COLUMN "sub_category" varchar(100);--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD COLUMN "positive_evidence" text;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD COLUMN "negative_evidence" text;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD COLUMN "neutral_analysis" text;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD COLUMN "practical_guide" text;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD COLUMN "case_studies" text;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD COLUMN "expert_opinions" text;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD COLUMN "images" text;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD COLUMN "videos" text;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD COLUMN "audio" text;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD COLUMN "sources" text;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD COLUMN "credibility" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD COLUMN "difficulty" varchar(20) DEFAULT 'beginner';--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD COLUMN "like_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "knowledge_base" ADD COLUMN "share_count" integer DEFAULT 0 NOT NULL;