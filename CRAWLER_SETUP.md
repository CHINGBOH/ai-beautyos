# 爬虫模块设置指南

## 概述

本项目实现了自定义爬虫模块，用于收集知识库数据。相比使用MCP爬虫，自定义爬虫的优势：

1. ✅ **集成现有架构**：复用统一的HTTP服务和日志系统
2. ✅ **定制化**：针对知识库需求（PubMed、知网、医美网站）定制
3. ✅ **可控性**：完全控制爬取逻辑、错误处理、频率控制
4. ✅ **可扩展**：易于添加新的爬虫类型

## 安装依赖

```bash
# 进入项目目录
cd medical-beauty-crm-landing

# 安装HTML解析库（必需）
# 注意: cheerio自带类型定义，不需要@types/cheerio
pnpm add cheerio

# 如果需要爬取JavaScript渲染的页面，可以安装Puppeteer（可选）
pnpm add puppeteer

# XML解析（PubMed爬虫需要，项目已有xml2js）
# pnpm add xml2js @types/xml2js
```

## 模块结构

```
server/crawler/
├── base-crawler.ts           # 基础爬虫类
├── html-crawler.ts           # HTML爬虫（使用cheerio）
├── pubmed-crawler.ts         # PubMed学术论文爬虫
├── cnki-crawler.ts           # 知网（CNKI）爬虫
├── medical-beauty-crawler.ts # 医美机构官网爬虫
├── json-api-crawler.ts       # JSON API爬虫
└── index.ts                  # 导出

server/routers/
└── crawler.ts                # tRPC路由
```

## 使用方法

### 1. HTML爬虫

爬取普通HTML网页：

```typescript
import { HtmlCrawler } from "./server/crawler/html-crawler";

const crawler = new HtmlCrawler({
  contentSelector: ".article-content", // 内容选择器
  titleSelector: "h1",                 // 标题选择器
  extractImages: true,                 // 提取图片
  delay: 2000,                          // 爬取间隔2秒
});

// 爬取单个页面
const data = await crawler.crawl("https://example.com/article");

// 批量爬取
const results = await crawler.crawlBatch([
  "https://example.com/article1",
  "https://example.com/article2",
]);
```

### 2. PubMed爬虫

搜索和爬取学术论文：

```typescript
import { PubMedCrawler } from "./server/crawler/pubmed-crawler";

const crawler = new PubMedCrawler();

// 搜索论文
const articles = await crawler.search({
  query: "skin pigmentation melasma",
  retmax: 20,
  sort: "relevance",
  dateRange: {
    start: "2020/01/01",
    end: "2024/12/31",
  },
});

// 爬取单个论文
const data = await crawler.crawl("https://pubmed.ncbi.nlm.nih.gov/12345678/");
```

### 3. 知网爬虫

```typescript
import { CNKICrawler } from "./server/crawler/cnki-crawler";

const crawler = new CNKICrawler();

// 搜索论文（注意：知网需要登录）
const articles = await crawler.search({
  keyword: "皮肤护理",
  searchType: "主题",
  pageSize: 20,
});

// 爬取单篇论文
const data = await crawler.crawl("https://kns.cnki.net/kcms/detail/...");
```

### 4. 医美机构爬虫

```typescript
import { MedicalBeautyCrawler } from "./server/crawler/medical-beauty-crawler";

const crawler = new MedicalBeautyCrawler();

// 爬取项目页面
const project = await crawler.crawlProject("https://clinic.com/project/picosecond");

// 爬取案例页面
const caseData = await crawler.crawlCase("https://clinic.com/case/123");
```

### 5. JSON API爬虫

```typescript
import { JsonApiCrawler } from "./server/crawler/json-api-crawler";

const crawler = new JsonApiCrawler({
  baseUrl: "https://api.example.com",
  headers: {
    "Authorization": "Bearer token",
  },
});

const data = await crawler.crawl("/articles");
```

### 6. 通过tRPC API使用

