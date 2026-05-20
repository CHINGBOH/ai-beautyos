import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getProjects,
  generateContent,
  generateContentImage,
  getContentHistory,
  analyzeContentQuality,
  getWritingTips,
  getContentTemplates,
  generateFromTemplate,
  bulkGenerateContent,
  schedulePost,
} from "../services/content.service";

const contentTypeEnum = z.enum(["project", "case", "price", "guide", "holiday", "new_product"]);
const toneEnum = z.enum(["enthusiastic", "professional", "casual"]);
const userId = (ctx: { user: { openId?: string | null } }) => ctx.user.openId || "anonymous";

export const contentRouterEnhanced = router({
  getProjects: protectedProcedure.query(() => getProjects()),

  generate: protectedProcedure
    .input(z.object({
      type: contentTypeEnum,
      project: z.string().max(200).optional(),
      keywords: z.array(z.string().max(100)).optional(),
      tone: toneEnum.optional(),
      useCache: z.boolean().default(true),
    }))
    .mutation(({ input, ctx }) => generateContent(input, userId(ctx))),

  generateImage: protectedProcedure
    .input(z.object({
      title: z.string().max(200),
      content: z.string().max(10000),
      project: z.string().max(200).optional(),
      style: z.enum(["modern", "elegant", "vibrant"]).optional(),
    }))
    .mutation(({ input, ctx }) => generateContentImage(input, userId(ctx))),

  getHistory: protectedProcedure
    .input(z.object({ postId: z.number(), limit: z.number().default(10) }))
    .query(({ input }) => getContentHistory(input.postId, input.limit)),

  analyzeQuality: protectedProcedure
    .input(z.object({
      title: z.string().max(200),
      content: z.string().max(10000),
      tags: z.array(z.string().max(100)),
    }))
    .mutation(({ input }) => analyzeContentQuality(input.title, input.content, input.tags)),

  getWritingTips: protectedProcedure.query(() => getWritingTips()),

  getTemplates: protectedProcedure.query(() => getContentTemplates()),

  generateFromTemplate: protectedProcedure
    .input(z.object({
      templateId: z.string(),
      customizations: z.record(z.string(), z.string().max(1000)).optional(),
    }))
    .mutation(({ input, ctx }) => generateFromTemplate(input.templateId, input.customizations, userId(ctx))),

  bulkGenerate: protectedProcedure
    .input(z.object({
      items: z.array(z.object({
        type: contentTypeEnum,
        project: z.string().max(200).optional(),
        keywords: z.array(z.string().max(100)).optional(),
        tone: toneEnum.optional(),
      })),
      batchSize: z.number().default(5),
    }))
    .mutation(({ input, ctx }) => bulkGenerateContent(input.items, input.batchSize, userId(ctx))),

  schedulePost: protectedProcedure
    .input(z.object({ postId: z.number(), scheduledTime: z.date() }))
    .mutation(({ input }) => schedulePost(input.postId, input.scheduledTime)),
});
