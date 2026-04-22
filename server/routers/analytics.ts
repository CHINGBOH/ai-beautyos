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
        const projects = Array.isArray(lead.interestedServices)
          ? lead.interestedServices
          : [];
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

  /**
   * 获取数据统计概览 (兼容前端 DashboardOverview)
   */
  getDashboardStats: protectedProcedure.query(async () => {
    return fetchOverview();
  }),

  /**
   * 获取数据统计概览 (兼容前端 DashboardBoss, DashboardAnalytics, Analytics)
   */
  getOverview: protectedProcedure.query(async () => {
    return fetchOverview();
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
      const projects = Array.isArray(lead.interestedServices)
        ? lead.interestedServices
        : [];
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
