-- 补全与当前 schema 一致的列（表已存在、列缺失时执行）。PostgreSQL 9.5+ 支持 ADD COLUMN IF NOT EXISTS。

-- leads：0004 新增
;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS hood varchar(200);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS birthday timestamp;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS important_holidays text;

-- knowledge_base：0001 层级与内容列（parent_id 用于 idx_knowledge_base_parent_id）
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS parent_id integer;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS level integer DEFAULT 1 NOT NULL;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS path text;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS "order" integer DEFAULT 0 NOT NULL;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS module varchar(50) DEFAULT 'skin_care' NOT NULL;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS sub_category varchar(100);
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS summary text;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS positive_evidence text;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS negative_evidence text;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS neutral_analysis text;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS practical_guide text;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS case_studies text;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS expert_opinions text;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS images text;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS videos text;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS audio text;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS sources text;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS credibility integer DEFAULT 5 NOT NULL;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS difficulty varchar(20) DEFAULT 'beginner';
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS like_count integer DEFAULT 0 NOT NULL;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS share_count integer DEFAULT 0 NOT NULL;

-- knowledge_base：0003 扩展列
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS embedding_json text;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS quality_score numeric(3,2) DEFAULT 0.00;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS estimated_read_time integer DEFAULT 5;
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS version varchar(20) DEFAULT '1.0';
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS last_reviewed_at timestamp;
