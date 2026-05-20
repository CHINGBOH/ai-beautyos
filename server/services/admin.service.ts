/**
 * Admin Service
 * 管理员配置业务逻辑；router 只负责鉴权与参数校验。
 */

import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { systemConfig } from "../../drizzle/schema";
import { setupAirtableCRM } from "../airtable-setup";

// ---------------------------------------------------------------------------
// Airtable config
// ---------------------------------------------------------------------------

export async function saveAirtableConfig(token: string, baseId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const configValue = JSON.stringify({ token, baseId });
  const existing = await db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.configKey, "airtable"))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(systemConfig)
      .set({ configValue, updatedAt: new Date().toISOString() })
      .where(eq(systemConfig.configKey, "airtable"));
  } else {
    await db.insert(systemConfig).values({
      configKey: "airtable",
      configValue,
      description: "Airtable CRM integration configuration",
    });
  }
  return { success: true };
}

export async function getAirtableConfig() {
  const db = await getDb();
  if (!db) return { token: null, baseId: null };

  const result = await db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.configKey, "airtable"))
    .limit(1);

  if (result.length === 0) return { token: null, baseId: null };

  try {
    const config = JSON.parse(result[0]!.configValue || "{}");
    return { token: config.token || null, baseId: config.baseId || null };
  } catch {
    return { token: null, baseId: null };
  }
}

export async function testAirtableConnection(token: string, baseId: string) {
  try {
    const response = await fetch(
      `https://api.airtable.com/v0/meta/bases/${baseId}/tables`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `API 错误 (${response.status}): ${error}` };
    }
    const data = await response.json() as { tables?: Array<{ name: string }> };
    return { success: true, tables: data.tables?.map(t => t.name) || [] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "未知错误" };
  }
}

export async function setupAirtableTables(token: string, baseId: string) {
  return setupAirtableCRM({ token, baseId });
}
