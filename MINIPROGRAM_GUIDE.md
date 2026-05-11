# 深圳妍美医疗美容门诊部 - 微信小程序开发指南

## 方案概述

采用**方案二（混合开发）**：
- **C端（客户端）**：使用微信小程序原生开发，提供最佳用户体验
- **B端（管理端）**：使用 WebView 嵌入当前 Web 管理后台
- **后端 API**：复用当前的 tRPC API，无需重复开发

---

## 一、小程序端（C端）开发

### 1.1 项目结构

```
miniprogram/
├── pages/
│   ├── index/              # 首页（项目展示）
│   │   ├── index.wxml
│   │   ├── index.wxss
│   │   ├── index.ts
│   │   └── index.json
│   ├── chat/               # AI 客服对话
│   │   ├── chat.wxml
│   │   ├── chat.wxss
│   │   ├── chat.ts
│   │   └── chat.json
│   ├── booking/            # 预约表单
│   │   ├── booking.wxml
│   │   ├── booking.wxss
│   │   ├── booking.ts
│   │   └── booking.json
│   ├── profile/            # 个人中心
│   │   ├── profile.wxml
│   │   ├── profile.wxss
│   │   ├── profile.ts
│   │   └── profile.json
│   └── admin/              # 管理后台（WebView）
│       ├── admin.wxml
│       ├── admin.wxss
│       ├── admin.ts
│       └── admin.json
├── utils/
│   ├── api.ts              # API 请求封装
│   ├── auth.ts             # 微信登录
│   └── storage.ts          # 本地存储
├── app.json                # 小程序配置
├── app.ts                  # 小程序入口
├── app.wxss                # 全局样式
└── project.config.json     # 项目配置
```

### 1.2 核心页面实现

#### 1.2.1 首页（项目展示）

**功能：**
- 展示超皮秒祛斑、水光针、热玛吉等项目
- 项目卡片点击查看详情
- 底部导航栏

**关键代码：**
```typescript
// pages/index/index.ts
Page({
  data: {
    projects: [
      {
        id: 1,
        name: '超皮秒祛斑',
        price: '3000-6000元',
        image: '/images/project1.jpg',
        description: '精准击碎色素颗粒，温和祛除各类色斑'
      },
      // ... 更多项目
    ]
  },
  
  onLoad() {
    // 加载项目列表
  },
  
  goToChat() {
    wx.navigateTo({
      url: '/pages/chat/chat'
    });
  },
  
  goToBooking(e: any) {
    const projectId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/booking/booking?projectId=${projectId}`
    });
  }
});
```

#### 1.2.2 AI 客服对话页面

**功能：**
- 与 AI 客服实时对话
- 自动提取客户信息
- 支持发送图片
- 留资表单弹窗

**关键代码：**
```typescript
// pages/chat/chat.ts
import { sendMessage, createConversation } from '../../utils/api';

Page({
  data: {
    messages: [],
    inputValue: '',
    conversationId: '',
    scrollToView: ''
  },
  
  async onLoad() {
    // 创建会话
    const res = await createConversation({
      visitorName: '微信用户',
      source: 'miniprogram'
    });
    this.setData({ conversationId: res.conversationId });
  },
  
  async sendMessage() {
    const { inputValue, conversationId, messages } = this.data;
    
    if (!inputValue.trim()) return;
    
    // 添加用户消息
    const userMessage = {
      role: 'user',
      content: inputValue,
      timestamp: Date.now()
    };
    
    this.setData({
      messages: [...messages, userMessage],
      inputValue: '',
      scrollToView: `msg-${messages.length}`
    });
    
    // 调用 API
    try {
      const res = await sendMessage({
        conversationId,
        message: inputValue
      });
      
      // 添加 AI 回复
      const aiMessage = {
        role: 'assistant',
        content: res.response,
        timestamp: Date.now()
      };
      
      this.setData({
        messages: [...this.data.messages, aiMessage],
        scrollToView: `msg-${this.data.messages.length}`
      });
    } catch (error) {
      wx.showToast({
        title: '发送失败',
        icon: 'none'
      });
    }
  }
});
```

#### 1.2.3 预约表单页面

**功能：**
- 填写姓名、手机、微信、意向项目、预算
- 表单验证
- 提交到后端 API

**关键代码：**
```typescript
// pages/booking/booking.ts
import { submitLead } from '../../utils/api';

