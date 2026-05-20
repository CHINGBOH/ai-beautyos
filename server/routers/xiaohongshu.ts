import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  updatePostStats,
  getComments,
  replyComment,
  getStats,
} from "../services/xiaohongshu.service";

export const xiaohongshuRouter = router({
  getPosts: protectedProcedure
    .input(z.object({
      status: z.enum(["draft", "scheduled", "published", "deleted"]).optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(({ input }) => getPosts(input.status, input.limit, input.offset)),

  getPost: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getPost(input.id)),

  createPost: protectedProcedure
    .input(z.object({
      title: z.string().max(200),
      content: z.string().max(10000),
      images: z.array(z.string().max(500)).optional(),
      tags: z.array(z.string().max(100)).optional(),
      contentType: z.string().max(50),
      project: z.string().max(200).optional(),
      status: z.enum(["draft", "scheduled", "published"]).default("draft"),
      scheduledAt: z.date().optional(),
    }))
    .mutation(({ input }) => createPost(input)),

  updatePost: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().max(200).optional(),
      content: z.string().max(10000).optional(),
      images: z.array(z.string().max(500)).optional(),
      tags: z.array(z.string().max(100)).optional(),
      status: z.enum(["draft", "scheduled", "published", "deleted"]).optional(),
      scheduledAt: z.date().optional(),
    }))
    .mutation(({ input }) => {
      const { id, ...updates } = input;
      return updatePost(id, updates);
    }),

  deletePost: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deletePost(input.id)),

  updatePostStats: protectedProcedure
    .input(z.object({
      id: z.number(),
      viewCount: z.number().optional(),
      likeCount: z.number().optional(),
      commentCount: z.number().optional(),
      shareCount: z.number().optional(),
      collectCount: z.number().optional(),
    }))
    .mutation(({ input }) => {
      const { id, ...stats } = input;
      return updatePostStats(id, stats);
    }),

  getComments: protectedProcedure
    .input(z.object({
      postId: z.number(),
      replyStatus: z.enum(["pending", "replied", "ignored"]).optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(({ input }) => getComments(input.postId, input.replyStatus, input.limit, input.offset)),

  replyComment: protectedProcedure
    .input(z.object({ id: z.number(), replyContent: z.string().max(5000) }))
    .mutation(({ input }) => replyComment(input.id, input.replyContent)),

  getStats: protectedProcedure
    .query(() => getStats()),
});
