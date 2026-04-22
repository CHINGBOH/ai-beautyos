#!/usr/bin/env tsx
/**
 * 网络资料爬取并入库
 * 读配置 → HTML/PubMed/CNKI 抓取 → 去重 → 模块映射 → 写入 knowledge_base
 */

import "dotenv/config";
import { getDb } from "../server/db";
import { knowledgeBase } from "../drizzle/schema";
import { KNOWLEDGE_MODULES } from "../shared/knowledge-modules";
import type { KnowledgeModule } from "../shared/knowledge-modules";
import { HtmlCrawler } from "../server/crawler/html-crawler";
import { PubMedCrawler } from "../server/crawler/pubmed-crawler";
import { CNKICrawler } from "../server/crawler/cnki-crawler";
import type { CrawledData } from "../server/crawler/base-crawler";
import {
  flattenUrlSources,
  PUBMED_SOURCES,
  PUBMED_SOURCES_PREMIUM,
  CNKI_SOURCES,
  CNKI_SOURCES_PREMIUM,
  KEYWORD_TO_MODULE,
  CRAWL_DELAY_MS,
} from "./config/crawl-sources";
import type { PubMedSourceConfig, CNKISourceConfig } from "./config/crawl-sources";
import { logger } from "../server/_core/logger";

export interface UnifiedCrawledItem {
  title: string;
  content: string;
  url: string;
  sourceType: "html" | "pubmed" | "cnki";
  module?: KnowledgeModule;
  category?: string;
  metadata?: Record<string, unknown>;
  credibility?: number;
  tier?: "premium";
  positioning?: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** 从标题+内容用关键词映射到模块 */
function mapModuleByKeyword(title: string, content: string): KnowledgeModule {
  const text = `${title} ${content}`.toLowerCase();
  for (const [keyword, module] of Object.entries(KEYWORD_TO_MODULE)) {
    if (text.includes(keyword.toLowerCase())) return module;
  }
  return KNOWLEDGE_MODULES.AESTHETICS;
}

/** 生成摘要（前 N 字） */
function summary(content: string, maxLen = 200): string {
  const t = content.trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen) + "...";
}

/** 从 DB 已存在的 sources 中提取 URL 集合（用于去重） */
async function getExistingUrls(): Promise<Set<string>> {
  const db = await getDb();
  if (!db) return new Set();
  const rows = await db.select({ sources: knowledgeBase.sources }).from(knowledgeBase);
  const urls = new Set<string>();
  for (const row of rows) {
    if (!row.sources) continue;
    try {
      const arr = JSON.parse(row.sources) as Array<{ url?: string }>;
      if (Array.isArray(arr)) for (const o of arr) if (o?.url) urls.add(o.url);
    } catch {
      // ignore invalid JSON
    }
  }
  return urls;
}

