#!/bin/bash
# PostgreSQL 系统安装脚本（Ubuntu/Debian）

echo "🔧 安装 PostgreSQL + pgvector..."

# 更新包列表
sudo apt update

# 安装PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# 安装依赖
sudo apt install -y build-essential git postgresql-server-dev-all

# 克隆和安装pgvector
cd /tmp
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install

# 启动PostgreSQL服务
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 创建数据库和用户
sudo -u postgres psql << EOF
CREATE USER devuser WITH ENCRYPTED PASSWORD 'devpass';
CREATE DATABASE medical_crm OWNER devuser;
GRANT ALL PRIVILEGES ON DATABASE medical_crm TO devuser;
\q
EOF

# 启用pgvector扩展
sudo -u postgres psql -d medical_crm -c "CREATE EXTENSION IF NOT EXISTS vector;"

echo "✅ PostgreSQL安装完成！"
echo "🔗 连接字符串: postgresql://devuser:devpass@localhost:5432/medical_crm"
echo "📊 运行测试: npx tsx scripts/test-vector-optimization.ts"