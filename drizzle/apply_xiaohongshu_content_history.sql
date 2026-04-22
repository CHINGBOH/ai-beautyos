-- 仅创建 xiaohongshu_content_history 表（内容管理历史记录）
-- 使用场景：无法执行完整 migrate 时，可手动执行本文件。
-- 执行前需确保已存在 xiaohongshu_posts 表。
-- 用法：psql "$DATABASE_URL" -f drizzle/apply_xiaohongshu_content_history.sql

CREATE TABLE IF NOT EXISTS "xiaohongshu_content_history" (
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
  "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'xiaohongshu_content_history_post_id_fkey'
  ) THEN
    ALTER TABLE "xiaohongshu_content_history"
      ADD CONSTRAINT "xiaohongshu_content_history_post_id_fkey"
      FOREIGN KEY ("post_id") REFERENCES "public"."xiaohongshu_posts"("id") ON DELETE CASCADE;
  END IF;
END $$;
