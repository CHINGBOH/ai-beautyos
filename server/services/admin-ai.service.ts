/**
 * Admin AI Service
 * 管理员 AI 自然语言查询业务逻辑；router 只负责鉴权与参数校验。
 */

import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, like, ne, sql } from "drizzle-orm";
import { invokeDeepSeekLLM } from "../llm";
import type { TextContent } from "../llm/types";
import { getDb } from "../db";
import { conversations, knowledgeBase, leads, messages } from "../../drizzle/schema";

const SENSITIVE_LEAD_FIELDS = new Set(["phone", "wechat", "notes"]);

function stripSensitiveFields(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(row => {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (!SENSITIVE_LEAD_FIELDS.has(key)) clean[key] = value;
    }
    return clean;
  });
}

function buildFallbackPlan(question: string) {
  const normalized = question.replace(/\s+/g, "");
  const tables: string[] = [];
  if (normalized.includes("客户") || normalized.includes("线索")) tables.push("leads");
  if (normalized.includes("对话") || normalized.includes("咨询") || normalized.includes("聊天")) tables.push("conversations");
  if (normalized.includes("知识") || normalized.includes("FAQ")) tables.push("knowledge_base");
  if (tables.length === 0) tables.push("leads");
  const isStats = normalized.includes("多少") || normalized.includes("统计") || normalized.includes("数量") || normalized.includes("本月") || normalized.includes("今天");
  return { queryType: isStats ? "统计查询" : "客户查询", tables, conditions: [], aggregations: [], timeRange: "" };
}

export async function adminAiQuery(question: string) {
  const normalized = question.replace(/\s+/g, "");
  const wantsPicosure = normalized.includes("超皮秒");
  const wantsNoBooking = normalized.includes("未预约") || normalized.includes("未面诊") || normalized.includes("未到店");
  const wantsConsulted = normalized.includes("咨询") || normalized.includes("聊过");
  const shouldUseKeywordFilter = wantsPicosure && wantsNoBooking && wantsConsulted;

  let queryPlan = buildFallbackPlan(question);
  try {
    const analysisResponse = await invokeDeepSeekLLM({
      messages: [
        {
          role: "system",
          content: `你是一个医美 CRM 系统的数据分析助手。你的任务是理解管理员的自然语言问题，并生成查询计划。

数据库表结构：
1. leads（客户线索表）— name, phone, wechat, source, interestedServices, budget, psychologyType, consumptionLevel, customerTier, psychologyTags, createdAt
2. conversations（对话会话表）— visitorName, visitorPhone, messageCount, detectedPsychologyType, detectedMotivations, createdAt
3. knowledge_base（知识库表）— title, content, category, type, usageCount

请分析用户问题，返回 JSON 格式的查询计划：
{"queryType": "客户查询 | 对话查询 | 统计查询 | 知识库查询", "tables": [...], "conditions": [...], "aggregations": [...], "timeRange": ""}`,
        },
        { role: "user", content: question },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "query_plan",
          strict: true,
          schema: {
            type: "object",
            properties: {
              queryType: { type: "string" },
              tables: { type: "array", items: { type: "string" } },
              conditions: { type: "array", items: { type: "string" } },
              aggregations: { type: "array", items: { type: "string" } },
              timeRange: { type: "string" },
            },
            required: ["queryType", "tables", "conditions", "aggregations", "timeRange"],
            additionalProperties: false,
          },
        },
      },
    });
    const content = analysisResponse.choices[0].message.content;
    const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
    if (parsed?.tables?.length) queryPlan = parsed;
  } catch (error) {
    console.warn("[AdminAI] LLM解析失败，使用本地规则:", error);
  }

  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "数据库未配置，请设置 DATABASE_URL 环境变量后重启服务。本地开发可在项目根目录 .env 中配置。",
    });
  }

  let queryResult: any = null;

  if (shouldUseKeywordFilter) {
    const matchedMessages = await db
      .select({ conversationId: messages.conversationId })
      .from(messages)
      .where(and(like(messages.content, "%超皮秒%"), eq(messages.role, "user")));
    const conversationIds = Array.from(new Set(matchedMessages.map(r => r.conversationId))).filter(id => typeof id === "number");

    if (conversationIds.length === 0) {
      queryResult = { type: "对话列表（超皮秒未预约）", data: [], count: 0 };
    } else {
      const results = await db
        .select()
        .from(conversations)
        .where(and(inArray(conversations.id, conversationIds), ne(conversations.status, "converted")))
        .orderBy(desc(conversations.createdAt))
        .limit(100);
      queryResult = { type: "对话列表（超皮秒未预约）", data: results, count: results.length };
    }
  } else if (queryPlan.queryType === "统计查询") {
    const [leadCount] = await db.select({ count: sql<number>`count(*)` }).from(leads);
    const [conversationCount] = await db.select({ count: sql<number>`count(*)` }).from(conversations);
    const [messageCount] = await db.select({ count: sql<number>`count(*)` }).from(messages);
    queryResult = { type: "统计概览", data: { leads: leadCount?.count ?? 0, conversations: conversationCount?.count ?? 0, messages: messageCount?.count ?? 0 } };
  } else if (queryPlan.tables.includes("conversations")) {
    const results = await db.select().from(conversations).orderBy(desc(conversations.createdAt)).limit(100);
    queryResult = { type: "对话列表", data: results, count: results.length };
  } else if (queryPlan.tables.includes("leads")) {
    const results = await db.select().from(leads).limit(100);
    queryResult = { type: "客户列表", data: stripSensitiveFields(results as Record<string, unknown>[]), count: results.length };
  } else if (queryPlan.tables.includes("knowledge_base")) {
    const results = await db.select().from(knowledgeBase).limit(100);
    queryResult = { type: "知识库列表", data: results, count: results.length };
  }

  let answer = "";
  try {
    const answerResponse = await invokeDeepSeekLLM({
      messages: [
        {
          role: "system",
          content: "你是一个医美 CRM 系统的数据分析助手。根据查询结果，用自然语言回答管理员的问题。\n\n要求：\n1. 用清晰、专业的语言描述查询结果\n2. 如果有统计数据，用数字和百分比展示\n3. 如果有列表数据，突出关键信息\n4. 给出可操作的建议",
        },
        { role: "user", content: `问题：${question}\n\n查询计划：${JSON.stringify(queryPlan, null, 2)}\n\n查询结果：${JSON.stringify(queryResult, null, 2)}` },
      ],
    });
    const content = answerResponse.choices[0].message.content;
    answer = typeof content === "string"
      ? content
      : (content as any[]).filter((c): c is TextContent => c.type === "text").map(c => c.text).join(" ");
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

  return { question, queryPlan, queryResult, answer };
}
