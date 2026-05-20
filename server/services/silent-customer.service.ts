/**
 * Silent Customer Service — 沉默客户巡检
 * 识别三类沉默客户：已留资未转化 / 逾期未跟进 / 长时间未互动。
 */

import { desc } from "drizzle-orm";
import { getDb } from "../db";
import { leads } from "../../drizzle/schema";

export interface SilentCustomerReport {
  date: string;
  totalLeads: number;
  unconverted: {
    count: number;
    rows: Array<{ id: number; name: string; phone: string; tier: string; status: string; interested: string; lastContact: string }>;
  };
  staleFollowups: {
    count: number;
    rows: Array<{ id: number; name: string; phone: string; tier: string; followUpDate: string | null; status: string }>;
  };
  coldLeads: {
    count: number;
    daysThreshold: number;
    rows: Array<{ id: number; name: string; phone: string; tier: string; status: string; lastContact: string; daysSilent: number }>;
  };
  summary: string;
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86400_000).toISOString();
}

function daysSince(isoDate: string | null): number {
  if (!isoDate) return 999;
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400_000);
}

function parseServices(raw: string | null): string {
  if (!raw) return "未知";
  try { return JSON.parse(raw).join("、"); } catch { return raw; }
}

function buildSummary(report: Omit<SilentCustomerReport, "summary">): string {
  const lines: string[] = [];
  lines.push(`🔍 沉默客户巡检 — ${report.date}`);
  lines.push(`总线索: ${report.totalLeads}`);

  // 已留资未转化
  lines.push(`\n📋 已留资未转化 (${report.unconverted.count} 人)`);
  if (report.unconverted.count === 0) {
    lines.push("  ✅ 无");
  } else {
    report.unconverted.rows.slice(0, 5).forEach((l, i) => {
      lines.push(`  ${i + 1}. ${l.name} | ${l.tier}级 | ${l.status} | 意向: ${l.interested} | 最后联系: ${l.lastContact || "未知"}`);
    });
    if (report.unconverted.count > 5) lines.push(`  ... 还有 ${report.unconverted.count - 5} 人`);
  }

  // 逾期未跟进
  lines.push(`\n⏰ 逾期未跟进 (${report.staleFollowups.count} 人)`);
  if (report.staleFollowups.count === 0) {
    lines.push("  ✅ 无");
  } else {
    report.staleFollowups.rows.slice(0, 5).forEach((l, i) => {
      const fd = l.followUpDate ? l.followUpDate.slice(0, 10) : "未设置";
      lines.push(`  ${i + 1}. ${l.name} | ${l.tier}级 | ${l.status} | 应跟日期: ${fd}`);
    });
    if (report.staleFollowups.count > 5) lines.push(`  ... 还有 ${report.staleFollowups.count - 5} 人`);
  }

  // 长时间未互动
  const threshold = report.coldLeads.daysThreshold;
  lines.push(`\n❄️  ${threshold}+ 天未互动 (${report.coldLeads.count} 人)`);
  if (report.coldLeads.count === 0) {
    lines.push("  ✅ 无");
  } else {
    report.coldLeads.rows.slice(0, 5).forEach((l, i) => {
      lines.push(`  ${i + 1}. ${l.name} | ${l.tier}级 | ${l.status} | 静默 ${l.daysSilent} 天`);
    });
    if (report.coldLeads.count > 5) lines.push(`  ... 还有 ${report.coldLeads.count - 5} 人`);
  }

  // 行动建议
  const total = report.unconverted.count + report.staleFollowups.count + report.coldLeads.count;
  if (total > 0) {
    lines.push(`\n⚠️ 共 ${total} 人需要关注。建议优先处理逾期未跟进 → 已留资未转化 → 长时间未互动。`);
  } else {
    lines.push(`\n✅ 当前无沉默客户需处理。`);
  }

  return lines.join("\n");
}

export async function generateSilentCustomerReport(coldDaysThreshold = 30): Promise<SilentCustomerReport> {
  const db = await getDb();
  if (!db) {
    return {
      date: new Date().toISOString().slice(0, 10),
      totalLeads: 0,
      unconverted: { count: 0, rows: [] },
      staleFollowups: { count: 0, rows: [] },
      coldLeads: { count: 0, daysThreshold: coldDaysThreshold, rows: [] },
      summary: "数据库不可用",
    };
  }

  const allLeads = await db.select().from(leads).orderBy(desc(leads.createdAt));
  const now = new Date().toISOString();
  const coldSince = daysAgo(coldDaysThreshold);

  // 1. 已留资未转化（排除已转化的）
  const unconvertedLeads = allLeads.filter(l => l.status !== "converted");
  const unconverted = {
    count: unconvertedLeads.length,
    rows: unconvertedLeads.map(l => ({
      id: l.id,
      name: l.name,
      phone: l.phone,
      tier: l.customerTier || "未知",
      status: l.status,
      interested: parseServices(l.interestedServices),
      lastContact: l.updatedAt?.slice(0, 10) || "",
    })),
  };

  // 2. 逾期未跟进
  const staleLeads = allLeads.filter(l =>
    l.followUpDate && l.followUpDate < now && l.status !== "converted"
  );
  const staleFollowups = {
    count: staleLeads.length,
    rows: staleLeads.map(l => ({
      id: l.id,
      name: l.name,
      phone: l.phone,
      tier: l.customerTier || "未知",
      followUpDate: l.followUpDate,
      status: l.status,
    })),
  };

  // 3. 长时间未互动
  const coldLeadsRaw = allLeads.filter(l =>
    (!l.updatedAt || l.updatedAt < coldSince) && l.status !== "converted"
  );
  const coldLeads = {
    count: coldLeadsRaw.length,
    daysThreshold: coldDaysThreshold,
    rows: coldLeadsRaw.map(l => ({
      id: l.id,
      name: l.name,
      phone: l.phone,
      tier: l.customerTier || "未知",
      status: l.status,
      lastContact: l.updatedAt?.slice(0, 10) || "从未",
      daysSilent: daysSince(l.updatedAt),
    })),
  };

  const base = {
    date: new Date().toISOString().slice(0, 10),
    totalLeads: allLeads.length,
    unconverted,
    staleFollowups,
    coldLeads,
  };

  return { ...base, summary: buildSummary(base) };
}
