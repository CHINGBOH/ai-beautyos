/**
 * Analytics Service
 * 业务逻辑从 tRPC router 中抽离至此；router 只负责鉴权与参数校验。
 */

import { desc, eq } from "drizzle-orm";
import {
  analyzeLeadsData,
  generateCustomerProfile,
  generateMarketingSuggestions,
} from "../qwen";
import type { LeadData, LeadInfo } from "../qwen";
import { getDb } from "../db";
import { leads, conversations, messages } from "../../drizzle/schema";

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

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function getOverview() {
  try {
    const db = await getDb();
    if (!db) {
      return {
        totalLeads: 0,
        totalConversations: 0,
        sourceDistribution: {} as Record<string, number>,
        projectDistribution: {} as Record<string, number>,
        recentLeads: [],
      };
    }

    const allLeads = await db.select().from(leads);
    const allConversations = await db.select().from(conversations);

    return {
      totalLeads: allLeads.length,
      totalConversations: allConversations.length,
      sourceDistribution: buildSourceDistribution(allLeads),
      projectDistribution: buildProjectDistribution(allLeads),
      recentLeads: allLeads.slice(0, 10),
    };
  } catch (error: any) {
    console.error("[AnalyticsService] getOverview error:", error);
    return {
      totalLeads: 0,
      totalConversations: 0,
      sourceDistribution: {} as Record<string, number>,
      projectDistribution: {} as Record<string, number>,
      recentLeads: [],
    };
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
    if (!db) return { weeks: [] as Array<{ label: string; leads: number; conversations: number }> };

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

    const allLeads = await db.select({ createdAt: leads.createdAt }).from(leads);
    const allConvs = await db.select({ createdAt: conversations.createdAt }).from(conversations);

    return {
      weeks: weeks.map(w => ({
        label: w.label,
        leads: allLeads.filter(l => l.createdAt >= w.startISO && l.createdAt <= w.endISO).length,
        conversations: allConvs.filter(c => c.createdAt >= w.startISO && c.createdAt <= w.endISO).length,
      })),
    };
  } catch {
    return { weeks: [] as Array<{ label: string; leads: number; conversations: number }> };
  }
}

export async function getRecentActivities() {
  try {
    const db = await getDb();
    if (!db) return { activities: [] as Array<{ id: string; type: string; content: string; createdAt: string | null }> };

    const recentLeads = await db
      .select({ id: leads.id, name: leads.name, source: leads.source, createdAt: leads.createdAt })
      .from(leads)
      .orderBy(desc(leads.createdAt))
      .limit(5);

    const recentConvs = await db
      .select({ id: conversations.id, visitorName: conversations.visitorName, createdAt: conversations.createdAt })
      .from(conversations)
      .orderBy(desc(conversations.createdAt))
      .limit(5);

    const activities = [
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
  } catch {
    return { activities: [] as Array<{ id: string; type: string; content: string; createdAt: string | null }> };
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
