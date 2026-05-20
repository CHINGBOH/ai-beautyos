/**
 * Content Strategy Service — 内容选题建议
 * 基于最近咨询高频项目 + 小红书内容表现 + 新增客户来源，生成选题建议。
 */

import { desc, eq, sql, and, gte } from "drizzle-orm";
import { getDb } from "../db";
import { leads, xiaohongshuPosts } from "../../drizzle/schema";
import { callQwen } from "../qwen";
import { getStats as getXiaohongshuStats } from "./xiaohongshu.service";

export interface ContentTopicReport {
  date: string;
  hotProjects: Array<{ project: string; count: number }>;
  xiaohongshuPerformance: {
    totalPosts: number; totalViews: number; totalLikes: number; totalComments: number; pendingComments: number;
  };
  topPerformingTopics: Array<{ project: string | null; title: string; views: number; likes: number }>;
  recentSourceChannels: Record<string, number>;
  suggestions: string; // LLM-generated
  summary: string;
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86400_000).toISOString();
}

export async function generateContentTopics(): Promise<ContentTopicReport> {
  const db = await getDb();
  if (!db) {
    return {
      date: new Date().toISOString().slice(0, 10),
      hotProjects: [],
      xiaohongshuPerformance: { totalPosts: 0, totalViews: 0, totalLikes: 0, totalComments: 0, pendingComments: 0 },
      topPerformingTopics: [],
      recentSourceChannels: {},
      suggestions: "数据库不可用",
      summary: "数据库不可用",
    };
  }

  // 1. 最近30天客户咨询的热门项目
  const recentLeads = await db.select().from(leads).where(
    and(
      gte(leads.createdAt, daysAgo(30)),
      eq(leads.status, "new")
    )
  );

  const projectMap: Record<string, number> = {};
  for (const l of recentLeads) {
    let services: string[] = [];
    try { services = JSON.parse(l.interestedServices || "[]"); } catch {
      services = (l.interestedServices || "").split(",").map((s: string) => s.trim()).filter(Boolean);
    }
    for (const s of services) {
      if (s) projectMap[s] = (projectMap[s] || 0) + 1;
    }
  }
  const hotProjects = Object.entries(projectMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([project, count]) => ({ project, count }));

  // 2. 小红书内容表现
  const xiaohongshuPerformance = await getXiaohongshuStats();

  // 3. 小红书表现最好的主题（按浏览量）
  const topPosts = await db
    .select({ title: xiaohongshuPosts.title, project: xiaohongshuPosts.project, viewCount: xiaohongshuPosts.viewCount, likeCount: xiaohongshuPosts.likeCount })
    .from(xiaohongshuPosts)
    .where(eq(xiaohongshuPosts.status, "published"))
    .orderBy(desc(xiaohongshuPosts.viewCount))
    .limit(5);

  const topPerformingTopics = topPosts.map(p => ({
    project: p.project,
    title: p.title,
    views: p.viewCount,
    likes: p.likeCount,
  }));

  // 4. 最近30天新增客户来源渠道
  const sourceChannels = recentLeads.reduce((acc: Record<string, number>, l) => {
    const source = l.source || "直接访问";
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {});

  // 5. LLM 生成选题建议
  let suggestions = "暂无数据，无法生成建议。";
  if (hotProjects.length > 0 || topPerformingTopics.length > 0) {
    const prompt = `你是一名医美机构的内容运营专家。请根据以下数据，生成5条本周可发布的小红书内容选题建议。

**最近30天客户咨询热门项目：**
${hotProjects.map(h => `- ${h.project}: ${h.count}次咨询`).join("\n") || "无数据"}

**小红书表现最好的内容：**
${topPerformingTopics.map(t => `- [${t.project || "通用"}] ${t.title} (${t.views} 浏览, ${t.likes} 赞)`).join("\n") || "无数据"}

**最近30天新增客户来源：**
${Object.entries(sourceChannels).map(([k, v]) => `- ${k}: ${v}人`).join("\n") || "无数据"}

**要求：**
1. 每条选题格式：话题标签 #xxx + 标题 + 一句话说明
2. 优先覆盖热门咨询项目
3. 参考高表现内容的成功模式
4. 针对新客户来源渠道优化内容方向
5. 直接输出5条选题，不要额外说明`;

    try {
      suggestions = await callQwen([{ role: "user", content: prompt }]);
    } catch {
      suggestions = "LLM 生成失败。建议手动基于热门项目生成内容。";
    }
  }

  const summary = [
    `📝 内容选题建议 — ${new Date().toISOString().slice(0, 10)}`,
    `\n🔥 热门项目: ${hotProjects.slice(0, 3).map(h => h.project).join("、") || "无"}`,
    `📊 小红书: ${xiaohongshuPerformance.totalPosts} 篇已发布, ${xiaohongshuPerformance.totalViews} 总浏览`,
    `\n💡 选题建议:\n${suggestions}`,
  ].join("\n");

  return {
    date: new Date().toISOString().slice(0, 10),
    hotProjects,
    xiaohongshuPerformance,
    topPerformingTopics,
    recentSourceChannels: sourceChannels,
    suggestions,
    summary,
  };
}
