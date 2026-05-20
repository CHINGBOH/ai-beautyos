/**
 * WeCom (企业微信) Service
 * 企业微信集成业务逻辑；router 只负责鉴权与参数校验。
 */

import axios from "axios";
import {
  getWeworkConfig,
  saveWeworkConfig,
  createContactWay,
  listContactWays,
  deleteContactWay,
  createWeworkCustomer,
  listWeworkCustomers,
  getWeworkCustomer,
  createWeworkMessage,
  listWeworkMessages,
  updateMessageStatus,
} from "../wework-db";
import {
  createContactWay as apiCreateContactWay,
  sendMessage as apiSendMessage,
  sendTextMessage,
} from "../wework-api";

export async function testConnection(corpId: string, corpSecret: string) {
  try {
    const response = await axios.get("https://qyapi.weixin.qq.com/cgi-bin/gettoken", {
      params: { corpid: corpId, corpsecret: corpSecret },
    });
    if (response.data.errcode === 0) return { success: true };
    return {
      success: false,
      error: `连接失败: ${response.data.errmsg} (错误码: ${response.data.errcode})`,
    };
  } catch (error: unknown) {
    return {
      success: false,
      error: `网络请求失败: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function getConfig() {
  const config = await getWeworkConfig();
  return config || null;
}

export async function saveConfig(input: {
  corpId?: string;
  corpSecret?: string;
  agentId?: number;
  token?: string;
  encodingAesKey?: string;
  isMockMode?: number;
}) {
  return saveWeworkConfig(input);
}

export async function createContactWayWithDb(input: {
  type: "single" | "multi";
  scene: "1" | "2";
  remark?: string;
  skipVerify: boolean;
  state?: string;
  userIds?: string[];
}) {
  const result = await apiCreateContactWay({
    type: input.type === "single" ? 1 : 2,
    scene: parseInt(input.scene),
    remark: input.remark,
    skip_verify: input.skipVerify,
    state: input.state,
    user: input.userIds,
  });

  if (result.errcode === 0 && result.config_id && result.qr_code) {
    await createContactWay({
      configId: result.config_id,
      type: input.type,
      scene: input.scene,
      qrCode: result.qr_code,
      remark: input.remark,
      skipVerify: input.skipVerify ? 1 : 0,
      state: input.state,
      userIds: input.userIds ? JSON.stringify(input.userIds) : undefined,
    });
    return { success: true, configId: result.config_id, qrCode: result.qr_code };
  }
  return { success: false, error: result.errmsg };
}

export async function listContactWayRecords() {
  return listContactWays();
}

export async function deleteContactWayRecord(configId: string) {
  await deleteContactWay(configId);
  return { success: true };
}

export async function listCustomers() {
  return listWeworkCustomers();
}

export async function getCustomer(externalUserId: string) {
  return getWeworkCustomer(externalUserId);
}

export async function mockAddCustomer(state?: string) {
  const externalUserId = `mock_${Date.now()}`;
  const customer = await createWeworkCustomer({
    externalUserId,
    name: `模拟客户 ${externalUserId}`,
    type: "1",
    state,
  });
  return { success: true, customer, error: undefined };
}

export async function sendMessage(input: {
  externalUserId: string;
  sendUserId: string;
  msgType: "text" | "image" | "link" | "miniprogram";
  content: unknown;
}) {
  const message = await createWeworkMessage({
    externalUserId: input.externalUserId,
    sendUserId: input.sendUserId,
    msgType: input.msgType,
    content: JSON.stringify(input.content),
    status: "pending",
  });

  let result;
  if (input.msgType === "text") {
    result = await sendTextMessage(input.externalUserId, (input.content as { content: string }).content);
  } else {
    result = await apiSendMessage({
      touser: input.externalUserId,
      msgtype: input.msgType,
      [input.msgType]: input.content,
    });
  }

  if (result.errcode === 0) {
    await updateMessageStatus(message.id, "sent");
    return { success: true, messageId: message.id };
  } else {
    await updateMessageStatus(message.id, "failed", result.errmsg);
    return { success: false, error: result.errmsg };
  }
}

export async function listMessages(externalUserId?: string) {
  return listWeworkMessages(externalUserId);
}
