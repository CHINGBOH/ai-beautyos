/**
 * 爬虫测试脚本
 * 用于测试各种爬虫功能
 */

import "dotenv/config";
import { HtmlCrawler } from "../server/crawler/html-crawler";
import { PubMedCrawler } from "../server/crawler/pubmed-crawler";
import { CNKICrawler } from "../server/crawler/cnki-crawler";
import { MedicalBeautyCrawler } from "../server/crawler/medical-beauty-crawler";
import { logger } from "../server/_core/logger";

async function testHtmlCrawler() {
  console.log("\n=== 测试HTML爬虫 ===\n");

  const crawler = new HtmlCrawler({
    contentSelector: "article, .content, main",
    titleSelector: "h1, title",
    extractImages: true,
    delay: 1000,
  });

  try {
    // 测试爬取一个简单的网页
    const result = await crawler.crawl("https://example.com");
    console.log("✅ 爬取成功:");
    console.log(`标题: ${result.title}`);
    console.log(`内容长度: ${result.content.length} 字符`);
    console.log(`图片数量: ${(result.metadata?.images as string[])?.length || 0}`);
  } catch (error) {
    console.error("❌ 爬取失败:", error);
  }
}

async function testPubMedCrawler() {
  console.log("\n=== 测试PubMed爬虫 ===\n");

  const crawler = new PubMedCrawler();

  try {
    // 搜索论文
    console.log("搜索: skin pigmentation");
    const articles = await crawler.search({
      query: "skin pigmentation",
      retmax: 5,
      sort: "relevance",
    });

    console.log(`✅ 找到 ${articles.length} 篇论文:`);
    articles.forEach((article, index) => {
      console.log(`\n${index + 1}. ${article.title}`);
      console.log(`   作者: ${article.authors.slice(0, 3).join(", ")}`);
      console.log(`   期刊: ${article.journal}`);
      console.log(`   日期: ${article.publicationDate}`);
      if (article.doi) {
        console.log(`   DOI: ${article.doi}`);
      }
    });

    // 测试爬取单个论文
    if (articles.length > 0) {
      const article = articles[0];
      // 测试多种URL格式
      const testUrls = [
        `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`,
        `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}`,
        article.pmid, // 直接使用PMID
      ];

      for (const testUrl of testUrls.slice(0, 1)) { // 只测试第一个
        try {
          console.log(`\n爬取论文详情: ${testUrl}`);
          const data = await crawler.crawl(testUrl);
          console.log("✅ 爬取成功:");
          console.log(`标题: ${data.title}`);
          console.log(`摘要长度: ${data.content.length} 字符`);
          break; // 成功就退出
        } catch (error) {
          console.error(`❌ 爬取失败: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  } catch (error) {
    console.error("❌ 测试失败:", error);
  }
}

async function testCNKICrawler() {
  console.log("\n=== 测试知网爬虫 ===\n");

  const crawler = new CNKICrawler();

  try {
    // 注意：知网需要登录，这里只是测试框架
    console.log("搜索: 皮肤护理");
    const articles = await crawler.search({
      keyword: "皮肤护理",
      searchType: "主题",
      pageSize: 5,
    });

    console.log(`✅ 找到 ${articles.length} 篇论文`);
    // 实际使用时需要处理登录和验证码
  } catch (error) {
    console.error("❌ 测试失败（知网需要登录）:", error);
  }
}

async function testMedicalBeautyCrawler() {
  console.log("\n=== 测试医美机构爬虫 ===\n");

  const crawler = new MedicalBeautyCrawler();

  try {
    // 测试爬取项目页面（使用示例URL）
    console.log("注意：需要提供真实的医美机构URL");
    // const project = await crawler.crawlProject("https://example-clinic.com/project/picosecond");
    // console.log("✅ 爬取成功:", project.name);
  } catch (error) {
    console.error("❌ 测试失败:", error);
  }
}

async function main() {
  console.log("🚀 开始测试爬虫模块...\n");

  // 测试HTML爬虫
  await testHtmlCrawler();

  // 等待一下
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 测试PubMed爬虫
  await testPubMedCrawler();

  // 等待一下
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 测试知网爬虫（需要登录）
  await testCNKICrawler();

  // 等待一下
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 测试医美机构爬虫
  await testMedicalBeautyCrawler();

  console.log("\n✅ 测试完成！");
}

main().catch((error) => {
  logger.error("测试失败", error);
  process.exit(1);
});
