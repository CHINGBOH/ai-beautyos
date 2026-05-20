/**
 * Todo Draft Service — 今日跟进待办草稿
 * 合并高意向、逾期未跟、未转化客户，按优先级排序生成今日任务清单。
 */

import { desc } from "drizzle-orm";
import { getDb } from "../db";
import { leads } from "../../drizzle/schema";
import { getTodayPriorities } from "./analytics.service";
import { getHighIntentCustomers } from "./customers.service";

export interface TodoDraftItem {
  id: number;
  name: string;
  phone: string;
  tier: string;
  status: string;
  psychologyType: string | null;
  interestedServices: string;
  reason: string;       // why this customer is on the list
  priority: number;      // 1=最高, 2=高, 3=中
  followUpDate: string | null;
  lastContact: string;
  daysSinceContact: number;
}

export interface TodoDraftReport {
  date: string;
  totalTasks: number;
  priorities: Array<{ level: "high" | "medium" | "low"; text: string }>;
  urgent: TodoDraftItem[];      // priority 1 — today
  important: TodoDraftItem[];    // priority 2 — this week
  normal: TodoDraftItem[];       // priority 3 — keep in view
  summary: string;
}

function daysSince(isoDate: string | null): number {
  if (!isoDate) return 999;
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400_000);
}

function parseServices(raw: string | null): string {
  if (!raw) return "未知";
  try { return JSON.parse(raw).join("、"); } catch { return raw; }
}

function buildSummary(report: Omit<TodoDraftReport, "summary">): string {
  const lines: string[] = [];
  lines.push(`✅ 今日跟进待办 — ${report.date}`);
  lines.push(`共 ${report.totalTasks} 个任务：🔥紧急 ${report.urgent.length} | ⚡重要 ${report.important.length} | 📋关注 ${report.normal.length}`);

  if (report.priorities.length > 0) {
    lines.push(`\n⚠️ 系统提醒`);
    report.priorities.forEach(p => {
      const icon = p.level === "high" ? "🔴" : p.level === "medium" ? "🟡" : "🟢";
      lines.push(`  ${icon} ${p.text}`);
    });
  }

  if (report.urgent.length > 0) {
    lines.push(`\n🔥 紧急 — 今天必须跟进`);
    report.urgent.forEach((l, i) => {
      lines.push(`  ${i + 1}. ${l.name} | ${l.tier}级 | ${l.psychologyType || "未知"} | 静默${l.daysSinceContact}天`);
      lines.push(`     理由: ${l.reason} | 意向: ${l.interestedServices}`);
    });
  }

  if (report.important.length > 0) {
    lines.push(`\n⚡ 重要 — 本周内跟进`);
    report.important.slice(0, 5).forEach((l, i) => {
      lines.push(`  ${i + 1}. ${l.name} | ${l.tier}级 | ${l.status} | ${l.reason}`);
    });
    if (report.important.length > 5) lines.push(`  ... 还有 ${report.important.length - 5} 人`);
  }

  if (report.normal.length > 0) {
    lines.push(`\n📋 关注 — 保持联系`);
    report.normal.slice(0, 3).forEach((l, i) => {
      lines.push(`  ${i + 1}. ${l.name} | ${l.tier}级 | ${l.status}`);
    });
    if (report.normal.length > 3) lines.push(`  ... 还有 ${report.normal.length - 3} 人`);
  }

  if (report.totalTasks === 0) {
    lines.push(`\n✅ 当前无待跟进任务。`);
  }

  return lines.join("\n");
}

export async function generateTodoDraft(): Promise<TodoDraftReport> {
  const db = await getDb();
  const priorities = await getTodayPriorities();

  if (!db) {
    return {
      date: new Date().toISOString().slice(0, 10),
      totalTasks: 0,
      priorities: priorities.priorities ?? [],
      urgent: [],
      important: [],
      normal: [],
      summary: "数据库不可用",
    };
  }

  const allLeads = await db.select().from(leads).orderBy(desc(leads.createdAt));
  const now = new Date().toISOString();

  const items: TodoDraftItem[] = [];

  for (const l of allLeads) {
    if (l.status === "converted") continue;

    const tier = l.customerTier || "D";
    const followUpPassed = l.followUpDate && l.followUpDate < now;
    const daysQuiet = daysSince(l.updatedAt);
    const hasNoContact = !l.updatedAt;

    let reason = "";
    let priority = 3;

    // Priority scoring
    if (tier === "A") {
      priority = followUpPassed ? 1 : 2;
      reason = followUpPassed ? "A级客户逾期未跟进" : "A级高意向客户待跟进";
    } else if (tier === "B") {
      priority = followUpPassed ? 1 : 2;
      reason = followUpPassed ? "B级客户逾期未跟进" : "B级客户待跟进";
    } else if (followUpPassed) {
      priority = 2;
      reason = "逾期未跟进";
    } else if (hasNoContact || daysQuiet > 14) {
      priority = 2;
      reason = hasNoContact ? "从未联系" : `静默 ${daysQuiet} 天`;
    } else if (l.status === "new") {
      priority = 3;
      reason = "新线索待联系";
    } else if (daysQuiet > 7) {
      priority = 3;
      reason = `静默 ${daysQuiet} 天`;
    } else {
      continue; // no action needed
    }

    items.push({
      id: l.id,
      name: l.name,
      phone: l.phone,
      tier,
      status: l.status,
      psychologyType: l.psychologyType,
      interestedServices: parseServices(l.interestedServices),
      reason,
      priority,
      followUpDate: l.followUpDate?.slice(0, 10) ?? null,
      lastContact: l.updatedAt?.slice(0, 10) || "从未",
      daysSinceContact: daysQuiet,
    });
  }

  // Sort by priority (1 first), then by tier (A > B > C > D), then by days since contact (most first)
  const tierOrder = { A: 0, B: 1, C: 2, D: 3 };
  items.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const ta = tierOrder[a.tier as keyof typeof tierOrder] ?? 4;
    const tb = tierOrder[b.tier as keyof typeof tierOrder] ?? 4;
    if (ta !== tb) return ta - tb;
    return b.daysSinceContact - a.daysSinceContact;
  });

  const urgent = items.filter(i => i.priority === 1);
  const important = items.filter(i => i.priority === 2);
  const normal = items.filter(i => i.priority === 3);

  const base = {
    date: new Date().toISOString().slice(0, 10),
    totalTasks: items.length,
    priorities: priorities.priorities ?? [],
    urgent,
    important,
    normal,
  };

  return { ...base, summary: buildSummary(base) };
}
