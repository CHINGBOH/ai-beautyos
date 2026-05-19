import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  generateChatResponse,
  MEDICAL_BEAUTY_SYSTEM_PROMPT,
  extractCustomerInfo,
  stripCustomerInfoJson,
} from "../llm";
import { renderSystemPrompt } from "../_core/tenant-config";
import {
  createConversation,
  getConversationBySessionId,
  updateConversation,
  getAllConversations,
  createMessage,
  getMessagesByConversationId,
  incrementKnowledgeUsage,
  createLead,
  createChatMessageTransaction,
  withTransaction,
} from "../db";
import { getCustomerHistoryFromAirtable } from "../airtable";
import {
  createLeadReliable,
  syncConversationReliable,
} from "../airtable-reliable";
import {
  analyzePsychology,
  shouldAnalyzePsychology,
} from "../psychology-analyzer";
import {
  searchKnowledgeForChat,
  searchKnowledgeForChatEnhanced,
  shouldUseKnowledge,
} from "../knowledge-retrieval";
import { nanoid } from "nanoid";
import { logger } from "../_core/logger";
import {
  persistAgentSession,
  persistAgentMessage,
  ensureDefaultTenant,
} from "../_core/agent-persistence";

type PreviewConversation = {
  id: number;
  sessionId: string;
  source: string;
  status: string;
  visitorName?: string | null;
  visitorPhone?: string | null;
  visitorWechat?: string | null;
};

type PreviewMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
};

const previewConversations = new Map<string, PreviewConversation>();
const previewMessages = new Map<string, PreviewMessage[]>();
let previewConversationId = 1;

function isDatabaseUnavailable(error: unknown): error is Error {
  return error instanceof Error && error.message === "Database not available";
}

function ensurePreviewConversation(sessionId: string): PreviewConversation {
  const existing = previewConversations.get(sessionId);
  if (existing) return existing;

  const created: PreviewConversation = {
    id: previewConversationId++,
    sessionId,
    source: "web-preview",
    status: "active",
  };
  previewConversations.set(sessionId, created);
  return created;
}

function getPreviewHistory(sessionId: string): PreviewMessage[] {
  return previewMessages.get(sessionId) ?? [];
}

function appendPreviewMessage(
  sessionId: string,
  role: PreviewMessage["role"],
  content: string
) {
  const history = getPreviewHistory(sessionId);
  previewMessages.set(sessionId, [
    ...history,
    { role, content, createdAt: new Date() },
  ]);
}

function updatePreviewConversation(
  sessionId: string,
  visitorInfo: {
    name?: string;
    phone?: string;
    wechat?: string;
  } | null
) {
  if (!visitorInfo) return;
  const conversation = ensurePreviewConversation(sessionId);
  previewConversations.set(sessionId, {
    ...conversation,
    visitorName: visitorInfo.name || conversation.visitorName,
    visitorPhone: visitorInfo.phone || conversation.visitorPhone,
    visitorWechat: visitorInfo.wechat || conversation.visitorWechat,
  });
}

async function handlePreviewChat(sessionId: string, message: string) {
  ensurePreviewConversation(sessionId);
  const history = getPreviewHistory(sessionId);
  const rawAiResponse = await generateChatResponse([
    {
      role: "system",
      content:
        MEDICAL_BEAUTY_SYSTEM_PROMPT +
        "\n\n当前处于无数据库预览模式。请继续提供咨询建议，但不要假设客户资料已经保存到正式系统。",
    },
    ...history.slice(-10).map(item => ({
      role: item.role,
      content: item.content,
    })),
    { role: "user", content: message },
  ]);

  const extractedInfo = extractCustomerInfo(rawAiResponse);
  const aiResponse = stripCustomerInfoJson(rawAiResponse);

  appendPreviewMessage(sessionId, "user", message);
  appendPreviewMessage(sessionId, "assistant", aiResponse);
  updatePreviewConversation(sessionId, extractedInfo);

  return {
    response: aiResponse,
    extractedInfo,
  };
}

