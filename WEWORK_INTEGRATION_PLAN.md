# 企业微信集成方案设计文档

## 一、方案概述

企业微信相比微信小程序更适合医美行业的B2C场景，具有以下优势：

**核心优势：**
- **临时会话模式**：专为医疗行业设计，客户扫码后仅在指定时间内可咨询（如24小时），会话结束自动发送结束语
- **客户联系功能**：企业员工可以添加客户微信，建立长期联系，支持客户标签管理和分组
- **消息推送能力**：可主动向客户推送营销内容、预约提醒、优惠活动等
- **数据统计完善**：提供客户添加数量、会话次数、转化率等数据统计
- **无需开发小程序**：直接使用企业微信客户端，客户无需安装额外应用

**适用场景：**
- 客户咨询和预约
- 客户关系维护
- 营销活动推送
- 员工协作管理

---

## 二、集成架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                         客户端（C端）                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  扫码添加     │  │  企业微信对话  │  │  接收消息推送  │      │
│  │  企业员工     │  │  咨询项目价格  │  │  预约提醒等   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                             ↕
┌─────────────────────────────────────────────────────────────┐
│                      企业微信服务器                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  客户联系API  │  │  消息推送API  │  │  事件回调    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                             ↕
┌─────────────────────────────────────────────────────────────┐
│                    医美CRM系统（后端）                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Access Token │  │  客户信息同步 │  │  消息处理    │      │
│  │  管理         │  │  标签管理     │  │  事件处理    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                             ↕
┌─────────────────────────────────────────────────────────────┐
│                    医美CRM系统（前端）                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  企业微信配置 │  │  客户管理     │  │  消息推送    │      │
│  │  页面         │  │  页面         │  │  页面        │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 数据流

**客户添加流程：**
1. 管理员在CRM系统中生成「联系我」二维码
2. 客户扫码添加企业员工
3. 企业微信回调通知CRM系统
4. CRM系统自动创建客户记录并打标签
5. 触发自动化营销流程

**消息推送流程：**
1. CRM系统根据触发规则（时间/行为/天气）生成推送任务
2. 调用企业微信消息推送API
3. 客户在企业微信中收到消息
4. 记录推送日志和效果数据

**数据同步流程：**
1. 定时任务从企业微信获取客户列表
2. 同步客户信息、标签、备注到CRM数据库
3. 同步对话记录到CRM数据库
4. 更新客户画像和分层分级

---

## 三、核心功能设计

### 3.1 客户联系功能

#### 3.1.1 「联系我」二维码生成

**功能描述：**
在CRM管理后台生成专属的「联系我」二维码或小程序按钮，客户扫码即可添加企业员工。

**配置参数：**
- **联系方式类型**：单人/多人
- **场景**：小程序中联系/二维码联系
- **临时会话模式**：是否启用（医疗行业专用）
- **二维码有效期**：最多14天
- **会话有效期**：最多14天
- **自定义state参数**：用于区分不同渠道（如：小红书/抖音/朋友圈）
- **结束语**：会话结束时自动发送的消息（文本/图片/链接/小程序卡片）

**API接口：**
```typescript
POST https://qyapi.weixin.qq.com/cgi-bin/externalcontact/add_contact_way

请求参数：
{
  "type": 1,                    // 1-单人, 2-多人
  "scene": 2,                   // 1-小程序, 2-二维码
  "is_temp": true,              // 临时会话模式
  "expires_in": 86400,          // 二维码有效期（秒）
  "chat_expires_in": 86400,     // 会话有效期（秒）
  "state": "xiaohongshu",       // 渠道标识
  "user": ["zhangsan"],         // 员工ID
  "conclusions": {              // 结束语
    "text": {
      "content": "感谢咨询！点击下方链接预约面诊：https://..."
    }
  }
}

返回结果：
{
  "errcode": 0,
  "errmsg": "ok",
  "config_id": "42b34949...",   // 配置ID（必须保存）
  "qr_code": "https://p.qpic.cn/..." // 二维码URL
}
```

#### 3.1.2 客户详情获取

**功能描述：**
获取客户的基本信息、添加方式、标签、备注等详细信息。

