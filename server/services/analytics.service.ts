/**
 * Analytics Service
 * 业务逻辑从 tRPC router 中抽离至此；router 只负责鉴权与参数校验。
 */

import { desc, eq, sql } from "drizzle-orm";
import {
  analyzeLeadsData,
  generateCustomerProfile,
  generateMarketingSuggestions,
} from "../qwen";
import type { LeadData, LeadInfo } from "../qwen";
import { getDb } from "../db";
import { ENV } from "../_core/env";
import {
  appointments,
  conversations,
  customers,
  knowledgeBase,
  leads,
  medicalProjects,
  messages,
  triggers,
  weworkCustomers,
  xiaohongshuPosts,
} from "../../drizzle/schema";
import type { Customer } from "../../drizzle/schema";

// ---------------------------------------------------------------------------
// Type helpers
// ---------------------------------------------------------------------------

export function toLeadData(lead: any): LeadData {
  let interestedServices: string[] = [];
  if (lead.interestedServices) {
    try {
      interestedServices = JSON.parse(lead.interestedServices);
    } catch {
      interestedServices = lead.interestedServices
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
    }
  }
  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    source: lead.source,
    interestedServices,
    budget: lead.budget,
  };
}

export function toLeadInfo(lead: any): LeadInfo {
  return {
    name: lead.name,
    phone: lead.phone,
    wechat: lead.wechat || undefined,
    interestedServices: toLeadData(lead).interestedServices,
    budget: lead.budget,
  };
}

// ---------------------------------------------------------------------------
// Compute helpers
// ---------------------------------------------------------------------------

function buildSourceDistribution(allLeads: any[]): Record<string, number> {
  return allLeads.reduce((acc: Record<string, number>, lead) => {
    const source = lead.source || "直接访问";
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});
}

function buildProjectDistribution(allLeads: any[]): Record<string, number> {
  return allLeads.reduce((acc: Record<string, number>, lead) => {
    const projects = toLeadData(lead).interestedServices ?? [];
    projects.forEach((proj: string) => {
      acc[proj] = (acc[proj] || 0) + 1;
    });
    return acc;
  }, {});
}

