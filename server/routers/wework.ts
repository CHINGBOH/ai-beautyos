import axios from "axios";
import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
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

export const weworkRouter = router({
  // 测试连接
  testConnection: adminProcedure
    .input(
      z.object({
        corpId: z.string(),
        corpSecret: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken`;
        const response = await axios.get(url, {
          params: {
            corpid: input.corpId,
            corpsecret: input.corpSecret,
          },
        });

        if (response.data.errcode === 0) {
          return { success: true };
        } else {
          return {
            success: false,
            error: `连接失败: ${response.data.errmsg} (错误码: ${response.data.errcode})`,
          };
        }
      } catch (error: unknown) {
        return {
          success: false,
          error: `网络请求失败: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    }),

  // 获取配置
  getConfig: protectedProcedure.query(async () => {
    const config = await getWeworkConfig();
    return config || null;
  }),

  // 保存配置
  saveConfig: adminProcedure
    .input(
      z.object({
        corpId: z.string().optional(),
        corpSecret: z.string().optional(),
        agentId: z.number().optional(),
        token: z.string().optional(),
        encodingAesKey: z.string().optional(),
        isMockMode: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await saveWeworkConfig(input);
    }),

  // 创建"联系我"二维码
  createContactWay: adminProcedure
    .input(
      z.object({
        type: z.enum(["single", "multi"]).default("single"),
        scene: z.enum(["1", "2"]).default("2"),
        remark: z.string().optional(),
        skipVerify: z.boolean().default(true),
        state: z.string().optional(),
        userIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await apiCreateContactWay({
        type: input.type === "single" ? 1 : 2,
        scene: parseInt(input.scene),
        remark: input.remark,
        skip_verify: input.skipVerify,
        state: input.state,
        user: input.userIds,
      });

      if (result.errcode === 0 && result.config_id && result.qr_code) {
        // 保存到数据库
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

        return {
          success: true,
          configId: result.config_id,
          qrCode: result.qr_code,
        };
      }

      return {
        success: false,
        error: result.errmsg,
      };
    }),

  // 获取"联系我"列表
  listContactWays: adminProcedure.query(async () => {
    return await listContactWays();
  }),

  // 删除"联系我"配置
  deleteContactWay: adminProcedure
    .input(z.object({ configId: z.string() }))
    .mutation(async ({ input }) => {
      await deleteContactWay(input.configId);
      return { success: true };
    }),

  // 获取客户列表
  listCustomers: protectedProcedure.query(async () => {
    return await listWeworkCustomers();
  }),

  // 获取客户详情
  getCustomer: protectedProcedure
    .input(z.object({ externalUserId: z.string() }))
    .query(async ({ input }) => {
      return await getWeworkCustomer(input.externalUserId);
    }),

  // 模拟添加客户（测试用）
  mockAddCustomer: protectedProcedure
    .input(z.object({ state: z.string().optional() }))
    .mutation(async ({ input }) => {
      const externalUserId = `mock_${Date.now()}`;
      const customer = await createWeworkCustomer({
        externalUserId,
        name: `模拟客户 ${externalUserId}`,
        type: "1",
        state: input.state,
      });
      return {
        success: true,
        customer,
        error: undefined,
      };
    }),

  // 发送消息
  sendMessage: protectedProcedure
    .input(
      z.object({
        externalUserId: z.string(),
        sendUserId: z.string(),
        msgType: z.enum(["text", "image", "link", "miniprogram"]),
        content: z.any(),
      })
    )
    .mutation(async ({ input }) => {
      // 创建消息记录
      const message = await createWeworkMessage({
        externalUserId: input.externalUserId,
        sendUserId: input.sendUserId,
        msgType: input.msgType,
        content: JSON.stringify(input.content),
        status: "pending",
      });

      let result;
      if (input.msgType === "text") {
        result = await sendTextMessage(
          input.externalUserId,
          input.content.content
        );
      } else {
        result = await apiSendMessage({
          touser: input.externalUserId,
          msgtype: input.msgType,
          [input.msgType]: input.content,
        });
      }

      if (result.errcode === 0) {
        await updateMessageStatus(message.id, "sent");
        return {
          success: true,
          messageId: message.id,
        };
      } else {
        await updateMessageStatus(message.id, "failed", result.errmsg);
        return {
          success: false,
          error: result.errmsg,
        };
      }
    }),

  // 获取消息列表
  listMessages: protectedProcedure
    .input(z.object({ externalUserId: z.string().optional() }))
    .query(async ({ input }) => {
      return await listWeworkMessages(input.externalUserId);
    }),
});
