# 环境变量配置文档

本文档列出了系统所需的所有环境变量及其说明。

## 必需的环境变量

以下环境变量是系统运行所必需的，缺失时系统将无法启动：

### 数据库配置

- **DATABASE_URL** (必需)
  - 类型: PostgreSQL 连接字符串
  - 格式: `postgresql://username:password@host:port/database`
  - 示例: `postgresql://user:pass@localhost:5432/medical_beauty_crm`
  - 说明: PostgreSQL 数据库连接字符串

### 安全配置

- **JWT_SECRET** (必需)
  - 类型: 字符串
  - 最小长度: 32 字符
  - 说明: JWT 密钥，用于加密会话和认证令牌
  - 生成方式: 可以使用 `openssl rand -base64 32` 生成

### AI 服务配置

- **DEEPSEEK_API_KEY** (必需)
  - 类型: 字符串
  - 说明: DeepSeek API 密钥，用于 AI 客服对话生成
  - 获取方式: 在 DeepSeek 官网注册并获取 API Key
  - ⚠️ **安全警告**: 不要将 API Key 硬编码在代码中，必须通过环境变量设置

## 可选的环境变量

以下环境变量是可选的，系统可以在没有这些变量的情况下运行：

### 应用配置

- **VITE_APP_ID**
  - 类型: 字符串
  - 说明: 应用 ID（可选）

- **OAUTH_SERVER_URL**
  - 类型: URL 字符串
  - 说明: OAuth 服务器 URL（可选）

- **OWNER_OPEN_ID**
  - 类型: 字符串
  - 说明: 所有者 Open ID（可选）

### 环境标识

- **NODE_ENV**
  - 类型: `development` | `production`
  - 默认值: `development`
  - 说明: 运行环境标识，影响日志级别和调试功能

- **PORT**
  - 类型: 数字
  - 默认值: `3000`
  - 说明: 服务器监听端口

- **DISABLE_AUTH**
  - 类型: `"1"` | 其他
  - 说明: 设置为 `"1"` 时禁用身份验证（仅用于开发）

### Forge API 配置（可选）

- **BUILT_IN_FORGE_API_URL**
  - 类型: URL 字符串
  - 说明: Forge API URL（可选）

- **BUILT_IN_FORGE_API_KEY**
  - 类型: 字符串
  - 说明: Forge API Key（可选）

## 配置示例

### .env 文件示例

```env
# 数据库配置
DATABASE_URL=postgresql://user:password@localhost:5432/medical_beauty_crm

# 安全配置
JWT_SECRET=your-secret-key-at-least-32-characters-long

# AI 服务配置
DEEPSEEK_API_KEY=sk-your-deepseek-api-key

# 应用配置（可选）
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://oauth.example.com
OWNER_OPEN_ID=your-open-id

# 环境配置
NODE_ENV=development
PORT=3000
```

## 启动时验证

系统在启动时会自动验证必需的环境变量：

1. 如果必需的环境变量缺失，系统将：
   - 打印详细的错误信息
   - 列出缺失的变量及其说明
   - 阻止服务器启动

2. 如果可选的环境变量缺失，系统将：
   - 打印警告信息
   - 使用默认值继续运行

## 安全建议

1. **永远不要将敏感信息提交到版本控制系统**
   - 确保 `.env` 文件已添加到 `.gitignore`
   - 使用 `.env.example` 作为模板（不包含真实值）

2. **使用强密码和密钥**
   - JWT_SECRET 至少 32 字符
   - 定期轮换 API 密钥

3. **生产环境配置**
   - 使用环境变量管理工具（如 AWS Secrets Manager、HashiCorp Vault）
   - 不要在代码中硬编码任何密钥

4. **API 密钥管理**
   - 每个环境使用不同的 API 密钥
   - 限制 API 密钥的权限范围
   - 定期审查和轮换密钥

## 故障排查

### 常见错误

1. **"DEEPSEEK_API_KEY environment variable is required"**
   - 原因: DeepSeek API 密钥未设置
   - 解决: 在 `.env` 文件中设置 `DEEPSEEK_API_KEY`

2. **"DATABASE_URL must be a valid PostgreSQL connection string"**
   - 原因: 数据库连接字符串格式错误
   - 解决: 检查 `DATABASE_URL` 格式，确保以 `postgresql://` 或 `postgres://` 开头

3. **"JWT_SECRET must be at least 32 characters long"**
   - 原因: JWT 密钥长度不足
   - 解决: 使用至少 32 字符的密钥

## 相关文档

- [数据库迁移指南](./drizzle/README.md)
- [部署文档](./DEPLOYMENT.md)
- [安全最佳实践](./SECURITY.md)
