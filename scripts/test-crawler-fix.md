# 测试爬虫脚本使用说明

## 问题修复

### 1. @types/cheerio 已弃用
- ✅ cheerio 1.2.0+ 自带类型定义
- ✅ 不需要安装 `@types/cheerio`
- ✅ 已更新文档和代码注释

### 2. 测试脚本路径问题

**错误**：在 `/home/l/美业CRM` 目录运行
```bash
npx tsx scripts/test-crawler.ts  # ❌ 找不到文件
```

**正确**：在 `/home/l/美业CRM/medical-beauty-crm-landing` 目录运行
```bash
cd medical-beauty-crm-landing
npx tsx scripts/test-crawler.ts  # ✅ 正确
```

## 正确的使用步骤

### 1. 进入项目目录
```bash
cd /home/l/美业CRM/medical-beauty-crm-landing
```

### 2. 安装依赖（如果还没安装）
```bash
pnpm add cheerio
```

### 3. 运行测试脚本
```bash
npx tsx scripts/test-crawler.ts
```

或者使用项目配置的tsx（如果已全局安装）：
```bash
tsx scripts/test-crawler.ts
```

## 如果仍然遇到问题

### 检查文件是否存在
```bash
ls -la scripts/test-crawler.ts
```

### 检查cheerio是否正确安装
```bash
pnpm list cheerio
```

### 检查TypeScript配置
```bash
npx tsc --noEmit
```

## 快速测试单个爬虫

如果完整测试脚本有问题，可以创建一个简单的测试：

```typescript
// test-simple.ts
import { HtmlCrawler } from "./server/crawler/html-crawler";

const crawler = new HtmlCrawler();
crawler.crawl("https://example.com")
  .then(data => console.log("成功:", data.title))
  .catch(err => console.error("失败:", err));
```

运行：
```bash
npx tsx test-simple.ts
```
