#!/usr/bin/env tsx

/**
 * 整理爬取数据脚本
 * 将爬虫获取的数据整理并导入知识库
 */

import "dotenv/config";
import { PubMedCrawler } from "../server/crawler/pubmed-crawler";
import { MedicalBeautyCrawler } from "../server/crawler/medical-beauty-crawler";
import { getDb } from "../server/db";
import { knowledgeBase } from "../drizzle/schema";
import { KNOWLEDGE_MODULES } from "../shared/knowledge-modules";
import { logger } from "../server/_core/logger";
import { eq } from "drizzle-orm";

interface CrawledArticle {
  title: string;
  content: string;
  authors?: string[];
  journal?: string;
  publicationDate?: string;
  doi?: string;
  url: string;
  keywords?: string[];
}

interface MedicalBeautyProject {
  name: string;
  description: string;
  principle?: string;
  suitableFor?: string;
  contraindications?: string;
  price?: string;
  effects?: string;
  risks?: string;
  images: string[];
  url: string;
}

class DataOrganizer {
  private pubmedCrawler: PubMedCrawler;
  private medicalCrawler: MedicalBeautyCrawler;

  constructor() {
    this.pubmedCrawler = new PubMedCrawler();
    this.medicalCrawler = new MedicalBeautyCrawler();
  }

  /**
   * 整理所有数据
   */
  async organizeAllData(): Promise<void> {
    console.log("🚀 开始整理爬取数据...\n");

    try {
      // 1. 爬取PubMed学术论文
      console.log("📚 爬取PubMed学术论文...");
      const pubmedArticles = await this.crawlPubMedArticles();
      console.log(`✅ 爬取到 ${pubmedArticles.length} 篇学术论文\n`);

      // 2. 爬取医美项目信息
      console.log("💄 爬取医美项目信息...");
      const medicalProjects = await this.crawlMedicalProjects();
      console.log(`✅ 爬取到 ${medicalProjects.length} 个医美项目\n`);

      // 3. 整理并导入数据库
      console.log("💾 整理并导入数据库...");
      await this.importToDatabase(pubmedArticles, medicalProjects);

      console.log("\n🎉 数据整理完成！");
      console.log("📊 统计信息：");
      console.log(`   - 学术论文: ${pubmedArticles.length} 篇`);
      console.log(`   - 医美项目: ${medicalProjects.length} 个`);

    } catch (error) {
      console.error("❌ 数据整理失败:", error);
      throw error;
    }
  }

  /**
   * 爬取PubMed学术论文
   */
  private async crawlPubMedArticles(): Promise<CrawledArticle[]> {
    const articles: CrawledArticle[] = [];

    // 搜索医美相关主题
    const searchQueries = [
      "medical aesthetics",
      "skin rejuvenation",
      "laser skin treatment",
      "cosmetic dermatology",
      "anti-aging treatment",
      "pigmentation treatment",
      "acne scar treatment",
      "wrinkle reduction",
      "botulinum toxin",
      "dermal filler"
    ];

    for (const query of searchQueries.slice(0, 3)) { // 先测试3个查询
      try {
        console.log(`  搜索: ${query}`);
        const results = await this.pubmedCrawler.search({
          query,
          retmax: 5,
          sort: "relevance",
        });

        for (const article of results) {
          try {
            // 爬取详细内容
            const detail = await this.pubmedCrawler.crawl(article.pmid);
            
            articles.push({
              title: detail.title || article.title,
              content: detail.content || article.abstract || "",
              authors: article.authors,
              journal: article.journal,
              publicationDate: article.publicationDate,
              doi: article.doi,
              url: `https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`,
              keywords: this.extractKeywords(article.title + " " + (article.abstract || ""))
            });

            console.log(`    ✅ ${article.title}`);
            
            // 避免请求过快
            await this.delay(1000);
          } catch (error) {
            console.log(`    ⚠️  跳过: ${article.title} (${error instanceof Error ? error.message : String(error)})`);
          }
        }
      } catch (error) {
        console.error(`   ❌ 搜索失败: ${query}`, error);
      }
    }

    return articles;
  }

