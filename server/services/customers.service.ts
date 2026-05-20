/**
 * Customers Service
 * 客户管理业务逻辑；router 只负责鉴权与参数校验。
 */

import { desc } from "drizzle-orm";
import { getDb, getAllLeads, getLeadById, updateLead } from "../db";
import { leads } from "../../drizzle/schema";

export async function listCustomers() {
  return getAllLeads();
}

export async function getCustomerById(id: number) {
  return getLeadById(id);
}

export async function updateCustomer(id: number, data: Record<string, unknown>) {
  return updateLead(id, data);
}

export async function getCustomerStats() {
  const leads = await getAllLeads();
  return {
    total: leads.length,
    tierA: leads.filter(l => l.customerTier === "A").length,
    tierB: leads.filter(l => l.customerTier === "B").length,
    tierC: leads.filter(l => l.customerTier === "C").length,
    tierD: leads.filter(l => l.customerTier === "D").length,
    恐惧型: leads.filter(l => l.psychologyType === "恐惧型").length,
    贪婪型: leads.filter(l => l.psychologyType === "贪婪型").length,
    安全型: leads.filter(l => l.psychologyType === "安全型").length,
    敏感型: leads.filter(l => l.psychologyType === "敏感型").length,
  };
}

/** 高意向客户：A/B 级且尚未转化 */
export async function getHighIntentCustomers(limit = 20) {
  const leads = await getAllLeads();
  return leads
    .filter(l => (l.customerTier === "A" || l.customerTier === "B") && l.status !== "converted")
    .slice(0, limit);
}

/** 带过滤的客户搜索（供 Tool Server 调用） */
export async function searchCustomers(input: { limit?: number; channel?: string; tier?: string }) {
  const limit = Math.min(input.limit ?? 20, 50);
  const db = await getDb();
  if (!db) return { rows: [], total: 0 };

  const allLeads = await db.select().from(leads).orderBy(desc(leads.createdAt));
  let filtered = allLeads as typeof allLeads;
  if (input.channel) filtered = filtered.filter(l => l.source?.includes(input.channel!));
  if (input.tier) filtered = filtered.filter(l => l.customerTier === input.tier);

  const rows = filtered.slice(0, limit).map(l => ({
    id: l.id,
    name: l.name,
    phone: l.phone,
    channel: l.source,
    tier: l.customerTier,
    psychologyType: l.psychologyType,
    status: l.status,
    lastContactAt: l.updatedAt,
  }));
  return { rows, total: filtered.length };
}

/** 咨询过某项目但尚未转化的线索 */
export async function getUnconvertedByProject(project: string, limit = 20) {
  const leads = await getAllLeads();
  return leads
    .filter(l => {
      if (l.status === "converted") return false;
      try {
        const services: string[] = JSON.parse(l.interestedServices || "[]");
        return services.some(s => s.includes(project));
      } catch {
        return (l.interestedServices || "").includes(project);
      }
    })
    .slice(0, limit);
}
