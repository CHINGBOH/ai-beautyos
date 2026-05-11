#!/bin/bash
# 数据库初始化脚本

set -e

echo "🚀 开始初始化数据库..."

# 切换到正确的目录
cd "$(dirname "$0")/.." || cd /home/l/美业CRM/medical-beauty-crm-landing

echo "📁 当前目录: $(pwd)"

# 检查SQL文件是否存在
if [ ! -f "scripts/init-database.sql" ]; then
    echo "❌ 找不到 scripts/init-database.sql"
    exit 1
fi

echo "✅ SQL文件存在"

# 尝试不同的连接方式
echo "🔌 尝试连接PostgreSQL..."

# 方式1: 使用postgres用户（需要sudo）
if sudo -n true 2>/dev/null; then
    echo "📦 使用sudo执行..."
    sudo -u postgres psql -d medical_beauty_crm -f scripts/init-database.sql && echo "✅ 初始化成功！" && exit 0
fi

# 方式2: 直接使用psql（如果配置了peer认证）
if psql -d medical_beauty_crm -f scripts/init-database.sql 2>/dev/null; then
    echo "✅ 初始化成功！"
    exit 0
fi

# 方式3: 使用环境变量
if [ -n "$DATABASE_URL" ]; then
    echo "📦 使用DATABASE_URL连接..."
    psql "$DATABASE_URL" -f scripts/init-database.sql && echo "✅ 初始化成功！" && exit 0
fi

echo "❌ 无法连接PostgreSQL"
echo ""
echo "请手动执行以下命令之一："
echo ""
echo "方式1（使用sudo）:"
echo "  sudo -u postgres psql -d medical_beauty_crm -f scripts/init-database.sql"
echo ""
echo "方式2（直接连接）:"
echo "  psql -d medical_beauty_crm -f scripts/init-database.sql"
echo ""
echo "方式3（指定用户）:"
echo "  psql -U postgres -d medical_beauty_crm -f scripts/init-database.sql"
echo ""
exit 1
