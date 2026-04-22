-- 添加知识库层级结构支持
-- 为现有的 knowledge_base 表添加新字段

-- 添加层级结构字段
ALTER TABLE "knowledge_base" 
ADD COLUMN IF NOT EXISTS "parent_id" integer,
ADD COLUMN IF NOT EXISTS "level" integer DEFAULT 1 NOT NULL,
ADD COLUMN IF NOT EXISTS "path" text,
ADD COLUMN IF NOT EXISTS "order" integer DEFAULT 0 NOT NULL;

-- 添加模块字段
ALTER TABLE "knowledge_base"
ADD COLUMN IF NOT EXISTS "module" varchar(50) NOT NULL DEFAULT 'skin_care',
ADD COLUMN IF NOT EXISTS "sub_category" varchar(100);

-- 添加内容扩展字段
ALTER TABLE "knowledge_base"
ADD COLUMN IF NOT EXISTS "summary" text,
ADD COLUMN IF NOT EXISTS "positive_evidence" text,
ADD COLUMN IF NOT EXISTS "negative_evidence" text,
ADD COLUMN IF NOT EXISTS "neutral_analysis" text,
ADD COLUMN IF NOT EXISTS "practical_guide" text,
ADD COLUMN IF NOT EXISTS "case_studies" text,
ADD COLUMN IF NOT EXISTS "expert_opinions" text;

-- 添加多媒体字段
ALTER TABLE "knowledge_base"
ADD COLUMN IF NOT EXISTS "images" text,
ADD COLUMN IF NOT EXISTS "videos" text,
ADD COLUMN IF NOT EXISTS "audio" text;

-- 添加元数据字段
ALTER TABLE "knowledge_base"
ADD COLUMN IF NOT EXISTS "sources" text,
ADD COLUMN IF NOT EXISTS "credibility" integer DEFAULT 5 NOT NULL,
ADD COLUMN IF NOT EXISTS "difficulty" varchar(20) DEFAULT 'beginner';

-- 添加统计字段
ALTER TABLE "knowledge_base"
ADD COLUMN IF NOT EXISTS "like_count" integer DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS "share_count" integer DEFAULT 0 NOT NULL;

-- 更新现有数据的模块字段（基于category推断）
UPDATE "knowledge_base" 
SET "module" = CASE 
  WHEN "category" LIKE '%睡眠%' OR "category" LIKE '%水分%' OR "category" LIKE '%心情%' OR "category" LIKE '%饮食%' OR "category" LIKE '%运动%' THEN 'health_foundation'
  WHEN "category" LIKE '%皮肤%' OR "category" LIKE '%色斑%' OR "category" LIKE '%痘痘%' OR "category" LIKE '%敏感%' THEN 'skin_care'
  WHEN "category" LIKE '%牙齿%' OR "category" LIKE '%口腔%' THEN 'dental_care'
  WHEN "category" LIKE '%中医%' OR "category" LIKE '%体质%' OR "category" LIKE '%食疗%' THEN 'tcm'
  WHEN "category" LIKE '%医美%' OR "category" LIKE '%激光%' OR "category" LIKE '%超皮秒%' THEN 'aesthetics'
  ELSE 'skin_care'
END
WHERE "module" = 'skin_care' OR "module" IS NULL;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS "idx_knowledge_base_module" ON "knowledge_base"("module");
CREATE INDEX IF NOT EXISTS "idx_knowledge_base_parent_id" ON "knowledge_base"("parent_id");
CREATE INDEX IF NOT EXISTS "idx_knowledge_base_level" ON "knowledge_base"("level");
CREATE INDEX IF NOT EXISTS "idx_knowledge_base_path" ON "knowledge_base"("path");
CREATE INDEX IF NOT EXISTS "idx_knowledge_base_type_active" ON "knowledge_base"("type", "is_active");
