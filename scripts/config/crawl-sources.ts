/**
 * 网络资料爬取资源配置
 * 集中管理 URL 列表、PubMed/CNKI 检索词、模块映射，供 crawl-and-import-knowledge 使用
 */

import { KNOWLEDGE_MODULES } from "../../shared/knowledge-modules";
import type { KnowledgeModule } from "../../shared/knowledge-modules";

/** 单条 URL 配置，可选选择器与高端标记 */
export interface UrlSourceItem {
  url: string;
  module: KnowledgeModule;
  category: string;
  titleSelector?: string;
  contentSelector?: string;
  /** 入库可信度 1-10，高端源可设 9 */
  credibility?: number;
  /** 来源层级，premium 时入库 sources 带 tier */
  tier?: "premium";
  /** 定位标签，如 shenzhen_luxury */
  positioning?: string;
}

/** URL 分组（按站点） */
export interface UrlSourceGroup {
  module: KnowledgeModule;
  category: string;
  titleSelector?: string;
  contentSelector?: string;
  urls: string[];
  credibility?: number;
  tier?: "premium";
  positioning?: string;
}

/** PubMed 检索配置 */
export interface PubMedSourceConfig {
  query: string;
  retmax: number;
  credibility?: number;
  tier?: "premium";
}

/** CNKI 检索配置 */
export interface CNKISourceConfig {
  query: string;
  retmax: number;
  credibility?: number;
  tier?: "premium";
}

/** 关键词 -> 模块映射（用于未指定 module 的结果归类） */
export const KEYWORD_TO_MODULE: Record<string, KnowledgeModule> = {
  // 健康基础
  sleep: KNOWLEDGE_MODULES.HEALTH_FOUNDATION,
  睡眠: KNOWLEDGE_MODULES.HEALTH_FOUNDATION,
  hydration: KNOWLEDGE_MODULES.HEALTH_FOUNDATION,
  水分: KNOWLEDGE_MODULES.HEALTH_FOUNDATION,
  diet: KNOWLEDGE_MODULES.HEALTH_FOUNDATION,
  饮食: KNOWLEDGE_MODULES.HEALTH_FOUNDATION,
  exercise: KNOWLEDGE_MODULES.HEALTH_FOUNDATION,
  运动: KNOWLEDGE_MODULES.HEALTH_FOUNDATION,
  // 皮肤
  skin: KNOWLEDGE_MODULES.SKIN_CARE,
  皮肤: KNOWLEDGE_MODULES.SKIN_CARE,
  dermatology: KNOWLEDGE_MODULES.SKIN_CARE,
  acne: KNOWLEDGE_MODULES.SKIN_CARE,
  痤疮: KNOWLEDGE_MODULES.SKIN_CARE,
  pigmentation: KNOWLEDGE_MODULES.SKIN_CARE,
  色素: KNOWLEDGE_MODULES.SKIN_CARE,
  // 牙科
  dental: KNOWLEDGE_MODULES.DENTAL_CARE,
  牙齿: KNOWLEDGE_MODULES.DENTAL_CARE,
  orthodontics: KNOWLEDGE_MODULES.DENTAL_CARE,
  正畸: KNOWLEDGE_MODULES.DENTAL_CARE,
  whitening: KNOWLEDGE_MODULES.DENTAL_CARE,
  美白: KNOWLEDGE_MODULES.DENTAL_CARE,
  // 中医
  tcm: KNOWLEDGE_MODULES.TCM,
  中医: KNOWLEDGE_MODULES.TCM,
  acupuncture: KNOWLEDGE_MODULES.TCM,
  针灸: KNOWLEDGE_MODULES.TCM,
  // 医美技术
  laser: KNOWLEDGE_MODULES.AESTHETICS,
  激光: KNOWLEDGE_MODULES.AESTHETICS,
  filler: KNOWLEDGE_MODULES.AESTHETICS,
  填充: KNOWLEDGE_MODULES.AESTHETICS,
  botulinum: KNOWLEDGE_MODULES.AESTHETICS,
  肉毒素: KNOWLEDGE_MODULES.AESTHETICS,
  aesthetics: KNOWLEDGE_MODULES.AESTHETICS,
  医美: KNOWLEDGE_MODULES.AESTHETICS,
  cosmetic: KNOWLEDGE_MODULES.AESTHETICS,
  rejuvenation: KNOWLEDGE_MODULES.AESTHETICS,
  anti-aging: KNOWLEDGE_MODULES.AESTHETICS,
  抗衰: KNOWLEDGE_MODULES.AESTHETICS,
  // 高端/深圳豪宅区定位（仍归入医美或皮肤，用于 tags/positioning）
  高端: KNOWLEDGE_MODULES.AESTHETICS,
  私密: KNOWLEDGE_MODULES.AESTHETICS,
  定制: KNOWLEDGE_MODULES.AESTHETICS,
  深圳: KNOWLEDGE_MODULES.AESTHETICS,
};

/** 爬取间隔（毫秒） */
export const CRAWL_DELAY_MS = 2000;

/** 每批 URL 最大并发（建议 1 避免封禁） */
export const CRAWL_CONCURRENCY = 1;

