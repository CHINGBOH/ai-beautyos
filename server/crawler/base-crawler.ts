/**
 * 基础爬虫类
 * 使用统一的HTTP服务和日志系统
 */

import { httpRequest, httpJson } from "../_core/http-service";
import { logger } from "../_core/logger";

export interface CrawlerConfig {
  /** 爬取间隔（毫秒），避免请求过快 */
  delay?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** User-Agent */
  userAgent?: string;
  /** 请求超时时间（毫秒） */
  timeout?: number;
}

export interface CrawledData {
  /** 来源URL */
  url: string;
  /** 标题 */
  title: string;
  /** 内容 */
  content: string;
  /** 元数据 */
  metadata?: Record<string, unknown>;
  /** 爬取时间 */
  crawledAt: Date;
}

export abstract class BaseCrawler {
  protected config: Required<CrawlerConfig>;

  constructor(config: CrawlerConfig = {}) {
    this.config = {
      delay: config.delay ?? 2000, // 默认2秒间隔
      maxRetries: config.maxRetries ?? 3,
      userAgent: config.userAgent ?? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      timeout: config.timeout ?? 30000,
    };
  }

  /**
   * 爬取单个URL
   */
  abstract crawl(url: string): Promise<CrawledData>;

  /**
   * 批量爬取URLs
   */
  async crawlBatch(urls: string[]): Promise<CrawledData[]> {
    const results: CrawledData[] = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      try {
        logger.info(`[Crawler] 爬取 ${i + 1}/${urls.length}: ${url}`);
        const data = await this.crawl(url);
        results.push(data);

        // 延迟，避免请求过快
        if (i < urls.length - 1) {
          await this.delay(this.config.delay);
        }
      } catch (error) {
        logger.error(`[Crawler] 爬取失败: ${url}`, error);
        // 继续爬取下一个，不中断整个流程
      }
    }

    return results;
  }

  /**
   * 延迟函数
   */
  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 获取HTML内容
   */
  protected async fetchHtml(url: string): Promise<string> {
    const response = await httpRequest(url, {
      headers: {
        "User-Agent": this.config.userAgent,
      },
      timeout: this.config.timeout,
      retries: this.config.maxRetries,
    });

    return await response.text();
  }

  /**
   * 获取JSON内容
   */
  protected async fetchJson<T = unknown>(url: string): Promise<T> {
    return await httpJson<T>(url, {
      headers: {
        "User-Agent": this.config.userAgent,
      },
      timeout: this.config.timeout,
      retries: this.config.maxRetries,
    });
  }

  /**
   * 验证URL是否可访问
   */
  async validateUrl(url: string): Promise<boolean> {
    try {
      const response = await httpRequest(url, {
        method: "HEAD",
        timeout: 5000,
        retries: 1,
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
