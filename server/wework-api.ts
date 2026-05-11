/**
 * 企业微信真实API调用
 */

import axios from "axios";
import { getWeworkConfig, updateAccessToken } from "./wework-db";

const WEWORK_API_BASE = "https://qyapi.weixin.qq.com";

/**
 * 获取Access Token（带缓存）
 */
export async function getAccessToken(): Promise<string> {
  const config = await getWeworkConfig();
  if (!config || !config.corpId || !config.corpSecret) {
    throw new Error("企业微信配置不完整");
  }

  // 检查是否有有效的缓存token
  if (config.accessToken && config.tokenExpiresAt) {
    const now = new Date();
    if (config.tokenExpiresAt > now) {
      return config.accessToken;
    }
  }

  // 获取新token
  const url = `${WEWORK_API_BASE}/cgi-bin/gettoken`;
  const response = await axios.get(url, {
    params: {
      corpid: config.corpId,
      corpsecret: config.corpSecret,
    },
  });

  if (response.data.errcode !== 0) {
    throw new Error(`获取Access Token失败: ${response.data.errmsg}`);
  }

  const { access_token, expires_in } = response.data;
  await updateAccessToken(access_token, expires_in);

  return access_token;
}

/**
 * 创建"联系我"二维码
 */
export async function createContactWay(params: {
  type: number; // 1=单人, 2=多人
  scene: number; // 1=在小程序中联系, 2=通过二维码联系
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
  const accessToken = await getAccessToken();
  const url = `${WEWORK_API_BASE}/cgi-bin/externalcontact/add_contact_way`;

  const response = await axios.post(url, {
    type: params.type,
    scene: params.scene,
    style: 1, // 二维码样式
    remark: params.remark,
    skip_verify: params.skip_verify ?? true,
    state: params.state,
    user: params.user,
  }, {
    params: {
      access_token: accessToken,
    },
  });

  return response.data;
}

/**
 * 获取外部联系人详情
 */
export async function getExternalContact(externalUserId: string): Promise<{
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
  const accessToken = await getAccessToken();
  const url = `${WEWORK_API_BASE}/cgi-bin/externalcontact/get`;

  const response = await axios.get(url, {
    params: {
      access_token: accessToken,
      external_userid: externalUserId,
    },
  });

  return response.data;
}

/**
 * 发送消息给外部联系人
 */
export async function sendMessage(params: {
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
  const config = await getWeworkConfig();
  if (!config || !config.agentId) {
    throw new Error("企业微信AgentId未配置");
  }

  const accessToken = await getAccessToken();
  const url = `${WEWORK_API_BASE}/cgi-bin/externalcontact/send_welcome_msg`;

  const response = await axios.post(url, {
    ...params,
  }, {
    params: {
      access_token: accessToken,
    },
  });

  return response.data;
}

/**
 * 发送文本消息（使用客服消息接口）
 */
export async function sendTextMessage(externalUserId: string, content: string): Promise<{
  errcode: number;
  errmsg: string;
}> {
  const config = await getWeworkConfig();
  if (!config || !config.agentId) {
    throw new Error("企业微信AgentId未配置");
  }

  const accessToken = await getAccessToken();
  const url = `${WEWORK_API_BASE}/cgi-bin/message/send`;

  const response = await axios.post(url, {
    touser: externalUserId,
    msgtype: "text",
    agentid: config.agentId,
    text: {
      content,
    },
  }, {
    params: {
      access_token: accessToken,
    },
  });

  return response.data;
}

/**
 * 检查是否为模拟模式
 */
export async function isMockMode(): Promise<boolean> {
  const config = await getWeworkConfig();
  return config?.isMockMode === 1;
}
