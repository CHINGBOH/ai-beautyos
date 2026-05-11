import { getDb } from "./db";
import { weworkConfig, weworkContactWay, weworkCustomers, weworkMessages } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * 企业微信数据库操作
 */

// ========== 配置管理 ==========

export async function getWeworkConfig() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const configs = await db.select().from(weworkConfig).where(eq(weworkConfig.isActive, 1)).limit(1);
  return configs[0] || null;
}

export async function saveWeworkConfig(data: {
  corpId?: string;
  corpSecret?: string;
  agentId?: number;
  token?: string;
  encodingAesKey?: string;
  isMockMode?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getWeworkConfig();
  
  if (existing) {
    await db.update(weworkConfig)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(weworkConfig.id, existing.id));
    return { ...existing, ...data };
  } else {
    const result = await db.insert(weworkConfig).values(data).returning({ id: weworkConfig.id });
    return { id: result[0]?.id || 0, ...data };
  }
}

export async function updateAccessToken(accessToken: string, expiresIn: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const config = await getWeworkConfig();
  if (!config) throw new Error("企业微信配置不存在");
  
  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  await db.update(weworkConfig)
    .set({ accessToken, tokenExpiresAt: expiresAt, updatedAt: new Date() })
    .where(eq(weworkConfig.id, config.id));
}

// ========== "联系我"配置管理 ==========

export async function createContactWay(data: {
  configId: string;
  type?: "single" | "multi";
  scene?: "1" | "2";
  qrCode?: string;
  remark?: string;
  skipVerify?: number;
  state?: string;
  userIds?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(weworkContactWay).values(data).returning({ id: weworkContactWay.id });
  return { id: result[0]?.id || 0, ...data };
}

export async function getContactWay(configId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const ways = await db.select().from(weworkContactWay)
    .where(eq(weworkContactWay.configId, configId))
    .limit(1);
  return ways[0] || null;
}

export async function listContactWays() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(weworkContactWay)
    .where(eq(weworkContactWay.isActive, 1));
}

export async function deleteContactWay(configId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(weworkContactWay)
    .set({ isActive: 0, updatedAt: new Date() })
    .where(eq(weworkContactWay.configId, configId));
}

// ========== 客户管理 ==========

export async function createWeworkCustomer(data: {
  externalUserId: string;
  name?: string;
  avatar?: string;
  type?: "1" | "2";
  gender?: "0" | "1" | "2";
  unionId?: string;
  position?: string;
  corpName?: string;
  corpFullName?: string;
  externalProfile?: string;
  followUserId?: string;
  remark?: string;
  description?: string;
  createTime?: Date;
  tags?: string;
  state?: string;
  conversationId?: number;
  leadId?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(weworkCustomers).values(data).returning({ id: weworkCustomers.id });
  return { id: result[0]?.id || 0, ...data };
}

export async function getWeworkCustomer(externalUserId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const customers = await db.select().from(weworkCustomers)
    .where(eq(weworkCustomers.externalUserId, externalUserId))
    .limit(1);
  return customers[0] || null;
}

export async function listWeworkCustomers() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(weworkCustomers);
}

export async function updateWeworkCustomer(externalUserId: string, data: Partial<typeof weworkCustomers.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(weworkCustomers)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(weworkCustomers.externalUserId, externalUserId));
}

// ========== 消息管理 ==========

export async function createWeworkMessage(data: {
  externalUserId: string;
  sendUserId: string;
  msgType: string;
  content: string;
  status?: "pending" | "sent" | "failed";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(weworkMessages).values(data).returning({ id: weworkMessages.id });
  return { id: result[0]?.id || 0, ...data };
}

export async function updateMessageStatus(id: number, status: "sent" | "failed", errorMsg?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(weworkMessages)
    .set({ status, errorMsg, sentAt: new Date() })
    .where(eq(weworkMessages.id, id));
}

export async function listWeworkMessages(externalUserId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (externalUserId) {
    return await db.select().from(weworkMessages)
      .where(eq(weworkMessages.externalUserId, externalUserId));
  }
  return await db.select().from(weworkMessages);
}
