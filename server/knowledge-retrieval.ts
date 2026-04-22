/**
 * 增强型知识检索模块
 * 支持：1) pgvector向量搜索（如果可用） 2) 增强关键词匹配（TF-IDF风格） 3) 混合搜索
 */

import { getDb, getActiveKnowledge } from "./db";
import { logger } from "./_core/logger";
import { 
  vectorSearchKnowledge, 
  hybridSearchKnowledge, 
  checkPgvectorExtension,
  VectorSearchResult 
} from "./db-vector";
import { generateEmbedding } from "./_core/embeddings";

// 医美领域同义词映射
const SYNONYM_MAP: Record<string, string[]> = {
  "祛斑": ["祛斑", "超皮秒", "皮秒", "激光祛斑", "色素", "色斑", "雀斑", "黄褐斑", "晒斑"],
  "美白": ["美白", "嫩肤", "亮肤", "肤色", "暗沉", "去黄"],
  "抗衰": ["抗衰", "除皱", "紧致", "热玛吉", "超声刀", "线雕", "提升", "皱纹", "松弛"],
  "补水": ["补水", "水光", "保湿", "干燥", "水润"],
  "瘦脸": ["瘦脸", "瘦脸针", "咬肌", "V脸", "轮廓"],
  "填充": ["填充", "玻尿酸", "法令纹", "泪沟", "苹果肌", "凹陷"],
  "痘痘": ["痘痘", "痤疮", "祛痘", "痘印", "痘坑", "闭口"],
  "毛孔": ["毛孔", "毛孔粗大", "收缩毛孔", "细腻"],
  "眼部": ["眼部", "眼袋", "黑眼圈", "眼周", "眼纹"],
  "价格": ["价格", "费用", "多少钱", "贵不贵", "预算", "花费", "收费"],
  "效果": ["效果", "功效", "作用", "怎么样", "好不好", "明显"],
  "恢复": ["恢复", "恢复期", "多久", "时间", "疗程", "间隔"],
  "疼痛": ["疼痛", "疼不疼", "痛不痛", "难受", "不舒服", "感觉"],
};

// 停用词
const STOP_WORDS = new Set([
  "的", "了", "在", "是", "我", "有", "和", "就", "不", "人", "都", "一", "一个", "上", "也",
  "很", "到", "说", "要", "去", "你", "会", "着", "没有", "看", "好", "自己", "这", "那",
  "想", "什么", "吗", "呢", "吧", "啊", "哦", "嗯", "想", "问问", "咨询", "一下"
]);

/**
 * 提取关键词（包含同义词扩展）
 */
function extractKeywords(query: string): string[] {
  const tokens = query.toLowerCase()
    .replace(/[，。？！；：""''（）【】]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));
  
  const expanded = new Set<string>();
  
  for (const token of tokens) {
    expanded.add(token);
    // 添加同义词
    for (const [concept, synonyms] of Object.entries(SYNONYM_MAP)) {
      if (synonyms.includes(token) || token.includes(concept)) {
        synonyms.forEach(s => expanded.add(s));
      }
    }
  }
  
  return Array.from(expanded);
}

/**
 * 计算文本相似度分数（TF-IDF风格）
 */
function calculateRelevanceScore(
  query: string,
  knowledge: { title: string; content: string; tags?: string | null }
): number {
  const keywords = extractKeywords(query);
  if (keywords.length === 0) return 0;
  
  let score = 0;
  const queryText = query.toLowerCase();
  const titleLower = knowledge.title.toLowerCase();
  const contentLower = knowledge.content.toLowerCase();
  const tags = knowledge.tags?.toLowerCase().split(",") || [];
  
  for (const keyword of keywords) {
    // 标题匹配（权重高）
    if (titleLower.includes(keyword)) {
      score += 3;
      if (titleLower === keyword) score += 2; // 完全匹配
    }
    
    // 标签匹配（权重很高）
    if (tags.some(t => t.includes(keyword))) {
      score += 4;
    }
    
    // 内容匹配（权重较低）
    const contentMatches = (contentLower.match(new RegExp(keyword, "g")) || []).length;
    score += Math.min(contentMatches * 0.5, 2); // 上限2分
    
    // 开头匹配额外加分
    if (contentLower.startsWith(keyword) || contentLower.indexOf(keyword) < 50) {
      score += 1;
    }
  }
  
  // 语义关联加分
  if (queryText.includes("疼") && contentLower.includes("无痛")) score += 2;
  if (queryText.includes("贵") && contentLower.includes("性价比")) score += 2;
  if (queryText.includes("怕") && contentLower.includes("安全")) score += 2;
  
  return score;
}

/**
 * 增强型知识检索（向量搜索优先 + 关键词兜底）
 */
