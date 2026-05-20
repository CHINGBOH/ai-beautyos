import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  analyzeLeadsData,
  generateCustomerProfile,
  generateMarketingSuggestions,
} from "../qwen";
import type { LeadData, LeadInfo } from "../qwen";
import { getDb } from "../db";
import { leads, conversations, messages } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

function toLeadData(lead: any): LeadData {
  let interestedServices: string[] = [];
  if (lead.interestedServices) {
    try {
      interestedServices = JSON.parse(lead.interestedServices);
    } catch {
      // If not JSON, treat as plain string (maybe comma separated)
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

function toLeadInfo(lead: any): LeadInfo {
  return {
    name: lead.name,
    phone: lead.phone,
    wechat: lead.wechat || undefined,
    interestedServices: toLeadData(lead).interestedServices,
    budget: lead.budget,
  };
}

export const analyticsRouter = router({
  /**
   * 生成线索数据分析报告
   */
  generateLeadsReport: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    // 获取所有线索数据
    const allLeads = await db
      .select()
      .from(leads)
      .orderBy(desc(leads.createdAt));

    if (allLeads.length === 0) {
      return {
        success: false,
        error: "暂无线索数据",
      };
    }

    try {
      // 调用 Qwen API 分析数据
      const report = await analyzeLeadsData(allLeads.map(toLeadData));

      return {
        success: true,
        report,
        leadsCount: allLeads.length,
      };
    } catch (error: any) {
      console.error("[Analytics Error]", error);
      return {
        success: false,
        error: error.message || "生成报告失败",
      };
    }
  }),

  /**
   * 生成客户画像
   */
  generateCustomerProfile: protectedProcedure
    .input(
      z.object({
        leadId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      // 获取线索信息
      const lead = await db
        .select()
        .from(leads)
        .where(eq(leads.id, input.leadId))
        .limit(1);

      if (lead.length === 0) {
        return {
          success: false,
          error: "线索不存在",
        };
      }

      const leadData = lead[0];

      // 获取对话历史（如果有）
      let conversationHistory = "";
      if (leadData.conversationId) {
        const conv = await db
          .select()
          .from(conversations)
          .where(eq(conversations.id, leadData.conversationId))
          .limit(1);

        if (conv.length > 0) {
          const msgs = await db
            .select()
            .from(messages)
            .where(eq(messages.conversationId, conv[0].id))
            .orderBy(messages.createdAt);

          conversationHistory = msgs
            .map(m => `${m.role}: ${m.content}`)
            .join("\n\n");
        }
      }

      try {
        // 调用 Qwen API 生成客户画像
        const profile = await generateCustomerProfile(
          conversationHistory || "暂无对话历史",
          toLeadInfo(leadData)
        );

        return {
          success: true,
          profile,
        };
      } catch (error: any) {
        console.error("[Analytics Error]", error);
        return {
          success: false,
          error: error.message || "生成客户画像失败",
        };
      }
    }),

  /**
   * 生成营销建议
   */
  generateMarketingSuggestions: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    // 获取线索数据
    const allLeads = await db
      .select()
      .from(leads)
      .orderBy(desc(leads.createdAt));

    if (allLeads.length === 0) {
      return {
        success: false,
        error: "暂无线索数据",
      };
    }

    // 计算业绩数据
    const performanceData = {
      totalLeads: allLeads.length,
      sourceDistribution: allLeads.reduce((acc: any, lead) => {
        const source = lead.source || "未知";
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {}),
      projectDistribution: allLeads.reduce((acc: any, lead) => {
        const projects = toLeadData(lead).interestedServices ?? [];
        projects.forEach((proj: string) => {
          acc[proj] = (acc[proj] || 0) + 1;
        });
        return acc;
      }, {}),
      budgetDistribution: allLeads.reduce((acc: any, lead) => {
        const budget = lead.budget || "未填写";
        acc[budget] = (acc[budget] || 0) + 1;
        return acc;
      }, {}),
    };

    try {
      // 调用 Qwen API 生成营销建议
      const suggestions = await generateMarketingSuggestions(
        allLeads.slice(0, 20).map(toLeadData), // 只传最近20条数据，避免token过多
        performanceData
      );

      return {
        success: true,
        suggestions,
        performanceData,
      };
    } catch (error: any) {
      console.error("[Analytics Error]", error);
      return {
        success: false,
        error: error.message || "生成营销建议失败",
      };
    }
  }),

  getDashboardStats: protectedProcedure.query(async () => {
    return fetchOverview();
  }),

  getOverview: protectedProcedure.query(async () => {
    return fetchOverview();
  }),

  /**
   * 最近6周每周新增线索数和对话数（用于趋势图）
   */
  getWeeklyTrend: protectedProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) return { weeks: [] };

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

      const result = weeks.map(w => ({
        label: w.label,
        leads: allLeads.filter(l => l.createdAt >= w.startISO && l.createdAt <= w.endISO).length,
        conversations: allConvs.filter(c => c.createdAt >= w.startISO && c.createdAt <= w.endISO).length,
      }));

      return { weeks: result };
    } catch {
      return { weeks: [] };
    }
  }),

  /**
   * 最近活动记录（真实数据：近期新增线索 + 对话）
   */
  getRecentActivities: protectedProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) return { activities: [] };

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
      return { activities: [] };
    }
  }),

  /**
   * 今日优先事项（供营销工作台和老板工作台使用）
   */
  getTodayPriorities: protectedProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) return { priorities: [] };

      const now = new Date();
      const todayISO = now.toISOString().slice(0, 10);

      const allLeads = await db.select().from(leads);

      const pendingFollowup = allLeads.filter(l =>
        l.followUpDate && l.followUpDate.slice(0, 10) <= todayISO && l.status !== "converted"
      ).length;

      const birthdayThisMonth = allLeads.filter(l => {
        if (!l.birthday) return false;
        const bd = new Date(l.birthday);
        return bd.getMonth() === now.getMonth();
      }).length;

      const newThisWeek = allLeads.filter(l => {
        const since = new Date(now);
        since.setDate(now.getDate() - 7);
        return l.createdAt >= since.toISOString();
      }).length;

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
      return { priorities: [] };
    }
  }),
});

/**
 * 获取概览数据的共享实现
 */
async function fetchOverview() {
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

    const sourceDistribution = allLeads.reduce((acc: any, lead) => {
      const source = lead.source || "直接访问";
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    const projectDistribution = allLeads.reduce((acc: any, lead) => {
      const projects = toLeadData(lead).interestedServices ?? [];
      projects.forEach((proj: string) => {
        acc[proj] = (acc[proj] || 0) + 1;
      });
      return acc;
    }, {});

    return {
      totalLeads: allLeads.length,
      totalConversations: allConversations.length,
      sourceDistribution,
      projectDistribution,
      recentLeads: allLeads.slice(0, 10),
    };
  } catch (error: any) {
    console.error("[Analytics Error]", error);
    return {
      totalLeads: 0,
      totalConversations: 0,
      sourceDistribution: {} as Record<string, number>,
      projectDistribution: {} as Record<string, number>,
      recentLeads: [],
    };
  }
}
