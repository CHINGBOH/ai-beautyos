#!/bin/bash
# 一键初始化数据库脚本

echo "🚀 开始初始化数据库..."

cd /home/l/美业CRM/medical-beauty-crm-landing

# 检查SQL文件
if [ ! -f "scripts/init-database.sql" ]; then
    echo "❌ 找不到 scripts/init-database.sql"
    exit 1
fi

# 创建数据库
echo "📦 创建数据库..."
sudo -u postgres psql -c "CREATE DATABASE medical_beauty_crm;" 2>&1 | grep -v "already exists" || true

# 执行初始化
echo "🔧 执行数据库初始化..."
sudo -u postgres psql -d medical_beauty_crm -f scripts/init-database.sql

# 验证
echo ""
echo "✅ 验证数据库表..."
sudo -u postgres psql -d medical_beauty_crm -c "\dt" | head -20

echo ""
echo "🎉 数据库初始化完成！"
echo "   现在可以访问 http://localhost:3000 使用系统了"