export async function searchKnowledge(
  query: string,
  options: {
    limit?: number;
    minScore?: number;
    category?: string;
    forceTextSearch?: boolean; // 强制使用文本搜索
    queryEmbedding?: number[]; // 可选的预计算embedding
  } = {}
): Promise<Array<{
  id: number;
  title: string;
  content: string;
  category: string;
  relevanceScore: number;
  matchType: "exact" | "semantic" | "related" | "vector" | "hybrid";
}>> {
  const { limit = 3, minScore = 1, category, forceTextSearch = false, queryEmbedding } = options;
  
  try {
    // 1. 优先尝试向量搜索（如果可用且未强制文本搜索）
    if (!forceTextSearch) {
      const isVectorEnabled = await checkPgvectorExtension();
      
      if (isVectorEnabled && queryEmbedding) {
        logger.debug("[Knowledge] Using vector search");
        
        const vectorResults = await vectorSearchKnowledge(queryEmbedding, {
          limit: limit * 2, // 获取更多结果以便过滤
          threshold: 0.6,
          category
        });
        
        if (vectorResults.length > 0) {
          return vectorResults.slice(0, limit).map(item => ({
            id: item.id,
            title: item.title,  
            content: item.content,
            category: item.category,
            relevanceScore: item.similarity * 10, // 转换到0-10分制
            matchType: "vector" as const
          }));
        }
      } else if (isVectorEnabled && !queryEmbedding) {
        logger.debug("[Knowledge] Using hybrid search (no embedding provided)");
        
        // 混合搜索（文本 + 向量，如果有embedding）
        const hybridResults = await hybridSearchKnowledge(query, undefined, {
          limit: limit,
          category
        });
        
        if (hybridResults.length > 0) {
          return hybridResults.map(item => ({
            id: item.id,
            title: item.title,
            content: item.content,
            category: item.category,
            relevanceScore: item.similarity * 10,
            matchType: item.matchType === 'hybrid' ? 'hybrid' : 'semantic' as const
          }));
        }
      }
    }
    
    // 2. 兜底到增强关键词搜索
    logger.debug("[Knowledge] Falling back to enhanced keyword search");
    
    // 获取知识库（使用缓存或数据库）
    const knowledgeItems = await getActiveKnowledge(category);
    
    // 计算相关性分数
    const scored = knowledgeItems.map(item => ({
      id: item.id,
      title: item.title,
      content: item.content,
      category: item.category,
      tags: item.tags,
      relevanceScore: calculateRelevanceScore(query, item),
    }));
    
    // 排序并过滤
    const filtered = scored
      .filter(item => item.relevanceScore >= minScore)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
    
    // 确定匹配类型
    return filtered.map(item => {
      const queryLower = query.toLowerCase();
      const titleLower = item.title.toLowerCase();
      let matchType: "exact" | "semantic" | "related" = "related";
      
      if (titleLower.includes(queryLower) || queryLower.includes(titleLower)) {
        matchType = "exact";
      } else if (item.relevanceScore > 5) {
        matchType = "semantic";
      }
      
      return {
        id: item.id,
        title: item.title,
        content: item.content,
        category: item.category,
        relevanceScore: item.relevanceScore,
        matchType,
      };
    });
  } catch (error) {
    logger.error("[Knowledge Retrieval] Search failed:", error);
    return [];
  }
}

/**
 * 批量检索（支持多个查询词）
 */
export async function searchKnowledgeBatch(
  queries: string[],
  options: { limit?: number; minScore?: number } = {}
): Promise<Map<string, ReturnType<typeof searchKnowledge> extends Promise<infer T> ? T : never>> {
  const results = new Map();
  
  await Promise.all(
    queries.map(async query => {
      const items = await searchKnowledge(query, options);
      results.set(query, items);
    })
  );
  
  return results;
}

/**
 * 智能知识检索（用于聊天上下文）
 * 根据对话历史动态调整检索策略
 */
export async function searchKnowledgeForChat(
  currentMessage: string,
  history: Array<{ role: string; content: string }>,
  options: { limit?: number } = {}
): Promise<{
  items: Awaited<ReturnType<typeof searchKnowledge>>;
  usedKnowledgeIds: number[];
  context: string;
}> {
  const { limit = 3 } = options;
  
  // 构建上下文感知的查询
  const recentMessages = history.slice(-3).map(h => h.content).join(" ");
  const enrichedQuery = `${recentMessages} ${currentMessage}`.slice(-200); // 限制长度
  
  // 提取关键意图
  const intentKeywords = extractKeywords(enrichedQuery);
  logger.debug("[Knowledge Retrieval] Intent keywords:", intentKeywords);
  
  // 执行搜索
  const items = await searchKnowledge(enrichedQuery, { limit, minScore: 0.5 });
  
  // 构建上下文
  const usedKnowledgeIds = items.map(i => i.id);
  let context = "";
  
  if (items.length > 0) {
    context = "\n\n参考知识库：\n" + items.map((k, idx) => {
      const relevance = k.relevanceScore > 5 ? "[高相关]" : "[相关]";
      return `${relevance}【${k.title}】\n${k.content.slice(0, 500)}${k.content.length > 500 ? "..." : ""}`;
    }).join("\n\n");
  }
  
  return { items, usedKnowledgeIds, context };
}