function buildBudgetDistribution(allLeads: any[]): Record<string, number> {
  return allLeads.reduce((acc: Record<string, number>, lead) => {
    const budget = lead.budget || "未填写";
    acc[budget] = (acc[budget] || 0) + 1;
    return acc;
  }, {});
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function normalizeCustomerTier(tier: string | null): string | null {
  if (!tier) return null;
  const normalized = tier.toUpperCase();
  if (["A", "B", "C", "D"].includes(normalized)) return normalized;
  if (tier === "vip") return "A";
  if (tier === "normal") return "B";
  return tier;
}

function customerToLeadLike(customer: Customer) {
  return {
    id: customer.id,
    airtableId: null,
    name: customer.name,
    phone: customer.phone,
    wechat: customer.wechat,
    age: customer.age,
    hood: customer.occupation,
    birthday: customer.birthday,
    importantHolidays: customer.tags,
    interestedServices: customer.tags,
    budget: customer.totalSpent ? `${customer.totalSpent}` : null,
    budgetLevel: customer.totalSpent && customer.totalSpent >= 50000 ? "高" : null,
    message: customer.notes,
    source: customer.source || "customers",
    sourceContent: null,
    status: customer.status || "active",
    psychologyType: null,
    psychologyTags: null,
    customerTier: normalizeCustomerTier(customer.tier),
    notes: customer.notes,
    followUpDate: null,
    conversationId: null,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
    syncedAt: null,
    convertedAt: null,
    convertedToCustomerId: customer.id,
  };
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function getOverview() {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not configured");
    }

    const [
      allLeads,
      allCustomers,
      allConversations,
      messageCountRows,
      knowledgeCountRows,
      projectCountRows,
      appointmentCountRows,
      triggerCountRows,
      xiaohongshuCountRows,
      weworkCountRows,
    ] = await Promise.all([
      db.select().from(leads),
      db.select().from(customers),
      db.select().from(conversations),
      db.select({ count: sql<number>`count(*)::int` }).from(messages),
      db.select({ count: sql<number>`count(*)::int` }).from(knowledgeBase),
      db.select({ count: sql<number>`count(*)::int` }).from(medicalProjects),
      db.select({ count: sql<number>`count(*)::int` }).from(appointments),
      db.select({ count: sql<number>`count(*)::int` }).from(triggers),
      db.select({ count: sql<number>`count(*)::int` }).from(xiaohongshuPosts),
      db.select({ count: sql<number>`count(*)::int` }).from(weworkCustomers),
    ]);
    const customerLikeRows = allCustomers.map(customerToLeadLike);
    const mergedCustomerRows = [
      ...customerLikeRows,
      ...allLeads.filter(lead => !allCustomers.some(customer => customer.phone === lead.phone)),
    ].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    const convertedCustomers = allCustomers.filter(customer => customer.status === "converted").length
      + allLeads.filter(lead => lead.status === "converted").length;

    return {
      totalCustomers: allCustomers.length,
      totalLeads: allLeads.length,
      totalContacts: mergedCustomerRows.length,
      totalConversations: allConversations.length,
      convertedCustomers,
      tableCounts: {
        customers: allCustomers.length,
        leads: allLeads.length,
        contacts: mergedCustomerRows.length,
        conversations: allConversations.length,
        messages: messageCountRows[0]?.count ?? 0,
        knowledgeBase: knowledgeCountRows[0]?.count ?? 0,
        medicalProjects: projectCountRows[0]?.count ?? 0,
        appointments: appointmentCountRows[0]?.count ?? 0,
        triggers: triggerCountRows[0]?.count ?? 0,
        xiaohongshuPosts: xiaohongshuCountRows[0]?.count ?? 0,
        weworkCustomers: weworkCountRows[0]?.count ?? 0,
      },
      sourceDistribution: buildSourceDistribution(mergedCustomerRows),
      projectDistribution: buildProjectDistribution(mergedCustomerRows),
      recentLeads: mergedCustomerRows.slice(0, 10),
    };
  } catch (error: unknown) {
    console.error("[AnalyticsService] getOverview error:", error);
    throw new Error(`Dashboard overview query failed: ${getErrorMessage(error)}`);
  }
}

export async function getLeadsReport() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const allLeads = await db.select().from(leads).orderBy(desc(leads.createdAt));

  if (allLeads.length === 0) {
    return { success: false as const, error: "暂无线索数据" };
  }

  try {
    const report = await analyzeLeadsData(allLeads.map(toLeadData));
    return { success: true as const, report, leadsCount: allLeads.length };
  } catch (error: any) {
    console.error("[AnalyticsService] generateLeadsReport error:", error);
    return { success: false as const, error: error.message || "生成报告失败" };
  }
}

export async function getCustomerProfile(leadId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const leadRows = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  if (leadRows.length === 0) {
    return { success: false as const, error: "线索不存在" };
  }

  const lead = leadRows[0];

  let conversationHistory = "";
  if (lead.conversationId) {
    const conv = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, lead.conversationId))
      .limit(1);

    if (conv.length > 0) {
      const msgs = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conv[0].id))
        .orderBy(messages.createdAt);

      conversationHistory = msgs.map(m => `${m.role}: ${m.content}`).join("\n\n");
    }
  }

  try {
    const profile = await generateCustomerProfile(
      conversationHistory || "暂无对话历史",
      toLeadInfo(lead)
    );
    return { success: true as const, profile };
  } catch (error: any) {
    console.error("[AnalyticsService] generateCustomerProfile error:", error);
    return { success: false as const, error: error.message || "生成客户画像失败" };
  }
}

export async function getMarketingSuggestions() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const allLeads = await db.select().from(leads).orderBy(desc(leads.createdAt));

  if (allLeads.length === 0) {
    return { success: false as const, error: "暂无线索数据" };
  }

  const performanceData = {
    totalLeads: allLeads.length,
    sourceDistribution: buildSourceDistribution(allLeads),
    projectDistribution: buildProjectDistribution(allLeads),
    budgetDistribution: buildBudgetDistribution(allLeads),
  };

  try {
    const suggestions = await generateMarketingSuggestions(
      allLeads.slice(0, 20).map(toLeadData),
      performanceData
    );
    return { success: true as const, suggestions, performanceData };
  } catch (error: any) {
    console.error("[AnalyticsService] generateMarketingSuggestions error:", error);
    return { success: false as const, error: error.message || "生成营销建议失败" };
  }
}

