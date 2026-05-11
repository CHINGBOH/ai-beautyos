# 爬虫模块完整总结

## 📦 已实现的爬虫类型

### 1. ✅ HTML爬虫 (`HtmlCrawler`)
**用途**: 爬取普通HTML网页

**特点**:
- 使用cheerio解析HTML
- 支持CSS选择器提取内容
- 可提取图片和链接
- 支持批量爬取

**适用场景**:
- 博客文章
- 新闻网站
- 一般网页内容

---

### 2. ✅ PubMed爬虫 (`PubMedCrawler`)
**用途**: 爬取PubMed学术论文

**特点**:
- 搜索学术论文
- 提取论文详情（标题、摘要、作者、期刊等）
- 支持日期范围筛选
- 支持排序（相关性、发表日期）

**适用场景**:
- 收集皮肤科学论文
- 收集睡眠医学研究
- 收集营养学研究
- 收集医美技术论文

**API示例**:
```typescript
const crawler = new PubMedCrawler();
const articles = await crawler.search({
  query: "skin pigmentation melasma",
  retmax: 20,
  dateRange: { start: "2020/01/01", end: "2024/12/31" }
});
```

---

### 3. ✅ 知网爬虫 (`CNKICrawler`)
**用途**: 爬取知网（CNKI）中文学术论文

**特点**:
- 搜索中文学术论文
- 提取论文详情
- 支持多种搜索类型（主题、篇名、关键词等）

**注意**: 
- ⚠️ 知网需要登录，实际使用时需要处理登录和验证码
- 当前提供基础框架，需要根据实际页面结构调整

**适用场景**:
- 收集中文医学论文
- 收集中医美容研究
- 收集国内医美技术资料

---

### 4. ✅ 医美机构爬虫 (`MedicalBeautyCrawler`)
**用途**: 爬取医美机构官网的项目介绍、案例等

**特点**:
- 专门针对医美网站优化
- 可提取项目信息（价格、效果、风险）
- 可提取案例对比图
- 支持自定义页面配置

**适用场景**:
- 收集超皮秒项目介绍
- 收集热玛吉案例
- 收集医美机构技术说明
- 收集项目价格信息

**API示例**:
```typescript
const crawler = new MedicalBeautyCrawler();
const project = await crawler.crawlProject("https://clinic.com/project/picosecond");
// 返回: { name, description, price, effects, risks, images, ... }
```

---

### 5. ✅ JSON API爬虫 (`JsonApiCrawler`)
**用途**: 爬取返回JSON格式数据的API

**特点**:
- 支持JSON数据提取
- 支持JSONPath路径提取
- 可自定义请求头和参数

**适用场景**:
- 爬取RESTful API
- 爬取JSON格式的数据接口
- 集成第三方数据源

---

## 🚀 快速开始

### 1. 安装依赖

```bash
# 进入项目目录
cd medical-beauty-crm-landing

# 安装cheerio（自带类型定义，不需要@types/cheerio）
pnpm add cheerio
```

### 2. 测试爬虫

```bash
npx tsx scripts/test-crawler.ts
```

### 3. 使用tRPC API

```typescript
// 前端调用
import { trpc } from "@/lib/trpc";

// HTML爬虫
const html = await trpc.crawler.crawlHtml.mutate({
  url: "https://example.com/article",
  contentSelector: ".content"
});

// PubMed搜索
const papers = await trpc.crawler.searchPubMed.query({
  query: "skin care",
  retmax: 10
});

// 医美项目爬取
const project = await trpc.crawler.crawlMedicalBeautyProject.mutate({
  url: "https://clinic.com/project/picosecond"
});
```

---

## 📋 所有tRPC API端点

### HTML爬虫
- `crawler.crawlHtml` - 爬取单个HTML页面
- `crawler.crawlHtmlBatch` - 批量爬取HTML页面

