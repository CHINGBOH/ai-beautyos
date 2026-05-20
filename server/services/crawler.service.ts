/**
 * Crawler Service
 * 爬虫业务逻辑；router 只负责鉴权与参数校验。
 * SSRF 防护集中于此，避免在各 procedure 重复。
 */

import { HtmlCrawler } from "../crawler/html-crawler";
import { PubMedCrawler } from "../crawler/pubmed-crawler";
import { CNKICrawler } from "../crawler/cnki-crawler";
import { MedicalBeautyCrawler } from "../crawler/medical-beauty-crawler";
import { JsonApiCrawler } from "../crawler/json-api-crawler";
import { logger } from "../_core/logger";

// ---------------------------------------------------------------------------
// SSRF guard — must be called before any outbound HTTP request
// ---------------------------------------------------------------------------

export function assertPublicUrl(url: string): void {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname === "0.0.0.0" ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      /^10\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^169\.254\./.test(hostname)
    ) {
      throw new Error(`禁止爬取内网地址: ${hostname}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("禁止爬取")) throw e;
    throw new Error(`无效的 URL: ${url}`);
  }
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function crawlHtml(input: {
  url: string;
  contentSelector?: string;
  titleSelector?: string;
  extractImages?: boolean;
  extractLinks?: boolean;
}) {
  assertPublicUrl(input.url);
  try {
    const crawler = new HtmlCrawler({
      contentSelector: input.contentSelector,
      titleSelector: input.titleSelector,
      extractImages: input.extractImages,
      extractLinks: input.extractLinks,
    });
    const result = await crawler.crawl(input.url);
    return { success: true, data: result };
  } catch (error) {
    logger.error("[Crawler] HTML爬取失败", error);
    throw new Error(`爬取失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function crawlHtmlBatch(input: {
  urls: string[];
  contentSelector?: string;
  titleSelector?: string;
  delay?: number;
}) {
  for (const url of input.urls) assertPublicUrl(url);
  try {
    const crawler = new HtmlCrawler({
      contentSelector: input.contentSelector,
      titleSelector: input.titleSelector,
      delay: input.delay,
    });
    const results = await Promise.all(
      input.urls.map(async (url, index) => {
        if (index > 0 && input.delay) await new Promise(resolve => setTimeout(resolve, input.delay));
        return crawler.crawl(url);
      })
    );
    return { success: true, data: results, count: results.length };
  } catch (error) {
    logger.error("[Crawler] 批量爬取失败", error);
    throw new Error(`批量爬取失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function searchPubMed(input: {
  query: string;
  retmax?: number;
  sort?: "relevance" | "pub_date";
  dateRange?: { start: string; end: string };
}) {
  try {
    const crawler = new PubMedCrawler();
    const articles = await crawler.search(input);
    return { success: true, data: articles, count: articles.length };
  } catch (error) {
    logger.error("[Crawler] PubMed搜索失败", error);
    throw new Error(`搜索失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function crawlPubMed(url: string) {
  assertPublicUrl(url);
  try {
    const crawler = new PubMedCrawler();
    const result = await crawler.crawl(url);
    return { success: true, data: result };
  } catch (error) {
    logger.error("[Crawler] PubMed爬取失败", error);
    throw new Error(`爬取失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function searchCNKI(input: {
  keyword: string;
  searchType?: "主题" | "篇名" | "关键词" | "摘要" | "全文";
  pageSize?: number;
  page?: number;
}) {
  try {
    const crawler = new CNKICrawler();
    const articles = await crawler.search(input);
    return { success: true, data: articles, count: articles.length };
  } catch (error) {
    logger.error("[Crawler] 知网搜索失败", error);
    throw new Error(`搜索失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function crawlCNKI(url: string) {
  assertPublicUrl(url);
  try {
    const crawler = new CNKICrawler();
    const result = await crawler.crawl(url);
    return { success: true, data: result };
  } catch (error) {
    logger.error("[Crawler] 知网爬取失败", error);
    throw new Error(`爬取失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function crawlMedicalBeautyProject(input: {
  url: string;
  config?: {
    contentSelector?: string;
    titleSelector?: string;
    priceSelector?: string;
    effectSelector?: string;
    riskSelector?: string;
  };
}) {
  assertPublicUrl(input.url);
  try {
    const crawler = new MedicalBeautyCrawler();
    if (input.config) {
      crawler.setPageConfig("project", { type: "project", ...input.config });
    }
    const project = await crawler.crawlProject(input.url);
    return { success: true, data: project };
  } catch (error) {
    logger.error("[Crawler] 医美项目爬取失败", error);
    throw new Error(`爬取失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function crawlMedicalBeautyCase(url: string) {
  assertPublicUrl(url);
  try {
    const crawler = new MedicalBeautyCrawler();
    const result = await crawler.crawlCase(url);
    return { success: true, data: result };
  } catch (error) {
    logger.error("[Crawler] 医美案例爬取失败", error);
    throw new Error(`爬取失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function crawlJsonApi(input: {
  url: string;
  baseUrl?: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  dataPath?: string;
}) {
  assertPublicUrl(input.url);
  try {
    const crawler = new JsonApiCrawler({
      baseUrl: input.baseUrl || "",
      headers: input.headers,
      params: input.params,
      dataPath: input.dataPath,
    });
    const result = await crawler.crawl(input.url);
    return { success: true, data: result };
  } catch (error) {
    logger.error("[Crawler] JSON API爬取失败", error);
    throw new Error(`爬取失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}
