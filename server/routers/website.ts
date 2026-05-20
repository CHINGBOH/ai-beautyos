import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  getEffectShowcaseImage,
  getPageContent,
  getContentById,
  createContent,
  updateContent,
  deleteContent,
  getButtonContent,
  getNavigation,
  getNavigationByNavKey,
  createNavigation,
  updateNavigation,
  deleteNavigation,
} from "../services/website.service";

export const websiteRouter = router({
  getEffectShowcaseImage: publicProcedure
    .query(() => getEffectShowcaseImage()),

  // ==================== 内容管理 ====================

  getPageContent: publicProcedure
    .input(z.object({
      pageKey: z.string(),
      sectionKey: z.string().optional(),
    }))
    .query(({ input }) => getPageContent(input.pageKey, input.sectionKey)),

  getContentById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getContentById(input.id)),

  createContent: protectedProcedure
    .input(z.object({
      pageKey: z.string(),
      sectionKey: z.string().optional(),
      contentType: z.string(),
      title: z.string().max(200).optional(),
      content: z.string().max(10000),
      imageUrl: z.string().max(500).optional(),
      linkUrl: z.string().max(500).optional(),
      linkText: z.string().max(200).optional(),
      sortOrder: z.number().default(0),
      metadata: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(({ input }) => createContent(input)),

  updateContent: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().max(200).optional(),
      content: z.string().max(10000).optional(),
      imageUrl: z.string().max(500).optional(),
      linkUrl: z.string().max(500).optional(),
      linkText: z.string().max(200).optional(),
      sortOrder: z.number().optional(),
      isActive: z.number().optional(),
      metadata: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(({ input }) => {
      const { id, ...updates } = input;
      return updateContent(id, updates);
    }),

  deleteContent: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteContent(input.id)),

  getButtonContent: publicProcedure
    .input(z.object({
      pageKey: z.string(),
      buttonKey: z.string(),
    }))
    .query(({ input }) => getButtonContent(input.pageKey, input.buttonKey)),

  // ==================== 导航管理 ====================

  getNavigation: publicProcedure
    .input(z.object({ parentKey: z.string().optional() }))
    .query(({ input }) => getNavigation(input.parentKey)),

  getNavigationByNavKey: publicProcedure
    .input(z.object({ navKey: z.string() }))
    .query(({ input }) => getNavigationByNavKey(input.navKey)),

  createNavigation: protectedProcedure
    .input(z.object({
      parentKey: z.string().optional(),
      navKey: z.string(),
      title: z.string().max(200),
      link: z.string().max(500).optional(),
      icon: z.string().max(100).optional(),
      description: z.string().max(500).optional(),
      sortOrder: z.number().default(0),
      isExternal: z.number().default(0),
      openInNewTab: z.number().default(0),
    }))
    .mutation(({ input }) => createNavigation(input)),

  updateNavigation: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().max(200).optional(),
      link: z.string().max(500).optional(),
      icon: z.string().max(100).optional(),
      description: z.string().max(500).optional(),
      sortOrder: z.number().optional(),
      isActive: z.number().optional(),
      isExternal: z.number().optional(),
      openInNewTab: z.number().optional(),
    }))
    .mutation(({ input }) => {
      const { id, ...updates } = input;
      return updateNavigation(id, updates);
    }),

  deleteNavigation: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteNavigation(input.id)),
});