  /**
   * 爬取医美项目信息
   */
  private async crawlMedicalProjects(): Promise<MedicalBeautyProject[]> {
    const projects: MedicalBeautyProject[] = [];

    // 医美机构网站示例（实际使用时需要替换为真实网站）
    const medicalWebsites = [
      // 这里可以添加真实的医美机构网站
      // "https://example-clinic.com/projects/picosecond",
      // "https://beauty-center.com/treatments/thermage"
    ];

    // 如果没有真实网站，生成模拟数据
    if (medicalWebsites.length === 0) {
      console.log("   ℹ️ 没有配置医美网站，生成模拟数据...");
      return this.generateMockMedicalProjects();
    }

    for (const url of medicalWebsites) {
      try {
        console.log(`  爬取: ${url}`);
        const project = await this.medicalCrawler.crawlProject(url);
        projects.push(project);
        console.log(`    ✅ ${project.name}`);
        
        await this.delay(2000); // 避免请求过快
      } catch (error) {
        console.error(`   ❌ 爬取失败: ${url}`, error);
      }
    }

    return projects;
  }

  /**
   * 生成模拟医美项目数据
   */
  private generateMockMedicalProjects(): MedicalBeautyProject[] {
    return [
      {
        name: "超皮秒激光祛斑",
        description: "超皮秒是新一代激光祛斑技术，采用755nm波长的皮秒激光，能够精准击碎黑色素颗粒。相比传统激光，超皮秒的脉冲时间更短（皮秒级），能量更集中，对周围组织的热损伤更小。",
        principle: "利用皮秒级激光脉冲瞬间击碎黑色素颗粒，通过人体代谢系统排出体外。",
        suitableFor: "雀斑、晒斑、黄褐斑、咖啡斑、老年斑等色素性问题。",
        contraindications: "孕妇、光敏性皮肤、活动性感染、近期暴晒者。",
        price: "3000-8000元/次，根据面积和次数而定",
        effects: "祛斑效果显著，皮肤更加白皙均匀，刺激胶原蛋白再生。",
        risks: "轻微红肿、暂时性色素沉着、极少数可能出现水疱。",
        images: [],
        url: "https://mock-clinic.com/picosecond"
      },
      {
        name: "热玛吉射频紧肤",
        description: "热玛吉采用单极射频技术，通过加热真皮层和皮下组织，刺激胶原蛋白收缩和新生，达到紧致皮肤、减少皱纹的效果。",
        principle: "射频能量穿透皮肤，加热真皮层至65-75℃，刺激胶原蛋白收缩和新生。",
        suitableFor: "皮肤松弛、皱纹、双下巴、眼周细纹等衰老问题。",
        contraindications: "体内有金属植入物、心脏起搏器、孕妇、严重皮肤疾病。",
        price: "15000-30000元/次",
        effects: "皮肤紧致提升，皱纹减少，轮廓更加清晰。",
        risks: "轻微疼痛、红肿、暂时性麻木感。",
        images: [],
        url: "https://mock-clinic.com/thermage"
      },
      {
        name: "水光针补水",
        description: "水光针通过微针将透明质酸等营养成分直接注入真皮层，深层补水保湿，改善皮肤干燥、细纹等问题。",
        principle: "微针透皮给药技术，将营养成分精准送达真皮层。",
        suitableFor: "皮肤干燥、缺水、细纹、肤色暗沉、毛孔粗大。",
        contraindications: "对透明质酸过敏、活动性痤疮、皮肤感染。",
        price: "1000-3000元/次",
        effects: "皮肤水润有光泽，细纹减少，肤质改善。",
        risks: "轻微出血、淤青、感染风险。",
        images: [],
        url: "https://mock-clinic.com/aquashine"
      }
    ];
  }

