#!/bin/bash
# PostgreSQL 数据库设置脚本

echo "🔧 设置 PostgreSQL 数据库..."

# 检查PostgreSQL是否运行
if ! pg_isready -U postgres > /dev/null 2>&1; then
    echo "⚠️  PostgreSQL 服务未运行，请先启动 PostgreSQL"
    exit 1
fi

# 创建数据库（如果不存在）
psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'medical_beauty_crm'" | grep -q 1 || \
psql -U postgres -c "CREATE DATABASE medical_beauty_crm;"

# 启用pgvector扩展
psql -U postgres -d medical_beauty_crm -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>&1 || echo "⚠️  pgvector扩展可能未安装，跳过"

echo "✅ 数据库设置完成"
echo "   数据库名: medical_beauty_crm"
echo "   连接字符串: postgresql://postgres:postgres@localhost:5432/medical_beauty_crm"
