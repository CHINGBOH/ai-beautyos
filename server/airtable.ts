/**
 * Airtable API 集成工具
 * 用于与 Airtable 进行数据同步
 */

import { getDb } from "./db";
import { systemConfig } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const AIRTABLE_API_URL = "https://api.airtable.com/v0";

/**
 * 从数据库获取 Airtable 配置
 */
async function getAirtableConfig(): Promise<{ token: string; baseId: string } | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.configKey, "airtable"))
    .limit(1);

  if (result.length === 0) return null;

  try {
    const config = JSON.parse(result[0]!.configValue || "{}");
    if (!config.token || !config.baseId) return null;
    return { token: config.token, baseId: config.baseId };
  } catch {
    return null;
  }
}

interface AirtableRecord {
  id?: string;
  fields: Record<string, unknown>;
  createdTime?: string;
}

interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}

/**
 * 创建 Airtable 记录
 */
export async function createAirtableRecord(
  tableName: string,
  fields: Record<string, unknown>
): Promise<AirtableRecord> {
  const config = await getAirtableConfig();
  if (!config) {
    throw new Error("Airtable credentials not configured");
  }

  const url = `${AIRTABLE_API_URL}/${config.baseId}/${encodeURIComponent(tableName)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      records: [{ fields }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Airtable API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as AirtableResponse;
  return data.records[0]!;
}

/**
 * 获取 Airtable 记录
 */
export async function getAirtableRecords(
  tableName: string,
  filterFormula?: string,
  maxRecords?: number
): Promise<AirtableRecord[]> {
  const config = await getAirtableConfig();
  if (!config) {
    throw new Error("Airtable credentials not configured");
  }

  const params = new URLSearchParams();
  if (filterFormula) params.append("filterByFormula", filterFormula);
  if (maxRecords) params.append("maxRecords", maxRecords.toString());

  const url = `${AIRTABLE_API_URL}/${config.baseId}/${encodeURIComponent(tableName)}?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${config.token}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Airtable API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as AirtableResponse;
  return data.records;
}

/**
 * 更新 Airtable 记录
 */
export async function updateAirtableRecord(
  tableName: string,
  recordId: string,
  fields: Record<string, unknown>
): Promise<AirtableRecord> {
  const config = await getAirtableConfig();
  if (!config) {
    throw new Error("Airtable credentials not configured");
  }

  const url = `${AIRTABLE_API_URL}/${config.baseId}/${encodeURIComponent(tableName)}/${recordId}`;

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Airtable API error: ${response.status} - ${error}`);
  }

  return (await response.json()) as AirtableRecord;
}

/**
 * 创建线索到 Airtable
 */
export async function createLeadInAirtable(leadData: {
  name: string;
  phone: string;
  wechat?: string;
  interestedServices?: string[];
  budget?: string;
  message?: string;
  source: string;
  sourceContent?: string;
}): Promise<string> {
  const fields: Record<string, unknown> = {
    "姓名": leadData.name,
    "手机号": leadData.phone,
    "来源渠道": leadData.source,
    "线索状态": "新线索",
  };

  if (leadData.wechat) fields["微信号"] = leadData.wechat;
  if (leadData.interestedServices && leadData.interestedServices.length > 0) {
    fields["意向项目"] = leadData.interestedServices;
  }
  if (leadData.budget) fields["预算区间"] = leadData.budget;
  if (leadData.message) fields["留言内容"] = leadData.message;
  if (leadData.sourceContent) fields["来源内容"] = leadData.sourceContent;

  const record = await createAirtableRecord("线索池", fields);
  return record.id!;
}

/**
 * 获取线索列表
 */
export async function getLeadsFromAirtable(status?: string): Promise<AirtableRecord[]> {
  let filterFormula = "";
  if (status) {
    filterFormula = `{线索状态} = '${status}'`;
  }
  return getAirtableRecords("线索池", filterFormula);
}

/**
 * 更新线索状态
 */
export async function updateLeadStatus(
  recordId: string,
  status: string
): Promise<AirtableRecord> {
  return updateAirtableRecord("线索池", recordId, {
    "线索状态": status,
  });
}

/**
 * 将对话同步到 Airtable
 */
export async function syncConversationToAirtable(conversationData: {
  sessionId: string;
  visitorName?: string;
  visitorPhone?: string;
  visitorWechat?: string;
  messages: Array<{ role: string; content: string; createdAt: Date }>;
  source: string;
}): Promise<string | null> {
  try {
    const config = await getAirtableConfig();
    if (!config) {
      console.warn("[Airtable] Configuration not found, skipping sync");
      return null;
    }

    // 构建对话摘要
    const messageSummary = conversationData.messages
      .map((m) => `[${m.role}] ${m.content.substring(0, 100)}...`)
      .join("\n");

    const fields: Record<string, unknown> = {
      "会话ID": conversationData.sessionId,
      "来源渠道": conversationData.source,
      "对话摘要": messageSummary,
      "消息数量": conversationData.messages.length,
      "创建时间": conversationData.messages[0]?.createdAt.toISOString(),
    };

    if (conversationData.visitorName) fields["访客姓名"] = conversationData.visitorName;
    if (conversationData.visitorPhone) fields["访客手机"] = conversationData.visitorPhone;
    if (conversationData.visitorWechat) fields["访客微信"] = conversationData.visitorWechat;

    const record = await createAirtableRecord("对话记录", fields);
    return record.id!;
  } catch (error) {
    console.error("[Airtable] Failed to sync conversation:", error);
    return null;
  }
}

/**
 * 从 Airtable 读取客户历史记录
 */
export async function getCustomerHistoryFromAirtable(phone: string): Promise<{
  leads: AirtableRecord[];
  conversations: AirtableRecord[];
} | null> {
  try {
    const config = await getAirtableConfig();
    if (!config) {
      console.warn("[Airtable] Configuration not found, skipping history fetch");
      return null;
    }

    // 获取客户的线索记录
    const leads = await getAirtableRecords(
      "线索池",
      `{手机号} = '${phone}'`,
      10
    );

    // 获取客户的对话记录
    const conversations = await getAirtableRecords(
      "对话记录",
      `{访客手机} = '${phone}'`,
      10
    );

    return { leads, conversations };
  } catch (error) {
    console.error("[Airtable] Failed to fetch customer history:", error);
    return null;
  }
}

/**
 * 更新 Airtable 中的客户画像
 */
export async function updateCustomerProfileInAirtable(
  recordId: string,
  profile: {
    psychologyType?: string;
    psychologyTags?: string[];
    customerTier?: string;
    budgetLevel?: string;
    notes?: string;
  }
): Promise<boolean> {
  try {
    const fields: Record<string, unknown> = {};

    if (profile.psychologyType) fields["心理类型"] = profile.psychologyType;
    if (profile.psychologyTags) fields["心理标签"] = profile.psychologyTags;
    if (profile.customerTier) fields["客户分层"] = profile.customerTier;
    if (profile.budgetLevel) fields["消费能力"] = profile.budgetLevel;
    if (profile.notes) fields["备注"] = profile.notes;

    await updateAirtableRecord("线索池", recordId, fields);
    return true;
  } catch (error) {
    console.error("[Airtable] Failed to update customer profile:", error);
    return false;
  }
}
