/**
 * 简化的向量搜索路由
 * 为现有项目结构提供基础的语义搜索功能
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { knowledgeBase } from '../drizzle/schema';
import { eq, and, ilike, desc, sql, or } from 'drizzle-orm';

// 向量搜索输入验证
const vectorSearchInput = z.object({
  query: z.string().min(1, '搜索查询不能为空'),
  module: z.string().optional(),
  limit: z.number().min(1).max(50).default(10),
  filters: z.object({
    difficulty: z.string().optional(),
    credibility: z.number().min(1).max(10).optional(),
  }).optional(),
});

/**
 * 简化的向量搜索路由
 */
export const vectorSearchRouter = router({
  /**
   * 增强的关键词搜索
   * 暂时使用关键词搜索，后续可升级为真正的向量搜索
   */
  search: protectedProcedure
    .input(vectorSearchInput)
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: '数据库连接失败',
          });
        }

        // 构建搜索条件
        const searchTerm = `%${input.query}%`;
        let whereConditions = [
          eq(knowledgeBase.isActive, 1),
          or(
            ilike(knowledgeBase.title, searchTerm),
            ilike(knowledgeBase.summary, searchTerm),
            ilike(knowledgeBase.content, searchTerm)
          )
        ];

        // 模块过滤
        if (input.module) {
          whereConditions.push(eq(knowledgeBase.module, input.module));
        }

        // 难度过滤
        if (input.filters?.difficulty) {
          whereConditions.push(eq(knowledgeBase.difficulty, input.filters.difficulty));
        }

        // 可信度过滤
        if (input.filters?.credibility) {
          whereConditions.push(
            sql`${knowledgeBase.credibility} >= ${input.filters.credibility}`
          );
        }

        // 执行搜索
        const results = await db
          .select({
            id: knowledgeBase.id,
            title: knowledgeBase.title,
            summary: knowledgeBase.summary,
            content: knowledgeBase.content,
            module: knowledgeBase.module,
            difficulty: knowledgeBase.difficulty,
            credibility: knowledgeBase.credibility,
            viewCount: knowledgeBase.viewCount,
            likeCount: knowledgeBase.likeCount,
          })
          .from(knowledgeBase)
          .where(and(...whereConditions))
          .orderBy(desc(knowledgeBase.credibility), desc(knowledgeBase.viewCount))
          .limit(input.limit);

        // 计算相关性分数
        const scoredResults = results.map(item => ({
          ...item,
          content: item.content?.substring(0, 500) + (item.content?.length > 500 ? '...' : ''),
          similarity: calculateRelevanceScore(item, input.query),
          matchType: 'keyword',
        }));

        return {
          results: scoredResults,
          query: input.query,
          totalFound: results.length,
          searchType: 'enhanced_keyword',
        };

      } catch (error) {
        console.error('Search error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '搜索失败',
        });
      }
    }),

  /**
   * 按模块获取内容
   */
  getByModule: protectedProcedure
    .input(z.object({
      module: z.string(),
      limit: z.number().min(1).max(50).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: '数据库连接失败',
          });
        }

        const results = await db
          .select({
            id: knowledgeBase.id,
            title: knowledgeBase.title,
            summary: knowledgeBase.summary,
            module: knowledgeBase.module,
            difficulty: knowledgeBase.difficulty,
            credibility: knowledgeBase.credibility,
            viewCount: knowledgeBase.viewCount,
            likeCount: knowledgeBase.likeCount,
          })
          .from(knowledgeBase)
          .where(
            and(
              eq(knowledgeBase.module, input.module),
              eq(knowledgeBase.isActive, 1)
            )
          )
          .orderBy(desc(knowledgeBase.credibility), desc(knowledgeBase.viewCount))
          .limit(input.limit)
          .offset(input.offset);

        return {
          results,
          module: input.module,
          totalFound: results.length,
        };

      } catch (error) {
        console.error('Get by module error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '获取模块内容失败',
        });
      }
    }),

  /**
   * 获取推荐内容
   */
  getRecommendations: protectedProcedure
    .input(z.object({
      contentId: z.number(),
      limit: z.number().min(1).max(10).default(5),
    }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: '数据库连接失败',
          });
        }

        // 获取源内容
        const sourceContent = await db
          .select({
            id: knowledgeBase.id,
            title: knowledgeBase.title,
            module: knowledgeBase.module,
            tags: knowledgeBase.tags,
          })
          .from(knowledgeBase)
          .where(eq(knowledgeBase.id, input.contentId))
          .limit(1);

        if (sourceContent.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: '源内容不存在',
          });
        }

        const source = sourceContent[0];
        
        // 基于模块和标签查找相似内容
        let whereConditions = [
          eq(knowledgeBase.isActive, 1),
          eq(knowledgeBase.module, source.module),
          sql`${knowledgeBase.id} != ${input.contentId}`
        ];

        // 如果有标签，尝试匹配标签
        if (source.tags) {
          try {
            const tags = JSON.parse(source.tags) as string[];
            if (tags.length > 0) {
              const tagConditions = tags.map(tag => 
                ilike(knowledgeBase.tags, `%${tag}%`)
              );
              whereConditions.push(or(...tagConditions));
            }
          } catch (e) {
            // 标签解析失败，忽略标签匹配
          }
        }

        const recommendations = await db
          .select({
            id: knowledgeBase.id,
            title: knowledgeBase.title,
            summary: knowledgeBase.summary,
            module: knowledgeBase.module,
            difficulty: knowledgeBase.difficulty,
            credibility: knowledgeBase.credibility,
            viewCount: knowledgeBase.viewCount,
          })
          .from(knowledgeBase)
          .where(and(...whereConditions))
          .orderBy(desc(knowledgeBase.credibility), desc(knowledgeBase.viewCount))
          .limit(input.limit);

        return {
          sourceContent: {
            id: source.id,
            title: source.title,
            module: source.module,
          },
          recommendations: recommendations.map(item => ({
            ...item,
            relevanceScore: calculateRecommendationScore(source, item),
          })),
          totalFound: recommendations.length,
        };

      } catch (error) {
        console.error('Get recommendations error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '获取推荐内容失败',
        });
      }
    }),

  /**
   * 获取搜索统计
   */
  getStats: protectedProcedure
    .query(async () => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: '数据库连接失败',
          });
        }

        const totalStats = await db
          .select({
            total: sql<number>`count(*)`,
            active: sql<number>`count(*) FILTER (WHERE ${knowledgeBase.isActive} = 1)`,
          })
          .from(knowledgeBase);

        const moduleStats = await db
          .select({
            module: knowledgeBase.module,
            count: sql<number>`count(*)`,
            avgCredibility: sql<number>`avg(${knowledgeBase.credibility})`,
            totalViews: sql<number>`sum(${knowledgeBase.viewCount})`,
          })
          .from(knowledgeBase)
          .where(eq(knowledgeBase.isActive, 1))
          .groupBy(knowledgeBase.module);

        const difficultyStats = await db
          .select({
            difficulty: knowledgeBase.difficulty,
            count: sql<number>`count(*)`,
          })
          .from(knowledgeBase)
          .where(eq(knowledgeBase.isActive, 1))
          .groupBy(knowledgeBase.difficulty);

        return {
          total: totalStats[0]?.total || 0,
          active: totalStats[0]?.active || 0,
          moduleStats,
          difficultyStats,
        };

      } catch (error) {
        console.error('Get stats error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '获取统计信息失败',
        });
      }
    }),
});

