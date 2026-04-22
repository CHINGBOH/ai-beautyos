# PostgreSQL + pgvector 手动配置指南

## 🎯 选择您的安装方式

### 方式1: Docker（最简单，推荐）
```bash
# 1. 安装Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 2. 启动数据库
docker run -d \
  --name medical-postgres \
  -e POSTGRES_DB=medical_crm \
  -e POSTGRES_USER=devuser \
  -e POSTGRES_PASSWORD=devpass \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  pgvector/pgvector:pg16

# 3. 等待启动并执行优化
sleep 10 && docker exec -i medical-postgres psql -U devuser -d medical_crm < scripts/optimize-postgres.sql
```

### 方式2: Ubuntu/Debian系统安装
```bash
# 运行安装脚本
chmod +x scripts/install-postgres-system.sh
./scripts/install-postgres-system.sh

# 执行优化脚本
psql postgresql://devuser:devpass@localhost:5432/medical_crm -f scripts/optimize-postgres.sql
```

### 方式3: 手动配置步骤

#### 步骤1: 安装PostgreSQL 16
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install postgresql-16 postgresql-contrib-16

# CentOS/RHEL
sudo dnf install postgresql16-server postgresql16-contrib

# macOS
brew install postgresql@16
```

#### 步骤2: 安装pgvector扩展
```bash
cd /tmp
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

#### 步骤3: 配置数据库
```sql
-- 连接到PostgreSQL
sudo -u postgres psql

-- 创建用户和数据库
CREATE USER devuser WITH ENCRYPTED PASSWORD 'devpass';
CREATE DATABASE medical_crm OWNER devuser;
GRANT ALL PRIVILEGES ON DATABASE medical_crm TO devuser;

-- 启用pgvector
\c medical_crm;
CREATE EXTENSION IF NOT EXISTS vector;
\q
```

#### 步骤4: 执行优化脚本
```bash
psql postgresql://devuser:devpass@localhost:5432/medical_crm -f scripts/optimize-postgres.sql
```

## 🧪 验证安装

运行测试脚本检查所有功能：
```bash
npx tsx scripts/test-vector-optimization.ts
```

期望输出：
```
🔍 PostgreSQL 数据库向量优化状态检查
📦 pgvector插件: ✅ 已安装
🗂️  embedding字段: ✅ 已配置
📈 向量数据数量: X
📊 覆盖率: X%
🏆 总体评估: 优秀/良好
```

## 🔧 常见问题

### Q: 连接失败怎么办？
- 检查PostgreSQL是否启动: `sudo systemctl status postgresql`
- 检查端口是否监听: `netstat -an | grep 5432`
- 验证网络连接: `telnet localhost 5432`

### Q: pgvector扩展安装失败？
- 确保安装了PostgreSQL开发包: `postgresql-server-dev-all`
- 检查编译工具: `build-essential` `git` `make`
- 验证PostgreSQL版本兼容性

### Q: 权限错误？
- 确保用户有数据库访问权限
- 检查防火墙设置
- 验证.env文件中的连接字符串

## 📞 技术支持

如果遇到问题，请提供以下信息：
- 操作系统版本
- PostgreSQL版本: `psql --version`
- 错误日志输出
- .env文件配置（隐藏密码）