/**
 * 检查是否需要知识库支持
 * 用于优化：某些简单问候不需要检索
 */
export function shouldUseKnowledge(query: string): boolean {
  const greetings = ["你好", "您好", "在吗", "哈喽", "hi", "hello", "请问"];
  const queryLower = query.toLowerCase().trim();
  
  // 纯问候语不需要知识库
  if (greetings.some(g => queryLower === g)) return false;
  
  // 短消息（<5字）通常不需要
  if (queryLower.length < 5) return false;
  
  return true;
}

/**
 * 智能搜索（自动生成embedding + 向量搜索优先）
 * 这是推荐的主要搜索接口，会自动选择最佳搜索策略
 */
export async function intelligentSearch(
  query: string,
  options: {
    limit?: number;
    category?: string;
    forceTextSearch?: boolean;
    enableEmbedding?: boolean; // 是否启用embedding生成
  } = {}
): Promise<Array<{
  id: number;
  title: string;
  content: string;
  category: string;
  relevanceScore: number;
  matchType: "exact" | "semantic" | "related" | "vector" | "hybrid";
  searchStrategy: string; // 记录使用的搜索策略
}>> {
  const { 
    limit = 3, 
    category, 
    forceTextSearch = false,
    enableEmbedding = true 
  } = options;
  
  let searchStrategy = "unknown";
  
  try {
    // 1. 检查是否需要知识库
    if (!shouldUseKnowledge(query)) {
      logger.debug("[Intelligent Search] Query too simple, skipping knowledge retrieval");
      return [];
    }
    
    // 2. 尝试生成embedding用于向量搜索
    let queryEmbedding: number[] | undefined;
    
    if (!forceTextSearch && enableEmbedding) {
      try {
        const embeddingResult = await generateEmbedding(query);
        queryEmbedding = embeddingResult.embedding;
        searchStrategy = `vector-${embeddingResult.provider}-${embeddingResult.model}`;
        logger.debug(`[Intelligent Search] Generated embedding using ${embeddingResult.provider}/${embeddingResult.model}`);
      } catch (error) {
        logger.warn("[Intelligent Search] Failed to generate embedding, falling back to text search:", error);
        searchStrategy = "text-fallback-embedding-failed";
      }
    } else if (forceTextSearch) {
      searchStrategy = "text-forced";
    } else {
      searchStrategy = "text-no-embedding";
    }
    
    // 3. 执行搜索
    const results = await searchKnowledge(query, {
      limit,
      category,
      forceTextSearch,
      queryEmbedding,
      minScore: queryEmbedding ? 0.6 : 1 // 向量搜索可以降低阈值
    });
    
    // 4. 添加搜索策略信息
    return results.map(item => ({
      ...item,
      searchStrategy
    }));
    
  } catch (error) {
    logger.error("[Intelligent Search] Search failed:", error);
    return [];
  }
}

/**
 * 增强的聊天知识检索（集成向量搜索）
 */
export async function searchKnowledgeForChatEnhanced(
  currentMessage: string,
  history: Array<{ role: string; content: string }>,
  options: { limit?: number; category?: string } = {}
): Promise<{
  items: Awaited<ReturnType<typeof intelligentSearch>>;
  usedKnowledgeIds: number[];
  context: string;
  searchStrategy: string;
}> {
  const { limit = 3, category } = options;
  
  // 构建上下文感知的查询
  const recentMessages = history.slice(-3).map(h => h.content).join(" ");
  const enrichedQuery = `${recentMessages} ${currentMessage}`.slice(-200);
  
  // 使用智能搜索
  const items = await intelligentSearch(enrichedQuery, { 
    limit, 
    category,
    enableEmbedding: true 
  });
  
  // 构建上下文
  const usedKnowledgeIds = items.map(i => i.id);
  const searchStrategy = items.length > 0 ? items[0].searchStrategy : "no-results";
  
  let context = "";
  if (items.length > 0) {
    context = "\n\n参考知识库：\n" + items.map((k, idx) => {
      const relevance = k.relevanceScore > 7 ? "[高相关]" : 
                       k.relevanceScore > 4 ? "[相关]" : "[低相关]";
      const strategy = k.matchType === "vector" ? "[向量]" : 
                      k.matchType === "hybrid" ? "[混合]" : "[文本]";
      return `${relevance}${strategy}【${k.title}】\n${k.content.slice(0, 400)}${k.content.length > 400 ? "..." : ""}`;
    }).join("\n\n");
  }
  
  return { items, usedKnowledgeIds, context, searchStrategy };
}
