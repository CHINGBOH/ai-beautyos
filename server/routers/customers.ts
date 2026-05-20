import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  listCustomers,
  getCustomerById,
  updateCustomer,
  getCustomerStats,
  getHighIntentCustomers,
  getUnconvertedByProject,
} from "../services/customers.service";

export const customersRouter = router({
  list: protectedProcedure.query(() => listCustomers()),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getCustomerById(input.id)),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        hood: z.string().max(200).optional(),
        birthday: z.string().max(50).optional().nullable(),
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
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return updateCustomer(id, data as Record<string, unknown>);
    }),

  stats: protectedProcedure.query(() => getCustomerStats()),

  /** 高意向客户（A/B 级未转化）— 供 Hermes 工具调用 */
  highIntent: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }).optional())
    .query(({ input }) => getHighIntentCustomers(input?.limit)),

  /** 咨询过某项目但未转化的线索 */
  unconvertedByProject: protectedProcedure
    .input(z.object({ project: z.string(), limit: z.number().min(1).max(100).default(20) }))
    .query(({ input }) => getUnconvertedByProject(input.project, input.limit)),
});
