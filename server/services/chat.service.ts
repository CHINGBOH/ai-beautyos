/**
 * Chat Service
 * AI 对话业务逻辑；router 只负责鉴权与参数校验。
 */

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
  createLead,
  createChatMessageTransaction,
  getMessagesByConversationId,
} from "../db";
import { getCustomerHistoryFromAirtable } from "../airtable";
import { createLeadReliable, syncConversationReliable } from "../airtable-reliable";
import { analyzePsychology, shouldAnalyzePsychology } from "../psychology-analyzer";
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

// ---------------------------------------------------------------------------
// In-memory preview mode state (no DB fallback)
// ---------------------------------------------------------------------------

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

function appendPreviewMessage(sessionId: string, role: PreviewMessage["role"], content: string) {
  const history = getPreviewHistory(sessionId);
  previewMessages.set(sessionId, [...history, { role, content, createdAt: new Date() }]);
}

function updatePreviewConversation(sessionId: string, visitorInfo: { name?: string; phone?: string; wechat?: string } | null) {
  if (!visitorInfo) return;
  const conv = ensurePreviewConversation(sessionId);
  previewConversations.set(sessionId, {
    ...conv,
    visitorName: visitorInfo.name || conv.visitorName,
    visitorPhone: visitorInfo.phone || conv.visitorPhone,
    visitorWechat: visitorInfo.wechat || conv.visitorWechat,
  });
}

async function handlePreviewChat(sessionId: string, message: string) {
  ensurePreviewConversation(sessionId);
  const history = getPreviewHistory(sessionId);
  let basePrompt: string;
  try {
    basePrompt = renderSystemPrompt({ tenantId: "00000000-0000-0000-0000-000000000001", profile: "sales_assistant" });
  } catch (e) {
    logger.warn(`[PreviewChat] tenant prompt render failed, falling back: ${(e as Error).message}`);
    basePrompt = MEDICAL_BEAUTY_SYSTEM_PROMPT;
  }
  const rawAiResponse = await generateChatResponse([
    {
      role: "system",
      content: basePrompt + "\n\n当前处于无数据库预览模式。请继续提供咨询建议，但不要假设客户资料已经保存到正式系统。",
    },
    ...history.slice(-10).map(item => ({ role: item.role, content: item.content })),
    { role: "user", content: message },
  ]);

  const extractedInfo = extractCustomerInfo(rawAiResponse);
  const aiResponse = stripCustomerInfoJson(rawAiResponse);

  appendPreviewMessage(sessionId, "user", message);
  appendPreviewMessage(sessionId, "assistant", aiResponse);
  updatePreviewConversation(sessionId, extractedInfo);

  return { response: aiResponse, extractedInfo };
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function createChatSession() {
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
    if (!isDatabaseUnavailable(error)) throw error;
    ensurePreviewConversation(sessionId);
    logger.warn(`[Chat] createSession falling back to preview memory mode for ${sessionId}`);
  }

  return { sessionId, agentSessionId };
}

