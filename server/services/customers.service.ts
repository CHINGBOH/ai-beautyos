/**
 * Customers Service
 * 客户管理业务逻辑；router 只负责鉴权与参数校验。
 */

import { desc } from "drizzle-orm";
import {
  getDb,
  getAllLeads,
  getLeadById,
  updateLead,
  getAllCustomers,
  getCustomerById as getCustomerRowById,
  updateCustomer as updateCustomerRow,
} from "../db";
import { leads } from "../../drizzle/schema";
import type { Customer } from "../../drizzle/schema";
import type { Lead } from "../../shared/api-types";

function normalizeCustomerTier(tier: string | null): string | null {
  if (!tier) return null;
  const normalized = tier.toUpperCase();
  if (["A", "B", "C", "D"].includes(normalized)) return normalized;
  if (tier === "vip") return "A";
  if (tier === "normal") return "B";
  return tier;
}

function customerToLead(customer: Customer): Lead {
  return {
    id: customer.id,
    airtableId: null,
    name: customer.name,
    phone: customer.phone,
    wechat: customer.wechat,
    age: customer.age,
    hood: customer.occupation,
    birthday: customer.birthday,
    importantHolidays: customer.tags,
    interestedServices: customer.tags,
    budget: customer.totalSpent ? `${customer.totalSpent}` : null,
    budgetLevel: customer.totalSpent && customer.totalSpent >= 50000 ? "高" : null,
    message: customer.notes,
    source: customer.source || "customers",
    sourceContent: null,
    status: customer.status || "active",
    psychologyType: null,
    psychologyTags: null,
    customerTier: normalizeCustomerTier(customer.tier),
    notes: customer.notes,
    followUpDate: null,
    conversationId: null,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
    syncedAt: null,
    convertedAt: null,
    convertedToCustomerId: customer.id,
  };
}

async function listCustomerRecords(): Promise<Lead[]> {
  const [leadRows, customerRows] = await Promise.all([
    getAllLeads(),
    getAllCustomers(undefined, undefined, 200, 0),
  ]);
  const mappedCustomers = customerRows.map(customerToLead);
  return [
    ...mappedCustomers,
    ...leadRows.filter(lead => !customerRows.some(customer => customer.phone === lead.phone)),
  ].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function listCustomers() {
  return listCustomerRecords();
}

export async function getCustomerById(id: number) {
  const lead = await getLeadById(id);
  if (lead) return lead;
  const customer = await getCustomerRowById(id);
  return customer ? customerToLead(customer) : null;
}

export async function updateCustomer(id: number, data: Record<string, unknown>) {
  const lead = await getLeadById(id);
  if (lead) return updateLead(id, data);

  const customer = await getCustomerRowById(id);
  if (!customer) return null;

  const customerUpdate: Parameters<typeof updateCustomerRow>[1] = {};
  if (typeof data.name === "string") customerUpdate.name = data.name;
  if (typeof data.wechat === "string" || data.wechat === null) customerUpdate.wechat = data.wechat ?? "";
  if (typeof data.birthday === "string" || data.birthday === null) customerUpdate.birthday = data.birthday ?? "";
  if (typeof data.age === "number") customerUpdate.age = data.age;
  if (typeof data.notes === "string" || data.notes === null) customerUpdate.notes = data.notes ?? "";
  if (typeof data.customerTier === "string" || data.customerTier === null) customerUpdate.tier = data.customerTier ?? "";
  if (typeof data.status === "string") customerUpdate.status = data.status;

  const updated = await updateCustomerRow(id, customerUpdate);
  return updated ? customerToLead(updated) : null;
}

export async function getCustomerStats() {
  const leads = await listCustomerRecords();
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
