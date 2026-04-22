
-- 第1步: 连接数据库并启用插件
-- psql postgresql://user:pass@localhost:5432/medical_beauty_crm

-- 第2步: 执行 pgvector 检查
SELECT * FROM pg_extension WHERE extname = 'vector';

-- 第3步: 如果没有安装，执行以下命令
-- CREATE EXTENSION IF NOT EXISTS vector;

-- 第4步: 检查现有 embedding 字段
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'knowledge_base' 
AND column_name LIKE '%embedding%';

-- 第5步: 验证优化效果
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('knowledge_base', 'conversations', 'messages')
ORDER BY tablename, indexname;

