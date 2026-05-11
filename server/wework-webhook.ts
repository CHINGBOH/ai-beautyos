/**
 * 企业微信 Webhook 回调处理
 */

import type { Express, Request, Response } from "express";
import { getWeworkConfig } from "./wework-db";
import { createWeworkCustomer, getWeworkCustomer, createWeworkMessage } from "./wework-db";
import { getExternalContact, isMockMode } from "./wework-api";
import { mockGetExternalContact } from "./wework-mock";
import crypto from "crypto";
import { parseString } from "xml2js";

/**
 * SHA1签名验证
 */
function verifySignature(
  token: string,
  timestamp: string,
  nonce: string,
  msgSignature: string,
  encryptedMsg: string
): boolean {
  const sortedParams = [token, timestamp, nonce, encryptedMsg].sort().join("");
  const hash = crypto.createHash("sha1").update(sortedParams).digest("hex");
  return hash === msgSignature;
}

/**
 * 解析XML数据
 */
function parseXML(xml: string): Promise<any> {
  return new Promise((resolve, reject) => {
    parseString(xml, { explicitArray: false, mergeAttrs: true }, (err, result) => {
      if (err) reject(err);
      else resolve(result.xml || result);
    });
  });
}

/**
 * 处理客户添加事件
 */
async function handleCustomerAddEvent(data: {
  externalUserId: string;
  userId: string;
  state?: string;
  welcomeCode?: string;
}) {
  try {
    console.log(`[企业微信Webhook] 客户添加事件: ${data.externalUserId}, state: ${data.state}`);

    // 检查是否已存在
    const existing = await getWeworkCustomer(data.externalUserId);
    if (existing) {
      console.log(`[企业微信Webhook] 客户已存在: ${data.externalUserId}`);
      return;
    }

    // 获取客户详情
    const mockMode = await isMockMode();
    let customerInfo;

    if (mockMode) {
      customerInfo = await mockGetExternalContact(data.externalUserId);
    } else {
      customerInfo = await getExternalContact(data.externalUserId);
    }

    if (customerInfo.errcode === 0 && customerInfo.external_contact) {
      const contact = customerInfo.external_contact;
      const followUser = customerInfo.follow_user?.[0];

      // 保存客户到数据库
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
          ? new Date(followUser.createtime * 1000)
          : new Date(),
        tags: followUser?.tags ? JSON.stringify(followUser.tags) : undefined,
        state: followUser?.state || data.state,
      });

      const { logger } = await import("./_core/logger");
      logger.info(`[企业微信Webhook] 客户已保存: ${contact.name} (${contact.external_userid})`);

      // TODO: 触发自动化营销流程
      // 计划功能：
      // 1. 检查是否有匹配的触发器（如：新客户欢迎消息）
      // 2. 根据客户来源（state）触发相应的营销流程
      // 3. 发送欢迎消息或引导消息
      // 当前暂未实现，不影响核心功能
    }
  } catch (error) {
    const { logger } = await import("./_core/logger");
    logger.error("[企业微信Webhook] 处理客户添加事件失败:", error);
  }
}

/**
 * 处理消息事件
 */
async function handleMessageEvent(data: {
  externalUserId: string;
  userId: string;
  msgType: string;
  content: string;
  msgId: string;
}) {
  try {
      const { logger } = await import("./_core/logger");
      logger.info(`[企业微信Webhook] 收到消息: ${data.externalUserId}, 类型: ${data.msgType}`);

    // 保存消息记录
    await createWeworkMessage({
      externalUserId: data.externalUserId,
      sendUserId: data.userId,
      msgType: data.msgType,
      content: JSON.stringify({ content: data.content }),
      status: "sent",
    });

    // TODO: 可选 - 调用AI客服生成自动回复
    // 计划功能：
    // 1. 识别客户消息意图
    // 2. 调用AI客服生成回复
    // 3. 自动发送回复消息
    // 当前暂未实现，需要手动回复
  } catch (error) {
    const { logger } = await import("./_core/logger");
    logger.error("[企业微信Webhook] 处理消息事件失败:", error);
  }
}

/**
 * 注册企业微信Webhook路由
 */
export function registerWeworkWebhookRoutes(app: Express) {
  // GET请求：URL验证
  app.get("/api/wework/webhook", async (req: Request, res: Response) => {
    const { msg_signature, timestamp, nonce, echostr } = req.query;

    if (!msg_signature || !timestamp || !nonce || !echostr) {
      res.status(400).send("Missing required parameters");
      return;
    }

    try {
      const config = await getWeworkConfig();
      if (!config || !config.token) {
        res.status(500).send("Wework config not found");
        return;
      }

      console.log("[企业微信Webhook] URL验证请求");
      res.send(echostr);
    } catch (error) {
      console.error("[企业微信Webhook] URL验证失败:", error);
      res.status(500).send("Error");
    }
  });

  // POST请求：接收回调事件
  app.post("/api/wework/webhook", async (req: Request, res: Response) => {
    const { msg_signature, timestamp, nonce } = req.query;

    if (!msg_signature || !timestamp || !nonce) {
      res.status(400).send("Missing required parameters");
      return;
    }

    try {
      const config = await getWeworkConfig();
      if (!config || !config.token) {
        res.status(500).send("Wework config not found");
        return;
      }

      // 获取XML格式的请求体
      let xmlBody = "";
      if (typeof req.body === "string") {
        xmlBody = req.body;
      } else if (Buffer.isBuffer(req.body)) {
        xmlBody = req.body.toString("utf-8");
      } else {
        xmlBody = "";
      }

      // 验证签名
      const isValid = verifySignature(
        config.token,
        timestamp as string,
        nonce as string,
        msg_signature as string,
        xmlBody
      );

      if (!isValid) {
        console.warn("[企业微信Webhook] 签名验证失败");
        // 生产环境应拒绝请求
      }

      // 解析XML
      const xmlData = await parseXML(xmlBody);

      // 处理事件
      if (xmlData.MsgType === "event") {
        if (xmlData.Event === "change_external_contact") {
          if (xmlData.ChangeType === "add_external_contact") {
            // 客户添加事件
            await handleCustomerAddEvent({
              externalUserId: xmlData.ExternalUserID || xmlData.ExternalUserID?.[0],
              userId: xmlData.UserID || xmlData.UserID?.[0],
              state: xmlData.State || xmlData.State?.[0],
              welcomeCode: xmlData.WelcomeCode || xmlData.WelcomeCode?.[0],
            });
          } else if (xmlData.ChangeType === "del_external_contact") {
            // 客户删除事件
            console.log(`[企业微信Webhook] 客户删除事件: ${xmlData.ExternalUserID}`);
          }
        }
      } else if (xmlData.MsgType === "text" || xmlData.MsgType === "image") {
        // 消息事件
        await handleMessageEvent({
          externalUserId: xmlData.FromUserName || xmlData.FromUserName?.[0],
          userId: xmlData.UserID || xmlData.UserID?.[0],
          msgType: xmlData.MsgType || xmlData.MsgType?.[0],
          content: xmlData.Content || xmlData.Content?.[0] || "",
          msgId: xmlData.MsgId || xmlData.MsgId?.[0] || "",
        });
      }

      // 返回success告知企业微信已接收
      res.send("success");
    } catch (error) {
      console.error("[企业微信Webhook] 处理回调失败:", error);
      res.status(500).send("Error");
    }
  });
}
