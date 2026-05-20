import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  searchKnowledgeByKeyword,
  getKnowledgeByModule,
  getKnowledgeRecommendations,
  getSearchStats,
} from "../services/vector-search.service";

const vectorSearchInput = z.object({
  query: z.string().min(1, "搜索查询不能为空"),
  module: z.string().optional(),
  limit: z.number().min(1).max(50).default(10),
  filters: z.object({
    difficulty: z.string().optional(),
    credibility: z.number().min(1).max(10).optional(),
  }).optional(),
});

export const vectorSearchRouter = router({
  search: protectedProcedure
    .input(vectorSearchInput)
    .query(({ input }) => searchKnowledgeByKeyword(input)),

  getByModule: protectedProcedure
    .input(z.object({
      module: z.string(),
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(({ input }) => getKnowledgeByModule(input)),

  getRecommendations: protectedProcedure
    .input(z.object({
      contentId: z.number(),
      limit: z.number().min(1).max(10).default(5),
    }))
    .query(({ input }) => getKnowledgeRecommendations(input.contentId, input.limit)),

  getStats: protectedProcedure
    .query(() => getSearchStats()),
});
