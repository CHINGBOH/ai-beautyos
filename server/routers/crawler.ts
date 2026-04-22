/**
 * 爬虫tRPC路由
 * 提供爬虫功能的API接口
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { HtmlCrawler } from "../crawler/html-crawler";
import { PubMedCrawler } from "../crawler/pubmed-crawler";
import { CNKICrawler } from "../crawler/cnki-crawler";
import { MedicalBeautyCrawler } from "../crawler/medical-beauty-crawler";
import { JsonApiCrawler } from "../crawler/json-api-crawler";
import { logger } from "../_core/logger";

/** SSRF 防护：禁止爬取内网地址 */
function assertPublicUrl(url: string): void {
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

export const crawlerRouter = router({
  /**
   * 爬取HTML页面
   */
  crawlHtml: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
        contentSelector: z.string().optional(),
        titleSelector: z.string().optional(),
        extractImages: z.boolean().optional().default(true),
        extractLinks: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ input }) => {
      try {
        assertPublicUrl(input.url);
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
    }),

  /**
   * 批量爬取HTML页面
   */
  crawlHtmlBatch: protectedProcedure
    .input(
      z.object({
        urls: z.array(z.string().url()),
        contentSelector: z.string().optional(),
        titleSelector: z.string().optional(),
        delay: z.number().optional().default(2000),
      })
    )
    .mutation(async ({ input }) => {
      try {
        for (const url of input.urls) assertPublicUrl(url);
        const crawler = new HtmlCrawler({
          contentSelector: input.contentSelector,
          titleSelector: input.titleSelector,
          delay: input.delay,
        });

        const results = await Promise.all(
          input.urls.map(async (url, index) => {
            if (index > 0 && input.delay) {
              await new Promise(resolve => setTimeout(resolve, input.delay));
            }
            return await crawler.crawl(url);
          })
        );
        return { success: true, data: results, count: results.length };
      } catch (error) {
        logger.error("[Crawler] 批量爬取失败", error);
        throw new Error(`批量爬取失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),

  /**
   * 搜索PubMed论文
   */
  searchPubMed: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        retmax: z.number().min(1).max(100).optional().default(20),
        sort: z.enum(["relevance", "pub_date"]).optional().default("relevance"),
        dateRange: z
          .object({
            start: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/),
            end: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/),
          })
          .optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const crawler = new PubMedCrawler();
        const articles = await crawler.search({
          query: input.query,
          retmax: input.retmax,
          sort: input.sort,
          dateRange: input.dateRange,
        });

        return { success: true, data: articles, count: articles.length };
      } catch (error) {
        logger.error("[Crawler] PubMed搜索失败", error);
        throw new Error(`搜索失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),

  /**
   * 爬取PubMed论文详情
   */
  crawlPubMed: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        assertPublicUrl(input.url);
        const crawler = new PubMedCrawler();
        const result = await crawler.crawl(input.url);
        return { success: true, data: result };
      } catch (error) {
        logger.error("[Crawler] PubMed爬取失败", error);
        throw new Error(`爬取失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),

  /**
   * 搜索知网论文
   */
  searchCNKI: protectedProcedure
    .input(
      z.object({
        keyword: z.string().min(1),
        searchType: z.enum(["主题", "篇名", "关键词", "摘要", "全文"]).optional().default("主题"),
        pageSize: z.number().min(1).max(50).optional().default(20),
        page: z.number().min(1).optional().default(1),
      })
    )
    .query(async ({ input }) => {
      try {
        const crawler = new CNKICrawler();
        const articles = await crawler.search({
          keyword: input.keyword,
          searchType: input.searchType,
          pageSize: input.pageSize,
          page: input.page,
        });
        return { success: true, data: articles, count: articles.length };
      } catch (error) {
        logger.error("[Crawler] 知网搜索失败", error);
        throw new Error(`搜索失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),

  /**
   * 爬取知网论文详情
   */
  crawlCNKI: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        assertPublicUrl(input.url);
        const crawler = new CNKICrawler();
        const result = await crawler.crawl(input.url);
        return { success: true, data: result };
      } catch (error) {
        logger.error("[Crawler] 知网爬取失败", error);
        throw new Error(`爬取失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),

  /**
   * 爬取医美机构项目页面
   */
  crawlMedicalBeautyProject: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
        config: z
          .object({
            contentSelector: z.string().optional(),
            titleSelector: z.string().optional(),
            priceSelector: z.string().optional(),
            effectSelector: z.string().optional(),
            riskSelector: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        assertPublicUrl(input.url);
        const crawler = new MedicalBeautyCrawler();
        if (input.config) {
          crawler.setPageConfig("project", {
            type: "project",
            contentSelector: input.config.contentSelector,
            titleSelector: input.config.titleSelector,
            priceSelector: input.config.priceSelector,
            effectSelector: input.config.effectSelector,
            riskSelector: input.config.riskSelector,
          });
        }
        const project = await crawler.crawlProject(input.url);
        return { success: true, data: project };
      } catch (error) {
        logger.error("[Crawler] 医美项目爬取失败", error);
        throw new Error(`爬取失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),

  /**
   * 爬取医美机构案例页面
   */
  crawlMedicalBeautyCase: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        assertPublicUrl(input.url);
        const crawler = new MedicalBeautyCrawler();
        const result = await crawler.crawlCase(input.url);
        return { success: true, data: result };
      } catch (error) {
        logger.error("[Crawler] 医美案例爬取失败", error);
        throw new Error(`爬取失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),

  /**
   * 爬取JSON API
   */
  crawlJsonApi: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
        baseUrl: z.string().url().optional(),
        headers: z.record(z.string()).optional(),
        params: z.record(z.string()).optional(),
        dataPath: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        assertPublicUrl(input.url);
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
    }),
});