**API接口：**
```typescript
GET https://qyapi.weixin.qq.com/cgi-bin/externalcontact/get

请求参数：
{
  "external_userid": "woAJ2GCA..." // 客户的external_userid
}

返回结果：
{
  "external_contact": {
    "external_userid": "woAJ2GCA...",
    "name": "李四",
    "avatar": "https://...",
    "gender": 1,
    "unionid": "ozynqsul..."
  },
  "follow_user": [
    {
      "userid": "zhangsan",
      "remark": "李部长",
      "description": "对接采购事务",
      "createtime": 1525779812,
      "tags": [...],
      "add_way": 1,           // 添加方式（1-扫码, 3-名片分享等）
      "state": "xiaohongshu"  // 自定义渠道标识
    }
  ]
}
```

### 3.2 消息推送功能

#### 3.2.1 发送文本消息

**功能描述：**
向客户发送文本消息（如：预约提醒、优惠活动）。

**API接口：**
```typescript
POST https://qyapi.weixin.qq.com/cgi-bin/message/send

请求参数：
{
  "touser": "UserID1|UserID2",  // 客户ID（多个用|分隔）
  "msgtype": "text",
  "agentid": 1000002,
  "text": {
    "content": "您好！本周末超皮秒祛斑项目限时优惠，原价5000元，现价3000元..."
  }
}
```

#### 3.2.2 发送图文消息

**功能描述：**
向客户发送图文消息（如：项目介绍、案例展示）。

**API接口：**
```typescript
POST https://qyapi.weixin.qq.com/cgi-bin/message/send

请求参数：
{
  "touser": "UserID1|UserID2",
  "msgtype": "news",
  "agentid": 1000002,
  "news": {
    "articles": [
      {
        "title": "超皮秒祛斑 - 让肌肤重焕光彩",
        "description": "采用先进的超皮秒激光技术...",
        "url": "https://...",
        "picurl": "https://..."
      }
    ]
  }
}
```

### 3.3 事件回调处理

#### 3.3.1 客户添加事件

**功能描述：**
当客户扫码添加企业员工时，企业微信会向CRM系统发送回调通知。

**回调URL配置：**
在企业微信后台配置回调URL：`https://your-domain.com/api/wework/callback`

**回调数据：**
```xml
<xml>
  <ToUserName><![CDATA[toUser]]></ToUserName>
  <FromUserName><![CDATA[fromUser]]></FromUserName>
  <CreateTime>1525779812</CreateTime>
  <MsgType><![CDATA[event]]></MsgType>
  <Event><![CDATA[change_external_contact]]></Event>
  <ChangeType><![CDATA[add_external_contact]]></ChangeType>
  <UserID><![CDATA[zhangsan]]></UserID>
  <ExternalUserID><![CDATA[woAJ2GCA...]]></ExternalUserID>
  <State><![CDATA[xiaohongshu]]></State>
  <WelcomeCode><![CDATA[WELCOME_CODE]]></WelcomeCode>
</xml>
```

**处理逻辑：**
1. 解密回调数据
2. 提取客户信息（external_userid、state）
3. 调用客户详情API获取完整信息
4. 创建客户记录到数据库
5. 根据state参数打标签（来源渠道）
6. 触发自动化营销流程

#### 3.3.2 消息事件

**功能描述：**
当客户在企业微信中发送消息时，企业微信会向CRM系统发送回调通知。

**回调数据：**
```xml
<xml>
  <ToUserName><![CDATA[toUser]]></ToUserName>
  <FromUserName><![CDATA[fromUser]]></FromUserName>
  <CreateTime>1525779812</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[你好，我想咨询超皮秒祛斑项目]]></Content>
  <MsgId>1234567890</MsgId>
  <AgentID>1000002</AgentID>
</xml>
```

**处理逻辑：**
1. 解密回调数据
2. 提取消息内容
3. 保存消息记录到数据库
4. 调用AI客服生成回复（可选）
5. 自动回复客户（可选）

---

## 四、数据库设计

### 4.1 企业微信配置表