```typescript
// 前端调用
import { trpc } from "@/lib/trpc";

// 爬取HTML
const result = await trpc.crawler.crawlHtml.mutate({
  url: "https://example.com/article",
  contentSelector: ".content",
  titleSelector: "h1",
});

// 搜索PubMed
const articles = await trpc.crawler.searchPubMed.query({
  query: "skin care",
  retmax: 10,
});

// 搜索知网
const cnkiArticles = await trpc.crawler.searchCNKI.query({
  keyword: "皮肤护理",
  searchType: "主题",
});

// 爬取医美项目
const project = await trpc.crawler.crawlMedicalBeautyProject.mutate({
  url: "https://clinic.com/project/picosecond",
});
```

## 扩展爬虫

### 添加新的爬虫类型

1. 创建新的爬虫类，继承 `BaseCrawler`：

```typescript
// server/crawler/cnki-crawler.ts
import { BaseCrawler, CrawledData } from "./base-crawler";
import { HtmlCrawler } from "./html-crawler";

export class CNKICrawler extends BaseCrawler {
  private htmlCrawler: HtmlCrawler;

  constructor() {
    super();
    this.htmlCrawler = new HtmlCrawler({
      contentSelector: ".main-content",
      titleSelector: ".title",
    });
  }

  async crawl(url: string): Promise<CrawledData> {
    // 实现知网特定的爬取逻辑
    const data = await this.htmlCrawler.crawl(url);
    // 处理知网特定的数据格式
    return {
      ...data,
      metadata: {
        ...data.metadata,
        source: "CNKI",
      },
    };
  }
}
```

2. 在 `server/crawler/index.ts` 中导出：

```typescript
export { CNKICrawler } from "./cnki-crawler";
```

3. 在 `server/routers/crawler.ts` 中添加路由：

```typescript
crawlCNKI: publicProcedure
  .input(z.object({ url: z.string().url() }))
  .mutation(async ({ input }) => {
    const crawler = new CNKICrawler();
    const result = await crawler.crawl(input.url);
    return { success: true, data: result };
  }),
```

## 配置选项

### BaseCrawler配置

```typescript
interface CrawlerConfig {
  delay?: number;        // 爬取间隔（毫秒），默认2000
  maxRetries?: number;   // 最大重试次数，默认3
  userAgent?: string;    // User-Agent，默认浏览器UA
  timeout?: number;      // 请求超时（毫秒），默认30000
}
```

### HtmlCrawler配置

```typescript
interface HtmlCrawlerOptions extends CrawlerConfig {
  contentSelector?: string;  // 内容选择器，默认"body"
  titleSelector?: string;    // 标题选择器，默认"title"
  extractImages?: boolean;   // 是否提取图片，默认true
  extractLinks?: boolean;    // 是否提取链接，默认false
}
```

## 注意事项

1. **遵守robots.txt**：爬取前检查目标网站的robots.txt
2. **频率控制**：使用`delay`参数控制爬取频率，避免被封IP
3. **错误处理**：爬虫会自动重试，但建议监控日志
4. **数据清洗**：爬取的数据需要清洗和验证
5. **法律合规**：确保遵守目标网站的使用条款和版权

## 与知识库集成

爬取的数据可以保存到 `knowledge-data-collection.json` 或直接导入数据库：

```typescript
import { createKnowledge } from "./server/db";
import { HtmlCrawler } from "./server/crawler/html-crawler";

const crawler = new HtmlCrawler();
const data = await crawler.crawl(url);

// 转换为知识库格式
await createKnowledge({
  title: data.title,
  content: data.content,
  module: "skin_care",
  level: 6,
  sources: JSON.stringify([{
    type: "web",
    url: data.url,
    title: data.title,
    date: data.crawledAt.toISOString(),
  }]),
  // ... 其他字段
});
```

## 下一步

1. 安装依赖：
   ```bash
   cd medical-beauty-crm-landing
   pnpm add cheerio
   ```
   ⚠️ 注意：cheerio自带类型定义，不需要`@types/cheerio`

2. 测试爬虫：
   ```bash
   cd medical-beauty-crm-landing
   npx tsx scripts/test-crawler.ts
   ```

3. 扩展功能：添加更多爬虫类型（知网、医美网站等）

4. 集成LLM：使用LLM增强爬取的数据（提取结构化信息、生成正反论证等）
