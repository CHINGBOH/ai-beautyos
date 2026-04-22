-- =============================================================================
-- 一键建表 SQL（与 Drizzle schema 一致）
-- 使用场景：本机 PostgreSQL 认证失败无法执行 npm run db:push 时，
--          在数据库可用后手动执行本文件即可完成所有表创建。
-- 用法：psql "$DATABASE_URL" -f scripts/create-all-tables.sql
-- 或：  psql -U 用户名 -d 数据库名 -h 主机 -f scripts/create-all-tables.sql
-- 可选：需向量搜索时请先安装 pgvector，本脚本会执行 CREATE EXTENSION IF NOT EXISTS vector;
-- =============================================================================

-- 可选：启用 pgvector（若未安装扩展可注释掉下一行）
-- CREATE EXTENSION IF NOT EXISTS vector;

-- -----------------------------------------------------------------------------
-- 1. 无外键依赖的基础表
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  "openId" varchar(64) NOT NULL UNIQUE,
  name text,
  email varchar(320),
  "loginMethod" varchar(64),
  role varchar(20) DEFAULT 'user' NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "lastSignedIn" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS system_config (
  id serial PRIMARY KEY,
  config_key varchar(100) NOT NULL UNIQUE,
  config_value text,
  description text,
  is_active integer DEFAULT 1 NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_base (
  id serial PRIMARY KEY,
  type varchar(20) DEFAULT 'customer' NOT NULL,
  title varchar(255) NOT NULL,
  content text NOT NULL,
  category varchar(100) NOT NULL,
  tags text,
  embedding text,
  view_count integer DEFAULT 0 NOT NULL,
  used_count integer DEFAULT 0 NOT NULL,
  is_active integer DEFAULT 1 NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL,
  embedding_json text,
  quality_score numeric(3,2) DEFAULT '0.00',
  estimated_read_time integer DEFAULT 5,
  version varchar(20) DEFAULT '1.0',
  last_reviewed_at timestamp,
  parent_id integer,
  level integer DEFAULT 1 NOT NULL,
  path text,
  "order" integer DEFAULT 0 NOT NULL,
  module varchar(50) DEFAULT 'skin_care' NOT NULL,
  sub_category varchar(100),
  summary text,
  positive_evidence text,
  negative_evidence text,
  neutral_analysis text,
  practical_guide text,
  case_studies text,
  expert_opinions text,
  images text,
  videos text,
  audio text,
  sources text,
  credibility integer DEFAULT 5 NOT NULL,
  difficulty varchar(20) DEFAULT 'beginner',
  like_count integer DEFAULT 0 NOT NULL,
  share_count integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
  id serial PRIMARY KEY,
  session_id varchar(64) NOT NULL UNIQUE,
  visitor_name varchar(100),
  visitor_phone varchar(20),
  visitor_wechat varchar(100),
  source varchar(50) DEFAULT 'web' NOT NULL,
  status varchar(20) DEFAULT 'active' NOT NULL,
  lead_id varchar(100),
  psychology_type varchar(20),
  psychology_tags text,
  budget_level varchar(20),
  customer_tier varchar(10),
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id serial PRIMARY KEY,
  conversation_id integer NOT NULL,
  role varchar(20) NOT NULL,
  content text NOT NULL,
  knowledge_used text,
  extracted_info text,
  created_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS leads (
  id serial PRIMARY KEY,
  airtable_id varchar(100) UNIQUE,
  name varchar(100) NOT NULL,
  phone varchar(20) NOT NULL,
  wechat varchar(100),
  age integer,
  interested_services text,
  budget varchar(50),
  budget_level varchar(20),
  message text,
  source varchar(50) NOT NULL,
  source_content varchar(255),
  status varchar(50) DEFAULT 'new' NOT NULL,
  psychology_type varchar(50),
  psychology_tags text,
  customer_tier varchar(10),
  notes text,
  follow_up_date timestamp,
  conversation_id integer,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL,
  synced_at timestamp
);

CREATE TABLE IF NOT EXISTS triggers (
  id serial PRIMARY KEY,
  name varchar(255) NOT NULL,
  description text,
  type varchar(20) NOT NULL,
  time_config text,
  behavior_config text,
  weather_config text,
  action varchar(30) NOT NULL,
  action_config text,
  target_filter text,
  is_active integer DEFAULT 1 NOT NULL,
  execution_count integer DEFAULT 0 NOT NULL,
  last_executed_at timestamp,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS trigger_executions (
  id serial PRIMARY KEY,
  trigger_id integer NOT NULL,
  lead_id integer,
  executed_at timestamp DEFAULT now() NOT NULL,
  status varchar(20) NOT NULL,
  result text,
  error_message text
);

CREATE TABLE IF NOT EXISTS wework_config (
  id serial PRIMARY KEY,
  corp_id varchar(100),
  corp_secret varchar(200),
  agent_id integer,
  token varchar(100),
  encoding_aes_key varchar(200),
  access_token text,
  token_expires_at timestamp,
  is_active integer DEFAULT 1 NOT NULL,
  is_mock_mode integer DEFAULT 1 NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS wework_contact_way (
  id serial PRIMARY KEY,
  config_id varchar(100) NOT NULL UNIQUE,
  type varchar(10) DEFAULT 'single' NOT NULL,
  scene varchar(10) DEFAULT '1' NOT NULL,
  qr_code text,
  remark varchar(255),
  skip_verify integer DEFAULT 1 NOT NULL,
  state varchar(100),
  user_ids text,
  is_active integer DEFAULT 1 NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS wework_customers (
  id serial PRIMARY KEY,
  external_user_id varchar(100) NOT NULL UNIQUE,
  name varchar(100),
  avatar text,
  type varchar(10) DEFAULT '1' NOT NULL,
  gender varchar(10) DEFAULT '0' NOT NULL,
  union_id varchar(100),
  position varchar(100),
  corp_name varchar(200),
  corp_full_name varchar(200),
  external_profile text,
  follow_user_id varchar(100),
  remark varchar(255),
  description text,
  create_time timestamp,
  tags text,
  state varchar(100),
  conversation_id integer,
  lead_id varchar(100),
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS wework_messages (
  id serial PRIMARY KEY,
  external_user_id varchar(100) NOT NULL,
  send_user_id varchar(100) NOT NULL,
  msg_type varchar(20) NOT NULL,
  content text NOT NULL,
  status varchar(20) DEFAULT 'pending' NOT NULL,
  error_msg text,
  sent_at timestamp,
  created_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS xiaohongshu_posts (
  id serial PRIMARY KEY,
  title varchar(255) NOT NULL,
  content text NOT NULL,
  images text,
  tags text,
  content_type varchar(50) NOT NULL,
  project varchar(100),
  status varchar(20) DEFAULT 'draft' NOT NULL,
  published_at timestamp,
  scheduled_at timestamp,
  view_count integer DEFAULT 0 NOT NULL,
  like_count integer DEFAULT 0 NOT NULL,
  comment_count integer DEFAULT 0 NOT NULL,
  share_count integer DEFAULT 0 NOT NULL,
  collect_count integer DEFAULT 0 NOT NULL,
  last_synced_at timestamp,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS xiaohongshu_comments (
  id serial PRIMARY KEY,
  post_id integer NOT NULL,
  author_name varchar(100) NOT NULL,
  author_avatar varchar(500),
  content text NOT NULL,
  reply_content text,
  reply_status varchar(20) DEFAULT 'pending' NOT NULL,
  sentiment varchar(20),
  is_filtered integer DEFAULT 0 NOT NULL,
  commented_at timestamp NOT NULL,
  replied_at timestamp,
  created_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS website_content (
  id serial PRIMARY KEY,
  page_key varchar(100) NOT NULL,
  section_key varchar(100),
  content_type varchar(50) NOT NULL,
  title varchar(255),
  content text NOT NULL,
  image_url text,
  link_url text,
  link_text varchar(255),
  sort_order integer DEFAULT 0 NOT NULL,
  is_active integer DEFAULT 1 NOT NULL,
  metadata text,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS medical_projects (
  id serial PRIMARY KEY,
  name varchar(100) NOT NULL,
  display_name varchar(200),
  category varchar(50) NOT NULL,
  description text,
  price_range varchar(100),
  recovery_time varchar(100),
  keywords text,
  is_active integer DEFAULT 1 NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS website_navigation (
  id serial PRIMARY KEY,
  parent_key varchar(100),
  nav_key varchar(100) NOT NULL,
  title varchar(200) NOT NULL,
  link varchar(500),
  icon varchar(50),
  description text,
  sort_order integer DEFAULT 0 NOT NULL,
  is_active integer DEFAULT 1 NOT NULL,
  is_external integer DEFAULT 0 NOT NULL,
  open_in_new_tab integer DEFAULT 0 NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL,
  updated_at timestamp DEFAULT now() NOT NULL
);

-- -----------------------------------------------------------------------------
-- 2. 依赖 knowledge_base / users / xiaohongshu_posts 的表
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS xiaohongshu_content_history (
  id serial PRIMARY KEY,
  post_id integer NOT NULL,
  version integer DEFAULT 1 NOT NULL,
  title varchar(255) NOT NULL,
  content text NOT NULL,
  tags text,
  content_type varchar(50) NOT NULL,
  project varchar(100),
  quality_score numeric(5,2),
  validation_errors text,
  validation_warnings text,
  generated_by varchar(50) DEFAULT 'ai' NOT NULL,
  generation_params text,
  from_cache integer DEFAULT 0 NOT NULL,
  created_at timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS content_quality_metrics (
  id serial PRIMARY KEY,
  content_id integer NOT NULL UNIQUE,
  completeness_score numeric(3,2) DEFAULT '0.00' CHECK (completeness_score >= 0 AND completeness_score <= 1),
  reliability_score numeric(3,2) DEFAULT '0.00' CHECK (reliability_score >= 0 AND reliability_score <= 1),
  credibility_score numeric(3,2) DEFAULT '0.00' CHECK (credibility_score >= 0 AND credibility_score <= 1),
  richness_score numeric(3,2) DEFAULT '0.00' CHECK (richness_score >= 0 AND richness_score <= 1),
  engagement_score numeric(3,2) DEFAULT '0.00' CHECK (engagement_score >= 0 AND engagement_score <= 1),
  overall_score numeric(3,2) DEFAULT '0.00' CHECK (overall_score >= 0 AND overall_score <= 1),
  issues jsonb DEFAULT '[]'::jsonb,
  recommendations jsonb DEFAULT '[]'::jsonb,
  status varchar(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','needs_revision')),
  reviewed_by varchar(100),
  reviewed_at timestamp,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expert_reviews (
  id serial PRIMARY KEY,
  content_id integer NOT NULL,
  expert_id varchar(100) NOT NULL,
  expert_name varchar(200) NOT NULL,
  credentials text,
  review_date timestamp DEFAULT now(),
  overall_rating integer NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 10),
  comments text,
  recommendations text[],
  approved boolean DEFAULT false,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_learning_progress (
  id serial PRIMARY KEY,
  user_id integer NOT NULL,
  content_id integer NOT NULL,
  status varchar(20) DEFAULT 'started' NOT NULL CHECK (status IN ('started','in_progress','completed','skipped')),
  time_spent integer DEFAULT 0,
  rating integer CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  feedback text,
  started_at timestamp DEFAULT now(),
  completed_at timestamp,
  updated_at timestamp DEFAULT now(),
  UNIQUE(user_id, content_id)
);

CREATE TABLE IF NOT EXISTS user_learning_preferences (
  id serial PRIMARY KEY,
  user_id integer NOT NULL UNIQUE,
  preferred_difficulty varchar(20) DEFAULT 'beginner' CHECK (preferred_difficulty IN ('beginner','intermediate','advanced')),
  preferred_content_types text[],
  learning_goals text[],
  time_preference varchar(20) DEFAULT 'medium' CHECK (time_preference IN ('short','medium','long')),
  interests text[],
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learning_analytics (
  id serial PRIMARY KEY,
  user_id integer NOT NULL,
  event_type varchar(50) NOT NULL,
  content_id integer,
  session_id varchar(100),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp DEFAULT now()
);

-- 外键（仅当约束不存在时添加，可重复执行）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'xiaohongshu_content_history_post_id_fkey') THEN
    ALTER TABLE xiaohongshu_content_history
      ADD CONSTRAINT xiaohongshu_content_history_post_id_fkey
      FOREIGN KEY (post_id) REFERENCES xiaohongshu_posts(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'content_quality_metrics_content_id_fkey') THEN
    ALTER TABLE content_quality_metrics
      ADD CONSTRAINT content_quality_metrics_content_id_fkey
      FOREIGN KEY (content_id) REFERENCES knowledge_base(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'expert_reviews_content_id_fkey') THEN
    ALTER TABLE expert_reviews
      ADD CONSTRAINT expert_reviews_content_id_fkey
      FOREIGN KEY (content_id) REFERENCES knowledge_base(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_learning_progress_user_id_fkey') THEN
    ALTER TABLE user_learning_progress
      ADD CONSTRAINT user_learning_progress_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_learning_progress_content_id_fkey') THEN
    ALTER TABLE user_learning_progress
      ADD CONSTRAINT user_learning_progress_content_id_fkey
      FOREIGN KEY (content_id) REFERENCES knowledge_base(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_learning_preferences_user_id_fkey') THEN
    ALTER TABLE user_learning_preferences
      ADD CONSTRAINT user_learning_preferences_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'learning_analytics_user_id_fkey') THEN
    ALTER TABLE learning_analytics
      ADD CONSTRAINT learning_analytics_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'learning_analytics_content_id_fkey') THEN
    ALTER TABLE learning_analytics
      ADD CONSTRAINT learning_analytics_content_id_fkey
      FOREIGN KEY (content_id) REFERENCES knowledge_base(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 索引（若已存在会报错，可忽略或加 IF NOT EXISTS 需 PG 9.5+）
CREATE INDEX IF NOT EXISTS idx_content_quality_metrics_content_id ON content_quality_metrics(content_id);
CREATE INDEX IF NOT EXISTS idx_content_quality_metrics_overall_score ON content_quality_metrics(overall_score);
CREATE INDEX IF NOT EXISTS idx_content_quality_metrics_status ON content_quality_metrics(status);
CREATE INDEX IF NOT EXISTS idx_expert_reviews_content_id ON expert_reviews(content_id);
CREATE INDEX IF NOT EXISTS idx_expert_reviews_expert_id ON expert_reviews(expert_id);
CREATE INDEX IF NOT EXISTS idx_expert_reviews_approved ON expert_reviews(approved);
CREATE INDEX IF NOT EXISTS idx_user_learning_progress_user_id ON user_learning_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_learning_progress_content_id ON user_learning_progress(content_id);
CREATE INDEX IF NOT EXISTS idx_user_learning_progress_status ON user_learning_progress(status);
CREATE INDEX IF NOT EXISTS idx_user_learning_preferences_user_id ON user_learning_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_analytics_user_id ON learning_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_analytics_content_id ON learning_analytics(content_id);
CREATE INDEX IF NOT EXISTS idx_learning_analytics_event_type ON learning_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_learning_analytics_created_at ON learning_analytics(created_at);

-- API 推荐索引（conversations, messages, leads, knowledge_base, triggers, trigger_executions, website_*, medical_projects, xiaohongshu_*）
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id_created_at ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_birthday ON leads(birthday);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_module_is_active ON knowledge_base(module, is_active);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_type_is_active ON knowledge_base(type, is_active);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_parent_id ON knowledge_base(parent_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_path ON knowledge_base(path);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_module_is_active_level_order ON knowledge_base(module, is_active, level, "order");
CREATE INDEX IF NOT EXISTS idx_triggers_created_at ON triggers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_triggers_is_active_type ON triggers(is_active, type);
CREATE INDEX IF NOT EXISTS idx_trigger_executions_trigger_id_executed_at ON trigger_executions(trigger_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_website_content_page_key_is_active_sort_order ON website_content(page_key, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_website_navigation_is_active_parent_key_sort_order ON website_navigation(is_active, parent_key, sort_order);
CREATE INDEX IF NOT EXISTS idx_website_navigation_nav_key ON website_navigation(nav_key);
CREATE INDEX IF NOT EXISTS idx_medical_projects_is_active_sort_order ON medical_projects(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_medical_projects_category_is_active ON medical_projects(category, is_active);
CREATE INDEX IF NOT EXISTS idx_xiaohongshu_posts_status_created_at ON xiaohongshu_posts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xiaohongshu_comments_post_id_commented_at ON xiaohongshu_comments(post_id, commented_at DESC);
CREATE INDEX IF NOT EXISTS idx_xiaohongshu_content_history_post_id_created_at ON xiaohongshu_content_history(post_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 3. 可选：初始化系统配置（与 init-database.sql 一致）
-- -----------------------------------------------------------------------------
INSERT INTO system_config (config_key, config_value, description, is_active)
VALUES (
  'airtable',
  '{"token":"patEJHiiGQRBKSgBQ","baseId":"appkA4QaGKyrdr684"}',
  'Airtable CRM integration configuration',
  1
)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- 4. 可选：更新时间触发器（与 init-database.sql 一致）
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各表 updated_at 自动更新触发器（PostgreSQL 11+ 可用 EXECUTE FUNCTION，此处用 PROCEDURE 兼容）
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
DROP TRIGGER IF EXISTS update_system_config_updated_at ON system_config;
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
DROP TRIGGER IF EXISTS update_knowledge_base_updated_at ON knowledge_base;
CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON knowledge_base FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
DROP TRIGGER IF EXISTS update_triggers_updated_at ON triggers;
CREATE TRIGGER update_triggers_updated_at BEFORE UPDATE ON triggers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
DROP TRIGGER IF EXISTS update_xiaohongshu_posts_updated_at ON xiaohongshu_posts;
CREATE TRIGGER update_xiaohongshu_posts_updated_at BEFORE UPDATE ON xiaohongshu_posts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
DROP TRIGGER IF EXISTS update_wework_config_updated_at ON wework_config;
CREATE TRIGGER update_wework_config_updated_at BEFORE UPDATE ON wework_config FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
DROP TRIGGER IF EXISTS update_wework_contact_way_updated_at ON wework_contact_way;
CREATE TRIGGER update_wework_contact_way_updated_at BEFORE UPDATE ON wework_contact_way FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
DROP TRIGGER IF EXISTS update_wework_customers_updated_at ON wework_customers;
CREATE TRIGGER update_wework_customers_updated_at BEFORE UPDATE ON wework_customers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
DROP TRIGGER IF EXISTS update_website_content_updated_at ON website_content;
CREATE TRIGGER update_website_content_updated_at BEFORE UPDATE ON website_content FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
DROP TRIGGER IF EXISTS update_medical_projects_updated_at ON medical_projects;
CREATE TRIGGER update_medical_projects_updated_at BEFORE UPDATE ON medical_projects FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
DROP TRIGGER IF EXISTS update_website_navigation_updated_at ON website_navigation;
CREATE TRIGGER update_website_navigation_updated_at BEFORE UPDATE ON website_navigation FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
