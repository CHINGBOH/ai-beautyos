/**
 * 知网（CNKI）爬虫
 * 爬取知网上的中文学术论文
 * 注意：知网需要登录，这里提供基础框架，实际使用时需要处理登录和验证码
 */

import { HtmlCrawler } from "./html-crawler";
import { BaseCrawler, CrawledData } from "./base-crawler";
import { logger } from "../_core/logger";

export interface CNKISearchOptions {
  /** 搜索关键词 */
  keyword: string;
  /** 搜索类型：主题、篇名、关键词、摘要等 */
  searchType?: "主题" | "篇名" | "关键词" | "摘要" | "全文";
  /** 返回数量 */
  pageSize?: number;
  /** 页码 */
  page?: number;
}

export interface CNKIArticle {
  /** 标题 */
  title: string;
  /** 作者 */
  authors: string[];
  /** 机构 */
  institutions: string[];
  /** 摘要 */
  abstract: string;
  /** 关键词 */
  keywords: string[];
  /** 期刊/会议 */
  journal: string;
  /** 发表时间 */
  publishDate: string;
  /** 下载次数 */
  downloadCount?: number;
  /** 被引次数 */
  citeCount?: number;
  /** 链接 */
  url: string;
}

export class CNKICrawler extends BaseCrawler {
  private htmlCrawler: HtmlCrawler;

  constructor() {
    super({
      delay: 3000, // 知网需要更长的延迟
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    });
    this.htmlCrawler = new HtmlCrawler({
      contentSelector: ".main-content, .article-content, .content",
      titleSelector: "h1, .title, .article-title",
      extractImages: false,
    });
  }

  /**
   * 搜索论文
   * 注意：知网搜索需要登录，这里提供基础框架
   */
  async search(options: CNKISearchOptions): Promise<CNKIArticle[]> {
    logger.info(`[CNKICrawler] 搜索: ${options.keyword}`);

    // 知网搜索URL（示例，实际URL可能不同）
    const searchUrl = "https://kns.cnki.net/kns8/defaultresult/index";
    const params = new URLSearchParams({
      kw: options.keyword,
      S: options.searchType || "主题",
      pageSize: String(options.pageSize || 20),
      page: String(options.page || 1),
    });

    try {
      const html = await this.fetchHtml(`${searchUrl}?${params.toString()}`);
      return this.parseSearchResults(html);
    } catch (error) {
      logger.error("[CNKICrawler] 搜索失败", error);
      throw new Error(`知网搜索失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 解析搜索结果页面
   */
  private parseSearchResults(html: string): CNKIArticle[] {
    // 这里需要根据知网的实际HTML结构来解析
    // 由于知网页面结构复杂且可能变化，这里提供基础框架
    const articles: CNKIArticle[] = [];

    // 使用正则或cheerio解析（简化示例）
    // 实际实现需要：
    // 1. 使用cheerio加载HTML
    // 2. 找到论文列表容器
    // 3. 提取每篇论文的信息

    logger.warn("[CNKICrawler] 解析搜索结果需要根据实际页面结构调整");

    return articles;
  }

  /**
   * 爬取单篇论文详情
   */
  async crawl(url: string): Promise<CrawledData> {
    logger.info(`[CNKICrawler] 爬取: ${url}`);

    try {
      // 使用HTML爬虫获取基础内容
      const data = await this.htmlCrawler.crawl(url);

      // 提取知网特定的元数据
      const html = await this.fetchHtml(url);
      const metadata = this.extractCNKIMetadata(html);

      return {
        ...data,
        metadata: {
          ...data.metadata,
          ...metadata,
          source: "CNKI",
        },
      };
    } catch (error) {
      logger.error("[CNKICrawler] 爬取失败", error);
      throw error;
    }
  }

  /**
   * 提取知网特定的元数据
   */
  private extractCNKIMetadata(html: string): Record<string, unknown> {
    const metadata: Record<string, unknown> = {};

    // 提取作者
    const authorMatch = html.match(/作者[：:]\s*([^<\n]+)/);
    if (authorMatch) {
      metadata.authors = authorMatch[1].split(/[，,、]/).map((a) => a.trim());
    }

    // 提取机构
    const institutionMatch = html.match(/机构[：:]\s*([^<\n]+)/);
    if (institutionMatch) {
      metadata.institutions = institutionMatch[1].split(/[；;]/).map((i) => i.trim());
    }

    // 提取关键词
    const keywordMatch = html.match(/关键词[：:]\s*([^<\n]+)/);
    if (keywordMatch) {
      metadata.keywords = keywordMatch[1].split(/[；;、]/).map((k) => k.trim());
    }

    // 提取发表时间
    const dateMatch = html.match(/发表时间[：:]\s*(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      metadata.publishDate = dateMatch[1];
    }

    return metadata;
  }
}
