/**
 * Daily Report Service
 * 经营日报聚合逻辑 — 组装 analytics + customers 数据为结构化日报。
 */

import { getOverview, getBusinessOverview, getTodayPriorities } from "./analytics.service";
import { getCustomerStats, getHighIntentCustomers } from "./customers.service";

export interface DailyReport {
  date: string;
  today: {
    newCustomers: number;
    conversions: number;
    pendingFollowups: number;
    staleFollowups: number;
    totalLeads: number;
  };
  channelDistribution: Record<string, number>;
  projectDistribution: Record<string, number>;
  tierDistribution: {
    A: number; B: number; C: number; D: number;
  };
  highIntentLeads: Array<{
    id: number;
    name: string;
    phone: string;
    source: string;
    tier: string;
    psychologyType: string;
    status: string;
    interestedServices: string[];
  }>;
  priorities: Array<{ level: "high" | "medium" | "low"; text: string }>;
  summary: string;
}

function buildSummary(report: Omit<DailyReport, "summary">): string {
  const lines: string[] = [];
  lines.push(`📊 今日经营日报 — ${report.date}`);

  // 今日概况
  const t = report.today;
  lines.push(`\n📈 今日概况`);
  lines.push(`  新增客户: ${t.newCustomers}  |  总线索: ${t.totalLeads}`);
  lines.push(`  待跟进: ${t.pendingFollowups}  |  逾期未跟: ${t.staleFollowups}  |  今日转化: ${t.conversions}`);

  // 渠道分布
  const channels = Object.entries(report.channelDistribution).sort((a, b) => b[1] - a[1]);
  if (channels.length > 0) {
    lines.push(`\n📡 渠道来源`);
    channels.slice(0, 5).forEach(([ch, n]) => lines.push(`  ${ch}: ${n}`));
  }

  // 意向项目
  const projects = Object.entries(report.projectDistribution).sort((a, b) => b[1] - a[1]);
  if (projects.length > 0) {
    lines.push(`\n💉 热门意向项目`);
    projects.slice(0, 5).forEach(([p, n]) => lines.push(`  ${p}: ${n}`));
  }

  // 等级分布
  lines.push(`\n🏷️ 客户等级  A:${report.tierDistribution.A}  B:${report.tierDistribution.B}  C:${report.tierDistribution.C}  D:${report.tierDistribution.D}`);

  // 高意向客户
  if (report.highIntentLeads.length > 0) {
    lines.push(`\n🎯 明日最值得跟进 (${report.highIntentLeads.length} 位)`);
    report.highIntentLeads.slice(0, 5).forEach((l, i) => {
      const projects = l.interestedServices?.join("、") || "未知";
      lines.push(`  ${i + 1}. ${l.name} | ${l.tier}级 | ${l.psychologyType || "未知"} | ${projects}`);
    });
  }

  // 优先级
  if (report.priorities.length > 0) {
    lines.push(`\n⚠️ 操作提醒`);
    report.priorities.forEach(p => lines.push(`  [${p.level === "high" ? "高" : p.level === "medium" ? "中" : "低"}] ${p.text}`));
  }

  return lines.join("\n");
}

export async function generateDailyReport(): Promise<DailyReport> {
  const today = new Date().toISOString().slice(0, 10);

  // 并行获取所有数据
  const [overview, businessOverview, stats, highIntent, priorities] = await Promise.all([
    getOverview(),
    getBusinessOverview(1),
    getCustomerStats(),
    getHighIntentCustomers(10),
    getTodayPriorities(),
  ]);

  const highIntentWithServices = highIntent.map((l: any) => {
    let services: string[] = [];
    try { services = JSON.parse(l.interestedServices || "[]"); } catch {
      services = (l.interestedServices || "").split(",").map((s: string) => s.trim()).filter(Boolean);
    }
    return {
      id: l.id,
      name: l.name,
      phone: l.phone,
      source: l.source,
      tier: l.customerTier,
      psychologyType: l.psychologyType,
      status: l.status,
      interestedServices: services,
    };
  });

  const base: Omit<DailyReport, "summary"> = {
    date: today,
    today: businessOverview,
    channelDistribution: overview.sourceDistribution,
    projectDistribution: overview.projectDistribution,
    tierDistribution: {
      A: stats.tierA, B: stats.tierB, C: stats.tierC, D: stats.tierD,
    },
    highIntentLeads: highIntentWithServices,
    priorities: priorities.priorities ?? [],
  };

  return { ...base, summary: buildSummary(base) };
}
