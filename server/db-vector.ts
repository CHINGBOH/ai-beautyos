/**
 * 向量数据库操作模块
 * 提供 pgvector 向量搜索和混合搜索功能
 */

import { getDb } from "./db";
import { sql } from "drizzle-orm";
import { logger } from "./_core/logger";
import { generateEmbedding, getEmbeddingService, initializeEmbeddingService } from "./local-embedding";

// OpenAI text-embedding-3-small 的维度
export const EMBEDDING_DIMENSION = 1536;

/**
 * 向量搜索结果类型
 */
export interface VectorSearchResult {
  id: number;
  title: string;
  content: string;
  category: string;
  similarity: number;
  matchType: 'vector' | 'hybrid' | 'text';
}

/**
 * 检查 pgvector 插件是否已安装
 */
export async function checkPgvectorExtension(): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const result = await db.execute(
      sql`SELECT 1 FROM pg_extension WHERE extname = 'vector'`
    );
    
    return result.length > 0;
  } catch (error) {
    logger.error("[Vector] Failed to check pgvector extension:", error);
    return false;
  }
}

/**
 * 启用 pgvector 插件（如果未安装）
 */
export async function enablePgvectorExtension(): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector`);
    logger.info("[Vector] pgvector extension enabled");
    return true;
  } catch (error) {
    logger.error("[Vector] Failed to enable pgvector extension:", error);
    return false;
  }
}

/**
 * 将 embedding 数组转换为 pgvector 格式
 */
function arrayToVector(embedding: number[]): string {
  if (embedding.length !== EMBEDDING_DIMENSION) {
    throw new Error(`Embedding dimension must be ${EMBEDDING_DIMENSION}, got ${embedding.length}`);
  }
  return `[${embedding.join(',')}]`;
}

/**
 * 为知识库条目保存 embedding
 */
export async function saveKnowledgeEmbedding(
  knowledgeId: number, 
  embedding: number[],
  model: string = 'text-embedding-3-small'
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const vectorStr = arrayToVector(embedding);
    
    await db.execute(
      sql`
        UPDATE knowledge_base 
        SET embedding = ${vectorStr}::vector,
            embedding_model = ${model},
            embedding_created_at = NOW()
        WHERE id = ${knowledgeId}
      `
    );
    
    logger.debug(`[Vector] Saved embedding for knowledge ${knowledgeId}`);
  } catch (error) {
    logger.error(`[Vector] Failed to save embedding for knowledge ${knowledgeId}:`, error);
    throw error;
  }
}

/**
 * 纯向量搜索（使用 cosine 相似度）
 */
export async function vectorSearchKnowledge(
  queryEmbedding: number[],
  options: {
    limit?: number;
    threshold?: number;
    category?: string;
    module?: string;
  } = {}
): Promise<VectorSearchResult[]> {
  const { limit = 5, threshold = 0.7, category, module } = options;
  
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    // 检查 pgvector 是否可用
    const isVectorEnabled = await checkPgvectorExtension();
    if (!isVectorEnabled) {
      logger.warn("[Vector] pgvector not enabled, falling back to text search");
      return [];
    }
    
    const vectorStr = arrayToVector(queryEmbedding);
    
    let query = sql`
      SELECT 
        id,
        title,
        content,
        category,
        1 - (embedding <=> ${vectorStr}::vector) as similarity
      FROM knowledge_base
      WHERE 
        embedding IS NOT NULL 
        AND is_active = 1
        AND 1 - (embedding <=> ${vectorStr}::vector) >= ${threshold}
    `;
    
    // 添加过滤条件
    if (category) {
      query = sql`${query} AND category = ${category}`;
    }
    if (module) {
      query = sql`${query} AND module = ${module}`;
    }
    
    query = sql`
      ${query}
      ORDER BY embedding <=> ${vectorStr}::vector
      LIMIT ${limit}
    `;
    
    const results = await db.execute(query);
    
    return results.map(row => ({
      id: row.id as number,
      title: row.title as string,
      content: row.content as string,
      category: row.category as string,
      similarity: row.similarity as number,
      matchType: 'vector' as const
    }));
    
  } catch (error) {
    logger.error("[Vector] Vector search failed:", error);
    return [];
  }
}

/**
 * 混合搜索（向量 + 文本）
 */
export async function hybridSearchKnowledge(
  queryText: string,
  queryEmbedding?: number[],
  options: {
    limit?: number;
    vectorWeight?: number; // 0.0 - 1.0
    textWeight?: number;   // 0.0 - 1.0
    category?: string;
  } = {}
): Promise<VectorSearchResult[]> {
  const { 
    limit = 10, 
    vectorWeight = 0.4, 
    textWeight = 0.6,
    category 
  } = options;
  
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const isVectorEnabled = await checkPgvectorExtension();
    const hasEmbedding = queryEmbedding && queryEmbedding.length === EMBEDDING_DIMENSION;
    
    let query: ReturnType<typeof sql>;
    
    if (isVectorEnabled && hasEmbedding) {
      // 使用向量 + 文本混合搜索
      const vectorStr = arrayToVector(queryEmbedding);
      
      query = sql`
        SELECT 
          id,
          title,
          content,
          category,
          -- 文本相似度分数
          CASE 
            WHEN title ILIKE ${'%' + queryText + '%'} THEN 1.0
            WHEN content ILIKE ${'%' + queryText + '%'} THEN 0.7
            ELSE GREATEST(similarity(title, ${queryText}) * 0.8, similarity(content, ${queryText}) * 0.2)
          END as text_score,
          -- 向量相似度分数
          COALESCE(1 - (embedding <=> ${vectorStr}::vector), 0) as vector_score,
          -- 综合分数
          (
            CASE 
              WHEN title ILIKE ${'%' + queryText + '%'} THEN 1.0
              WHEN content ILIKE ${'%' + queryText + '%'} THEN 0.7 
              ELSE GREATEST(similarity(title, ${queryText}) * 0.8, similarity(content, ${queryText}) * 0.2)
            END * ${textWeight} +
            COALESCE(1 - (embedding <=> ${vectorStr}::vector), 0) * ${vectorWeight}
          ) as combined_score
        FROM knowledge_base
        WHERE 
          is_active = 1
          AND (
            title ILIKE ${'%' + queryText + '%'} OR
            content ILIKE ${'%' + queryText + '%'} OR
            title % ${queryText} OR
            embedding IS NOT NULL
          )
      `;
    } else {
      // 纯文本搜索
      query = sql`
        SELECT 
          id,
          title,
          content,
          category,
          CASE 
            WHEN title ILIKE ${'%' + queryText + '%'} THEN 1.0
            WHEN content ILIKE ${'%' + queryText + '%'} THEN 0.7
            ELSE GREATEST(similarity(title, ${queryText}), similarity(content, ${queryText}))
          END as text_score,
          0 as vector_score,
          CASE 
            WHEN title ILIKE ${'%' + queryText + '%'} THEN 1.0
            WHEN content ILIKE ${'%' + queryText + '%'} THEN 0.7
            ELSE GREATEST(similarity(title, ${queryText}), similarity(content, ${queryText}))
          END as combined_score
        FROM knowledge_base
        WHERE 
          is_active = 1
          AND (
            title ILIKE ${'%' + queryText + '%'} OR
            content ILIKE ${'%' + queryText + '%'} OR
            title % ${queryText}
          )
      `;
    }
    
    // 添加过滤条件
    if (category) {
      query = sql`${query} AND category = ${category}`;
    }
    
    query = sql`
      ${query}
      ORDER BY combined_score DESC
      LIMIT ${limit}
    `;
    
    const results = await db.execute(query);
    
    return results.map(row => ({
      id: row.id as number,
      title: row.title as string,
      content: row.content as string,
      category: row.category as string,
      similarity: row.combined_score as number,
      matchType: (hasEmbedding && isVectorEnabled) ? 'hybrid' : 'text' as const
    }));
    
  } catch (error) {
    logger.error("[Vector] Hybrid search failed:", error);
    return [];
  }
}

/**
 * 获取知识库 embedding 统计信息
 */
export async function getEmbeddingStats(): Promise<{
  total: number;
  withEmbedding: number;
  coverage: number;
  avgDimension: number;
}> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const result = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(embedding) as with_embedding,
        ROUND(COUNT(embedding)::decimal / COUNT(*) * 100, 2) as coverage,
        COALESCE(AVG(array_length(embedding, 1)), 0) as avg_dimension
      FROM knowledge_base 
      WHERE is_active = 1
    `);
    
    const row = result[0];
    return {
      total: row.total as number,
      withEmbedding: row.with_embedding as number, 
      coverage: row.coverage as number,
      avgDimension: row.avg_dimension as number
    };
    
  } catch (error) {
    logger.error("[Vector] Failed to get embedding stats:", error);
    return { total: 0, withEmbedding: 0, coverage: 0, avgDimension: 0 };
  }
}

