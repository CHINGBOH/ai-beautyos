import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  crawlHtml,
  crawlHtmlBatch,
  searchPubMed,
  crawlPubMed,
  searchCNKI,
  crawlCNKI,
  crawlMedicalBeautyProject,
  crawlMedicalBeautyCase,
  crawlJsonApi,
} from "../services/crawler.service";

export const crawlerRouter = router({
  crawlHtml: protectedProcedure
    .input(z.object({
      url: z.string().url(),
      contentSelector: z.string().optional(),
      titleSelector: z.string().optional(),
      extractImages: z.boolean().optional().default(true),
      extractLinks: z.boolean().optional().default(false),
    }))
    .mutation(({ input }) => crawlHtml(input)),

  crawlHtmlBatch: protectedProcedure
    .input(z.object({
      urls: z.array(z.string().url()),
      contentSelector: z.string().optional(),
      titleSelector: z.string().optional(),
      delay: z.number().optional().default(2000),
    }))
    .mutation(({ input }) => crawlHtmlBatch(input)),

  searchPubMed: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
      retmax: z.number().min(1).max(100).optional().default(20),
      sort: z.enum(["relevance", "pub_date"]).optional().default("relevance"),
      dateRange: z.object({
        start: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/),
        end: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/),
      }).optional(),
    }))
    .query(({ input }) => searchPubMed(input)),

  crawlPubMed: protectedProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(({ input }) => crawlPubMed(input.url)),

  searchCNKI: protectedProcedure
    .input(z.object({
      keyword: z.string().min(1),
      searchType: z.enum(["主题", "篇名", "关键词", "摘要", "全文"]).optional().default("主题"),
      pageSize: z.number().min(1).max(50).optional().default(20),
      page: z.number().min(1).optional().default(1),
    }))
    .query(({ input }) => searchCNKI(input)),

  crawlCNKI: protectedProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(({ input }) => crawlCNKI(input.url)),

  crawlMedicalBeautyProject: protectedProcedure
    .input(z.object({
      url: z.string().url(),
      config: z.object({
        contentSelector: z.string().optional(),
        titleSelector: z.string().optional(),
        priceSelector: z.string().optional(),
        effectSelector: z.string().optional(),
        riskSelector: z.string().optional(),
      }).optional(),
    }))
    .mutation(({ input }) => crawlMedicalBeautyProject(input)),

  crawlMedicalBeautyCase: protectedProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(({ input }) => crawlMedicalBeautyCase(input.url)),

  crawlJsonApi: protectedProcedure
    .input(z.object({
      url: z.string().url(),
      baseUrl: z.string().url().optional(),
      headers: z.record(z.string(), z.string()).optional(),
      params: z.record(z.string(), z.string()).optional(),
      dataPath: z.string().optional(),
    }))
    .mutation(({ input }) => crawlJsonApi(input)),
});
