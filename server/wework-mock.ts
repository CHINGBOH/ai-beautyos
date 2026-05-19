/**
 * 企业微信模拟 API
 * 用于在认证期间测试功能，无需真实企业微信账号
 */

import { getWeworkConfig, updateAccessToken } from "./wework-db";

// 生成模拟 Access Token
export async function getMockAccessToken(): Promise<string> {
  const config = await getWeworkConfig();
  
  // 检查是否有有效的缓存 token
  if (config?.accessToken && config.tokenExpiresAt) {
    const now = new Date();
    if (config.tokenExpiresAt > now) {
      return config.accessToken;
    }
  }
  
  // 生成新的模拟 token
  const mockToken = `MOCK_TOKEN_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const expiresIn = 7200; // 2小时
  
  await updateAccessToken(mockToken, expiresIn);
  return mockToken;
}

// 模拟创建"联系我"二维码
export async function mockCreateContactWay(params: {
  type: number;
  scene: number;
  remark?: string;
  skip_verify?: boolean;
  state?: string;
  user?: string[];
}): Promise<{
  errcode: number;
  errmsg: string;
  config_id?: string;
  qr_code?: string;
}> {
  // 模拟成功响应
  const configId = `MOCK_CONFIG_${Date.now()}`;
  const qrCode = `https://work.weixin.qq.com/ca/cawcde${Math.random().toString(36).substring(7)}`;
  
  return {
    errcode: 0,
    errmsg: "ok",
    config_id: configId,
    qr_code: qrCode,
  };
}

// 模拟获取客户详情
export async function mockGetExternalContact(externalUserId: string): Promise<{
  errcode: number;
  errmsg: string;
  external_contact?: {
    external_userid: string;
    name: string;
    avatar: string;
    type: number;
    gender: number;
    unionid?: string;
  };
  follow_user?: Array<{
    userid: string;
    remark: string;
    description: string;
    createtime: number;
    tags?: Array<{
      group_name: string;
      tag_name: string;
      type: number;
    }>;
    state: string;
  }>;
}> {
  // 模拟客户数据
  return {
    errcode: 0,
    errmsg: "ok",
    external_contact: {
      external_userid: externalUserId,
      name: `模拟客户_${externalUserId.substring(0, 6)}`,
      avatar: "https://via.placeholder.com/150",
      type: 1,
      gender: 2, // 女性
    },
    follow_user: [
      {
        userid: "mock_user_001",
        remark: "来自小红书",
        description: "对超皮秒祛斑感兴趣",
        createtime: Math.floor(Date.now() / 1000),
        tags: [
          {
            group_name: "客户类型",
            tag_name: "潜在客户",
            type: 1,
          },
        ],
        state: "xiaohongshu",
      },
    ],
  };
}

// 模拟发送消息
export async function mockSendMessage(params: {
  touser: string;
  msgtype: string;
  text?: { content: string };
  image?: { media_id: string };
  link?: {
    title: string;
    picurl?: string;
    desc?: string;
    url: string;
  };
  miniprogram?: {
    title: string;
    pic_media_id: string;
    appid: string;
    page: string;
  };
}): Promise<{
  errcode: number;
  errmsg: string;
}> {
  // 模拟发送成功
  console.log("[企业微信模拟] 发送消息:", JSON.stringify(params, null, 2));
  
  return {
    errcode: 0,
    errmsg: "ok",
  };
}

// 模拟添加客户事件（用于测试）
export function mockCustomerAddEvent(state?: string) {
  const externalUserId = `MOCK_EXTERNAL_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  return {
    ToUserName: "mock_corp_id",
    FromUserName: externalUserId,
    CreateTime: Math.floor(Date.now() / 1000),
    MsgType: "event",
    Event: "change_external_contact",
    ChangeType: "add_external_contact",
    UserID: "mock_user_001",
    ExternalUserID: externalUserId,
    State: state || "xiaohongshu",
    WelcomeCode: `MOCK_WELCOME_${Date.now()}`,
  };
}

// 检查是否为模拟模式
export async function isMockMode(): Promise<boolean> {
  const config = await getWeworkConfig();
  return config?.isMockMode === 1;
}
