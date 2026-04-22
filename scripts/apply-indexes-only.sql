-- 仅创建 API 推荐索引（与 drizzle 0005 一致），表已存在时用。IF NOT EXISTS 可重复执行。
-- 覆盖：conversations/messages | leads | knowledge_base | triggers/trigger_executions
--       website_content/navigation | medical_projects | xiaohongshu_*
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
