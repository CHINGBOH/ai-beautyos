/**
 * Wework Webhook Service
 * 企业微信 Webhook 业务逻辑；Express 路由只负责 XML 解析与签名验证。
 */

import { getWeworkConfig, createWeworkCustomer, getWeworkCustomer, createWeworkMessage } from "../wework-db";
import { getExternalContact, sendTextMessage } from "../wework-api";
import { getActiveTriggersByTypes } from "../db";
import { callQwen } from "../qwen";
import { logger } from "../_core/logger";

// ---------------------------------------------------------------------------
// 客户添加事件
// ---------------------------------------------------------------------------

export async function handleCustomerAdd(data: {
  externalUserId: string;
  userId: string;
  state?: string;
  welcomeCode?: string;
}) {
  try {
    logger.info(`[企业微信Webhook] 客户添加事件: ${data.externalUserId}, state: ${data.state}`);

    const existing = await getWeworkCustomer(data.externalUserId);
    if (existing) {
      logger.info(`[企业微信Webhook] 客户已存在: ${data.externalUserId}`);
      return;
    }

    const customerInfo = await getExternalContact(data.externalUserId);
    if (customerInfo.errcode !== 0 || !customerInfo.external_contact) return;

    const contact = customerInfo.external_contact;
    const followUser = customerInfo.follow_user?.[0];

    await createWeworkCustomer({
      externalUserId: contact.external_userid,
      name: contact.name,
      avatar: contact.avatar,
      type: contact.type === 1 ? "1" : "2",
      gender: contact.gender === 0 ? "0" : contact.gender === 1 ? "1" : "2",
      unionId: contact.unionid,
      followUserId: followUser?.userid,
      remark: followUser?.remark,
      description: followUser?.description,
      createTime: followUser?.createtime
        ? new Date(followUser.createtime * 1000).toISOString()
        : new Date().toISOString(),
      tags: followUser?.tags ? JSON.stringify(followUser.tags) : undefined,
      state: followUser?.state || data.state,
    });

    logger.info(`[企业微信Webhook] 客户已保存: ${contact.name} (${contact.external_userid})`);

    // 触发自动化欢迎消息
    try {
      const activeTriggers = await getActiveTriggersByTypes(["time"]);
      const welcomeTrigger = activeTriggers.find(t => {
        try {
          const cfg = JSON.parse(t.actionConfig || "{}");
          return cfg.type === "welcome" || t.name?.includes("欢迎") || t.name?.includes("welcome");
        } catch { return false; }
      });

      if (contact.external_userid) {
        let welcomeMsg = `您好！感谢添加，我是您的专属顾问。\n\n有任何关于肌肤护理的问题都可以直接问我，也欢迎预约免费面诊～`;
        if (welcomeTrigger) {
          try {
            const cfg = JSON.parse(welcomeTrigger.actionConfig || "{}");
            if (cfg.message) welcomeMsg = cfg.message;
          } catch { /* ignore */ }
        }
        await sendTextMessage(contact.external_userid, welcomeMsg);
        logger.info(`[企业微信Webhook] 已发送欢迎消息给 ${contact.name}`);
      }
    } catch (triggerErr) {
      logger.warn("[企业微信Webhook] 欢迎消息发送失败", { error: triggerErr });
    }
  } catch (error) {
    logger.error("[企业微信Webhook] 处理客户添加事件失败:", error);
  }
}

// ---------------------------------------------------------------------------
// 消息事件（含 AI 自动回复）
// ---------------------------------------------------------------------------

export async function handleMessage(data: {
  externalUserId: string;
  userId: string;
  msgType: string;
  content: string;
  msgId: string;
}) {
  try {
    logger.info(`[企业微信Webhook] 收到消息: ${data.externalUserId}, 类型: ${data.msgType}`);

    await createWeworkMessage({
      externalUserId: data.externalUserId,
      sendUserId: data.userId,
      msgType: data.msgType,
      content: JSON.stringify({ content: data.content }),
      status: "sent",
    });

    if (data.msgType === "text" && data.content?.trim()) {
      try {
        const reply = await callQwen([
          {
            role: "system",
            content: "你是一名医美机构的AI客服助手，专业、亲切、简洁。回复客户问题时，优先解答疑虑，适时引导预约面诊，不超过120字。",
          },
          { role: "user", content: data.content },
        ]);
        if (reply && data.externalUserId) {
          await sendTextMessage(data.externalUserId, reply.trim());
        }
      } catch (aiErr) {
        logger.warn("[企业微信Webhook] AI自动回复失败（需人工跟进）", { error: aiErr });
      }
    }
  } catch (error) {
    logger.error("[企业微信Webhook] 处理消息事件失败:", error);
  }
}
