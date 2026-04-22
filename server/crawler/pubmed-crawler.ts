/**
 * PubMed学术论文爬虫
 * 爬取PubMed上的学术论文信息
 */

import { BaseCrawler, CrawledData } from "./base-crawler";
import { logger } from "../_core/logger";

export interface PubMedSearchOptions {
  /** 搜索关键词 */
  query: string;
  /** 返回数量 */
  retmax?: number;
  /** 排序方式 */
  sort?: "relevance" | "pub_date";
  /** 日期范围 */
  dateRange?: {
    start: string; // YYYY/MM/DD
    end: string; // YYYY/MM/DD
  };
}

export interface PubMedArticle {
  id: string;
  title: string;
  abstract: string;
  authors: string[];
  journal: string;
  publicationDate: string;
  doi?: string;
  pmid: string;
  keywords: string[];
}

export class PubMedCrawler extends BaseCrawler {
  private readonly baseUrl = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

  /**
   * 搜索论文
   */
  async search(options: PubMedSearchOptions): Promise<PubMedArticle[]> {
    logger.info(`[PubMedCrawler] 搜索: ${options.query}`);

    // 第一步：搜索并获取PMID列表
    const searchUrl = `${this.baseUrl}/esearch.fcgi`;
    const searchParams = new URLSearchParams({
      db: "pubmed",
      term: options.query,
      retmax: String(options.retmax ?? 20),
      retmode: "json",
      sort: options.sort ?? "relevance",
    });

    if (options.dateRange) {
      searchParams.append("mindate", options.dateRange.start);
      searchParams.append("maxdate", options.dateRange.end);
      searchParams.append("datetype", "pdat");
    }

    const searchResponse = await this.fetchJson<{
      esearchresult: { idlist: string[] };
    }>(`${searchUrl}?${searchParams.toString()}`);

    const pmids = searchResponse.esearchresult?.idlist || [];
    logger.info(`[PubMedCrawler] 找到 ${pmids.length} 篇论文`);

    if (pmids.length === 0) {
      return [];
    }

    // 第二步：获取论文详情
    return await this.fetchArticles(pmids);
  }

  /**
   * 获取论文详情
   */
  async fetchArticles(pmids: string[]): Promise<PubMedArticle[]> {
    const fetchUrl = `${this.baseUrl}/efetch.fcgi`;
    const params = new URLSearchParams({
      db: "pubmed",
      id: pmids.join(","),
      retmode: "xml",
    });

    const xmlText = await this.fetchHtml(`${fetchUrl}?${params.toString()}`);
    return this.parseXml(xmlText);
  }

  /**
   * 解析XML格式的论文数据
   * 注意：这里简化处理，实际应该使用xml2js或类似库
   */
  private parseXml(xml: string): PubMedArticle[] {
    // 简化实现：使用正则提取关键信息
    // 实际项目中应该使用xml2js库解析
    const articles: PubMedArticle[] = [];

    // 提取PMID
    const pmidMatches = xml.matchAll(/<PMID[^>]*>(\d+)<\/PMID>/g);
    const pmids = Array.from(pmidMatches, (m) => m[1]);

    for (const pmid of pmids) {
      // 提取标题
      const titleMatch = xml.match(new RegExp(`<PMID[^>]*>${pmid}</PMID>[\\s\\S]*?<ArticleTitle[^>]*>(.*?)</ArticleTitle>`, "i"));
      const title = titleMatch ? this.cleanXmlText(titleMatch[1]) : "";

      // 提取摘要
      const abstractMatch = xml.match(new RegExp(`<PMID[^>]*>${pmid}</PMID>[\\s\\S]*?<AbstractText[^>]*>(.*?)</AbstractText>`, "i"));
      const abstract = abstractMatch ? this.cleanXmlText(abstractMatch[1]) : "";

      // 提取作者
      const authorMatches = xml.matchAll(
        new RegExp(`<PMID[^>]*>${pmid}</PMID>[\\s\\S]*?<Author[^>]*>[\\s\\S]*?<LastName>(.*?)</LastName>[\\s\\S]*?<ForeName>(.*?)</ForeName>`, "gi")
      );
      const authors = Array.from(authorMatches, (m) => `${this.cleanXmlText(m[2])} ${this.cleanXmlText(m[1])}`);

      // 提取期刊
      const journalMatch = xml.match(new RegExp(`<PMID[^>]*>${pmid}</PMID>[\\s\\S]*?<Title>(.*?)</Title>`, "i"));
      const journal = journalMatch ? this.cleanXmlText(journalMatch[1]) : "";

      // 提取日期
      const dateMatch = xml.match(new RegExp(`<PMID[^>]*>${pmid}</PMID>[\\s\\S]*?<PubDate[^>]*>[\\s\\S]*?<Year>(\\d+)</Year>[\\s\\S]*?<Month>(\\d+)</Month>`, "i"));
      const publicationDate = dateMatch ? `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}` : "";

      // 提取DOI
      const doiMatch = xml.match(new RegExp(`<PMID[^>]*>${pmid}</PMID>[\\s\\S]*?<ArticleId[^>]*IdType="doi"[^>]*>(.*?)</ArticleId>`, "i"));
      const doi = doiMatch ? this.cleanXmlText(doiMatch[1]) : undefined;

      articles.push({
        id: pmid,
        pmid,
        title,
        abstract,
        authors,
        journal,
        publicationDate,
        doi,
        keywords: [], // 需要额外解析
      });
    }

    return articles;
  }

  /**
   * 清理XML文本
   */
  private cleanXmlText(text: string): string {
    return text
      .replace(/<[^>]+>/g, "") // 移除HTML标签
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  /**
   * 爬取单个论文（通过URL或PMID）
   */
  async crawl(urlOrPmid: string): Promise<CrawledData> {
    let pmid: string;

    // 判断是URL还是PMID
    if (urlOrPmid.startsWith("http")) {
      // 从URL提取PMID - 支持多种URL格式
      // https://pubmed.ncbi.nlm.nih.gov/37375394/
      // https://pubmed.ncbi.nlm.nih.gov/37375394
      // https://www.ncbi.nlm.nih.gov/pubmed/37375394
      // 优先匹配 pubmed.ncbi.nlm.nih.gov/ 后面的数字
      // 或者匹配 /pubmed/ 后面的数字
      // 或者匹配URL末尾的数字
      let pmidMatch = urlOrPmid.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i);
      if (!pmidMatch) {
        pmidMatch = urlOrPmid.match(/\/pubmed[\/\?](\d+)/i);
      }
      if (!pmidMatch) {
        // 最后尝试匹配URL末尾的数字
        pmidMatch = urlOrPmid.match(/\/(\d+)\/?$/);
      }
      if (!pmidMatch) {
        throw new Error(`无效的PubMed URL: ${urlOrPmid}`);
      }
      pmid = pmidMatch[1];
    } else if (/^\d+$/.test(urlOrPmid)) {
      // 直接是PMID
      pmid = urlOrPmid;
    } else {
      throw new Error(`无效的PubMed URL或PMID: ${urlOrPmid}`);
    }

    const articles = await this.fetchArticles([pmid]);
    if (articles.length === 0) {
      throw new Error(`未找到论文: ${urlOrPmid}`);
    }

    const article = articles[0];

    // 构建标准URL
    const url = `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;

    return {
      url,
      title: article.title,
      content: article.abstract,
      metadata: {
        authors: article.authors,
        journal: article.journal,
        publicationDate: article.publicationDate,
        doi: article.doi,
        pmid: article.pmid,
        keywords: article.keywords,
      },
      crawledAt: new Date(),
    };
  }
}
