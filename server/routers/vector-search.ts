import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  getVectorCapability,
  vectorSearch,
  indexContent,
  batchIndexContent,
  getVectorStats,
} from "../services/vector-search-rag.service";

const vectorSearchInput = z.object({
  query: z.string().min(1, "搜索查询不能为空").max(500),
  module: z.string().optional(),
  limit: z.number().min(1).max(50).default(10),
  threshold: z.number().min(0).max(1).default(0.7),
  filters: z.object({
    difficulty: z.string().optional(),
    credibility: z.number().min(1).max(10).optional(),
  }).optional(),
});

export const vectorSearchRouter = router({
  capability: protectedProcedure
    .query(() => getVectorCapability()),

  search: protectedProcedure
    .input(vectorSearchInput)
    .query(({ input }) => vectorSearch(input)),

  indexContent: protectedProcedure
    .input(z.object({ contentId: z.number(), force: z.boolean().default(false) }))
    .mutation(({ input }) => indexContent(input.contentId, input.force)),

  batchIndex: protectedProcedure
    .input(z.object({
      module: z.string().optional(),
      limit: z.number().min(1).max(200).default(50),
      force: z.boolean().default(false),
    }))
    .mutation(({ input }) => batchIndexContent(input)),

  getStats: protectedProcedure
    .query(() => getVectorStats()),
});