### PubMed爬虫
- `crawler.searchPubMed` - 搜索PubMed论文
- `crawler.crawlPubMed` - 爬取PubMed论文详情

### 知网爬虫
- `crawler.searchCNKI` - 搜索知网论文
- `crawler.crawlCNKI` - 爬取知网论文详情

### 医美机构爬虫
- `crawler.crawlMedicalBeautyProject` - 爬取项目页面
- `crawler.crawlMedicalBeautyCase` - 爬取案例页面

### JSON API爬虫
- `crawler.crawlJsonApi` - 爬取JSON API

---

## 🔧 配置选项

所有爬虫都支持以下基础配置：

```typescript
interface CrawlerConfig {
  delay?: number;        // 爬取间隔（毫秒），默认2000
  maxRetries?: number;   // 最大重试次数，默认3
  userAgent?: string;    // User-Agent
  timeout?: number;      // 请求超时（毫秒），默认30000
}
```

---

## 💡 使用建议

### 1. 频率控制
- 设置合理的`delay`间隔（建议2-3秒）
- 避免短时间内大量请求
- 遵守目标网站的robots.txt

### 2. 错误处理
- 所有爬虫都有自动重试机制
- 建议监控日志，及时发现问题
- 批量爬取时，单个失败不影响整体

### 3. 数据清洗
- 爬取的数据需要清洗和验证
- 使用LLM增强数据（提取结构化信息）
- 保存到`knowledge-data-collection.json`或数据库

### 4. 法律合规
- 遵守目标网站的使用条款
- 注意版权问题
- 不要爬取需要付费的内容

---

## 🔄 与知识库集成

### 保存到JSON文件

```typescript
import fs from "fs";
import { HtmlCrawler } from "./server/crawler/html-crawler";

const crawler = new HtmlCrawler();
const data = await crawler.crawl(url);

// 读取现有数据
const collection = JSON.parse(fs.readFileSync("knowledge-data-collection.json", "utf-8"));

// 添加新数据
collection.collectedData.push({
  id: `crawled_${Date.now()}`,
  module: "skin_care",
  title: data.title,
  content: data.content,
  sources: [{
    type: "web",
    url: data.url,
    title: data.title,
    date: data.crawledAt.toISOString(),
  }],
  collectedAt: data.crawledAt.toISOString(),
  collectedBy: "crawler",
  status: "pending",
});

// 保存
fs.writeFileSync("knowledge-data-collection.json", JSON.stringify(collection, null, 2));
```

### 直接导入数据库

```typescript
import { createKnowledge } from "./server/db";
import { PubMedCrawler } from "./server/crawler/pubmed-crawler";

const crawler = new PubMedCrawler();
const articles = await crawler.search({ query: "skin pigmentation" });

for (const article of articles) {
  await createKnowledge({
    title: article.title,
    summary: article.abstract.substring(0, 200),
    content: article.abstract,
    module: "skin_care",
    level: 6,
    sources: JSON.stringify([{
      type: "academic",
      title: article.title,
      url: `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`,
      author: article.authors.join(", "),
      date: article.publicationDate,
      publisher: article.journal,
    }]),
    credibility: 8,
    difficulty: "advanced",
  });
}
```

---

## 📈 下一步计划

1. ✅ 基础爬虫框架
2. ✅ HTML爬虫
3. ✅ PubMed爬虫
4. ✅ 知网爬虫（框架）
5. ✅ 医美机构爬虫
6. ✅ JSON API爬虫
7. ⏳ 添加Puppeteer支持（JavaScript渲染页面）
8. ⏳ 添加数据清洗和LLM增强
9. ⏳ 添加定时任务支持
10. ⏳ 添加爬取进度跟踪

---

## 📚 相关文档

- `CRAWLER_SETUP.md` - 详细设置指南
- `knowledge-base-requirements.json` - 知识库需求规划
- `knowledge-data-collection.json` - 数据收集存储模板
- `crawler-implementation-plan.json` - 爬虫实施计划
