import axios from "axios";
import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
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
  getMockAccessToken,
  mockCreateContactWay,
  mockGetExternalContact,
  mockSendMessage,
  mockCustomerAddEvent,
  isMockMode,
} from "../wework-mock";
import {
  createContactWay as apiCreateContactWay,
  sendMessage as apiSendMessage,
  sendTextMessage,
  isMockMode as apiIsMockMode,
} from "../wework-api";

export const weworkRouter = router({
  // 测试连接
  testConnection: publicProcedure
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
      } catch (error: any) {
        return {
          success: false,
          error: `网络请求失败: ${error.message}`,
        };
      }
    }),

  // 获取配置
  getConfig: publicProcedure.query(async () => {
    const config = await getWeworkConfig();
    return config || null;
  }),

  // 保存配置
  saveConfig: publicProcedure
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
  createContactWay: publicProcedure
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
      const mockMode = await apiIsMockMode();

      let result;
      if (mockMode) {
        // 模拟模式
        result = await mockCreateContactWay({
          type: input.type === "single" ? 1 : 2,
          scene: parseInt(input.scene),
          remark: input.remark,
          skip_verify: input.skipVerify,
          state: input.state,
          user: input.userIds,
        });
      } else {
        // 真实模式
        result = await apiCreateContactWay({
          type: input.type === "single" ? 1 : 2,
          scene: parseInt(input.scene),
          remark: input.remark,
          skip_verify: input.skipVerify,
          state: input.state,
          user: input.userIds,
        });
      }

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
  listContactWays: publicProcedure.query(async () => {
    return await listContactWays();
  }),

  // 删除"联系我"配置
  deleteContactWay: publicProcedure
    .input(z.object({ configId: z.string() }))
    .mutation(async ({ input }) => {
      await deleteContactWay(input.configId);
      return { success: true };
    }),

  // 模拟添加客户（用于测试）
  mockAddCustomer: publicProcedure
    .input(
      z.object({
        state: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const mockMode = await isMockMode();
      if (!mockMode) {
        throw new Error("只有在模拟模式下才能使用此功能");
      }

      // 生成模拟客户添加事件
      const event = mockCustomerAddEvent(input.state);

      // 获取客户详情
      const customerInfo = await mockGetExternalContact(event.ExternalUserID);

      if (customerInfo.errcode === 0 && customerInfo.external_contact) {
        const contact = customerInfo.external_contact;
        const followUser = customerInfo.follow_user?.[0];

        // 保存到数据库
        const customer = await createWeworkCustomer({
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
          state: followUser?.state || input.state,
        });

        return {
          success: true,
          customer,
        };
      }

      return {
        success: false,
        error: customerInfo.errmsg,
      };
    }),

  // 获取客户列表
  listCustomers: publicProcedure.query(async () => {
    return await listWeworkCustomers();
  }),

  // 获取客户详情
  getCustomer: publicProcedure
    .input(z.object({ externalUserId: z.string() }))
    .query(async ({ input }) => {
      return await getWeworkCustomer(input.externalUserId);
    }),

  // 发送消息
  sendMessage: publicProcedure
    .input(
      z.object({
        externalUserId: z.string(),
        sendUserId: z.string(),
        msgType: z.enum(["text", "image", "link", "miniprogram"]),
        content: z.any(),
      })
    )
    .mutation(async ({ input }) => {
      const mockMode = await apiIsMockMode();

      // 创建消息记录
      const message = await createWeworkMessage({
        externalUserId: input.externalUserId,
        sendUserId: input.sendUserId,
        msgType: input.msgType,
        content: JSON.stringify(input.content),
        status: "pending",
      });

      let result;
      if (mockMode) {
        // 模拟发送
        result = await mockSendMessage({
          touser: input.externalUserId,
          msgtype: input.msgType,
          [input.msgType]: input.content,
        });
      } else {
        // 真实模式
        if (input.msgType === "text") {
          result = await sendTextMessage(input.externalUserId, input.content.content);
        } else {
          result = await apiSendMessage({
            touser: input.externalUserId,
            msgtype: input.msgType,
            [input.msgType]: input.content,
          });
        }
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
  listMessages: publicProcedure
    .input(z.object({ externalUserId: z.string().optional() }))
    .query(async ({ input }) => {
      return await listWeworkMessages(input.externalUserId);
    }),
});