export async function getWeeklyTrend() {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not configured");

    const now = new Date();
    const weeks = Array.from({ length: 6 }, (_, i) => {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (5 - i) * 7 - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      return {
        label: `第${i + 1}周`,
        startISO: weekStart.toISOString(),
        endISO: weekEnd.toISOString(),
      };
    });

    const [allLeads, allCustomers, allConvs] = await Promise.all([
      db.select({ createdAt: leads.createdAt }).from(leads),
      db.select({ createdAt: customers.createdAt }).from(customers),
      db.select({ createdAt: conversations.createdAt }).from(conversations),
    ]);
    const allCustomerEvents = [...allCustomers, ...allLeads];

    return {
      weeks: weeks.map(w => ({
        label: w.label,
        leads: allCustomerEvents.filter(l => l.createdAt >= w.startISO && l.createdAt <= w.endISO).length,
        conversations: allConvs.filter(c => c.createdAt >= w.startISO && c.createdAt <= w.endISO).length,
      })),
    };
  } catch (error: unknown) {
    console.error("[AnalyticsService] getWeeklyTrend error:", error);
    throw new Error(`Weekly trend query failed: ${getErrorMessage(error)}`);
  }
}

export async function getRecentActivities() {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not configured");

    const [recentLeads, recentCustomers, recentConvs] = await Promise.all([
      db
        .select({ id: leads.id, name: leads.name, source: leads.source, createdAt: leads.createdAt })
        .from(leads)
        .orderBy(desc(leads.createdAt))
        .limit(5),
      db
        .select({ id: customers.id, name: customers.name, source: customers.source, createdAt: customers.createdAt })
        .from(customers)
        .orderBy(desc(customers.createdAt))
        .limit(5),
      db
        .select({ id: conversations.id, visitorName: conversations.visitorName, createdAt: conversations.createdAt })
        .from(conversations)
        .orderBy(desc(conversations.createdAt))
        .limit(5),
    ]);

    const activities = [
      ...recentCustomers.map(c => ({
        id: `customer_${c.id}`,
        type: "客户",
        content: `新增客户 ${c.name}（来源：${c.source || "未知"}）`,
        createdAt: c.createdAt,
      })),
      ...recentLeads.map(l => ({
        id: `lead_${l.id}`,
        type: "客户",
        content: `新增客户 ${l.name}（来源：${l.source || "未知"}）`,
        createdAt: l.createdAt,
      })),
      ...recentConvs.map(c => ({
        id: `conv_${c.id}`,
        type: "对话",
        content: `${c.visitorName || "访客"} 发起 AI 咨询对话`,
        createdAt: c.createdAt,
      })),
    ]
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
      .slice(0, 8);

    return { activities };
  } catch (error: unknown) {
    console.error("[AnalyticsService] getRecentActivities error:", error);
    throw new Error(`Recent activity query failed: ${getErrorMessage(error)}`);
  }
}

export async function getSystemStatus() {
  const aiConfigured = Boolean(
    ENV.deepseekApiKey ||
      ENV.forgeApiKey ||
      process.env.QWEN_API_KEY ||
      process.env.OPENAI_API_KEY
  );

  try {
    const db = await getDb();
    if (!db) {
      return {
        runtime: { status: "ok" as const, label: "Node/Express 后端", detail: "运行中" },
        database: { status: "error" as const, label: "PostgreSQL", detail: "DATABASE_URL 未配置" },
        ai: { status: aiConfigured ? "ok" as const : "warning" as const, label: "AI 服务", detail: aiConfigured ? "已配置" : "未配置 API Key" },
      };
    }

    await db.select({ ok: sql<number>`1` }).from(conversations).limit(1);
    return {
      runtime: { status: "ok" as const, label: "Node/Express 后端", detail: "运行中" },
      database: { status: "ok" as const, label: "PostgreSQL", detail: "已连接" },
      ai: { status: aiConfigured ? "ok" as const : "warning" as const, label: "AI 服务", detail: aiConfigured ? "已配置" : "未配置 API Key" },
    };
  } catch (error: unknown) {
    console.error("[AnalyticsService] getSystemStatus error:", error);
    return {
      runtime: { status: "ok" as const, label: "Node/Express 后端", detail: "运行中" },
      database: { status: "error" as const, label: "PostgreSQL", detail: getErrorMessage(error) },
      ai: { status: aiConfigured ? "ok" as const : "warning" as const, label: "AI 服务", detail: aiConfigured ? "已配置" : "未配置 API Key" },
    };
  }
}