  /**
   * 导入数据到数据库
   */
  private async importToDatabase(
    articles: CrawledArticle[],
    projects: MedicalBeautyProject[]
  ): Promise<void> {
    const db = await getDb();
    if (!db) {
      throw new Error("数据库连接失败");
    }

    let importedCount = 0;

    // 导入学术论文到"医美技术"模块
    for (const article of articles) {
      try {
        await db.insert(knowledgeBase).values({
          module: KNOWLEDGE_MODULES.AESTHETICS,
          level: 1,
          title: article.title,
          content: this.formatArticleContent(article),
          summary: this.generateSummary(article.content),
          category: "学术研究",
          tags: JSON.stringify(article.keywords || []),
          sources: JSON.stringify([{
            type: "学术论文",
            title: article.title,
            url: article.url,
            author: article.authors?.join(", "),
            date: article.publicationDate
          }]),
          credibility: 8, // 学术论文可信度较高
          difficulty: "intermediate",
          isActive: 1
        });

        importedCount++;
        console.log(`   ✅ 导入: ${article.title}`);
      } catch (error) {
        console.error(`   ❌ 导入失败: ${article.title}`, error);
      }
    }

    // 导入医美项目到"皮肤管理"和"医美技术"模块
    for (const project of projects) {
      try {
        await db.insert(knowledgeBase).values({
          module: project.name.includes("激光") || project.name.includes("射频") 
            ? KNOWLEDGE_MODULES.AESTHETICS 
            : KNOWLEDGE_MODULES.SKIN_CARE,
          level: 1,
          title: project.name,
          content: this.formatProjectContent(project),
          summary: project.description,
          category: "项目介绍",
          tags: JSON.stringify(this.extractKeywords(project.name + " " + project.description)),
          sources: JSON.stringify([{
            type: "医美机构",
            title: project.name,
            url: project.url
          }]),
          credibility: 7, // 机构信息可信度中等
          difficulty: "beginner",
          isActive: 1
        });

        importedCount++;
        console.log(`   ✅ 导入: ${project.name}`);
      } catch (error) {
        console.error(`   ❌ 导入失败: ${project.name}`, error);
      }
    }

    console.log(`\n📊 数据库导入完成: ${importedCount} 条记录`);
  }

  /**
   * 格式化文章内容
   */
  private formatArticleContent(article: CrawledArticle): string {
    let content = `# ${article.title}\n\n`;

    if (article.authors && article.authors.length > 0) {
      content += `**作者**: ${article.authors.join(", ")}\n\n`;
    }

    if (article.journal) {
      content += `**期刊**: ${article.journal}\n\n`;
    }

    if (article.publicationDate) {
      content += `**发表日期**: ${article.publicationDate}\n\n`;
    }

    if (article.doi) {
      content += `**DOI**: ${article.doi}\n\n`;
    }

    content += `## 摘要\n\n${article.content}\n\n`;

    content += `## 来源\n\n- 原文链接: ${article.url}\n`;

    return content;
  }

  /**
   * 格式化项目内容
   */
  private formatProjectContent(project: MedicalBeautyProject): string {
    let content = `# ${project.name}\n\n`;

    content += `## 项目介绍\n\n${project.description}\n\n`;

    if (project.principle) {
      content += `## 技术原理\n\n${project.principle}\n\n`;
    }

    if (project.suitableFor) {
      content += `## 适合人群\n\n${project.suitableFor}\n\n`;
    }

    if (project.contraindications) {
      content += `## 禁忌症\n\n${project.contraindications}\n\n`;
    }

    if (project.effects) {
      content += `## 治疗效果\n\n${project.effects}\n\n`;
    }

    if (project.risks) {
      content += `## 风险提示\n\n${project.risks}\n\n`;
    }

    if (project.price) {
      content += `## 价格参考\n\n${project.price}\n\n`;
    }

    return content;
  }

  /**
   * 生成摘要
   */
  private generateSummary(content: string, maxLength: number = 200): string {
    if (content.length <= maxLength) {
      return content;
    }
    
    // 简单截取，实际可以使用更智能的摘要算法
    return content.substring(0, maxLength) + "...";
  }

  /**
   * 提取关键词
   */
  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ') // 保留中文和英文单词
      .split(/\s+/)
      .filter(word => word.length > 1);
    
    // 简单的词频统计（实际可以使用TF-IDF等算法）
    const wordCount: Record<string, number> = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    // 返回出现次数最多的前5个词
    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 主函数
async function main() {
  try {
    const organizer = new DataOrganizer();
    await organizer.organizeAllData();
    
    console.log("\n🎯 下一步操作：");
    console.log("1. 运行向量索引生成: npm run knowledge:index");
    console.log("2. 启动服务器: npm run dev");
    console.log("3. 访问知识库查看整理后的数据");
    
  } catch (error) {
    console.error("❌ 主程序执行失败:", error);
    process.exit(1);
  }
}

// 执行
main();