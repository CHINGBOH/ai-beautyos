import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  createChatSession,
  sendChatMessage,
  getChatHistory,
  getConversations,
  getMessages,
  convertToLead,
} from "../services/chat.service";

export const chatRouter = router({
  createSession: publicProcedure
    .output(z.object({ sessionId: z.string(), agentSessionId: z.string().nullable() }))
    .mutation(() => createChatSession()),

  sendMessage: publicProcedure
    .input(z.object({
      sessionId: z.string(),
      message: z.string().max(10000),
    }))
    .output(z.object({
      response: z.string(),
      extractedInfo: z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
        wechat: z.string().optional(),
        interestedServices: z.array(z.string()).optional(),
        budget: z.string().optional(),
      }).nullable(),
    }))
    .mutation(({ input }) => sendChatMessage(input.sessionId, input.message)),

  getHistory: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(({ input }) => getChatHistory(input.sessionId)),

  getConversations: protectedProcedure
    .query(() => getConversations()),

  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(({ input }) => getMessages(input.conversationId)),

  convertToLead: publicProcedure
    .input(z.object({
      sessionId: z.string(),
      name: z.string().max(200),
      phone: z.string().max(50),
      wechat: z.string().max(100).optional(),
      interestedServices: z.array(z.string().max(100)).optional(),
      budget: z.string().max(50).optional(),
      message: z.string().max(10000).optional(),
      source: z.string().max(50).optional(),
    }))
    .output(z.object({
      success: z.boolean(),
      leadId: z.string(),
      airtableSynced: z.boolean(),
      error: z.string().optional(),
    }))
    .mutation(({ input }) => convertToLead(input)),
});
