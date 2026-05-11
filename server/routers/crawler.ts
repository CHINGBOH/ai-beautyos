/**
 * 爬虫tRPC路由
 * 提供爬虫功能的API接口
 */

import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { HtmlCrawler } from "../crawler/html-crawler";
import { PubMedCrawler } from "../crawler/pubmed-crawler";
import { CNKICrawler } from "../crawler/cnki-crawler";
import { MedicalBeautyCrawler } from "../crawler/medical-beauty-crawler";
import { JsonApiCrawler } from "../crawler/json-api-crawler";
import { logger } from "../_core/logger";

export const crawlerRouter = router({
  /**
   * 爬取HTML页面
   */
  crawlHtml: publicProcedure
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
  crawlHtmlBatch: publicProcedure
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
        const crawler = new HtmlCrawler({
          contentSelector: input.contentSelector,
          titleSelector: input.titleSelector,
          delay: input.delay,
        });

        const results = await crawler.crawlBatch(input.urls);
        return { success: true, data: results, count: results.length };
      } catch (error) {
        logger.error("[Crawler] 批量爬取失败", error);
        throw new Error(`批量爬取失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }),

  /**
   * 搜索PubMed论文
   */
  searchPubMed: publicProcedure
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
  crawlPubMed: publicProcedure
    .input(
      z.object({
        url: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      try {
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
  searchCNKI: publicProcedure
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
  crawlCNKI: publicProcedure
    .input(
      z.object({
        url: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      try {
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
  crawlMedicalBeautyProject: publicProcedure
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
  crawlMedicalBeautyCase: publicProcedure
    .input(
      z.object({
        url: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      try {
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
  crawlJsonApi: publicProcedure
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
