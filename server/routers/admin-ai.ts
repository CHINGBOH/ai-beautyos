import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { leads, conversations, messages, knowledgeBase } from "../../drizzle/schema";
import { eq, and, gte, lte, like, sql, desc, inArray, ne } from "drizzle-orm";

/**
 * 管理端 AI 助手 Router
 * 让管理员可以用自然语言查询数据库
 */

export const adminAiRouter = router({
  /**
   * AI 查询数据库
   */
  query: protectedProcedure
    .input(
      z.object({
        question: z.string().min(1).max(500),
      })
    )
    .mutation(async ({ input }) => {
      const { question } = input;

      const buildFallbackPlan = () => {
        const normalized = question.replace(/\s+/g, "");
        const tables: string[] = [];
        if (normalized.includes("客户") || normalized.includes("线索")) {
          tables.push("leads");
        }
        if (normalized.includes("对话") || normalized.includes("咨询") || normalized.includes("聊天")) {
          tables.push("conversations");
        }
        if (normalized.includes("知识") || normalized.includes("FAQ")) {
          tables.push("knowledge_base");
        }
        if (tables.length === 0) {
          tables.push("leads");
        }
        const isStats = normalized.includes("多少") || normalized.includes("统计") || normalized.includes("数量") || normalized.includes("本月") || normalized.includes("今天");
        return {
          queryType: isStats ? "统计查询" : "客户查询",
          tables,
          conditions: [],
          aggregations: [],
          timeRange: "",
        };
      };

      const normalizedQuestion = question.replace(/\s+/g, "");
      const wantsPicosure = normalizedQuestion.includes("超皮秒");
      const wantsNoBooking =
        normalizedQuestion.includes("未预约") ||
        normalizedQuestion.includes("未面诊") ||
        normalizedQuestion.includes("未到店");
      const wantsConsulted =
        normalizedQuestion.includes("咨询") || normalizedQuestion.includes("聊过");

      const shouldUseKeywordFilter =
        wantsPicosure && wantsNoBooking && wantsConsulted;

      // 第一步：使用 LLM 分析用户问题，生成查询计划
      let queryPlan = buildFallbackPlan();
      try {
        const analysisResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `你是一个医美 CRM 系统的数据分析助手。你的任务是理解管理员的自然语言问题，并生成查询计划。

数据库表结构：
1. leads（客户线索表）
   - name: 姓名
   - phone: 手机号
   - wechat: 微信号
   - source: 来源渠道（小红书、抖音、微信朋友圈等）
   - interestedServices: 兴趣项目（JSON数组）
   - budget: 预算
   - psychologyType: 心理类型（fear恐惧型、greed贪婪型、safety安全型、sensitive敏感型）
   - consumptionLevel: 消费能力（low低、medium中、high高）
   - customerTier: 客户分层（A、B、C、D）
   - psychologyTags: 心理标签（JSON数组）
   - createdAt: 创建时间

2. conversations（对话会话表）
   - visitorName: 访客姓名
   - visitorPhone: 访客手机
   - messageCount: 消息数量
   - detectedPsychologyType: 检测到的心理类型
   - detectedMotivations: 检测到的动机（JSON数组）
   - createdAt: 创建时间

3. knowledge_base（知识库表）
   - title: 标题
   - content: 内容
   - category: 分类
   - type: 类型（customer_inquiry客户问询、internal_management内部管理）
   - usageCount: 使用次数

请分析用户问题，返回 JSON 格式的查询计划：
{
  "queryType": "客户查询 | 对话查询 | 统计查询 | 知识库查询",
  "tables": ["需要查询的表"],
  "conditions": ["查询条件描述"],
  "aggregations": ["聚合统计描述"],
  "timeRange": "时间范围描述"
}`,
            },
            {
              role: "user",
              content: question,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "query_plan",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  queryType: {
                    type: "string",
                    description: "查询类型",
                  },
                  tables: {
                    type: "array",
                    items: { type: "string" },
                    description: "需要查询的表",
                  },
                  conditions: {
                    type: "array",
                    items: { type: "string" },
                    description: "查询条件描述",
                  },
                  aggregations: {
                    type: "array",
                    items: { type: "string" },
                    description: "聚合统计描述",
                  },
                  timeRange: {
                    type: "string",
                    description: "时间范围描述",
                  },
                },
                required: ["queryType", "tables", "conditions", "aggregations", "timeRange"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = analysisResponse.choices[0].message.content;
        const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
        if (parsed?.tables?.length) {
          queryPlan = parsed;
        }
      } catch (error) {
        console.warn("[AdminAI] LLM解析失败，使用本地规则:", error);
      }

      // 第二步：根据查询计划执行数据库查询
      const dbInstance = await getDb();
      if (!dbInstance) {
        throw new Error("数据库未初始化");
      }

      let queryResult: any = null;

      // 根据查询类型执行不同的查询
      if (shouldUseKeywordFilter) {
        const keyword = "超皮秒";
        const matchedMessages = await dbInstance
          .select({ conversationId: messages.conversationId })
          .from(messages)
          .where(
            and(
              like(messages.content, `%${keyword}%`),
              eq(messages.role, "user")
            )
          );
        const conversationIds = Array.from(
          new Set(matchedMessages.map(row => row.conversationId))
        ).filter(id => typeof id === "number");

        if (conversationIds.length === 0) {
          queryResult = {
            type: "对话列表（超皮秒未预约）",
            data: [],
            count: 0,
          };
        } else {
          const results = await dbInstance
            .select()
            .from(conversations)
            .where(
              and(inArray(conversations.id, conversationIds), ne(conversations.status, "converted"))
            )
            .orderBy(desc(conversations.createdAt))
            .limit(100);
          queryResult = {
            type: "对话列表（超皮秒未预约）",
            data: results,
            count: results.length,
          };
        }
      } else if (queryPlan.queryType === "统计查询") {
        const [leadCount] = await dbInstance
          .select({ count: sql<number>`count(*)` })
          .from(leads);
        const [conversationCount] = await dbInstance
          .select({ count: sql<number>`count(*)` })
          .from(conversations);
        const [messageCount] = await dbInstance
          .select({ count: sql<number>`count(*)` })
          .from(messages);
        queryResult = {
          type: "统计概览",
          data: {
            leads: leadCount?.count ?? 0,
            conversations: conversationCount?.count ?? 0,
            messages: messageCount?.count ?? 0,
          },
        };
      } else if (queryPlan.tables.includes("conversations")) {
        const results = await dbInstance
          .select()
          .from(conversations)
          .orderBy(desc(conversations.createdAt))
          .limit(100);
        queryResult = {
          type: "对话列表",
          data: results,
          count: results.length,
        };
      } else if (queryPlan.tables.includes("leads")) {
        const results = await dbInstance.select().from(leads).limit(100);
        queryResult = {
          type: "客户列表",
          data: results,
          count: results.length,
        };
      } else if (queryPlan.tables.includes("knowledge_base")) {
        const results = await dbInstance.select().from(knowledgeBase).limit(100);
        queryResult = {
          type: "知识库列表",
          data: results,
          count: results.length,
        };
      }

      // 第三步：使用 LLM 生成自然语言回答
      let answer = "";
      try {
        const questionText = `问题：${question}\n\n查询计划：${JSON.stringify(queryPlan, null, 2)}\n\n查询结果：${JSON.stringify(queryResult, null, 2)}`;
        const answerResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "你是一个医美 CRM 系统的数据分析助手。根据查询结果，用自然语言回答管理员的问题。\n\n要求：\n1. 用清晰、专业的语言描述查询结果\n2. 如果有统计数据，用数字和百分比展示\n3. 如果有列表数据，突出关键信息\n4. 给出可操作的建议",
            },
            {
              role: "user",
              content: questionText,
            },
          ],
        });
        answer = answerResponse.choices[0].message.content;
      } catch (error) {
        console.warn("[AdminAI] LLM回答失败，使用本地摘要:", error);
        if (queryResult?.type === "统计概览") {
          answer = `当前共有客户线索 ${queryResult.data.leads} 条，对话会话 ${queryResult.data.conversations} 条，消息记录 ${queryResult.data.messages} 条。`;
        } else if (queryResult?.type && queryResult?.count !== undefined) {
          answer = `已为你查询到 ${queryResult.type}，共 ${queryResult.count} 条结果。`;
        } else {
          answer = "已为你完成查询，请查看下方结果。";
        }
      }

      return {
        question,
        queryPlan,
        queryResult,
        answer,
      };
    }),

  /**
   * 获取 AI 助手对话历史
   * 
   * @deprecated 功能暂未实现，计划在后续版本中添加
   * 当前返回空数组，不会影响现有功能
   */
  getHistory: protectedProcedure.query(async () => {
    // TODO: 实现对话历史记录
    // 计划功能：
    // 1. 存储管理员与AI助手的对话记录
    // 2. 支持按时间、查询类型筛选
    // 3. 支持导出对话记录
    return [];
  }),
});