/**
 * 计算相关性分数
 */
function calculateRelevanceScore(item: any, query: string): number {
  const queryWords = query.toLowerCase().split(/\s+/);
  const title = item.title?.toLowerCase() || '';
  const summary = item.summary?.toLowerCase() || '';
  const content = item.content?.toLowerCase() || '';
  
  let score = 0;
  const totalWords = queryWords.length;
  
  queryWords.forEach(word => {
    if (title.includes(word)) score += 0.5;
    if (summary.includes(word)) score += 0.3;
    if (content.includes(word)) score += 0.2;
  });
  
  // 考虑可信度和查看次数
  score += (item.credibility / 10) * 0.1;
  score += Math.min(item.viewCount / 1000, 1) * 0.1;
  
  return Math.min(score / totalWords, 1);
}

/**
 * 计算推荐分数
 */
function calculateRecommendationScore(source: any, item: any): number {
  let score = 0;
  
  // 同模块加分
  if (source.module === item.module) {
    score += 0.4;
  }
  
  // 可信度相似性
  const credibilityDiff = Math.abs(source.credibility - item.credibility);
  score += (1 - credibilityDiff / 10) * 0.3;
  
  // 查看次数权重
  score += Math.min(item.viewCount / 1000, 1) * 0.3;
  
  return Math.min(score, 1);
}
