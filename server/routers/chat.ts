import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { generateChatResponse, MEDICAL_BEAUTY_SYSTEM_PROMPT, extractCustomerInfo } from "../deepseek";
import { 
  createConversation, 
  getConversationBySessionId, 
  updateConversation,
  getAllConversations,
  createMessage,
  getMessagesByConversationId,
  getActiveKnowledge,
  incrementKnowledgeUsage,
  createLead
} from "../db";
import { createLeadInAirtable, syncConversationToAirtable, getCustomerHistoryFromAirtable } from "../airtable";
import { analyzePsychology, shouldAnalyzePsychology } from "../psychology-analyzer";
import { nanoid } from "nanoid";

export const chatRouter = router({
  /**
   * 创建新会话
   */
  createSession: publicProcedure.mutation(async () => {
    const sessionId = nanoid();
    
    await createConversation({
      sessionId,
      source: "web",
      status: "active",
    });
    
    return { sessionId };
  }),

  /**
   * 发送消息并获取 AI 回复
   */
  sendMessage: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        message: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { sessionId, message } = input;
      
      // 获取或创建会话
      let conversation = await getConversationBySessionId(sessionId);
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
      
      // 保存用户消息
      await createMessage({
        conversationId: conversation.id,
        role: "user",
        content: message,
      });
      
      // 获取历史消息
      const history = await getMessagesByConversationId(conversation.id);
      
      // 如果有客户手机号，从 Airtable 读取客户历史记录
      let customerHistoryContext = "";
      if (conversation.visitorPhone) {
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
      }
      
      // 检索相关知识库内容
      const knowledgeItems = await getActiveKnowledge();
      let knowledgeContext = "";
      const usedKnowledgeIds: number[] = [];
      
      if (knowledgeItems.length > 0) {
        // 简单的关键词匹配（实际应用中可以用向量搜索）
        const relevantKnowledge = knowledgeItems.filter(k => {
          const keywords = ["超皮秒", "祛斑", "水光", "热玛吉", "价格", "效果", "恢复", "疼痛"];
          return keywords.some(kw => message.includes(kw) || k.title.includes(kw) || k.content.includes(kw));
        }).slice(0, 3);
        
        if (relevantKnowledge.length > 0) {
          knowledgeContext = "\n\n参考知识库：\n" + relevantKnowledge.map(k => {
            usedKnowledgeIds.push(k.id);
            return `【${k.title}】\n${k.content}`;
          }).join("\n\n");
        }
      }
      
      // 构建消息历史
      const messages = [
        { role: "system" as const, content: MEDICAL_BEAUTY_SYSTEM_PROMPT + customerHistoryContext + knowledgeContext },
        ...history.slice(-10).map(h => ({
          role: h.role as "user" | "assistant",
          content: h.content,
        })),
      ];
      
      // 调用 LLM 生成回复
      const aiResponse = await generateChatResponse(messages);
      
      // 提取客户信息
      const extractedInfo = extractCustomerInfo(aiResponse);
      
      // 保存 AI 回复
      await createMessage({
        conversationId: conversation.id,
        role: "assistant",
        content: aiResponse,
        knowledgeUsed: usedKnowledgeIds.length > 0 ? JSON.stringify(usedKnowledgeIds) : null,
        extractedInfo: extractedInfo ? JSON.stringify(extractedInfo) : null,
      });
      
      // 更新知识库使用次数
      for (const id of usedKnowledgeIds) {
        await incrementKnowledgeUsage(id);
      }
      
      // 如果提取到客户信息，更新会话
      if (extractedInfo) {
        await updateConversation(sessionId, {
          visitorName: extractedInfo.name || conversation.visitorName,
          visitorPhone: extractedInfo.phone || conversation.visitorPhone,
          visitorWechat: extractedInfo.wechat || conversation.visitorWechat,
        });
        
        // 同步对话到 Airtable
        const updatedConversation = await getConversationBySessionId(sessionId);
        if (updatedConversation) {
          await syncConversationToAirtable({
            sessionId: updatedConversation.sessionId,
            visitorName: updatedConversation.visitorName || undefined,
            visitorPhone: updatedConversation.visitorPhone || undefined,
            visitorWechat: updatedConversation.visitorWechat || undefined,
            messages: history.map(h => ({
              role: h.role,
              content: h.content,
              createdAt: h.createdAt,
            })),
            source: updatedConversation.source,
          });
        }
      }
      
      // 心理标签自动识别：当对话消息达到一定数量时触发
      const messageCount = history.length + 1; // +1 因为刚才保存了新消息
      if (shouldAnalyzePsychology(messageCount)) {
        try {
          const analysisResult = await analyzePsychology(
            history.map(h => ({
              role: h.role,
              content: h.content,
            }))
          );
          
          // 如果置信度足够高，更新客户画像
          if (analysisResult.confidence > 0.6) {
            // 更新对话记录中的客户画像信息
            await updateConversation(sessionId, {
              psychologyType: analysisResult.psychologyType,
              psychologyTags: JSON.stringify(analysisResult.psychologyTags),
              budgetLevel: analysisResult.budgetLevel,
              customerTier: analysisResult.customerTier,
            });
            
            console.log(`[心理分析] 会话 ${sessionId} 的客户画像已更新：${analysisResult.psychologyType}，置信度 ${analysisResult.confidence}`);
          }
        } catch (error) {
          console.error("[心理分析] 分析失败：", error);
        }
      }
      
      return {
        response: aiResponse,
        extractedInfo,
      };
    }),

  /**
   * 获取会话历史
   */
  getHistory: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
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
    }),

  /**
   * 获取所有对话
   */
  getConversations: publicProcedure.query(async () => {
    const conversations = await getAllConversations();
    return conversations;
  }),

  /**
   * 获取对话消息
   */
  getMessages: publicProcedure
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
        name: z.string(),
        phone: z.string(),
        wechat: z.string().optional(),
        interestedServices: z.array(z.string()).optional(),
        budget: z.string().optional(),
        message: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const conversation = await getConversationBySessionId(input.sessionId);
      if (!conversation) {
        throw new Error("Conversation not found");
      }
      
      // 创建本地线索记录
      await createLead({
        name: input.name,
        phone: input.phone,
        wechat: input.wechat,
        interestedServices: input.interestedServices ? JSON.stringify(input.interestedServices) : null,
        budget: input.budget,
        message: input.message,
        source: "AI客服对话",
        sourceContent: `会话ID: ${input.sessionId}`,
        status: "新线索",
        conversationId: conversation.id,
      });
      
      // 同步到 Airtable
      try {
        const airtableId = await createLeadInAirtable({
          name: input.name,
          phone: input.phone,
          wechat: input.wechat,
          interestedServices: input.interestedServices,
          budget: input.budget,
          message: input.message,
          source: "AI客服对话",
          sourceContent: `会话ID: ${input.sessionId}`,
        });
        await updateConversation(input.sessionId, {
          status: "converted",
          leadId: airtableId,
        });
        
        return {
          success: true,
          leadId: airtableId,
        };
      } catch (error) {
        console.error("Failed to sync to Airtable:", error);
        return {
          success: false,
          error: "同步到 Airtable 失败，但本地记录已保存",
        };
      }
    }),
});