```sql
CREATE TABLE wework_config (
  id INT PRIMARY KEY AUTO_INCREMENT,
  corp_id VARCHAR(255) NOT NULL COMMENT '企业ID',
  corp_secret VARCHAR(255) NOT NULL COMMENT '企业Secret',
  agent_id INT NOT NULL COMMENT '应用AgentID',
  token VARCHAR(255) NOT NULL COMMENT '回调Token',
  encoding_aes_key VARCHAR(255) NOT NULL COMMENT '回调EncodingAESKey',
  access_token TEXT COMMENT 'Access Token',
  access_token_expires_at BIGINT COMMENT 'Access Token过期时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 4.2 「联系我」配置表

```sql
CREATE TABLE wework_contact_ways (
  id INT PRIMARY KEY AUTO_INCREMENT,
  config_id VARCHAR(255) NOT NULL UNIQUE COMMENT '企业微信返回的config_id',
  type TINYINT NOT NULL COMMENT '类型：1-单人, 2-多人',
  scene TINYINT NOT NULL COMMENT '场景：1-小程序, 2-二维码',
  is_temp BOOLEAN DEFAULT FALSE COMMENT '是否临时会话',
  expires_in INT COMMENT '二维码有效期（秒）',
  chat_expires_in INT COMMENT '会话有效期（秒）',
  state VARCHAR(255) COMMENT '渠道标识',
  qr_code TEXT COMMENT '二维码URL',
  user_ids TEXT COMMENT '员工ID列表（JSON数组）',
  conclusions TEXT COMMENT '结束语配置（JSON）',
  remark VARCHAR(255) COMMENT '备注',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_state (state)
);
```

### 4.3 企业微信客户表

```sql
CREATE TABLE wework_customers (
  id INT PRIMARY KEY AUTO_INCREMENT,
  external_userid VARCHAR(255) NOT NULL UNIQUE COMMENT '企业微信客户ID',
  lead_id INT COMMENT '关联的线索ID',
  name VARCHAR(255) COMMENT '客户姓名',
  avatar TEXT COMMENT '头像URL',
  gender TINYINT COMMENT '性别：0-未知, 1-男, 2-女',
  unionid VARCHAR(255) COMMENT '微信unionid',
  type TINYINT COMMENT '类型：1-微信用户, 2-企业微信用户',
  add_way TINYINT COMMENT '添加方式',
  state VARCHAR(255) COMMENT '渠道标识',
  follow_user_id VARCHAR(255) COMMENT '跟进人员工ID',
  remark VARCHAR(255) COMMENT '备注',
  description TEXT COMMENT '描述',
  tags TEXT COMMENT '标签（JSON数组）',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_external_userid (external_userid),
  INDEX idx_lead_id (lead_id),
  INDEX idx_state (state)
);
```

### 4.4 消息推送记录表

```sql
CREATE TABLE wework_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  external_userid VARCHAR(255) NOT NULL COMMENT '客户ID',
  msgtype VARCHAR(50) NOT NULL COMMENT '消息类型：text/image/news等',
  content TEXT COMMENT '消息内容（JSON）',
  status VARCHAR(50) DEFAULT 'pending' COMMENT '状态：pending/sent/failed',
  error_msg TEXT COMMENT '错误信息',
  sent_at TIMESTAMP COMMENT '发送时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_external_userid (external_userid),
  INDEX idx_status (status)
);
```

### 4.5 事件回调日志表

```sql
CREATE TABLE wework_callback_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  event_type VARCHAR(100) NOT NULL COMMENT '事件类型',
  external_userid VARCHAR(255) COMMENT '客户ID',
  user_id VARCHAR(255) COMMENT '员工ID',
  state VARCHAR(255) COMMENT '渠道标识',
  raw_data TEXT COMMENT '原始数据（JSON）',
  processed BOOLEAN DEFAULT FALSE COMMENT '是否已处理',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_event_type (event_type),
  INDEX idx_processed (processed)
);
```

---

## 五、前端页面设计

### 5.1 企业微信配置页面

**路径：** `/dashboard/wework/config`

**功能：**
- 配置企业ID、Secret、AgentID
- 配置回调URL和加密密钥
- 测试连接
- 显示Access Token状态

**UI组件：**
- 表单输入框（CorpID、Secret、AgentID）
- 测试连接按钮
- 保存按钮
- 状态指示器（已连接/未连接）

### 5.2 「联系我」管理页面

**路径：** `/dashboard/wework/contact-ways`

**功能：**
- 创建「联系我」二维码
- 配置参数（类型、场景、有效期、渠道标识、结束语）
- 查看已创建的二维码列表
- 下载二维码图片
- 删除二维码

**UI组件：**
- 创建按钮
- 配置表单（类型、场景、有效期等）
- 二维码列表（表格）
- 二维码预览（弹窗）
- 下载按钮
- 删除按钮

### 5.3 客户管理页面（扩展）

**路径：** `/dashboard/customers`（扩展现有页面）

**新增功能：**
- 显示企业微信客户标识
- 显示添加方式和渠道
- 同步客户信息按钮
- 发送消息按钮

**UI组件：**
- 客户列表（扩展字段）
- 同步按钮
- 发送消息按钮（打开消息编辑器）

### 5.4 消息推送页面

**路径：** `/dashboard/wework/messages`

**功能：**
- 创建消息推送任务
- 选择目标客户（单个/批量/筛选条件）
- 编辑消息内容（文本/图文/小程序卡片）
- 预览消息
- 立即发送/定时发送
- 查看推送记录和效果

**UI组件：**
- 创建按钮
- 客户选择器（支持筛选）
- 消息编辑器（富文本/图文/小程序卡片）
- 预览窗口
- 发送按钮
- 推送记录列表（表格）

---

## 六、后端API设计

### 6.1 Access Token管理

```typescript
// server/lib/wework.ts

