#!/bin/bash
# 完整的数据库初始化脚本

set -e

echo "🚀 美业CRM数据库初始化"
echo "========================"

# 进入正确的目录
cd /home/l/美业CRM/medical-beauty-crm-landing || {
    echo "❌ 无法进入项目目录"
    exit 1
}

echo "✅ 当前目录: $(pwd)"

# 检查SQL文件
if [ ! -f "scripts/init-database.sql" ]; then
    echo "❌ 找不到 scripts/init-database.sql"
    exit 1
fi

echo "✅ SQL文件存在"

# 检查PostgreSQL服务
if ! pg_isready > /dev/null 2>&1; then
    echo "⚠️  PostgreSQL服务未运行，尝试启动..."
    sudo systemctl start postgresql || {
        echo "❌ 无法启动PostgreSQL服务"
        exit 1
    }
fi

echo "✅ PostgreSQL服务运行中"

# 创建数据库（如果不存在）
echo "📦 创建数据库..."
sudo -u postgres psql -c "CREATE DATABASE medical_beauty_crm;" 2>&1 | grep -v "already exists" || true

# 创建PostgreSQL用户（如果不存在）
echo "👤 检查PostgreSQL用户..."
sudo -u postgres psql -c "CREATE USER l WITH PASSWORD 'postgres';" 2>&1 | grep -v "already exists" || true
sudo -u postgres psql -c "ALTER USER l CREATEDB;" 2>&1 || true

# 执行初始化脚本
echo "🔧 执行数据库初始化..."
if sudo -u postgres psql -d medical_beauty_crm -f scripts/init-database.sql; then
    echo ""
    echo "✅ 数据库初始化成功！"
    echo ""
    echo "📋 验证数据库："
    sudo -u postgres psql -d medical_beauty_crm -c "\dt" | head -20
    echo ""
    echo "🎉 系统已就绪！访问 http://localhost:3000"
else
    echo ""
    echo "❌ 初始化失败，请检查错误信息"
    echo ""
    echo "💡 手动执行："
    echo "   sudo -u postgres psql -d medical_beauty_crm -f scripts/init-database.sql"
    exit 1
fi
