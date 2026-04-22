-- PostgreSQL 数据库全面优化脚本
-- 执行方式: psql -U postgres -d medical_beauty_crm -f scripts/optimize-postgres.sql

-- 1. 启用pgvector插件
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- 文本相似性索引
CREATE EXTENSION IF NOT EXISTS btree_gin; -- GIN复合索引
CREATE EXTENSION IF NOT EXISTS pg_stat_statements; -- 性能监控

-- 2. 添加向量字段到knowledge_base表
ALTER TABLE knowledge_base 
ADD COLUMN IF NOT EXISTS embedding vector(1536),
ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(50) DEFAULT 'text-embedding-3-small',
ADD COLUMN IF NOT EXISTS embedding_created_at TIMESTAMP DEFAULT NOW();

-- 3. 优化文本字段（分离大文本）
CREATE TABLE IF NOT EXISTS knowledge_content_large (
  id SERIAL PRIMARY KEY,
  knowledge_id INTEGER NOT NULL REFERENCES knowledge_base(id) ON DELETE CASCADE,
  content_type VARCHAR(20) DEFAULT 'main', -- main, positive_evidence, negative_evidence
  content_text TEXT NOT NULL,
  text_length INTEGER GENERATED ALWAYS AS (length(content_text)) STORED,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. 创建向量索引（HNSW算法，适合cosine相似度）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_knowledge_embedding_cosine 
ON knowledge_base USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 5. 优化文本搜索索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_knowledge_title_trgm 
ON knowledge_base USING gin (title gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_knowledge_category_btree 
ON knowledge_base (category, is_active) 
WHERE is_active = 1;

-- 6. 优化对话表索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_phone_active 
ON conversations (visitor_phone) 
WHERE visitor_phone IS NOT NULL AND status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_role 
ON messages (conversation_id, role, created_at DESC);

-- 7. 优化线索表索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_psychology_tier 
ON leads (psychology_type, customer_tier) 
WHERE status != 'archived';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_source_status 
ON leads (source, status, created_at DESC);

-- 8. 创建物化视图优化查询
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_knowledge_stats AS
SELECT 
  kb.category,
  kb.module,
  COUNT(*) as total_count,
  AVG(kb.quality_score::numeric) as avg_quality,
  SUM(kb.used_count) as total_usage,
  MAX(kb.updated_at) as last_updated
FROM knowledge_base kb 
WHERE kb.is_active = 1
GROUP BY kb.category, kb.module;

-- 为物化视图创建索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_knowledge_stats_category_module
ON mv_knowledge_stats (category, module);

-- 9. 创建向量搜索函数
CREATE OR REPLACE FUNCTION vector_search_knowledge(
  query_embedding vector(1536),
  result_limit integer DEFAULT 5,
  similarity_threshold double precision DEFAULT 0.7
)
RETURNS TABLE (
  id integer,
  title varchar,
  content text,
  category varchar,
  similarity double precision
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kb.id,
    kb.title,
    kb.content,
    kb.category,
    1 - (kb.embedding <=> query_embedding) as similarity
  FROM knowledge_base kb
  WHERE 
    kb.embedding IS NOT NULL 
    AND kb.is_active = 1
    AND 1 - (kb.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- 10. 创建混合搜索函数（向量 + 文本）
CREATE OR REPLACE FUNCTION hybrid_search_knowledge(
  query_text text,
  query_embedding vector(1536) DEFAULT NULL,
  result_limit integer DEFAULT 10
)
RETURNS TABLE (
  id integer,
  title varchar,
  content text,
  category varchar,
  text_score double precision,
  vector_score double precision,
  combined_score double precision
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kb.id,
    kb.title,
    kb.content,
    kb.category,
    -- 文本相似度分数
    CASE 
      WHEN kb.title ILIKE '%' || query_text || '%' THEN 1.0
      WHEN kb.content ILIKE '%' || query_text || '%' THEN 0.7
      ELSE similarity(kb.title, query_text) * 0.8 + similarity(kb.content, query_text) * 0.2
    END as text_score,
    -- 向量相似度分数
    CASE 
      WHEN query_embedding IS NOT NULL AND kb.embedding IS NOT NULL 
      THEN 1 - (kb.embedding <=> query_embedding)
      ELSE 0.0
    END as vector_score,
    -- 综合分数（0.6*文本 + 0.4*向量）
    (
      CASE 
        WHEN kb.title ILIKE '%' || query_text || '%' THEN 1.0
        WHEN kb.content ILIKE '%' || query_text || '%' THEN 0.7
        ELSE similarity(kb.title, query_text) * 0.8 + similarity(kb.content, query_text) * 0.2
      END * 0.6 +
      CASE 
        WHEN query_embedding IS NOT NULL AND kb.embedding IS NOT NULL 
        THEN (1 - (kb.embedding <=> query_embedding)) * 0.4
        ELSE 0.0
      END
    ) as combined_score
  FROM knowledge_base kb
  WHERE 
    kb.is_active = 1
    AND (
      kb.title ILIKE '%' || query_text || '%' OR
      kb.content ILIKE '%' || query_text || '%' OR
      kb.title % query_text OR
      (query_embedding IS NOT NULL AND kb.embedding IS NOT NULL)
    )
  ORDER BY combined_score DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- 11. 数据库性能优化设置
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '512MB';
ALTER SYSTEM SET effective_cache_size = '2GB';
ALTER SYSTEM SET maintenance_work_mem = '256MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;

-- 12. 创建数据清理任务
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- 清理老旧的触发器执行记录（保留3个月）
  DELETE FROM trigger_executions 
  WHERE executed_at < NOW() - INTERVAL '3 months';
  
  -- 清理非活跃对话（保留6个月）
  DELETE FROM messages 
  WHERE conversation_id IN (
    SELECT id FROM conversations 
    WHERE status = 'inactive' 
    AND updated_at < NOW() - INTERVAL '6 months'
  );
  
  DELETE FROM conversations 
  WHERE status = 'inactive' 
  AND updated_at < NOW() - INTERVAL '6 months';
  
  -- 更新统计信息
  ANALYZE;
  
  -- 刷新物化视图
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_knowledge_stats;
END;
$$ LANGUAGE plpgsql;

-- 13. 监控查询视图
CREATE OR REPLACE VIEW db_performance_stats AS
SELECT 
  schemaname,
  tablename,
  attname as column_name,
  n_distinct,
  correlation,
  most_common_vals
FROM pg_stats 
WHERE schemaname = 'public'
ORDER BY tablename, attname;

-- 14. 数据验证规则
ALTER TABLE knowledge_base 
ADD CONSTRAINT check_quality_score 
CHECK (quality_score >= 0 AND quality_score <= 5);

ALTER TABLE knowledge_base
ADD CONSTRAINT check_embedding_dimension
CHECK (embedding IS NULL OR array_length(embedding, 1) = 1536);

-- 15. 数据完整性检查
CREATE OR REPLACE FUNCTION check_data_integrity()
RETURNS TABLE (
  table_name text,
  issue_type text,
  issue_count bigint
) AS $$
BEGIN
  -- 检查孤儿记录
  RETURN QUERY
  SELECT 'messages'::text, 'orphaned_messages'::text, 
         COUNT(*) 
  FROM messages m 
  LEFT JOIN conversations c ON m.conversation_id = c.id 
  WHERE c.id IS NULL;
  
  -- 检查空向量
  RETURN QUERY
  SELECT 'knowledge_base'::text, 'empty_embeddings'::text,
         COUNT(*)
  FROM knowledge_base
  WHERE is_active = 1 AND embedding IS NULL;
  
  -- 检查重复数据
  RETURN QUERY
  SELECT 'conversations'::text, 'duplicate_sessions'::text,
         COUNT(*) - COUNT(DISTINCT session_id)
  FROM conversations;
END;
$$ LANGUAGE plpgsql;

NOTIFY pgvector_optimization, '✅ PostgreSQL数据库优化完成！';
NOTIFY pgvector_optimization, '⚡ 向量搜索、性能优化、数据清理均已启用';
NOTIFY pgvector_optimization, '🔍 使用 SELECT * FROM check_data_integrity(); 检查数据完整性';