/** 1. 抓取 HTML URL 列表 */
async function crawlHtmlSources(): Promise<UnifiedCrawledItem[]> {
  const items = flattenUrlSources();
  if (items.length === 0) {
    logger.info("[Crawl] 未配置 HTML URL，跳过");
    return [];
  }
  const results: UnifiedCrawledItem[] = [];
  const crawler = new HtmlCrawler({ delay: CRAWL_DELAY_MS });
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    try {
      const data = await crawler.crawl(item.url);
      results.push({
        title: data.title,
        content: data.content,
        url: data.url,
        sourceType: "html",
        module: item.module,
        category: item.category,
        metadata: data.metadata,
        credibility: item.credibility,
        tier: item.tier,
        positioning: item.positioning,
      });
      logger.info(`[Crawl] HTML ${i + 1}/${items.length}: ${data.title.slice(0, 40)}...`);
    } catch (e) {
      logger.warn(`[Crawl] HTML 失败 ${item.url}: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (i < items.length - 1) await delay(CRAWL_DELAY_MS);
  }
  return results;
}

/** 2. 抓取 PubMed（普通 + 高端检索词合并） */
async function crawlPubMedSources(): Promise<UnifiedCrawledItem[]> {
  const results: UnifiedCrawledItem[] = [];
  const crawler = new PubMedCrawler({ delay: CRAWL_DELAY_MS });
  const allConfigs: PubMedSourceConfig[] = [...PUBMED_SOURCES, ...PUBMED_SOURCES_PREMIUM];
  for (const config of allConfigs) {
    try {
      const articles = await crawler.search({
        query: config.query,
        retmax: config.retmax,
        sort: "relevance",
      });
      for (const article of articles) {
        try {
          const detail = await crawler.crawl(article.pmid);
          const url = `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`;
          results.push({
            title: detail.title,
            content: detail.content,
            url,
            sourceType: "pubmed",
            category: "学术研究",
            metadata: detail.metadata,
            credibility: config.credibility,
            tier: config.tier,
          });
          await delay(CRAWL_DELAY_MS);
        } catch {
          // skip single article failure
        }
      }
    } catch (e) {
      logger.warn(`[Crawl] PubMed 搜索失败 "${config.query}": ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return results;
}

/** 3. 抓取 CNKI（普通 + 高端检索词合并，搜索可能返回空则保留流程） */
async function crawlCNKISources(): Promise<UnifiedCrawledItem[]> {
  const results: UnifiedCrawledItem[] = [];
  const crawler = new CNKICrawler();
  const allConfigs: CNKISourceConfig[] = [...CNKI_SOURCES, ...CNKI_SOURCES_PREMIUM];
  for (const config of allConfigs) {
    try {
      const articles = await crawler.search({
        keyword: config.query,
        pageSize: config.retmax,
      });
      for (const article of articles) {
        if (!article.url) continue;
        try {
          const data = await crawler.crawl(article.url);
          results.push({
            title: data.title,
            content: data.content,
            url: data.url,
            sourceType: "cnki",
            category: "学术研究",
            metadata: data.metadata,
            credibility: config.credibility,
            tier: config.tier,
          });
          await delay(CRAWL_DELAY_MS);
        } catch {
          // skip
        }
      }
    } catch (e) {
      logger.warn(`[Crawl] CNKI 搜索失败 "${config.query}": ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return results;
}

/** 去重：已有 URL + 当次运行内按 URL 去重 */
function dedup(items: UnifiedCrawledItem[], existingUrls: Set<string>): UnifiedCrawledItem[] {
  const seen = new Set<string>(existingUrls);
  const out: UnifiedCrawledItem[] = [];
  for (const item of items) {
    const u = item.url.trim();
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(item);
  }
  return out;
}

/** 为未指定 module 的项做关键词映射 */
function mapModules(items: UnifiedCrawledItem[]): UnifiedCrawledItem[] {
  return items.map((item) => {
    if (item.module) return item;
    return { ...item, module: mapModuleByKeyword(item.title, item.content) };
  });
}

/** 格式化内容为知识库正文 */
function formatContent(item: UnifiedCrawledItem): string {
  if (item.sourceType === "pubmed" && item.metadata) {
    const m = item.metadata as { authors?: string[]; journal?: string; publicationDate?: string; doi?: string };
    let s = `# ${item.title}\n\n`;
    if (m.authors?.length) s += `**作者**: ${m.authors.join(", ")}\n\n`;
    if (m.journal) s += `**期刊**: ${m.journal}\n\n`;
    if (m.publicationDate) s += `**发表日期**: ${m.publicationDate}\n\n`;
    if (m.doi) s += `**DOI**: ${m.doi}\n\n`;
    s += `## 摘要\n\n${item.content}\n\n## 来源\n\n- 原文链接: ${item.url}\n`;
    return s;
  }
  return `# ${item.title}\n\n${item.content}\n\n## 来源\n\n- ${item.url}\n`;
}

/** 批量插入 knowledge_base */
async function insertIntoDb(items: UnifiedCrawledItem[]): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("数据库不可用");
  let order = 0;
  let inserted = 0;
  for (const item of items) {
    const module = item.module ?? KNOWLEDGE_MODULES.AESTHETICS;
    const category = item.category ?? "网络资料";
    try {
      await db.insert(knowledgeBase).values({
        title: item.title.slice(0, 255),
        content: formatContent(item),
        summary: summary(item.content),
        category,
        module,
        level: 1,
        parentId: null,
        path: null,
        order: order++,
        type: "customer",
        isActive: 1,
        credibility: item.credibility ?? (item.sourceType === "pubmed" ? 8 : 6),
        difficulty: "intermediate",
        sources: JSON.stringify([
          {
            type: item.sourceType,
            url: item.url,
            title: item.title,
            crawledAt: new Date().toISOString(),
            ...(item.tier && { tier: item.tier }),
            ...(item.positioning && { positioning: item.positioning }),
          },
        ]),
      });
      inserted++;
      logger.info(`[Import] ${inserted}: ${item.title.slice(0, 50)}...`);
    } catch (e) {
      logger.error(`[Import] 失败 ${item.title.slice(0, 30)}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return inserted;
}

async function main() {
  logger.info("[Crawl] 开始网络资料爬取与入库...");
  const db = await getDb();
  if (!db) {
    logger.error("[Crawl] 数据库未配置或连接失败");
    process.exit(1);
  }

  const existingUrls = await getExistingUrls();
  logger.info(`[Crawl] 已有 ${existingUrls.size} 条来源 URL，将跳过重复`);

  const htmlItems = await crawlHtmlSources();
  const pubmedItems = await crawlPubMedSources();
  const cnkiItems = await crawlCNKISources();

  const combined = [...htmlItems, ...pubmedItems, ...cnkiItems];
  const afterDedup = dedup(combined, existingUrls);
  const afterMap = mapModules(afterDedup);

  logger.info(`[Crawl] 抓取 ${combined.length} 条，去重后 ${afterDedup.length} 条`);
  if (afterMap.length === 0) {
    logger.info("[Crawl] 无新数据需要入库");
    return;
  }

  const inserted = await insertIntoDb(afterMap);
  logger.info(`[Crawl] 入库完成，新增 ${inserted} 条`);
}

main().catch((e) => {
  logger.error("[Crawl] 执行失败", e);
  process.exit(1);
});
