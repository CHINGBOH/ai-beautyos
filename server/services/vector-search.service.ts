/**
 * Vector Search Service
 * 关键词语义搜索业务逻辑；router 只负责鉴权与参数校验。
 */

import { TRPCError } from "@trpc/server";
import { eq, and, ilike, desc, sql, or } from "drizzle-orm";
import { getDb } from "../db";
import { knowledgeBase } from "../../drizzle/schema";

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function calculateRelevanceScore(item: any, query: string): number {
  const queryWords = query.toLowerCase().split(/\s+/);
  const title = item.title?.toLowerCase() || "";
  const summary = item.summary?.toLowerCase() || "";
  const content = item.content?.toLowerCase() || "";

  let score = 0;
  queryWords.forEach(word => {
    if (title.includes(word)) score += 0.5;
    if (summary.includes(word)) score += 0.3;
    if (content.includes(word)) score += 0.2;
  });
  score += (item.credibility / 10) * 0.1;
  score += Math.min(item.viewCount / 1000, 1) * 0.1;
  return Math.min(score / queryWords.length, 1);
}

function calculateRecommendationScore(source: any, item: any): number {
  let score = 0;
  if (source.module === item.module) score += 0.4;
  const credibilityDiff = Math.abs((source.credibility || 5) - (item.credibility || 5));
  score += (1 - credibilityDiff / 10) * 0.3;
  score += Math.min((item.viewCount || 0) / 1000, 1) * 0.3;
  return Math.min(score, 1);
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
  return db;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function searchKnowledgeByKeyword(input: {
  query: string;
  module?: string;
  limit: number;
  filters?: { difficulty?: string; credibility?: number };
}) {
  const db = await requireDb();
  const searchTerm = `%${input.query}%`;

  const whereConditions: any[] = [
    eq(knowledgeBase.isActive, 1),
    or(
      ilike(knowledgeBase.title, searchTerm),
      ilike(knowledgeBase.summary, searchTerm),
      ilike(knowledgeBase.content, searchTerm)
    ),
  ];

  if (input.module) whereConditions.push(eq(knowledgeBase.module, input.module));
  if (input.filters?.difficulty) whereConditions.push(eq(knowledgeBase.difficulty, input.filters.difficulty));
  if (input.filters?.credibility) whereConditions.push(sql`${knowledgeBase.credibility} >= ${input.filters.credibility}`);

  const results = await db
    .select({
      id: knowledgeBase.id, title: knowledgeBase.title, summary: knowledgeBase.summary,
      content: knowledgeBase.content, module: knowledgeBase.module, difficulty: knowledgeBase.difficulty,
      credibility: knowledgeBase.credibility, viewCount: knowledgeBase.viewCount, likeCount: knowledgeBase.likeCount,
    })
    .from(knowledgeBase)
    .where(and(...whereConditions))
    .orderBy(desc(knowledgeBase.credibility), desc(knowledgeBase.viewCount))
    .limit(input.limit);

  const scoredResults = results.map(item => ({
    ...item,
    content: item.content?.substring(0, 500) + (item.content?.length > 500 ? "..." : ""),
    similarity: calculateRelevanceScore(item, input.query),
    matchType: "keyword",
  }));

  return { results: scoredResults, query: input.query, totalFound: results.length, searchType: "enhanced_keyword" };
}

export async function getKnowledgeByModule(input: { module: string; limit: number; offset: number }) {
  const db = await requireDb();

  const results = await db
    .select({
      id: knowledgeBase.id, title: knowledgeBase.title, summary: knowledgeBase.summary,
      module: knowledgeBase.module, difficulty: knowledgeBase.difficulty,
      credibility: knowledgeBase.credibility, viewCount: knowledgeBase.viewCount, likeCount: knowledgeBase.likeCount,
    })
    .from(knowledgeBase)
    .where(and(eq(knowledgeBase.module, input.module), eq(knowledgeBase.isActive, 1)))
    .orderBy(desc(knowledgeBase.credibility), desc(knowledgeBase.viewCount))
    .limit(input.limit)
    .offset(input.offset);

  return { results, module: input.module, totalFound: results.length };
}

export async function getKnowledgeRecommendations(contentId: number, limit: number) {
  const db = await requireDb();

  const sourceContent = await db
    .select({ id: knowledgeBase.id, title: knowledgeBase.title, module: knowledgeBase.module, tags: knowledgeBase.tags })
    .from(knowledgeBase)
    .where(eq(knowledgeBase.id, contentId))
    .limit(1);

  if (sourceContent.length === 0) {
    throw new TRPCError({ code: "NOT_FOUND", message: "源内容不存在" });
  }

  const source = sourceContent[0];
  const whereConditions: any[] = [
    eq(knowledgeBase.isActive, 1),
    eq(knowledgeBase.module, source.module),
    sql`${knowledgeBase.id} != ${contentId}`,
  ];

  if (source.tags) {
    try {
      const tags = JSON.parse(source.tags) as string[];
      if (tags.length > 0) {
        const tagFilter = or(...tags.map(tag => ilike(knowledgeBase.tags, `%${tag}%`)));
        if (tagFilter) whereConditions.push(tagFilter);
      }
    } catch {
      // tag parse failure is non-fatal
    }
  }

  const recommendations = await db
    .select({
      id: knowledgeBase.id, title: knowledgeBase.title, summary: knowledgeBase.summary,
      module: knowledgeBase.module, difficulty: knowledgeBase.difficulty,
      credibility: knowledgeBase.credibility, viewCount: knowledgeBase.viewCount,
    })
    .from(knowledgeBase)
    .where(and(...whereConditions))
    .orderBy(desc(knowledgeBase.credibility), desc(knowledgeBase.viewCount))
    .limit(limit);

  return {
    sourceContent: { id: source.id, title: source.title, module: source.module },
    recommendations: recommendations.map(item => ({ ...item, relevanceScore: calculateRecommendationScore(source, item) })),
    totalFound: recommendations.length,
  };
}

export async function getSearchStats() {
  const db = await requireDb();

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
    .select({ difficulty: knowledgeBase.difficulty, count: sql<number>`count(*)` })
    .from(knowledgeBase)
    .where(eq(knowledgeBase.isActive, 1))
    .groupBy(knowledgeBase.difficulty);

  return {
    total: totalStats[0]?.total || 0,
    active: totalStats[0]?.active || 0,
    moduleStats,
    difficultyStats,
  };
}
