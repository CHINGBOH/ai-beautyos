import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  getOverview,
  getLeadsReport,
  getCustomerProfile,
  getMarketingSuggestions,
  getWeeklyTrend,
  getRecentActivities,
  getTodayPriorities,
  getSystemStatus,
} from "../services/analytics.service";

export const analyticsRouter = router({
  generateLeadsReport: protectedProcedure.mutation(() => getLeadsReport()),

  generateCustomerProfile: protectedProcedure
    .input(z.object({ leadId: z.number() }))
    .mutation(({ input }) => getCustomerProfile(input.leadId)),

  generateMarketingSuggestions: protectedProcedure.mutation(() => getMarketingSuggestions()),

  getDashboardStats: protectedProcedure.query(() => getOverview()),

  getOverview: protectedProcedure.query(() => getOverview()),

  getWeeklyTrend: protectedProcedure.query(() => getWeeklyTrend()),

  getRecentActivities: protectedProcedure.query(() => getRecentActivities()),

  getTodayPriorities: protectedProcedure.query(() => getTodayPriorities()),

  getSystemStatus: protectedProcedure.query(() => getSystemStatus()),
});