Page({
  data: {
    formData: {
      name: '',
      phone: '',
      wechat: '',
      interestedProject: '',
      budget: '',
      message: ''
    },
    projects: ['超皮秒祛斑', '水光针', '热玛吉', '冷光美白', '隐形矫正']
  },
  
  onLoad(options: any) {
    if (options.projectId) {
      // 预填充项目
      this.setData({
        'formData.interestedProject': this.data.projects[options.projectId - 1]
      });
    }
  },
  
  async submitForm() {
    const { formData } = this.data;
    
    // 表单验证
    if (!formData.name || !formData.phone) {
      wx.showToast({
        title: '请填写必填项',
        icon: 'none'
      });
      return;
    }
    
    // 手机号验证
    if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      wx.showToast({
        title: '手机号格式不正确',
        icon: 'none'
      });
      return;
    }
    
    try {
      await submitLead({
        ...formData,
        source: 'miniprogram'
      });
      
      wx.showToast({
        title: '提交成功',
        icon: 'success'
      });
      
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      wx.showToast({
        title: '提交失败',
        icon: 'none'
      });
    }
  }
});
```

#### 1.2.4 管理后台（WebView）

**功能：**
- 嵌入 Web 管理后台
- 自动登录

**关键代码：**
```typescript
// pages/admin/admin.ts
Page({
  data: {
    webviewUrl: ''
  },
  
  onLoad() {
    // 获取登录 token
    const token = wx.getStorageSync('token');
    
    // 构建 URL
    const baseUrl = 'https://your-domain.com/dashboard';
    const url = `${baseUrl}?token=${token}`;
    
    this.setData({ webviewUrl: url });
  }
});
```

```xml
<!-- pages/admin/admin.wxml -->
<web-view src="{{webviewUrl}}"></web-view>
```

### 1.3 API 请求封装

```typescript
// utils/api.ts
const BASE_URL = 'https://your-domain.com/api/trpc';

interface RequestOptions {
  method?: 'GET' | 'POST';
  data?: any;
}

async function request(path: string, options: RequestOptions = {}) {
  const token = wx.getStorageSync('token');
  
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}/${path}`,
      method: options.method || 'POST',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(new Error('请求失败'));
        }
      },
      fail: reject
    });
  });
}

// 创建会话
export async function createConversation(data: any) {
  return request('chat.createConversation', { data });
}

// 发送消息
export async function sendMessage(data: any) {
  return request('chat.sendMessage', { data });
}

// 提交线索
export async function submitLead(data: any) {
  return request('admin.submitLead', { data });
}
```

### 1.4 微信登录

```typescript
// utils/auth.ts
export async function wxLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: async (res) => {
        if (res.code) {
          try {
            // 调用后端 API 换取 token
            const result: any = await request('auth.wxLogin', {
              data: { code: res.code }
            });
            
            // 保存 token
            wx.setStorageSync('token', result.token);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error('登录失败'));
        }
      },
      fail: reject
    });
  });
}
```

---

## 二、后端 API 适配

### 2.1 添加微信小程序登录支持

在 `server/routers.ts` 中添加微信登录接口：

