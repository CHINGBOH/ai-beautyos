#!/bin/bash
# 完整设置脚本

set -e

echo "🚀 开始设置美业CRM系统..."

# 检查PostgreSQL是否运行
if ! pg_isready > /dev/null 2>&1; then
    echo "⚠️  PostgreSQL服务未运行，请先启动PostgreSQL"
    echo "   运行: sudo systemctl start postgresql"
    exit 1
fi

# 获取当前用户
CURRENT_USER=$(whoami)
echo "📋 当前用户: $CURRENT_USER"

# 尝试不同的连接方式
DB_URL=""
if psql -U postgres -d postgres -c "SELECT 1" > /dev/null 2>&1; then
    DB_URL="postgresql://postgres@localhost:5432/medical_beauty_crm"
    echo "✅ 使用 postgres 用户连接"
elif psql -U $CURRENT_USER -d postgres -c "SELECT 1" > /dev/null 2>&1; then
    DB_URL="postgresql://$CURRENT_USER@localhost:5432/medical_beauty_crm"
    echo "✅ 使用 $CURRENT_USER 用户连接"
else
    echo "❌ 无法连接到PostgreSQL，请检查配置"
    exit 1
fi

# 创建数据库
echo "📦 创建数据库..."
psql -U postgres -d postgres -c "CREATE DATABASE medical_beauty_crm;" 2>&1 | grep -v "already exists" || true

# 执行SQL初始化脚本
echo "🔧 初始化数据库表结构..."
psql $DB_URL -f scripts/init-database.sql

# 更新.env文件
echo "📝 更新.env文件..."
sed -i "s|DATABASE_URL=.*|DATABASE_URL=$DB_URL|" .env

echo "✅ 数据库设置完成！"
echo ""
echo "📋 下一步："
echo "   1. 检查 .env 文件中的 DATABASE_URL"
echo "   2. 运行: npm run dev"
echo "   3. 访问: http://localhost:3000"
