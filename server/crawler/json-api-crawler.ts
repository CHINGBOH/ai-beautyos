/**
 * JSON API爬虫
 * 用于爬取返回JSON格式数据的API
 */

import { BaseCrawler, CrawledData } from "./base-crawler";
import { logger } from "../_core/logger";

export interface JsonApiConfig {
  /** API基础URL */
  baseUrl: string;
  /** 请求头 */
  headers?: Record<string, string>;
  /** 请求参数 */
  params?: Record<string, string>;
  /** 数据提取路径（JSONPath） */
  dataPath?: string;
}

export class JsonApiCrawler extends BaseCrawler {
  private config: JsonApiConfig;

  constructor(config: JsonApiConfig) {
    super();
    this.config = config;
  }

  /**
   * 爬取API数据
   */
  async crawl(url: string): Promise<CrawledData> {
    logger.info(`[JsonApiCrawler] 爬取API: ${url}`);

    try {
      const fullUrl = url.startsWith("http") ? url : `${this.config.baseUrl}${url}`;
      const data = await this.fetchJson(fullUrl);

      // 提取数据（如果指定了路径）
      let extractedData = data;
      if (this.config.dataPath) {
        extractedData = this.extractByPath(data, this.config.dataPath);
      }

      // 转换为CrawledData格式
      return this.transformToCrawledData(extractedData, url);
    } catch (error) {
      logger.error("[JsonApiCrawler] 爬取失败", error);
      throw error;
    }
  }

  /**
   * 根据路径提取数据（简化版JSONPath）
   */
  private extractByPath(data: unknown, path: string): unknown {
    const parts = path.split(".");
    let result: unknown = data;

    for (const part of parts) {
      if (result && typeof result === "object" && part in result) {
        result = (result as Record<string, unknown>)[part];
      } else {
        return null;
      }
    }

    return result;
  }

  /**
   * 转换为CrawledData格式
   */
  private transformToCrawledData(data: unknown, url: string): CrawledData {
    // 尝试从数据中提取标题和内容
    let title = url;
    let content = "";

    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      title = (obj.title as string) || (obj.name as string) || title;
      content = (obj.content as string) || (obj.description as string) || JSON.stringify(data, null, 2);
    } else {
      content = JSON.stringify(data, null, 2);
    }

    return {
      url,
      title,
      content,
      metadata: {
        source: "json_api",
        data,
      },
      crawledAt: new Date(),
    };
  }

  /**
   * 批量爬取多个API端点
   */
  async crawlBatch(endpoints: string[]): Promise<CrawledData[]> {
    const results: CrawledData[] = [];

    for (const endpoint of endpoints) {
      try {
        const data = await this.crawl(endpoint);
        results.push(data);
        await this.delay(this.config.delay);
      } catch (error) {
        logger.error(`[JsonApiCrawler] 爬取失败: ${endpoint}`, error);
      }
    }

    return results;
  }
}