/** PubMed 检索词与每词条数 */
export const PUBMED_SOURCES: PubMedSourceConfig[] = [
  { query: "medical aesthetics", retmax: 10 },
  { query: "skin rejuvenation", retmax: 10 },
  { query: "laser skin treatment", retmax: 10 },
  { query: "cosmetic dermatology", retmax: 8 },
  { query: "anti-aging treatment", retmax: 8 },
  { query: "pigmentation treatment", retmax: 8 },
  { query: "acne scar treatment", retmax: 8 },
  { query: "wrinkle reduction", retmax: 8 },
  { query: "botulinum toxin cosmetic", retmax: 8 },
  { query: "dermal filler", retmax: 8 },
  { query: "dental aesthetics", retmax: 6 },
  { query: "traditional chinese medicine skin", retmax: 6 },
];

/** CNKI 检索词与每词条数 */
export const CNKI_SOURCES: CNKISourceConfig[] = [
  { query: "医美", retmax: 8 },
  { query: "皮肤美容", retmax: 8 },
  { query: "激光美容", retmax: 6 },
  { query: "注射美容", retmax: 6 },
  { query: "中医美容", retmax: 6 },
  { query: "牙齿美白", retmax: 5 },
];

/** PubMed 顶级/权威向（综述、指南、高端医美，可信度 9） */
export const PUBMED_SOURCES_PREMIUM: PubMedSourceConfig[] = [
  { query: "systematic review cosmetic dermatology", retmax: 12, credibility: 9, tier: "premium" },
  { query: "meta-analysis aesthetic medicine", retmax: 12, credibility: 9, tier: "premium" },
  { query: "clinical guideline facial rejuvenation", retmax: 10, credibility: 9, tier: "premium" },
  { query: "cosmetic dermatology guideline", retmax: 10, credibility: 9, tier: "premium" },
  { query: "aesthetic medicine patient safety", retmax: 10, credibility: 9, tier: "premium" },
  { query: "facial rejuvenation evidence", retmax: 10, credibility: 9, tier: "premium" },
  { query: "laser skin resurfacing review", retmax: 10, credibility: 9, tier: "premium" },
  { query: "dermal filler safety guideline", retmax: 8, credibility: 9, tier: "premium" },
];

/** CNKI 顶级/高端向（规范、共识、深圳，可信度 9） */
export const CNKI_SOURCES_PREMIUM: CNKISourceConfig[] = [
  { query: "医疗美容规范", retmax: 8, credibility: 9, tier: "premium" },
  { query: "医美专家共识", retmax: 8, credibility: 9, tier: "premium" },
  { query: "皮肤美容共识", retmax: 6, credibility: 9, tier: "premium" },
  { query: "注射美容规范", retmax: 6, credibility: 9, tier: "premium" },
  { query: "高端医美", retmax: 6, credibility: 9, tier: "premium" },
  { query: "深圳 医美", retmax: 5, credibility: 9, tier: "premium" },
];

/** HTML URL 列表（按组，可扩展真实 URL） */
export const URL_SOURCE_GROUPS: UrlSourceGroup[] = [
  {
    module: KNOWLEDGE_MODULES.AESTHETICS,
    category: "行业科普",
    urls: [
      // 示例：可替换为真实科普页
      // "https://example.com/medical-aesthetics-intro",
    ],
  },
  {
    module: KNOWLEDGE_MODULES.SKIN_CARE,
    category: "皮肤护理",
    urls: [],
  },
];

/** 顶级/深圳权威 URL 组（占位，替换为真实链接后启用） */
export const URL_SOURCE_GROUPS_PREMIUM: UrlSourceGroup[] = [
  {
    module: KNOWLEDGE_MODULES.AESTHETICS,
    category: "权威指南",
    credibility: 9,
    tier: "premium",
    positioning: "shenzhen_luxury",
    urls: [
      // 卫健委/学会/协会科普或规范页（需可抓取且合规）
      // "https://www.nhc.gov.cn/...",
      // "https://www.capa.org.cn/...",
    ],
  },
  {
    module: KNOWLEDGE_MODULES.AESTHETICS,
    category: "深圳科普",
    credibility: 9,
    tier: "premium",
    positioning: "shenzhen_luxury",
    urls: [
      // 深圳卫健委医美相关、深圳消委会医美提示等
      // "https://wjw.sz.gov.cn/...",
    ],
  },
  {
    module: KNOWLEDGE_MODULES.AESTHETICS,
    category: "高端品质",
    credibility: 9,
    tier: "premium",
    positioning: "shenzhen_luxury",
    urls: [
      // 高端医美白皮书、行业报告等可抓取 URL
    ],
  },
];

/** 展开为扁平 UrlSourceItem 列表（供脚本遍历），含普通 + 高端 URL 组 */
export function flattenUrlSources(): UrlSourceItem[] {
  const groups = [...URL_SOURCE_GROUPS, ...URL_SOURCE_GROUPS_PREMIUM];
  const items: UrlSourceItem[] = [];
  for (const group of groups) {
    for (const url of group.urls) {
      items.push({
        url,
        module: group.module,
        category: group.category,
        titleSelector: group.titleSelector,
        contentSelector: group.contentSelector,
        credibility: group.credibility,
        tier: group.tier,
        positioning: group.positioning,
      });
    }
  }
  return items;
}