export async function sendChatMessage(sessionId: string, message: string) {
  const startTime = Date.now();

  try {
    let conversation: any;
    let history: any[];

    try {
      conversation = await getConversationBySessionId(sessionId);
      if (!conversation) {
        await createConversation({ sessionId, source: "web", status: "active" });
        conversation = await getConversationBySessionId(sessionId);
      }
      if (!conversation) throw new Error("Failed to create conversation");
      history = await getMessagesByConversationId(conversation.id);
    } catch (error) {
      if (!isDatabaseUnavailable(error)) throw error;
      logger.warn(`[Chat] Database unavailable, using preview memory mode for ${sessionId}`);
      return await handlePreviewChat(sessionId, message);
    }

    // Customer history from Airtable
    let customerHistoryContext = "";
    if (conversation.visitorPhone) {
      try {
        const customerHistory = await getCustomerHistoryFromAirtable(conversation.visitorPhone);
        if (customerHistory && (customerHistory.leads.length > 0 || customerHistory.conversations.length > 0)) {
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

    // Knowledge retrieval
    let knowledgeContext = "";
    let usedKnowledgeIds: number[] = [];
    let searchStrategy = "skipped";

    if (shouldUseKnowledge(message)) {
      try {
        const searchResult = await searchKnowledgeForChatEnhanced(
          message,
          history.map((h: any) => ({ role: h.role, content: h.content })),
          { limit: 3 }
        );
        knowledgeContext = searchResult.context;
        usedKnowledgeIds = searchResult.usedKnowledgeIds;
        searchStrategy = searchResult.searchStrategy;
        logger.debug(`[Chat] Knowledge search completed with strategy: ${searchStrategy}, found ${usedKnowledgeIds.length} items`);
      } catch (e) {
        logger.warn("[Chat] Enhanced knowledge retrieval failed, trying fallback:", e);
        try {
          const fallbackResult = await searchKnowledgeForChat(
            message,
            history.map((h: any) => ({ role: h.role, content: h.content })),
            { limit: 3 }
          );
          knowledgeContext = fallbackResult.context;
          usedKnowledgeIds = fallbackResult.usedKnowledgeIds;
          searchStrategy = "fallback-text";
        } catch (fallbackError) {
          logger.error("[Chat] Both enhanced and fallback knowledge retrieval failed:", fallbackError);
        }
      }
    }

    // Build messages
    let systemPromptBase: string;
    try {
      systemPromptBase = renderSystemPrompt({ tenantId: "00000000-0000-0000-0000-000000000001", profile: "sales_assistant" });
    } catch (e) {
      logger.warn(`[Chat] tenant prompt render failed, falling back: ${(e as Error).message}`);
      systemPromptBase = MEDICAL_BEAUTY_SYSTEM_PROMPT;
    }

    const messages = [
      { role: "system" as const, content: systemPromptBase + customerHistoryContext + knowledgeContext },
      ...history.slice(-10).map((h: any) => ({ role: h.role as "user" | "assistant", content: h.content })),
      { role: "user" as const, content: message },
    ];

    const rawAiResponse = await generateChatResponse(messages);
    const extractedInfo = extractCustomerInfo(rawAiResponse);
    const aiResponse = stripCustomerInfoJson(rawAiResponse);
    const messageCount = history.length + 2;

    let psychologyInfo: { psychologyType?: string; psychologyTags?: string[]; budgetLevel?: string; customerTier?: string } | null = null;
    if (shouldAnalyzePsychology(messageCount)) {
      try {
        const analysisResult = await analyzePsychology([
          ...history.map((h: any) => ({ role: h.role, content: h.content })),
          { role: "user", content: message },
        ]);
        if (analysisResult.confidence > 0.6) {
          psychologyInfo = {
            psychologyType: analysisResult.psychologyType,
            psychologyTags: analysisResult.psychologyTags,
            budgetLevel: analysisResult.budgetLevel,
            customerTier: analysisResult.customerTier,
          };
          logger.info(`[心理分析] 会话 ${sessionId}: ${analysisResult.psychologyType}, 置信度 ${analysisResult.confidence}`);
        }
      } catch (error) {
        logger.error("[心理分析] 分析失败:", error);
      }
    }

    const { conversationId } = await createChatMessageTransaction({
      sessionId,
      userMessage: { content: message, role: "user" },
      aiMessage: { content: aiResponse, role: "assistant", knowledgeUsed: usedKnowledgeIds, extractedInfo },
      visitorInfo: extractedInfo
        ? {
            visitorName: extractedInfo.name || conversation.visitorName || undefined,
            visitorPhone: extractedInfo.phone || conversation.visitorPhone || undefined,
            visitorWechat: extractedInfo.wechat || conversation.visitorWechat || undefined,
          }
        : undefined,
      psychologyInfo,
    });

    const agentSessionId = (conversation as any).agentSessionId as string | undefined;
    if (agentSessionId) {
      persistAgentMessage({ sessionId: agentSessionId, role: "user", content: message });
      persistAgentMessage({ sessionId: agentSessionId, role: "assistant", content: aiResponse });
    }

    if (extractedInfo?.phone) {
      const updatedConversation = await getConversationBySessionId(sessionId);
      if (updatedConversation) {
        syncConversationReliable({
          sessionId: updatedConversation.sessionId,
          visitorName: updatedConversation.visitorName || undefined,
          visitorPhone: updatedConversation.visitorPhone || undefined,
          visitorWechat: updatedConversation.visitorWechat || undefined,
          messages: [
            ...history,
            { role: "user", content: message, createdAt: new Date() },
          ].map((h: any) => ({ role: h.role, content: h.content, createdAt: new Date(h.createdAt) })),
          source: updatedConversation.source,
        }).catch(e => {
          logger.error("[Chat] Airtable sync failed (data may be lost):", e instanceof Error ? e.message : String(e));
        });
      }
    }

    logger.info(`[Chat] Message processed in ${Date.now() - startTime}ms, convId=${conversationId}`);
    return { response: aiResponse, extractedInfo };

  } catch (error) {
    logger.error("[Chat] sendMessage failed:", error);
    throw error;
  }
}

export async function getChatHistory(sessionId: string) {
  try {
    const conversation = await getConversationBySessionId(sessionId);
    if (!conversation) return { messages: [] };

    const messages = await getMessagesByConversationId(conversation.id);
    return {
      messages: messages.map((m: any) => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    };
  } catch (error) {
    if (!isDatabaseUnavailable(error)) throw error;
    return {
      messages: getPreviewHistory(sessionId).map(m => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
      })),
    };
  }
}

export async function getConversations() {
  return getAllConversations();
}

export async function getMessages(conversationId: number) {
  return getMessagesByConversationId(conversationId);
}

export async function convertToLead(input: {
  sessionId: string;
  name: string;
  phone: string;
  wechat?: string;
  interestedServices?: string[];
  budget?: string;
  message?: string;
  source?: string;
}) {
  const conversation = await getConversationBySessionId(input.sessionId);
  if (!conversation) throw new Error("Conversation not found");

  const created = await createLead({
    name: input.name,
    phone: input.phone,
    wechat: input.wechat,
    interestedServices: input.interestedServices ? JSON.stringify(input.interestedServices) : null,
    budget: input.budget,
    message: input.message,
    source: input.source || "chat",
    sourceContent: `会话ID: ${input.sessionId}`,
    status: "new",
    conversationId: conversation.id,
  });
  const localLeadId = created?.id;

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
    await updateConversation(input.sessionId, { status: "converted", leadId: airtableId });
  }

  return {
    success: true,
    leadId: String(localLeadId ?? airtableId ?? "pending"),
    airtableSynced: !!airtableId,
  } as const;
}
