# 🔑 更新 DeepSeek API 密钥

## 当前状态

API 密钥仍然无效。即使充值后，如果使用的是旧密钥，需要：

1. **生成新的 API 密钥**（如果旧密钥已失效）
2. **更新 .env 文件中的密钥**

## 操作步骤

### 1. 获取新的 API 密钥

1. 访问：https://platform.deepseek.com/
2. 登录账号
3. 进入 **API Keys** 页面
4. 点击 **Create API Key** 创建新密钥
5. 复制新密钥（只显示一次，请保存好）

### 2. 更新配置文件

编辑 `.env` 文件：

```bash
cd /home/l/美业CRM/medical-beauty-crm-landing
nano .env
```

找到这一行：
```
DEEPSEEK_API_KEY=replace_with_your_deepseek_key
```

替换为你的新密钥：
```
DEEPSEEK_API_KEY=你的新密钥
```

保存文件（Ctrl+O, Enter, Ctrl+X）

### 3. 重启服务器

服务器会自动检测 `.env` 变化并重启，或者手动重启：

```bash
# 查找进程
ps aux | grep "tsx watch"

# 重启（如果需要）
# 停止旧进程后，运行：
npm run dev
```

### 4. 验证

访问 http://localhost:3000，尝试发送一条消息，应该能正常收到 AI 回复。

## 或者直接告诉我新密钥

如果你已经获取了新密钥，可以直接告诉我，我会帮你更新配置文件。