/** 供 Tool Server get_business_overview 调用 */
export async function getBusinessOverview(rangeDays = 7) {
  try {
    const db = await getDb();
    if (!db) return { windowDays: rangeDays, newCustomers: 0, conversions: 0, pendingFollowups: 0, staleFollowups: 0, totalLeads: 0 };

    const since = new Date(Date.now() - rangeDays * 86400_000).toISOString();
    const nowISO = new Date().toISOString();

    const allLeads = await db.select().from(leads);
    const newCustomers = allLeads.filter(l => l.createdAt >= since).length;
    const pendingFollowups = allLeads.filter(l =>
      l.followUpDate && l.followUpDate >= nowISO && l.status !== "converted"
    ).length;
    const staleFollowups = allLeads.filter(l =>
      l.followUpDate && l.followUpDate < nowISO && l.status !== "converted"
    ).length;
    const conversions = allLeads.filter(l =>
      l.convertedAt && l.convertedAt >= since
    ).length;

    return { windowDays: rangeDays, newCustomers, conversions, pendingFollowups, staleFollowups, totalLeads: allLeads.length };
  } catch (error: any) {
    console.error("[AnalyticsService] getBusinessOverview error:", error);
    return { windowDays: rangeDays, newCustomers: 0, conversions: 0, pendingFollowups: 0, staleFollowups: 0, totalLeads: 0 };
  }
}

export async function getTodayPriorities() {
  try {
    const db = await getDb();
    if (!db) return { priorities: [] as Array<{ level: "high" | "medium" | "low"; text: string }> };

    const now = new Date();
    const todayISO = now.toISOString().slice(0, 10);
    const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const allLeads = await db.select().from(leads);

    const pendingFollowup = allLeads.filter(l =>
      l.followUpDate && l.followUpDate.slice(0, 10) <= todayISO && l.status !== "converted"
    ).length;

    const birthdayThisMonth = allLeads.filter(l =>
      l.birthday && l.birthday.slice(5, 7) === thisMonthStr.slice(5, 7)
    ).length;

    const since = new Date(now);
    since.setDate(now.getDate() - 7);
    const newThisWeek = allLeads.filter(l => l.createdAt >= since.toISOString()).length;

    const tierA = allLeads.filter(l => l.customerTier === "A" && l.status !== "converted").length;

    const priorities: Array<{ level: "high" | "medium" | "low"; text: string }> = [];

    if (pendingFollowup > 0) {
      priorities.push({ level: "high", text: `今日有 ${pendingFollowup} 位客户到了跟进时间，请及时处理` });
    }
    if (tierA > 0) {
      priorities.push({ level: "high", text: `${tierA} 位 A 级客户尚未转化，建议重点跟进` });
    }
    if (birthdayThisMonth > 0) {
      priorities.push({ level: "medium", text: `本月有 ${birthdayThisMonth} 位客户生日，可发送祝福并推荐护肤方案` });
    }
    if (newThisWeek > 0) {
      priorities.push({ level: "medium", text: `本周新增 ${newThisWeek} 位线索，建议尽快完成初步沟通` });
    }
    if (priorities.length === 0) {
      priorities.push({ level: "low", text: "当前无紧急跟进事项，可以更新知识库或生成小红书内容" });
    }

    return { priorities };
  } catch {
    return { priorities: [] as Array<{ level: "high" | "medium" | "low"; text: string }> };
  }
}
