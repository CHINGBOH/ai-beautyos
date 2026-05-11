/**
 * 小红书运营管理 Router
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getAllXiaohongshuPosts,
  getXiaohongshuPostById,
  createXiaohongshuPost,
  updateXiaohongshuPost,
  getXiaohongshuComments,
  replyXiaohongshuComment,
} from "../db";
import { getDb } from "../db";
import { xiaohongshuPosts, xiaohongshuComments } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";

export const xiaohongshuRouter = router({
  /**
   * 获取所有小红书内容
   */
  getPosts: protectedProcedure
    .input(
      z.object({
        status: z.enum(["draft", "scheduled", "published", "deleted"]).optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const posts = await getAllXiaohongshuPosts(input.status, input.limit, input.offset);
      
      // 获取总数
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      let countQuery = db.select({ count: sql<number>`count(*)` }).from(xiaohongshuPosts);
      if (input.status) {
        countQuery = countQuery.where(eq(xiaohongshuPosts.status, input.status)) as any;
      }
      const total = await countQuery;
      
      return {
        posts,
        total: total[0]?.count || 0,
      };
    }),

  /**
   * 获取单个小红书内容详情
   */
  getPost: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await getXiaohongshuPostById(input.id);
    }),

  /**
   * 创建小红书内容
   */
  createPost: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        content: z.string(),
        images: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        contentType: z.string(),
        project: z.string().optional(),
        status: z.enum(["draft", "scheduled", "published"]).default("draft"),
        scheduledAt: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await createXiaohongshuPost({
        title: input.title,
        content: input.content,
        images: input.images ? JSON.stringify(input.images) : null,
        tags: input.tags ? JSON.stringify(input.tags) : null,
        contentType: input.contentType,
        project: input.project || null,
        status: input.status,
        scheduledAt: input.scheduledAt || null,
      });
    }),

  /**
   * 更新小红书内容
   */
  updatePost: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
        images: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        status: z.enum(["draft", "scheduled", "published", "deleted"]).optional(),
        scheduledAt: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      
      const updateData: any = {};
      if (updates.title) updateData.title = updates.title;
      if (updates.content) updateData.content = updates.content;
      if (updates.images) updateData.images = JSON.stringify(updates.images);
      if (updates.tags) updateData.tags = JSON.stringify(updates.tags);
      if (updates.status) updateData.status = updates.status;
      if (updates.scheduledAt) updateData.scheduledAt = updates.scheduledAt;
      
      return await updateXiaohongshuPost(id, updateData);
    }),

  /**
   * 删除小红书内容
   */
  deletePost: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      return await updateXiaohongshuPost(input.id, { status: "deleted" });
    }),

  /**
   * 更新小红书内容数据（阅读量、点赞等）
   */
  updatePostStats: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        viewCount: z.number().optional(),
        likeCount: z.number().optional(),
        commentCount: z.number().optional(),
        shareCount: z.number().optional(),
        collectCount: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...stats } = input;
      
      return await updateXiaohongshuPost(id, {
        ...stats,
        lastSyncedAt: new Date(),
      });
    }),

  /**
   * 获取小红书内容的评论（支持分页）
   */
  getComments: protectedProcedure
    .input(
      z.object({
        postId: z.number(),
        replyStatus: z.enum(["pending", "replied", "ignored"]).optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { xiaohongshuComments } = await import("../drizzle/schema");
      
      let query = db.select().from(xiaohongshuComments)
        .where(eq(xiaohongshuComments.postId, input.postId));

      if (input.replyStatus) {
        query = query.where(eq(xiaohongshuComments.replyStatus, input.replyStatus)) as any;
      }

      const comments = await query
        .orderBy(desc(xiaohongshuComments.commentedAt))
        .limit(input.limit)
        .offset(input.offset);

      // Get total count
      let countQuery = db.select({ count: sql<number>`count(*)` })
        .from(xiaohongshuComments)
        .where(eq(xiaohongshuComments.postId, input.postId));

      if (input.replyStatus) {
        countQuery = countQuery.where(eq(xiaohongshuComments.replyStatus, input.replyStatus)) as any;
      }

      const total = await countQuery;

      return {
        comments,
        total: total[0]?.count || 0,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  /**
   * 回复评论
   */
  replyComment: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        replyContent: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      return await replyXiaohongshuComment(input.id, input.replyContent);
    }),

  /**
   * 获取数据统计
   */
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const totalPosts = await db
      .select({ count: sql<number>`count(*)` })
      .from(xiaohongshuPosts)
      .where(eq(xiaohongshuPosts.status, "published"));
    
    const totalViews = await db
      .select({ sum: sql<number>`sum(view_count)` })
      .from(xiaohongshuPosts)
      .where(eq(xiaohongshuPosts.status, "published"));
    
    const totalLikes = await db
      .select({ sum: sql<number>`sum(like_count)` })
      .from(xiaohongshuPosts)
      .where(eq(xiaohongshuPosts.status, "published"));
    
    const totalComments = await db
      .select({ sum: sql<number>`sum(comment_count)` })
      .from(xiaohongshuPosts)
      .where(eq(xiaohongshuPosts.status, "published"));
    
    const pendingComments = await db
      .select({ count: sql<number>`count(*)` })
      .from(xiaohongshuComments)
      .where(eq(xiaohongshuComments.replyStatus, "pending"));
    
    return {
      totalPosts: totalPosts[0]?.count || 0,
      totalViews: totalViews[0]?.sum || 0,
      totalLikes: totalLikes[0]?.sum || 0,
      totalComments: totalComments[0]?.sum || 0,
      pendingComments: pendingComments[0]?.count || 0,
    };
  }),
});
