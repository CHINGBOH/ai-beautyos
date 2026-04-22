#!/bin/bash
# PostgreSQL + pgvector Docker 快速启动脚本

echo "🚀 启动PostgreSQL + pgvector 数据库..."

# 停止并删除现有容器
docker stop medical-postgres 2>/dev/null || true
docker rm medical-postgres 2>/dev/null || true

# 启动支持pgvector的PostgreSQL容器
docker run -d \
  --name medical-postgres \
  -e POSTGRES_DB=medical_crm \
  -e POSTGRES_USER=devuser \
  -e POSTGRES_PASSWORD=devpass \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  --restart unless-stopped \
  pgvector/pgvector:pg16

echo "⏳ 等待数据库启动（10秒）..."
sleep 10

# 检查连接
echo "🔍 测试数据库连接..."
docker exec medical-postgres psql -U devuser -d medical_crm -c "SELECT version();" && echo "✅ 数据库连接成功！"

# 执行优化脚本
echo "🛠️ 执行数据库优化..."
docker exec -i medical-postgres psql -U devuser -d medical_crm < scripts/optimize-postgres.sql

echo "🎉 数据库启动完成！"
echo "📊 运行测试: npx tsx scripts/test-vector-optimization.ts"