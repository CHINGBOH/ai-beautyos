import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getAllLeads, getLeadById, updateLead } from "../db";

export const customersRouter = router({
  /**
   * 获取客户列表
   */
  list: protectedProcedure.query(async () => {
    const leads = await getAllLeads();
    return leads;
  }),

  /**
   * 获取客户详情
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const lead = await getLeadById(input.id);
      return lead;
    }),

  /**
   * 更新客户（含区域、生日、重要节日等）
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        hood: z.string().max(200).optional(),
        birthday: z
          .string()
          .max(50)
          .optional()
          .nullable()
          .describe("生日，ISO 8601 字符串格式（例如 '1990-01-01'）"),
        importantHolidays: z.string().max(500).optional().nullable(),
        name: z.string().max(200).optional(),
        phone: z.string().max(50).optional(),
        wechat: z.string().max(100).optional().nullable(),
        age: z.number().optional().nullable(),
        notes: z.string().max(10000).optional().nullable(),
        customerTier: z.string().optional().nullable(),
        status: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateLead(id, data);
    }),

  /**
   * 获取客户统计
   */
  stats: protectedProcedure.query(async () => {
    const leads = await getAllLeads();

    return {
      total: leads.length,
      tierA: leads.filter(l => l.customerTier === "A").length,
      tierB: leads.filter(l => l.customerTier === "B").length,
      tierC: leads.filter(l => l.customerTier === "C").length,
      tierD: leads.filter(l => l.customerTier === "D").length,
      恐惧型: leads.filter(l => l.psychologyType === "恐惧型").length,
      贪婪型: leads.filter(l => l.psychologyType === "贪婪型").length,
      安全型: leads.filter(l => l.psychologyType === "安全型").length,
      敏感型: leads.filter(l => l.psychologyType === "敏感型").length,
    };
  }),
});
