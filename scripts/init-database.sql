-- PostgreSQL 数据库初始化脚本
-- 执行方式: psql -U postgres -d medical_beauty_crm -f scripts/init-database.sql

-- 启用扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    "openId" VARCHAR(64) NOT NULL UNIQUE,
    name TEXT,
    email VARCHAR(320),
    "loginMethod" VARCHAR(64),
    role VARCHAR(20) DEFAULT 'user' NOT NULL,
    "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    "lastSignedIn" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 创建系统配置表
CREATE TABLE IF NOT EXISTS system_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT,
    description TEXT,
    is_active INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 创建知识库表
CREATE TABLE IF NOT EXISTS knowledge_base (
    id SERIAL PRIMARY KEY,
    type VARCHAR(20) DEFAULT 'customer' NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    tags TEXT,
    embedding TEXT,
    view_count INTEGER DEFAULT 0 NOT NULL,
    used_count INTEGER DEFAULT 0 NOT NULL,
    is_active INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 创建对话表
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL UNIQUE,
    visitor_name VARCHAR(100),
    visitor_phone VARCHAR(20),
    visitor_wechat VARCHAR(100),
    source VARCHAR(50) DEFAULT 'web' NOT NULL,
    status VARCHAR(20) DEFAULT 'active' NOT NULL,
    lead_id VARCHAR(100),
    psychology_type VARCHAR(20),
    psychology_tags TEXT,
    budget_level VARCHAR(20),
    customer_tier VARCHAR(10),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 创建消息表
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    knowledge_used TEXT,
    extracted_info TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 创建线索表
CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    airtable_id VARCHAR(100) UNIQUE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    wechat VARCHAR(100),
    age INTEGER,
    interested_services TEXT,
    budget VARCHAR(50),
    budget_level VARCHAR(20),
    message TEXT,
    source VARCHAR(50) NOT NULL,
    source_content VARCHAR(255),
    status VARCHAR(50) DEFAULT 'new' NOT NULL,
    psychology_type VARCHAR(50),
    psychology_tags TEXT,
    customer_tier VARCHAR(10),
    notes TEXT,
    follow_up_date TIMESTAMP,
    conversation_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    synced_at TIMESTAMP
);

-- 创建触发器表
CREATE TABLE IF NOT EXISTS triggers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL,
    time_config TEXT,
    behavior_config TEXT,
    weather_config TEXT,
    action VARCHAR(30) NOT NULL,
    action_config TEXT,
    target_filter TEXT,
    is_active INTEGER DEFAULT 1 NOT NULL,
    execution_count INTEGER DEFAULT 0 NOT NULL,
    last_executed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 创建触发器执行记录表
CREATE TABLE IF NOT EXISTS trigger_executions (
    id SERIAL PRIMARY KEY,
    trigger_id INTEGER NOT NULL,
    lead_id INTEGER,
    executed_at TIMESTAMP DEFAULT NOW() NOT NULL,
    status VARCHAR(20) NOT NULL,
    result TEXT,
    error_message TEXT
);

-- 创建小红书内容表
CREATE TABLE IF NOT EXISTS xiaohongshu_posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    images TEXT,
    tags TEXT,
    content_type VARCHAR(50) NOT NULL,
    project VARCHAR(100),
    status VARCHAR(20) DEFAULT 'draft' NOT NULL,
    published_at TIMESTAMP,
    scheduled_at TIMESTAMP,
    view_count INTEGER DEFAULT 0 NOT NULL,
    like_count INTEGER DEFAULT 0 NOT NULL,
    comment_count INTEGER DEFAULT 0 NOT NULL,
    share_count INTEGER DEFAULT 0 NOT NULL,
    collect_count INTEGER DEFAULT 0 NOT NULL,
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 创建小红书评论表
CREATE TABLE IF NOT EXISTS xiaohongshu_comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL,
    author_name VARCHAR(100) NOT NULL,
    author_avatar VARCHAR(500),
    content TEXT NOT NULL,
    reply_content TEXT,
    reply_status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    sentiment VARCHAR(20),
    is_filtered INTEGER DEFAULT 0 NOT NULL,
    commented_at TIMESTAMP NOT NULL,
    replied_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 创建企业微信配置表
CREATE TABLE IF NOT EXISTS wework_config (
    id SERIAL PRIMARY KEY,
    corp_id VARCHAR(100),
    corp_secret VARCHAR(200),
    agent_id INTEGER,
    token VARCHAR(100),
    encoding_aes_key VARCHAR(200),
    access_token TEXT,
    token_expires_at TIMESTAMP,
    is_active INTEGER DEFAULT 1 NOT NULL,
    is_mock_mode INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 创建企业微信联系我配置表
CREATE TABLE IF NOT EXISTS wework_contact_way (
    id SERIAL PRIMARY KEY,
    config_id VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(10) DEFAULT 'single' NOT NULL,
    scene VARCHAR(10) DEFAULT '1' NOT NULL,
    qr_code TEXT,
    remark VARCHAR(255),
    skip_verify INTEGER DEFAULT 1 NOT NULL,
    state VARCHAR(100),
    user_ids TEXT,
    is_active INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 创建企业微信客户表
CREATE TABLE IF NOT EXISTS wework_customers (
    id SERIAL PRIMARY KEY,
    external_user_id VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(100),
    avatar TEXT,
    type VARCHAR(10) DEFAULT '1' NOT NULL,
    gender VARCHAR(10) DEFAULT '0' NOT NULL,
    union_id VARCHAR(100),
    position VARCHAR(100),
    corp_name VARCHAR(200),
    corp_full_name VARCHAR(200),
    external_profile TEXT,
    follow_user_id VARCHAR(100),
    remark VARCHAR(255),
    description TEXT,
    create_time TIMESTAMP,
    tags TEXT,
    state VARCHAR(100),
    conversation_id INTEGER,
    lead_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 创建企业微信消息表
CREATE TABLE IF NOT EXISTS wework_messages (
    id SERIAL PRIMARY KEY,
    external_user_id VARCHAR(100) NOT NULL,
    send_user_id VARCHAR(100) NOT NULL,
    msg_type VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    error_msg TEXT,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 初始化Airtable配置
INSERT INTO system_config (config_key, config_value, description, is_active)
VALUES (
    'airtable',
    '{"token":"","baseId":""}',
    'Airtable CRM integration configuration',
    1
)
ON CONFLICT (config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value,
    updated_at = NOW();

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为所有表添加更新时间触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON knowledge_base FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_triggers_updated_at BEFORE UPDATE ON triggers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_xiaohongshu_posts_updated_at BEFORE UPDATE ON xiaohongshu_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wework_config_updated_at BEFORE UPDATE ON wework_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wework_contact_way_updated_at BEFORE UPDATE ON wework_contact_way FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wework_customers_updated_at BEFORE UPDATE ON wework_customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
