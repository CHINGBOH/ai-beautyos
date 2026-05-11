/**
 * 网站内容管理 Router
 */

import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  getWebsiteContent,
  getWebsiteContentById,
  createWebsiteContent,
  updateWebsiteContent,
  deleteWebsiteContent,
  getWebsiteNavigation,
  getWebsiteNavigationByNavKey,
  createWebsiteNavigation,
  updateWebsiteNavigation,
  deleteWebsiteNavigation,
} from "../db";

export const websiteRouter = router({
  // ==================== 内容管理 ====================

  /**
   * 获取页面内容
   */
  getPageContent: publicProcedure
    .input(
      z.object({
        pageKey: z.string(),
        sectionKey: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const content = await getWebsiteContent(input.pageKey, input.sectionKey);
      return content.map(item => ({
        ...item,
        metadata: item.metadata ? JSON.parse(item.metadata) : null,
      }));
    }),

  /**
   * 获取单个内容
   */
  getContentById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const content = await getWebsiteContentById(input.id);
      if (content && content.metadata) {
        content.metadata = JSON.parse(content.metadata);
      }
      return content;
    }),

  /**
   * 创建内容
   */
  createContent: protectedProcedure
    .input(
      z.object({
        pageKey: z.string(),
        sectionKey: z.string().optional(),
        contentType: z.string(),
        title: z.string().optional(),
        content: z.string(),
        imageUrl: z.string().optional(),
        linkUrl: z.string().optional(),
        linkText: z.string().optional(),
        sortOrder: z.number().default(0),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await createWebsiteContent({
        ...input,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      });
    }),

  /**
   * 更新内容
   */
  updateContent: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
        imageUrl: z.string().optional(),
        linkUrl: z.string().optional(),
        linkText: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      const updateData: any = {};
      
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.content !== undefined) updateData.content = updates.content;
      if (updates.imageUrl !== undefined) updateData.imageUrl = updates.imageUrl;
      if (updates.linkUrl !== undefined) updateData.linkUrl = updates.linkUrl;
      if (updates.linkText !== undefined) updateData.linkText = updates.linkText;
      if (updates.sortOrder !== undefined) updateData.sortOrder = updates.sortOrder;
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
      if (updates.metadata !== undefined) updateData.metadata = JSON.stringify(updates.metadata);
      
      return await updateWebsiteContent(id, updateData);
    }),

  /**
   * 删除内容（软删除）
   */
  deleteContent: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await deleteWebsiteContent(input.id);
    }),

  /**
   * 获取按钮内容
   */
  getButtonContent: publicProcedure
    .input(
      z.object({
        pageKey: z.string(),
        buttonKey: z.string(), // 按钮的唯一标识
      })
    )
    .query(async ({ input }) => {
      const { pageKey, buttonKey } = input;
      
      // 查询特定页面和按钮键的网站内容
      const db = await import("../db");
      const content = await db.getWebsiteContent(pageKey, `button_${buttonKey}`);
      
      if (!content || content.length === 0) {
        // 如果没有找到特定按钮内容，则返回默认值
        return {
          id: null,
          pageKey,
          sectionKey: `button_${buttonKey}`,
          contentType: "button",
          title: "",
          content: buttonKey, // 使用按钮键作为默认内容
          imageUrl: null,
          linkUrl: null,
          linkText: buttonKey, // 使用按钮键作为默认链接文本
          sortOrder: 0,
          isActive: 1,
          metadata: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
      
      const buttonContent = content[0];
      return {
        ...buttonContent,
        metadata: buttonContent.metadata ? JSON.parse(buttonContent.metadata) : null,
      };
    }),

  // ==================== 导航管理 ====================

  /**
   * 获取导航菜单
   */
  getNavigation: publicProcedure
    .input(
      z.object({
        parentKey: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return await getWebsiteNavigation(input.parentKey);
    }),

  /**
   * 获取单个导航
   */
  getNavigationByNavKey: publicProcedure
    .input(z.object({ navKey: z.string() }))
    .query(async ({ input }) => {
      return await getWebsiteNavigationByNavKey(input.navKey);
    }),

  /**
   * 创建导航
   */
  createNavigation: protectedProcedure
    .input(
      z.object({
        parentKey: z.string().optional(),
        navKey: z.string(),
        title: z.string(),
        link: z.string().optional(),
        icon: z.string().optional(),
        description: z.string().optional(),
        sortOrder: z.number().default(0),
        isExternal: z.number().default(0),
        openInNewTab: z.number().default(0),
      })
    )
    .mutation(async ({ input }) => {
      return await createWebsiteNavigation(input);
    }),

  /**
   * 更新导航
   */
  updateNavigation: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        link: z.string().optional(),
        icon: z.string().optional(),
        description: z.string().optional(),
        sortOrder: z.number().optional(),
        isActive: z.number().optional(),
        isExternal: z.number().optional(),
        openInNewTab: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      return await updateWebsiteNavigation(id, updates);
    }),

  /**
   * 删除导航（软删除）
   */
  deleteNavigation: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await deleteWebsiteNavigation(input.id);
    }),
});
