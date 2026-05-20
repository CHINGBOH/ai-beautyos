import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  testConnection,
  getConfig,
  saveConfig,
  createContactWayWithDb,
  listContactWayRecords,
  deleteContactWayRecord,
  listCustomers,
  getCustomer,
  mockAddCustomer,
  sendMessage,
  listMessages,
} from "../services/wework.service";

export const weworkRouter = router({
  testConnection: adminProcedure
    .input(z.object({ corpId: z.string(), corpSecret: z.string() }))
    .mutation(({ input }) => testConnection(input.corpId, input.corpSecret)),

  getConfig: protectedProcedure
    .query(() => getConfig()),

  saveConfig: adminProcedure
    .input(z.object({
      corpId: z.string().optional(),
      corpSecret: z.string().optional(),
      agentId: z.number().optional(),
      token: z.string().optional(),
      encodingAesKey: z.string().optional(),
      isMockMode: z.number().optional(),
    }))
    .mutation(({ input }) => saveConfig(input)),

  createContactWay: adminProcedure
    .input(z.object({
      type: z.enum(["single", "multi"]).default("single"),
      scene: z.enum(["1", "2"]).default("2"),
      remark: z.string().optional(),
      skipVerify: z.boolean().default(true),
      state: z.string().optional(),
      userIds: z.array(z.string()).optional(),
    }))
    .mutation(({ input }) => createContactWayWithDb(input)),

  listContactWays: adminProcedure
    .query(() => listContactWayRecords()),

  deleteContactWay: adminProcedure
    .input(z.object({ configId: z.string() }))
    .mutation(({ input }) => deleteContactWayRecord(input.configId)),

  listCustomers: protectedProcedure
    .query(() => listCustomers()),

  getCustomer: protectedProcedure
    .input(z.object({ externalUserId: z.string() }))
    .query(({ input }) => getCustomer(input.externalUserId)),

  mockAddCustomer: protectedProcedure
    .input(z.object({ state: z.string().optional() }))
    .mutation(({ input }) => mockAddCustomer(input.state)),

  sendMessage: protectedProcedure
    .input(z.object({
      externalUserId: z.string(),
      sendUserId: z.string(),
      msgType: z.enum(["text", "image", "link", "miniprogram"]),
      content: z.any(),
    }))
    .mutation(({ input }) => sendMessage(input)),

  listMessages: protectedProcedure
    .input(z.object({ externalUserId: z.string().optional() }))
    .query(({ input }) => listMessages(input.externalUserId)),
});
