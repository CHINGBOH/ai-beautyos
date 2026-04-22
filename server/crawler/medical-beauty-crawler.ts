/**
 * 医美机构官网爬虫
 * 爬取医美机构官网的项目介绍、案例、技术说明等
 */

import { HtmlCrawler } from "./html-crawler";
import { BaseCrawler, CrawledData } from "./base-crawler";
import { logger } from "../_core/logger";

export interface MedicalBeautyPageConfig {
  /** 页面类型 */
  type: "project" | "case" | "technology" | "article";
  /** 内容选择器 */
  contentSelector?: string;
  /** 标题选择器 */
  titleSelector?: string;
  /** 图片选择器 */
  imageSelector?: string;
  /** 价格选择器 */
  priceSelector?: string;
  /** 效果描述选择器 */
  effectSelector?: string;
  /** 风险提示选择器 */
  riskSelector?: string;
}

export interface MedicalBeautyProject {
  /** 项目名称 */
  name: string;
  /** 项目介绍 */
  description: string;
  /** 技术原理 */
  principle?: string;
  /** 适用人群 */
  suitableFor?: string;
  /** 禁忌症 */
  contraindications?: string;
  /** 价格区间 */
  price?: string;
  /** 效果描述 */
  effects?: string;
  /** 风险提示 */
  risks?: string;
  /** 图片 */
  images: string[];
  /** 来源URL */
  url: string;
}

export class MedicalBeautyCrawler extends BaseCrawler {
  private htmlCrawler: HtmlCrawler;
  private pageConfigs: Map<string, MedicalBeautyPageConfig>;

  constructor() {
    super({
      delay: 2000,
    });
    this.htmlCrawler = new HtmlCrawler({
      extractImages: true,
      extractLinks: false,
    });

    // 默认页面配置
    this.pageConfigs = new Map([
      [
        "project",
        {
          type: "project",
          contentSelector: ".project-content, .project-detail, .content",
          titleSelector: "h1, .project-title, .title",
          imageSelector: ".project-image, .before-after img",
          priceSelector: ".price, .price-info",
          effectSelector: ".effect, .effect-description",
          riskSelector: ".risk, .risk-warning, .contraindication",
        },
      ],
      [
        "case",
        {
          type: "case",
          contentSelector: ".case-content, .case-detail",
          titleSelector: "h1, .case-title",
          imageSelector: ".before-after img, .comparison-image",
        },
      ],
    ]);
  }

  /**
   * 设置页面配置
   */
  setPageConfig(type: string, config: MedicalBeautyPageConfig): void {
    this.pageConfigs.set(type, config);
  }

  /**
   * 爬取项目页面
   */
  async crawlProject(url: string, config?: MedicalBeautyPageConfig): Promise<MedicalBeautyProject> {
    logger.info(`[MedicalBeautyCrawler] 爬取项目: ${url}`);

    const pageConfig = config || this.pageConfigs.get("project");
    if (!pageConfig) {
      throw new Error("未找到项目页面配置");
    }

    const html = await this.fetchHtml(url);
    const data = await this.htmlCrawler.crawl(url);

    // 提取项目特定信息
    const project: MedicalBeautyProject = {
      name: data.title,
      description: data.content,
      url,
      images: (data.metadata?.images as string[]) || [],
    };

    // 提取价格
    if (pageConfig.priceSelector) {
      const priceMatch = html.match(new RegExp(`<[^>]*class=["']?[^"']*${pageConfig.priceSelector.replace(".", "")}[^"']*["']?[^>]*>([^<]+)</`, "i"));
      if (priceMatch) {
        project.price = priceMatch[1].trim();
      }
    }

    // 提取效果描述
    if (pageConfig.effectSelector) {
      const effectMatch = html.match(new RegExp(`<[^>]*class=["']?[^"']*${pageConfig.effectSelector.replace(".", "")}[^"']*["']?[^>]*>([^<]+)</`, "i"));
      if (effectMatch) {
        project.effects = effectMatch[1].trim();
      }
    }

    // 提取风险提示
    if (pageConfig.riskSelector) {
      const riskMatch = html.match(new RegExp(`<[^>]*class=["']?[^"']*${pageConfig.riskSelector.replace(".", "")}[^"']*["']?[^>]*>([^<]+)</`, "i"));
      if (riskMatch) {
        project.risks = riskMatch[1].trim();
      }
    }

    return project;
  }

  /**
   * 爬取案例页面
   */
  async crawlCase(url: string): Promise<CrawledData> {
    logger.info(`[MedicalBeautyCrawler] 爬取案例: ${url}`);

    const config = this.pageConfigs.get("case");
    if (config) {
      this.htmlCrawler = new HtmlCrawler({
        contentSelector: config.contentSelector,
        titleSelector: config.titleSelector,
        extractImages: true,
      });
    }

    const data = await this.htmlCrawler.crawl(url);
    return {
      ...data,
      metadata: {
        ...data.metadata,
        source: "medical_beauty_website",
        type: "case",
      },
    };
  }

  /**
   * 通用爬取方法
   */
  async crawl(url: string): Promise<CrawledData> {
    // 尝试识别页面类型
    const html = await this.fetchHtml(url);
    let pageType = "article";

    if (url.includes("/project/") || url.includes("/项目/")) {
      pageType = "project";
    } else if (url.includes("/case/") || url.includes("/案例/")) {
      pageType = "case";
    } else if (url.includes("/technology/") || url.includes("/技术/")) {
      pageType = "technology";
    }

    const config = this.pageConfigs.get(pageType);
    if (config) {
      this.htmlCrawler = new HtmlCrawler({
        contentSelector: config.contentSelector,
        titleSelector: config.titleSelector,
        extractImages: true,
      });
    }

    const data = await this.htmlCrawler.crawl(url);
    return {
      ...data,
      metadata: {
        ...data.metadata,
        source: "medical_beauty_website",
        pageType,
      },
    };
  }

  /**
   * 批量爬取项目列表
   */
  async crawlProjectList(urls: string[]): Promise<MedicalBeautyProject[]> {
    const projects: MedicalBeautyProject[] = [];

    for (const url of urls) {
      try {
        const project = await this.crawlProject(url);
        projects.push(project);
        await this.delay(this.config.delay);
      } catch (error) {
        logger.error(`[MedicalBeautyCrawler] 爬取项目失败: ${url}`, error);
      }
    }

    return projects;
  }
}
