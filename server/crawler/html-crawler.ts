/**
 * HTML爬虫
 * 使用cheerio解析HTML内容
 * 需要安装: pnpm add cheerio
 * 注意: cheerio自带类型定义，不需要@types/cheerio
 */

import { load } from "cheerio";
import { BaseCrawler, CrawledData, CrawlerConfig } from "./base-crawler";
import { logger } from "../_core/logger";

export interface HtmlCrawlerOptions extends CrawlerConfig {
  /** 内容选择器 */
  contentSelector?: string;
  /** 标题选择器 */
  titleSelector?: string;
  /** 是否提取图片 */
  extractImages?: boolean;
  /** 是否提取链接 */
  extractLinks?: boolean;
}

export class HtmlCrawler extends BaseCrawler {
  private options: Required<HtmlCrawlerOptions>;

  constructor(options: HtmlCrawlerOptions = {}) {
    super(options);
    this.options = {
      ...this.config,
      contentSelector: options.contentSelector ?? "body",
      titleSelector: options.titleSelector ?? "title",
      extractImages: options.extractImages ?? true,
      extractLinks: options.extractLinks ?? false,
    };
  }

  async crawl(url: string): Promise<CrawledData> {
    logger.info(`[HtmlCrawler] 开始爬取: ${url}`);

    const html = await this.fetchHtml(url);
    const $ = load(html);

    // 提取标题
    const title = $(this.options.titleSelector).first().text().trim() || url;

    // 提取内容
    let content = "";
    if (this.options.contentSelector) {
      const contentElement = $(this.options.contentSelector).first();
      // 移除script和style标签
      contentElement.find("script, style").remove();
      content = contentElement.text().trim();
    } else {
      // 如果没有指定选择器，提取body文本
      $("script, style").remove();
      content = $("body").text().trim();
    }

    // 提取元数据
    const metadata: Record<string, unknown> = {
      description: $('meta[name="description"]').attr("content") || "",
      keywords: $('meta[name="keywords"]').attr("content") || "",
      author: $('meta[name="author"]').attr("content") || "",
    };

    // 提取图片
    if (this.options.extractImages) {
      const images: string[] = [];
      $("img").each((_, el) => {
        const src = $(el).attr("src");
        if (src) {
          // 转换为绝对URL
          const absoluteUrl = new URL(src, url).toString();
          images.push(absoluteUrl);
        }
      });
      metadata.images = images;
    }

    // 提取链接
    if (this.options.extractLinks) {
      const links: string[] = [];
      $("a").each((_, el) => {
        const href = $(el).attr("href");
        if (href) {
          try {
            const absoluteUrl = new URL(href, url).toString();
            links.push(absoluteUrl);
          } catch {
            // 忽略无效URL
          }
        }
      });
      metadata.links = links;
    }

    logger.info(`[HtmlCrawler] 爬取完成: ${title.substring(0, 50)}...`);

    return {
      url,
      title,
      content,
      metadata,
      crawledAt: new Date(),
    };
  }

  /**
   * 提取特定元素的内容
   */
  extractElements(html: string, selector: string): string[] {
    const $ = load(html);
    const elements: string[] = [];

    $(selector).each((_, el) => {
      const text = $(el).text().trim();
      if (text) {
        elements.push(text);
      }
    });

    return elements;
  }

  /**
   * 提取属性值
   */
  extractAttributes(html: string, selector: string, attribute: string): string[] {
    const $ = load(html);
    const values: string[] = [];

    $(selector).each((_, el) => {
      const value = $(el).attr(attribute);
      if (value) {
        values.push(value);
      }
    });

    return values;
  }
}