```typescript
import { z } from "zod";
import axios from "axios";
import jwt from "jsonwebtoken";

export const appRouter = router({
  // ... 现有路由
  
  auth: router({
    // ... 现有认证路由
    
    // 微信小程序登录
    wxLogin: publicProcedure
      .input(z.object({
        code: z.string(),
      }))
      .mutation(async ({ input }) => {
        // 调用微信 API 换取 openid
        const { data } = await axios.get(
          `https://api.weixin.qq.com/sns/jscode2session`,
          {
            params: {
              appid: process.env.WX_MINIPROGRAM_APPID,
              secret: process.env.WX_MINIPROGRAM_SECRET,
              js_code: input.code,
              grant_type: 'authorization_code'
            }
          }
        );
        
        if (data.errcode) {
          throw new Error('微信登录失败');
        }
        
        const { openid, session_key } = data;
        
        // 查找或创建用户
        let user = await getUserByOpenId(openid);
        
        if (!user) {
          user = await createUser({
            openId: openid,
            source: 'miniprogram'
          });
        }
        
        // 生成 JWT token
        const token = jwt.sign(
          { userId: user.id, openId: openid },
          process.env.JWT_SECRET!,
          { expiresIn: '30d' }
        );
        
        return {
          token,
          user: {
            id: user.id,
            name: user.name,
            avatar: user.avatar
          }
        };
      }),
  }),
});
```

### 2.2 添加环境变量

在 `.env` 文件中添加：

```
WX_MINIPROGRAM_APPID=your_appid
WX_MINIPROGRAM_SECRET=your_secret
```

### 2.3 适配请求格式

小程序的请求格式与 Web 端完全兼容，无需额外适配。只需确保：
1. 所有 API 支持 CORS
2. 支持 Bearer Token 认证
3. 返回标准 JSON 格式

---

## 三、小程序配置

### 3.1 app.json

```json
{
  "pages": [
    "pages/index/index",
    "pages/chat/chat",
    "pages/booking/booking",
    "pages/profile/profile",
    "pages/admin/admin"
  ],
  "window": {
    "backgroundTextStyle": "light",
    "navigationBarBackgroundColor": "#B8A68D",
    "navigationBarTitleText": "深圳妍美医美",
    "navigationBarTextStyle": "white"
  },
  "tabBar": {
    "color": "#999999",
    "selectedColor": "#B8A68D",
    "backgroundColor": "#ffffff",
    "list": [
      {
        "pagePath": "pages/index/index",
        "text": "首页",
        "iconPath": "images/home.png",
        "selectedIconPath": "images/home-active.png"
      },
      {
        "pagePath": "pages/chat/chat",
        "text": "咨询",
        "iconPath": "images/chat.png",
        "selectedIconPath": "images/chat-active.png"
      },
      {
        "pagePath": "pages/profile/profile",
        "text": "我的",
        "iconPath": "images/profile.png",
        "selectedIconPath": "images/profile-active.png"
      }
    ]
  },
  "permission": {
    "scope.userLocation": {
      "desc": "您的位置信息将用于查找附近的门店"
    }
  }
}
```

### 3.2 project.config.json

```json
{
  "description": "深圳妍美医疗美容门诊部微信小程序",
  "appid": "your_appid",
  "projectname": "medical-beauty-miniapp",
  "miniprogramRoot": "./",
  "compileType": "miniprogram",
  "setting": {
    "urlCheck": true,
    "es6": true,
    "enhance": true,
    "postcss": true,
    "minified": true
  }
}
```

---

## 四、部署流程

### 4.1 小程序端部署

1. **注册小程序账号**
   - 访问 [微信公众平台](https://mp.weixin.qq.com/)
   - 注册小程序账号
   - 完成主体信息认证

2. **配置服务器域名**
   - 在小程序后台 → 开发 → 开发管理 → 开发设置
   - 配置 request 合法域名：`https://your-domain.com`
   - 配置 uploadFile 合法域名（如需上传图片）
   - 配置 downloadFile 合法域名（如需下载文件）

3. **开发和测试**
   - 下载[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
   - 导入项目
   - 填写 AppID
   - 本地开发和调试

4. **提交审核**
   - 在开发者工具中点击"上传"
   - 在小程序后台提交审核
   - 等待审核通过（通常 1-3 天）

5. **发布上线**
   - 审核通过后，在小程序后台点击"发布"
   - 用户即可搜索到小程序

### 4.2 后端 API 部署

当前的 Web 应用已经部署，无需额外操作。只需：
1. 确保域名已备案
2. 在小程序后台配置服务器域名
3. 添加微信小程序的环境变量

---

## 五、开发时间估算

| 任务 | 预计时间 |
|------|---------|
| 小程序项目初始化 | 0.5天 |
| 首页开发 | 1天 |
| AI 客服对话页面 | 2天 |
| 预约表单页面 | 1天 |
| 个人中心页面 | 1天 |
| API 封装和对接 | 1天 |
| 微信登录集成 | 1天 |
| 测试和调试 | 2天 |
| 提交审核和发布 | 1-3天 |
| **总计** | **10-12天** |

---

## 六、注意事项

1. **域名备案**：小程序要求服务器域名必须已备案

2. **HTTPS**：所有 API 请求必须使用 HTTPS

3. **跨域问题**：小程序不存在跨域问题，但需要在后端配置 CORS

4. **图片资源**：建议使用 CDN 存储图片，提升加载速度

5. **性能优化**：
   - 减少 setData 调用频率
   - 图片懒加载
   - 分包加载

6. **用户体验**：
   - 添加 loading 提示
   - 错误提示友好
   - 支持下拉刷新

---

## 七、后续扩展

1. **支付功能**：集成微信支付，支持在线预约付款

2. **优惠券系统**：发放和核销优惠券

3. **会员系统**：积分、等级、专属优惠

4. **预约管理**：查看预约记录、取消预约、修改预约

5. **消息推送**：预约提醒、优惠活动通知

6. **分享功能**：分享项目、分享优惠，获得奖励

---

## 八、技术支持

如有问题，请参考：
- [微信小程序官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/)
- [tRPC 官方文档](https://trpc.io/)
- 当前项目的 `SYSTEM_MANUAL.md`

---

**开发建议：**

由于小程序开发需要微信开发者工具和小程序账号，建议：
1. 先注册小程序账号并获取 AppID
2. 下载微信开发者工具
3. 按照本文档创建项目结构
4. 逐步实现各个页面
5. 与后端 API 对接测试

如需帮助，可以随时联系我继续开发！