export const chatRouter = router({
  /**
   * 创建新会话
   */
  createSession: publicProcedure
    .output(z.object({ sessionId: z.string(), agentSessionId: z.string().nullable() }))
    .mutation(async () => {
      const sessionId = nanoid();
      let agentSessionId: string | null = null;

      try {
        await ensureDefaultTenant();
        agentSessionId = await persistAgentSession({
          actorKind: "web_visitor",
          actorRef: sessionId,
          contextSnapshot: { source: "web" },
        });

        await createConversation({
          sessionId,
          source: "web",
          status: "active",
          ...(agentSessionId ? { agentSessionId } : {}),
        } as any);
      } catch (error) {
        if (!isDatabaseUnavailable(error)) {
          throw error;
        }
        ensurePreviewConversation(sessionId);
        logger.warn(
          `[Chat] createSession falling back to preview memory mode for ${sessionId}`
        );
      }

      return { sessionId, agentSessionId };
    }),

  /**
   * 发送消息并获取 AI 回复（事务安全版本）
   * 修复：使用事务确保数据一致性，修复心理分析触发逻辑
   */
  sendMessage: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        message: z.string().max(10000),
      })
    )
    .output(
      z.object({
        response: z.string(),
        extractedInfo: z
          .object({
            name: z.string().optional(),
            phone: z.string().optional(),
            wechat: z.string().optional(),
            interestedServices: z.array(z.string()).optional(),
            budget: z.string().optional(),
          })
          .nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const { sessionId, message } = input;
      const startTime = Date.now();

      try {
        let conversation;
        let history;

        try {
          // 获取或创建会话（事务外，因为需要先获取历史消息）
          conversation = await getConversationBySessionId(sessionId);
          if (!conversation) {
            await createConversation({
              sessionId,
              source: "web",
              status: "active",
            });
            conversation = await getConversationBySessionId(sessionId);
          }

          if (!conversation) {
            throw new Error("Failed to create conversation");
          }

          // 获取历史消息
          history = await getMessagesByConversationId(conversation.id);
        } catch (error) {
          if (!isDatabaseUnavailable(error)) {
            throw error;
          }
          logger.warn(
            `[Chat] Database unavailable, using preview memory mode for ${sessionId}`
          );
          return await handlePreviewChat(sessionId, message);
        }

        // 如果有客户手机号，从 Airtable 读取客户历史记录
        let customerHistoryContext = "";
        if (conversation.visitorPhone) {
          try {
            const customerHistory = await getCustomerHistoryFromAirtable(
              conversation.visitorPhone
            );
            if (
              customerHistory &&
              (customerHistory.leads.length > 0 ||
                customerHistory.conversations.length > 0)
            ) {
              customerHistoryContext = "\n\n客户历史记录：\n";

              if (customerHistory.leads.length > 0) {
                const lead = customerHistory.leads[0]!;
                customerHistoryContext += `- 客户姓名：${lead.fields["姓名"] || "未知"}\n`;
                customerHistoryContext += `- 线索状态：${lead.fields["线索状态"] || "未知"}\n`;
                customerHistoryContext += `- 意向项目：${lead.fields["意向项目"] || "未知"}\n`;
                customerHistoryContext += `- 预算区间：${lead.fields["预算区间"] || "未知"}\n`;
              }

              if (customerHistory.conversations.length > 0) {
                customerHistoryContext += `- 历史对话次数：${customerHistory.conversations.length}\n`;
              }
            }
          } catch (e) {
            logger.warn("[Chat] Failed to fetch customer history:", e);
          }
        }

        // 检索相关知识库内容（使用增强的向量语义检索）
        let knowledgeContext = "";
        let usedKnowledgeIds: number[] = [];
        let searchStrategy = "skipped";

        if (shouldUseKnowledge(message)) {
          try {
            const searchResult = await searchKnowledgeForChatEnhanced(
              message,
              history.map(h => ({ role: h.role, content: h.content })),
              { limit: 3 }
            );
            knowledgeContext = searchResult.context;
            usedKnowledgeIds = searchResult.usedKnowledgeIds;
            searchStrategy = searchResult.searchStrategy;
            
            logger.debug(`[Chat] Knowledge search completed with strategy: ${searchStrategy}, found ${usedKnowledgeIds.length} items`);
          } catch (e) {
            logger.warn(
              "[Chat] Enhanced knowledge retrieval failed, trying fallback:",
              e
            );
            
            // 兜底到原来的搜索方式
            try {
              const fallbackResult = await searchKnowledgeForChat(
                message,
                history.map(h => ({ role: h.role, content: h.content })),
                { limit: 3 }
              );
              knowledgeContext = fallbackResult.context;
              usedKnowledgeIds = fallbackResult.usedKnowledgeIds;
              searchStrategy = "fallback-text";
            } catch (fallbackError) {
              logger.error("[Chat] Both enhanced and fallback knowledge retrieval failed:", fallbackError);
            }
          }
        } else {
          logger.debug(
            "[Chat] Skipping knowledge retrieval for simple greeting"
          );
        }

        // 构建消息历史
        // 系统提示按租户配置渲染（#26）。如果加载失败（缺配置/校验错），
        // 退回到内置静态 prompt，保证服务可用性。
        let systemPromptBase: string;
        try {
          systemPromptBase = renderSystemPrompt({
            tenantId: "00000000-0000-0000-0000-000000000001",
            profile: "sales_assistant",
          });
        } catch (e) {
          logger.warn(
            `[Chat] tenant prompt render failed, falling back: ${(e as Error).message}`,
          );
          systemPromptBase = MEDICAL_BEAUTY_SYSTEM_PROMPT;
        }
        const messages = [
          {
            role: "system" as const,
            content:
              systemPromptBase +
              customerHistoryContext +
              knowledgeContext,
          },
          ...history.slice(-10).map(h => ({
            role: h.role as "user" | "assistant",
            content: h.content,
          })),
          { role: "user" as const, content: message },
        ];

        // 调用 LLM 生成回复
        const rawAiResponse = await generateChatResponse(messages);

        // 提取客户信息（从原始文本提取，再清除 JSON 标注）
        const extractedInfo = extractCustomerInfo(rawAiResponse);
        const aiResponse = stripCustomerInfoJson(rawAiResponse);

        // 计算消息数量（包括本次用户消息和AI回复）
        const messageCount = history.length + 2;

        // 判断是否需要进行心理分析
        let psychologyInfo: {
          psychologyType?: string;
          psychologyTags?: string[];
          budgetLevel?: string;
          customerTier?: string;
        } | null = null;

        if (shouldAnalyzePsychology(messageCount)) {
          try {
            const analysisResult = await analyzePsychology([
              ...history.map(h => ({ role: h.role, content: h.content })),
              { role: "user", content: message },
            ]);

            if (analysisResult.confidence > 0.6) {
              psychologyInfo = {
                psychologyType: analysisResult.psychologyType,
                psychologyTags: analysisResult.psychologyTags,
                budgetLevel: analysisResult.budgetLevel,
                customerTier: analysisResult.customerTier,
              };
              logger.info(
                `[心理分析] 会话 ${sessionId}: ${analysisResult.psychologyType}, 置信度 ${analysisResult.confidence}`
              );
            }
          } catch (error) {
            logger.error("[心理分析] 分析失败:", error);
          }
        }

        // 使用事务保存所有数据（核心修复：确保数据一致性）
        const { conversationId } = await createChatMessageTransaction({
          sessionId,
          userMessage: { content: message, role: "user" },
          aiMessage: {
            content: aiResponse,
            role: "assistant",
            knowledgeUsed: usedKnowledgeIds,
            extractedInfo,
          },
          visitorInfo: extractedInfo
            ? {
                visitorName: extractedInfo.name || conversation.visitorName || undefined,
                visitorPhone: extractedInfo.phone || conversation.visitorPhone || undefined,
                visitorWechat:
                  extractedInfo.wechat || conversation.visitorWechat || undefined,
              }
            : undefined,
          psychologyInfo,
        });

        // Agent-native overlay: mirror user + assistant turns into agent_messages
        // so Hermes (and audit/replay) can see the full conversation.
        const agentSessionId = (conversation as any).agentSessionId as string | undefined;
        if (agentSessionId) {
          persistAgentMessage({
            sessionId: agentSessionId,
            role: "user",
            content: message,
          });
          persistAgentMessage({
            sessionId: agentSessionId,
            role: "assistant",
            content: aiResponse,
          });
        }

        // 异步同步到 Airtable（可靠版本：带重试，非阻塞）
        if (extractedInfo && extractedInfo.phone) {
          const updatedConversation =
            await getConversationBySessionId(sessionId);
          if (updatedConversation) {
            syncConversationReliable({
              sessionId: updatedConversation.sessionId,
              visitorName: updatedConversation.visitorName || undefined,
              visitorPhone: updatedConversation.visitorPhone || undefined,
              visitorWechat: updatedConversation.visitorWechat || undefined,
              messages: [
                ...history,
                { role: "user", content: message, createdAt: new Date() },
              ].map(h => ({
                role: h.role,
                content: h.content,
                createdAt: new Date(h.createdAt),
              })),
              source: updatedConversation.source,
            }).catch(e => {
              logger.error("[Chat] Airtable sync failed (data may be lost):", e instanceof Error ? e.message : String(e));
            });
          }
        }

        const duration = Date.now() - startTime;
        logger.info(
          `[Chat] Message processed in ${duration}ms, convId=${conversationId}`
        );

        return {
          response: aiResponse,
          extractedInfo,
        };
      } catch (error) {
        logger.error("[Chat] sendMessage failed:", error);
        throw error;
      }
    }),

  /**
   * 获取会话历史
   */
  getHistory: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      try {
        const conversation = await getConversationBySessionId(input.sessionId);
        if (!conversation) {
          return { messages: [] };
        }

        const messages = await getMessagesByConversationId(conversation.id);
        return {
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
            createdAt: m.createdAt,
          })),
        };
      } catch (error) {
        if (!isDatabaseUnavailable(error)) {
          throw error;
        }
        return {
          messages: getPreviewHistory(input.sessionId).map(message => ({
            role: message.role,
            content: message.content,
            createdAt: message.createdAt,
          })),
        };
      }
    }),

  /**
   * 获取所有对话
   */
  getConversations: protectedProcedure.query(async () => {
    const conversations = await getAllConversations();
    return conversations;
  }),

  /**
   * 获取对话消息
   */
  getMessages: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ input }) => {
      const messages = await getMessagesByConversationId(input.conversationId);
      return messages;
    }),

  /**
   * 将对话转为线索
   */
  convertToLead: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        name: z.string().max(200),
        phone: z.string().max(50),
        wechat: z.string().max(100).optional(),
        interestedServices: z.array(z.string().max(100)).optional(),
        budget: z.string().max(50).optional(),
        message: z.string().max(10000).optional(),
        source: z.string().max(50).optional(),
      })
    )
    .output(
      z.object({
        success: z.boolean(),
        leadId: z.string(),
        airtableSynced: z.boolean(),
        error: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const conversation = await getConversationBySessionId(input.sessionId);
      if (!conversation) {
        throw new Error("Conversation not found");
      }

      // 创建本地线索记录
      const created = await createLead({
        name: input.name,
        phone: input.phone,
        wechat: input.wechat,
        interestedServices: input.interestedServices
          ? JSON.stringify(input.interestedServices)
          : null,
        budget: input.budget,
        message: input.message,
        source: input.source || "chat",
        sourceContent: `会话ID: ${input.sessionId}`,
        status: "new",
        conversationId: conversation.id,
      });
      const localLeadId = created?.id;

      // 同步到 Airtable（可靠版本）
      const airtableId = await createLeadReliable({
        name: input.name,
        phone: input.phone,
        wechat: input.wechat,
        interestedServices: input.interestedServices,
        budget: input.budget,
        message: input.message,
        source: "AI客服对话",
        sourceContent: `会话ID: ${input.sessionId}`,
      });

      if (airtableId) {
        await updateConversation(input.sessionId, {
          status: "converted",
          leadId: airtableId,
        });
      }

      return {
        success: true,
        leadId: String(localLeadId ?? airtableId ?? "pending"),
        airtableSynced: !!airtableId,
      } as const;
    }),
});
