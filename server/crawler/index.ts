/**
 * 爬虫模块导出
 */

export { BaseCrawler, type CrawlerConfig, type CrawledData } from "./base-crawler";
export { HtmlCrawler, type HtmlCrawlerOptions } from "./html-crawler";
export { PubMedCrawler, type PubMedSearchOptions, type PubMedArticle } from "./pubmed-crawler";
export { CNKICrawler, type CNKISearchOptions, type CNKIArticle } from "./cnki-crawler";
export { MedicalBeautyCrawler, type MedicalBeautyPageConfig, type MedicalBeautyProject } from "./medical-beauty-crawler";
export { JsonApiCrawler, type JsonApiConfig } from "./json-api-crawler";