/**
 * 批量保存 embeddings
 */
export async function batchSaveEmbeddings(
  embeddings: Array<{ 
    knowledgeId: number; 
    embedding: number[]; 
    model?: string 
  }>
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;
  
  for (const item of embeddings) {
    try {
      await saveKnowledgeEmbedding(
        item.knowledgeId, 
        item.embedding, 
        item.model
      );
      success++;
    } catch (error) {
      logger.error(`[Vector] Failed to save embedding for ${item.knowledgeId}:`, error);
      failed++;
    }
  }
  
  logger.info(`[Vector] Batch save completed: ${success} success, ${failed} failed`);
  return { success, failed };
}

/**
 * 检查数据库向量支持状态
 */
export async function getVectorSupport(): Promise<{
  hasExtension: boolean;
  hasEmbeddingColumn: boolean;
  totalEmbeddings: number;
  recommendations: string[];
}> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    // 检查插件
    const hasExtension = await checkPgvectorExtension();
    
    // 检查 embedding 列
    const columnCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'knowledge_base' 
      AND column_name = 'embedding'
    `);
    const hasEmbeddingColumn = columnCheck.length > 0;
    
    // 统计 embeddings
    const stats = await getEmbeddingStats();
    
    const recommendations = [];
    if (!hasExtension) {
      recommendations.push("需要执行: CREATE EXTENSION IF NOT EXISTS vector;");
    }
    if (!hasEmbeddingColumn) {
      recommendations.push("需要执行: ALTER TABLE knowledge_base ADD COLUMN embedding vector(1536);");
    }
    if (stats.coverage < 50) {
      recommendations.push("建议为更多知识库条目生成 embeddings，当前覆盖率仅 " + stats.coverage + "%");
    }
    
    return {
      hasExtension,
      hasEmbeddingColumn,
      totalEmbeddings: stats.withEmbedding,
      recommendations
    };
    
  } catch (error) {
    logger.error("[Vector] Failed to check vector support:", error);
    return {
      hasExtension: false,
      hasEmbeddingColumn: false,
      totalEmbeddings: 0,
      recommendations: ["数据库连接失败，请检查数据库状态"]
    };
  }
}