export class WeWorkAPI {
  private corpId: string;
  private corpSecret: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(corpId: string, corpSecret: string) {
    this.corpId = corpId;
    this.corpSecret = corpSecret;
  }

  // 获取Access Token（自动刷新）
  async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const response = await axios.get(
      'https://qyapi.weixin.qq.com/cgi-bin/gettoken',
      {
        params: {
          corpid: this.corpId,
          corpsecret: this.corpSecret
        }
      }
    );

    if (response.data.errcode !== 0) {
      throw new Error(`获取Access Token失败: ${response.data.errmsg}`);
    }

    this.accessToken = response.data.access_token;
    this.tokenExpiresAt = Date.now() + response.data.expires_in * 1000 - 60000; // 提前1分钟刷新

    // 保存到数据库
    await updateWeWorkConfig({
      access_token: this.accessToken,
      access_token_expires_at: this.tokenExpiresAt
    });

    return this.accessToken;
  }
}
```

### 6.2 客户联系API

```typescript
// server/routers/wework.ts

export const weworkRouter = router({
  // 创建「联系我」
  createContactWay: protectedProcedure
    .input(z.object({
      type: z.number(),
      scene: z.number(),
      isTemp: z.boolean().optional(),
      expiresIn: z.number().optional(),
      chatExpiresIn: z.number().optional(),
      state: z.string().optional(),
      userIds: z.array(z.string()),
      conclusions: z.any().optional(),
      remark: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      const wework = new WeWorkAPI(corpId, corpSecret);
      const accessToken = await wework.getAccessToken();

      const response = await axios.post(
        `https://qyapi.weixin.qq.com/cgi-bin/externalcontact/add_contact_way?access_token=${accessToken}`,
        {
          type: input.type,
          scene: input.scene,
          is_temp: input.isTemp,
          expires_in: input.expiresIn,
          chat_expires_in: input.chatExpiresIn,
          state: input.state,
          user: input.userIds,
          conclusions: input.conclusions,
          remark: input.remark
        }
      );

      if (response.data.errcode !== 0) {
        throw new Error(`创建失败: ${response.data.errmsg}`);
      }

      // 保存到数据库
      await createWeWorkContactWay({
        config_id: response.data.config_id,
        type: input.type,
        scene: input.scene,
        is_temp: input.isTemp,
        expires_in: input.expiresIn,
        chat_expires_in: input.chatExpiresIn,
        state: input.state,
        qr_code: response.data.qr_code,
        user_ids: JSON.stringify(input.userIds),
        conclusions: JSON.stringify(input.conclusions),
        remark: input.remark
      });

      return {
        configId: response.data.config_id,
        qrCode: response.data.qr_code
      };
    }),

  // 获取客户详情
  getCustomerDetail: protectedProcedure
    .input(z.object({
      externalUserId: z.string()
    }))
    .query(async ({ input }) => {
      const wework = new WeWorkAPI(corpId, corpSecret);
      const accessToken = await wework.getAccessToken();

      const response = await axios.get(
        `https://qyapi.weixin.qq.com/cgi-bin/externalcontact/get?access_token=${accessToken}&external_userid=${input.externalUserId}`
      );

      if (response.data.errcode !== 0) {
        throw new Error(`获取失败: ${response.data.errmsg}`);
      }

      return response.data;
    }),

  // 发送消息
  sendMessage: protectedProcedure
    .input(z.object({
      externalUserIds: z.array(z.string()),
      msgtype: z.string(),
      content: z.any()
    }))
    .mutation(async ({ input }) => {
      const wework = new WeWorkAPI(corpId, corpSecret);
      const accessToken = await wework.getAccessToken();

      const response = await axios.post(
        `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${accessToken}`,
        {
          touser: input.externalUserIds.join('|'),
          msgtype: input.msgtype,
          agentid: agentId,
          [input.msgtype]: input.content
        }
      );

      if (response.data.errcode !== 0) {
        throw new Error(`发送失败: ${response.data.errmsg}`);
      }

      // 记录推送日志
      for (const userId of input.externalUserIds) {
        await createWeWorkMessage({
          external_userid: userId,
          msgtype: input.msgtype,
          content: JSON.stringify(input.content),
          status: 'sent',
          sent_at: new Date()
        });
      }

      return response.data;
    })
});
```

### 6.3 回调处理API

```typescript
// server/routes.ts

app.post('/api/wework/callback', async (req, res) => {
  try {
    // 1. 验证签名
    const signature = req.query.msg_signature;
    const timestamp = req.query.timestamp;
    const nonce = req.query.nonce;
    const echostr = req.query.echostr;

    // 2. 解密数据
    const crypto = new WXBizMsgCrypt(token, encodingAESKey, corpId);
    const decryptedData = crypto.decrypt(req.body);

    // 3. 解析XML
    const xml = await parseXML(decryptedData);

    // 4. 处理事件
    if (xml.MsgType === 'event') {
      if (xml.Event === 'change_external_contact') {
        if (xml.ChangeType === 'add_external_contact') {
          // 客户添加事件
          await handleCustomerAdd({
            externalUserId: xml.ExternalUserID,
            userId: xml.UserID,
            state: xml.State,
            welcomeCode: xml.WelcomeCode
          });
        }
      }
    }

    // 5. 返回success
    res.send('success');
  } catch (error) {
    console.error('回调处理失败:', error);
    res.status(500).send('error');
  }
});

async function handleCustomerAdd(data: any) {
  // 1. 获取客户详情
  const wework = new WeWorkAPI(corpId, corpSecret);
  const customerDetail = await wework.getCustomerDetail(data.externalUserId);

  // 2. 创建客户记录
  const lead = await createLead({
    name: customerDetail.external_contact.name,
    source: `wework_${data.state}`,
    status: 'new'
  });

  // 3. 创建企业微信客户记录
  await createWeWorkCustomer({
    external_userid: data.externalUserId,
    lead_id: lead.id,
    name: customerDetail.external_contact.name,
    avatar: customerDetail.external_contact.avatar,
    gender: customerDetail.external_contact.gender,
    unionid: customerDetail.external_contact.unionid,
    type: customerDetail.external_contact.type,
    add_way: customerDetail.follow_user[0].add_way,
    state: data.state,
    follow_user_id: data.userId
  });

  // 4. 打标签
  await addLeadTag(lead.id, `来源:企业微信-${data.state}`);

  // 5. 触发自动化营销流程
  await triggerAutomation({
    type: 'customer_add',
    leadId: lead.id,
    source: data.state
  });
}
```

---

## 七、开发流程

### 7.1 准备工作

1. **注册企业微信**
   - 访问 https://work.weixin.qq.com/
   - 注册企业微信账号
   - 完成企业认证（300元/年）

2. **创建自建应用**
   - 登录企业微信管理后台
   - 进入"应用管理" → "自建"
   - 创建应用，获取AgentID和Secret

3. **配置客户联系功能**
   - 进入"客户联系" → "客户"
   - 开启客户联系功能
   - 配置可调用接口的应用

4. **配置回调URL**
   - 在应用设置中配置回调URL
   - 配置Token和EncodingAESKey
   - 验证URL有效性

### 7.2 开发步骤

**第一步：后端API集成**
1. 创建 `server/lib/wework.ts`，实现Access Token管理
2. 创建 `server/routers/wework.ts`，实现客户联系API
3. 创建回调处理路由 `/api/wework/callback`
4. 实现消息加解密功能
5. 测试API功能

**第二步：数据库设计**
1. 创建企业微信相关数据表
2. 执行数据库迁移
3. 测试数据读写

**第三步：前端页面开发**
1. 创建企业微信配置页面
2. 创建「联系我」管理页面
3. 扩展客户管理页面
4. 创建消息推送页面
5. 在Dashboard导航中添加入口

**第四步：数据同步**
1. 实现客户信息同步定时任务
2. 实现对话记录同步
3. 实现标签同步
4. 测试数据同步功能

**第五步：测试和优化**
1. 测试「联系我」二维码生成
2. 测试客户添加事件回调
3. 测试消息推送功能
4. 测试数据同步功能
5. 优化错误处理和日志记录

### 7.3 开发时间估算

| 任务 | 预计时间 |
|------|---------|
| 后端API集成 | 3天 |
| 数据库设计和迁移 | 1天 |
| 前端页面开发 | 3天 |
| 数据同步功能 | 2天 |
| 测试和优化 | 2天 |
| 文档编写 | 1天 |
| **总计** | **12天** |

---

## 八、使用场景

### 8.1 客户咨询场景

**流程：**
1. 客户在小红书看到医美项目推广
2. 扫描文章中的企业微信二维码
3. 添加企业员工为好友
4. 在企业微信中咨询项目详情和价格
5. 员工回复并发送项目介绍图文
6. 客户预约面诊
7. 系统自动记录客户信息和对话历史

**优势：**
- 客户无需安装额外应用
- 企业员工可以长期维护客户关系
- 支持发送图文、小程序卡片等丰富内容
- 自动记录对话历史，方便后续跟进

### 8.2 营销活动推送场景

**流程：**
1. 管理员在CRM系统中创建营销活动
2. 筛选目标客户（如：30天未消费的客户）
3. 编辑推送内容（优惠活动、项目介绍）
4. 设置推送时间（立即/定时）
5. 系统自动向目标客户推送消息
6. 客户收到消息并点击查看
7. 系统记录推送效果（打开率、转化率）

**优势：**
- 精准推送，提高转化率
- 支持批量推送，节省人力
- 实时统计效果，优化营销策略

### 8.3 自动化触发场景

**流程：**
1. 系统检测到客户生日即将到来（提前7天）
2. 自动触发生日祝福推送
3. 发送生日优惠券
4. 客户收到消息并预约
5. 系统自动记录触发日志和效果

**优势：**
- 自动化运营，提升客户体验
- 提高客户复购率
- 减少人工成本

---

## 九、注意事项

### 9.1 限制和配额

- 每个企业最多配置**50万**个「联系我」
- 临时会话每日最多添加**10万**个
- 临时会话模式仅支持**医疗行业**
- Access Token有效期**7200秒**（需定时刷新）
- 消息推送频率限制（避免被限流）

### 9.2 安全性

- **妥善保存config_id**：丢失后无法编辑或删除「联系我」
- **加密回调数据**：使用AES加密，防止数据泄露
- **验证签名**：确保回调请求来自企业微信服务器
- **限制API调用频率**：避免被限流或封号

### 9.3 合规性

- **企业认证**：需要完成企业认证（300元/年）
- **隐私保护**：遵守《个人信息保护法》，获取客户同意后才能推送消息
- **内容审核**：推送内容需符合医疗广告法规定

---

## 十、总结

企业微信相比微信小程序更适合医美行业的客户管理和营销场景，具有以下优势：

**核心优势：**
- ✅ 临时会话模式（医疗行业专用）
- ✅ 客户联系功能（长期维护客户关系）
- ✅ 消息推送能力（主动营销）
- ✅ 数据统计完善（效果追踪）
- ✅ 无需开发小程序（降低开发成本）

**推荐理由：**
1. **适合医美行业**：临时会话模式专为医疗行业设计，符合行业特点
2. **客户体验好**：客户无需安装额外应用，直接在企业微信中咨询
3. **功能强大**：支持消息推送、客户标签、数据统计等丰富功能
4. **开发成本低**：无需开发小程序，只需对接API即可
5. **长期价值高**：可以长期维护客户关系，提高复购率

**下一步行动：**
1. 注册企业微信并完成认证
2. 创建自建应用并获取凭证
3. 按照本文档开发集成功能
4. 测试和上线

---

*文档版本：v1.0*  
*最后更新：2026-02-03*
