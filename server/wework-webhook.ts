/**
 * 企业微信 Webhook 回调路由
 * 业务逻辑已抽至 services/wework-webhook.service.ts。
 */

import type { Express, Request, Response } from "express";
import { getWeworkConfig } from "./wework-db";
import { handleCustomerAdd, handleMessage } from "./services/wework-webhook.service";
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

      // 处理事件 → 委托给 service 层
      if (xmlData.MsgType === "event") {
        if (xmlData.Event === "change_external_contact") {
          if (xmlData.ChangeType === "add_external_contact") {
            await handleCustomerAdd({
              externalUserId: xmlData.ExternalUserID || xmlData.ExternalUserID?.[0],
              userId: xmlData.UserID || xmlData.UserID?.[0],
              state: xmlData.State || xmlData.State?.[0],
              welcomeCode: xmlData.WelcomeCode || xmlData.WelcomeCode?.[0],
            });
          } else if (xmlData.ChangeType === "del_external_contact") {
            console.log(`[企业微信Webhook] 客户删除事件: ${xmlData.ExternalUserID}`);
          }
        }
      } else if (xmlData.MsgType === "text" || xmlData.MsgType === "image") {
        await handleMessage({
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
