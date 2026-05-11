# 企业微信Webhook配置指南

## 快速开始

### 1. 安装依赖

```bash
cd /home/l/美业CRM/medical-beauty-crm-landing
npm install xml2js @types/xml2js
```

### 2. 初始化配置

**方式1：使用初始化脚本**
```bash
# 确保数据库已连接
npm run dev  # 启动服务器

# 在另一个终端运行：
npx tsx scripts/init-wework-config.ts
```

**方式2：通过管理后台**
1. 访问管理后台的企业微信配置页面
2. 填入以下信息：
   - 企业ID: `ww3ceb59d6b08f5957`
   - SECRET: `AStMpkL4CaQ-alCPk_PrCBCxm-5_2h3mxFfIBXyGVZc`
   - 模式: 选择"真实模式"（isMockMode = 0）

### 3. 配置企业微信回调

#### 步骤1：准备回调URL

**开发环境（本地测试）**:
1. 使用ngrok暴露本地端口：
   ```bash
   ngrok http 3000
   ```
2. 获取ngrok提供的HTTPS URL，例如：`https://abc123.ngrok.io`
3. 回调URL设置为：`https://abc123.ngrok.io/api/wework/webhook`

**生产环境**:
- 回调URL: `https://your-domain.com/api/wework/webhook`
- 必须使用HTTPS（企业微信要求）

#### 步骤2：在企业微信管理后台配置

1. 登录 [企业微信管理后台](https://work.weixin.qq.com/)
2. 进入 **应用管理** → 选择你的应用 → **企业客户** → **配置**
3. 找到 **接收消息服务器配置** 部分
4. 点击 **设置** 或 **修改**
5. 填写以下信息：
   - **URL**: `https://your-domain.com/api/wework/webhook`
   - **Token**: 自定义一个字符串（建议使用随机字符串，至少32位）
   - **EncodingAESKey**: 点击"随机获取"或手动生成（43位字符）
6. 点击 **保存**

#### 步骤3：保存Token和EncodingAESKey到数据库

在企业微信管理后台配置完成后，需要将Token和EncodingAESKey保存到数据库：

**方式1：通过管理后台界面**
- 在企业微信配置页面填入Token和EncodingAESKey

**方式2：通过数据库直接更新**
```sql
UPDATE wework_config 
SET token = 'your_token_here',
    encoding_aes_key = 'your_encoding_aes_key_here',
    updated_at = NOW()
WHERE is_active = 1;
```

**方式3：通过tRPC API**
```typescript
await trpc.wework.saveConfig.mutate({
  token: "your_token_here",
  encodingAesKey: "your_encoding_aes_key_here",
});
```

#### 步骤4：选择接收的事件

在企业微信管理后台，选择需要接收的事件类型：
- ✅ **客户添加事件** (`change_external_contact` → `add_external_contact`)
- ✅ **客户删除事件** (`change_external_contact` → `del_external_contact`)
- ✅ **消息事件** (`text`, `image`)

### 4. 验证配置

#### 测试URL验证

企业微信会自动发送GET请求验证URL：

```
GET /api/wework/webhook?msg_signature=xxx&timestamp=xxx&nonce=xxx&echostr=xxx
```

如果配置正确，服务器会返回 `echostr` 的值，企业微信会显示"配置成功"。

#### 测试事件接收

1. **测试客户添加**:
   - 使用"联系我"二维码添加一个测试客户
   - 检查服务器日志，应该看到：
     ```
     [企业微信Webhook] 客户添加事件: external_userid_xxx
     [企业微信Webhook] 客户已保存: 客户名称 (external_userid_xxx)
     ```
   - 检查数据库 `wework_customers` 表，应该有新记录

2. **测试消息接收**:
   - 客户发送一条消息
   - 检查服务器日志，应该看到：
     ```
     [企业微信Webhook] 收到消息: external_userid_xxx, 类型: text
     ```
   - 检查数据库 `wework_messages` 表，应该有新记录

## 故障排查

### 问题1：URL验证失败

**症状**: 企业微信显示"URL验证失败"

**可能原因**:
1. Token配置不正确
2. 服务器未正确返回echostr
3. 网络无法访问回调URL

**解决方法**:
1. 检查数据库中的token是否与企业微信管理后台一致
2. 检查服务器日志，查看是否有错误信息
3. 确保回调URL可以从外网访问（使用ngrok或公网IP）

### 问题2：事件接收失败

**症状**: 客户添加后，数据库中没有记录

**可能原因**:
1. 签名验证失败
2. XML解析错误
3. 数据库连接问题

**解决方法**:
1. 检查服务器日志中的错误信息
2. 确认Token和EncodingAESKey配置正确
3. 检查数据库连接是否正常

### 问题3：Access Token获取失败

**症状**: 调用企业微信API时返回401错误

**可能原因**:
1. 企业ID或SECRET配置错误
2. 企业微信应用权限不足

**解决方法**:
1. 检查数据库中的corpId和corpSecret是否正确
2. 确认应用有"客户联系"权限
3. 检查企业微信管理后台的应用配置

## 开发调试

### 查看日志

服务器启动后，Webhook相关的日志会输出到控制台：

```
[企业微信Webhook] URL验证请求
[企业微信Webhook] 客户添加事件: external_userid_xxx
[企业微信Webhook] 客户已保存: 客户名称 (external_userid_xxx)
[企业微信Webhook] 收到消息: external_userid_xxx, 类型: text
```

### 使用Mock模式测试

如果不想连接真实的企业微信API，可以使用Mock模式：

1. 设置 `isMockMode = 1` 在数据库中
2. 使用 `trpc.wework.mockAddCustomer` API测试客户添加
3. Mock模式不会调用真实的企业微信API，适合开发测试

## API端点

### Webhook端点

- **GET** `/api/wework/webhook` - URL验证
- **POST** `/api/wework/webhook` - 接收事件回调

### tRPC端点

- `trpc.wework.getConfig` - 获取配置
- `trpc.wework.saveConfig` - 保存配置
- `trpc.wework.createContactWay` - 创建"联系我"二维码
- `trpc.wework.listContactWays` - 获取二维码列表
- `trpc.wework.listCustomers` - 获取客户列表
- `trpc.wework.sendMessage` - 发送消息

## 安全注意事项

1. **生产环境必须使用HTTPS**
2. **Token和EncodingAESKey必须保密**，不要提交到代码仓库
3. **签名验证**：当前实现为简化版，生产环境建议使用企业微信官方SDK
4. **AES解密**：当前未实现完整解密，如果企业微信发送加密消息，需要添加解密功能

## 下一步

- [ ] 实现完整的AES解密功能
- [ ] 添加自动回复功能（AI生成回复）
- [ ] 完善错误处理和重试机制
- [ ] 添加Webhook事件日志记录
- [ ] 实现客户删除事件的处理逻辑
