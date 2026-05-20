/**
 * Xiaohongshu Service
 * 小红书运营管理业务逻辑；router 只负责鉴权与参数校验。
 */

import { and, desc, eq, sql } from "drizzle-orm";
import {
  getDb,
  getAllXiaohongshuPosts,
  getXiaohongshuPostById,
  createXiaohongshuPost,
  updateXiaohongshuPost,
  getXiaohongshuComments,
  replyXiaohongshuComment,
} from "../db";
import { xiaohongshuComments, xiaohongshuPosts } from "../../drizzle/schema";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db;
}

export async function getPosts(status?: "draft" | "scheduled" | "published" | "deleted", limit = 20, offset = 0) {
  const db = await requireDb();
  const posts = await getAllXiaohongshuPosts(status, limit, offset);

  let countQuery = db.select({ count: sql<number>`count(*)` }).from(xiaohongshuPosts);
  if (status) {
    countQuery = countQuery.where(eq(xiaohongshuPosts.status, status)) as typeof countQuery;
  }
  const total = await countQuery;
  return { posts, total: total[0]?.count || 0 };
}

export async function getPost(id: number) {
  return getXiaohongshuPostById(id);
}

export async function createPost(input: {
  title: string;
  content: string;
  images?: string[];
  tags?: string[];
  contentType: string;
  project?: string;
  status: "draft" | "scheduled" | "published";
  scheduledAt?: Date;
}) {
  return createXiaohongshuPost({
    title: input.title,
    content: input.content,
    images: input.images ? JSON.stringify(input.images) : null,
    tags: input.tags ? JSON.stringify(input.tags) : null,
    contentType: input.contentType,
    project: input.project || null,
    status: input.status,
    scheduledAt: input.scheduledAt?.toISOString() || null,
  });
}

export async function updatePost(id: number, updates: {
  title?: string;
  content?: string;
  images?: string[];
  tags?: string[];
  status?: "draft" | "scheduled" | "published" | "deleted";
  scheduledAt?: Date;
}) {
  const updateData: Record<string, unknown> = {};
  if (updates.title) updateData.title = updates.title;
  if (updates.content) updateData.content = updates.content;
  if (updates.images) updateData.images = JSON.stringify(updates.images);
  if (updates.tags) updateData.tags = JSON.stringify(updates.tags);
  if (updates.status) updateData.status = updates.status;
  if (updates.scheduledAt) updateData.scheduledAt = updates.scheduledAt;
  return updateXiaohongshuPost(id, updateData);
}

export async function deletePost(id: number) {
  return updateXiaohongshuPost(id, { status: "deleted" });
}

export async function updatePostStats(id: number, stats: {
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  collectCount?: number;
}) {
  return updateXiaohongshuPost(id, { ...stats, lastSyncedAt: new Date().toISOString() });
}

export async function getComments(postId: number, replyStatus?: "pending" | "replied" | "ignored", limit = 20, offset = 0) {
  const db = await requireDb();

  const conditions = [eq(xiaohongshuComments.postId, postId)];
  if (replyStatus) conditions.push(eq(xiaohongshuComments.replyStatus, replyStatus));
  const where = and(...conditions);

  const comments = await db
    .select()
    .from(xiaohongshuComments)
    .where(where)
    .orderBy(desc(xiaohongshuComments.commentedAt))
    .limit(limit)
    .offset(offset);

  const total = await db
    .select({ count: sql<number>`count(*)` })
    .from(xiaohongshuComments)
    .where(where);

  return { comments, total: total[0]?.count || 0, limit, offset };
}

export async function replyComment(id: number, replyContent: string) {
  return replyXiaohongshuComment(id, replyContent);
}

export async function getStats() {
  const db = await requireDb();
  const publishedFilter = eq(xiaohongshuPosts.status, "published");

  const [totalPosts, totalViews, totalLikes, totalComments, pendingComments] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(xiaohongshuPosts).where(publishedFilter),
    db.select({ sum: sql<number>`sum(view_count)` }).from(xiaohongshuPosts).where(publishedFilter),
    db.select({ sum: sql<number>`sum(like_count)` }).from(xiaohongshuPosts).where(publishedFilter),
    db.select({ sum: sql<number>`sum(comment_count)` }).from(xiaohongshuPosts).where(publishedFilter),
    db.select({ count: sql<number>`count(*)` }).from(xiaohongshuComments).where(eq(xiaohongshuComments.replyStatus, "pending")),
  ]);

  return {
    totalPosts: totalPosts[0]?.count || 0,
    totalViews: totalViews[0]?.sum || 0,
    totalLikes: totalLikes[0]?.sum || 0,
    totalComments: totalComments[0]?.sum || 0,
    pendingComments: pendingComments[0]?.count || 0,
  };
}
