import { eq, desc, and, or, like, ilike, isNull, sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core"; // @ts-ignore - drizzle-orm internal type
import {
  InsertUser,
  users,
  knowledgeBase,
  InsertKnowledgeBase,
  conversations,
  InsertConversation,
  messages,
  InsertMessage,
  leads,
  InsertLead,
  InsertXiaohongshuPost,
  InsertTrigger,
  InsertTriggerExecution,
  InsertWebsiteContent,
  InsertWebsiteNavigation,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { logger } from "./_core/logger";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // 设置连接超时和池配置
      const client = postgres(process.env.DATABASE_URL, {
        max: parseInt(process.env.DB_POOL_SIZE || "10"),
        idle_timeout: 20,
        connect_timeout: 10,
      });
      _db = drizzle(client);

      // 测试连接
      await client`SELECT 1`;
      logger.info("[Database] Connected successfully");
    } catch (error) {
      logger.error("[Database] Failed to connect:", error);
      _db = null;
      throw new Error(`Database connection failed: ${error}`);
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    logger.warn("[Database] Cannot upsert user: database not available");
    throw new Error("Database connection is not available");
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date().toISOString();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date().toISOString();
    }

    // PostgreSQL使用ON CONFLICT替代onDuplicateKeyUpdate
    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    logger.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    logger.warn("[Database] Cannot get user: database not available");
    throw new Error("Database connection is not available");
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result[0];
}

// ==================== 知识库相关 ====================

export async function createKnowledge(data: InsertKnowledgeBase) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(knowledgeBase).values(data);
}

/**
 * 获取激活的知识库（用于 AI 检索）
 * 支持按模块、分类、类型筛选
 */
export async function getActiveKnowledge(
  category?: string,
  type?: "customer" | "internal",
  module?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [eq(knowledgeBase.isActive, 1)];
  if (category) {
    conditions.push(eq(knowledgeBase.category, category));
  }
  if (type) {
    conditions.push(eq(knowledgeBase.type, type));
  }
  if (module) {
    conditions.push(eq(knowledgeBase.module, module));
  }

  // 只查客服/内容用到的列，避免表缺少新列（如 embedding_json）时整句 SQL 报错
  return db
    .select({
      id: knowledgeBase.id,
      type: knowledgeBase.type,
      title: knowledgeBase.title,
      content: knowledgeBase.content,
      category: knowledgeBase.category,
      tags: knowledgeBase.tags,
      module: knowledgeBase.module,
      usedCount: knowledgeBase.usedCount,
      isActive: knowledgeBase.isActive,
    })
    .from(knowledgeBase)
    .where(and(...conditions))
    .orderBy(desc(knowledgeBase.usedCount));
}

const LIST_SUMMARY_MAX_LEN = 200;

/**
 * 获取知识库列表（分页 + 服务端搜索，仅返回列表用轻量列，不含 content 等大字段）
 */
export async function getAllKnowledge(
  opts: {
    type?: "customer" | "internal";
    module?: string;
    limit?: number;
    offset?: number;
    searchTerm?: string;
  } = {}
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { type, module: mod, limit = 50, offset = 0, searchTerm } = opts;
  const conditions: ReturnType<typeof eq>[] = [];
  if (type) conditions.push(eq(knowledgeBase.type, type));
  if (mod) conditions.push(eq(knowledgeBase.module, mod));
  if (searchTerm && searchTerm.trim()) {
    const term = `%${searchTerm.trim()}%`;
    conditions.push(
      or(
        ilike(knowledgeBase.title, term),
        ilike(knowledgeBase.summary, term),
        ilike(knowledgeBase.content, term)
      )!
    );
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(knowledgeBase)
      .where(whereClause ?? sql`1=1`),
    db
      .select({
        id: knowledgeBase.id,
        title: knowledgeBase.title,
        summary: knowledgeBase.summary,
        category: knowledgeBase.category,
        tags: knowledgeBase.tags,
        module: knowledgeBase.module,
        type: knowledgeBase.type,
        usedCount: knowledgeBase.usedCount,
        viewCount: knowledgeBase.viewCount,
        isActive: knowledgeBase.isActive,
        createdAt: knowledgeBase.createdAt,
      })
      .from(knowledgeBase)
      .where(whereClause ?? sql`1=1`)
      .orderBy(knowledgeBase.order, desc(knowledgeBase.createdAt))
      .limit(limit)
      .offset(offset),
  ]);

  const total = Number(countResult[0]?.count ?? 0);
  const items = rows.map(r => ({
    ...r,
    summary:
      r.summary != null && r.summary.length > LIST_SUMMARY_MAX_LEN
        ? r.summary.slice(0, LIST_SUMMARY_MAX_LEN) + "..."
        : r.summary,
  }));

  return { items, total };
}

/**
 * 根据ID获取知识库详情
 */
export async function getKnowledgeById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(knowledgeBase)
    .where(eq(knowledgeBase.id, id))
    .limit(1);

  return result[0];
}

/**
 * 根据父节点ID获取子节点（支持层级查询）
 */
export async function getKnowledgeByParentId(parentId: number | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (parentId === null) {
    // 获取根节点（level 1）
    return db
      .select()
      .from(knowledgeBase)
      .where(and(eq(knowledgeBase.level, 1), eq(knowledgeBase.isActive, 1)))
      .orderBy(knowledgeBase.order);
  }

  return db
    .select()
    .from(knowledgeBase)
    .where(
      and(eq(knowledgeBase.parentId, parentId), eq(knowledgeBase.isActive, 1))
    )
    .orderBy(knowledgeBase.order);
}

const TREE_SUMMARY_MAX_LEN = 120;

/**
 * 根据模块获取知识库树形结构（轻量：仅结构+标题/摘要预览，不含 content 等大字段）
 */
export async function getKnowledgeTreeByModule(module: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const allKnowledge = await db
    .select({
      id: knowledgeBase.id,
      title: knowledgeBase.title,
      summary: knowledgeBase.summary,
      parentId: knowledgeBase.parentId,
      level: knowledgeBase.level,
      order: knowledgeBase.order,
      module: knowledgeBase.module,
      viewCount: knowledgeBase.viewCount,
      usedCount: knowledgeBase.usedCount,
      isActive: knowledgeBase.isActive,
    })
    .from(knowledgeBase)
    .where(and(eq(knowledgeBase.module, module), eq(knowledgeBase.isActive, 1)))
    // @ts-ignore - drizzle orderBy 支持多字段
    .orderBy(knowledgeBase.level, knowledgeBase.order);

  type LightRow = {
    id: number;
    title: string;
    summary: string | null;
    parentId: number | null;
    level: number;
    order: number;
    module: string;
    viewCount: number;
    usedCount: number;
    isActive: number;
  };
  type KnowledgeNode = LightRow & {
    summary: string | null;
    children: KnowledgeNode[];
  };
  const knowledgeMap = new Map<number, KnowledgeNode>();
  const rootNodes: KnowledgeNode[] = [];

  for (const item of allKnowledge) {
    const summary =
      item.summary != null && item.summary.length > TREE_SUMMARY_MAX_LEN
        ? item.summary.slice(0, TREE_SUMMARY_MAX_LEN) + "..."
        : item.summary;
    knowledgeMap.set(item.id, { ...item, summary, children: [] });
  }

  for (const item of allKnowledge) {
    const node = knowledgeMap.get(item.id)!;
    if (item.parentId === null || item.parentId === undefined) {
      rootNodes.push(node);
    } else {
      const parent = knowledgeMap.get(item.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        rootNodes.push(node);
      }
    }
  }

  return rootNodes;
}

/**
 * 根据路径获取知识库节点
 */
export async function getKnowledgeByPath(path: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(knowledgeBase)
    .where(eq(knowledgeBase.path, path))
    .limit(1)
    .then(result => result[0]);
}

/**
 * 更新知识库
 */
export async function updateKnowledge(
  id: number,
  data: Partial<InsertKnowledgeBase>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(knowledgeBase).set(data).where(eq(knowledgeBase.id, id));
}

/**
 * 删除知识库（软删除：设置为非激活状态）
 */
export async function deleteKnowledge(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 检查是否有子节点
  const children = await db
    .select()
    .from(knowledgeBase)
    .where(eq(knowledgeBase.parentId, id))
    .limit(1);

  if (children.length > 0) {
    throw new Error(
      "Cannot delete knowledge with children. Please delete children first."
    );
  }

  // 软删除：设置为非激活状态
  await db
    .update(knowledgeBase)
    .set({ isActive: 0 })
    .where(eq(knowledgeBase.id, id));
}

/**
 * 增加知识库使用次数（原子更新）
 */
export async function incrementKnowledgeUsage(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.execute(
    sql`UPDATE ${knowledgeBase} SET ${knowledgeBase.usedCount} = ${knowledgeBase.usedCount} + 1 WHERE ${knowledgeBase.id} = ${id}`
  );
}

/**
 * 增加知识库查看次数（原子更新）
 */
export async function incrementKnowledgeView(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.execute(
    sql`UPDATE ${knowledgeBase} SET ${knowledgeBase.viewCount} = ${knowledgeBase.viewCount} + 1 WHERE ${knowledgeBase.id} = ${id}`
  );
}

/**
 * 搜索知识库（支持关键词、模块、类型）
 */
export async function searchKnowledge(
  keyword: string,
  module?: string,
  type?: "customer" | "internal",
  limit = 20
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions: ReturnType<typeof eq>[] = [
    eq(knowledgeBase.isActive, 1),
    // 使用 LIKE 进行模糊搜索（实际应用中可以使用全文搜索）
    or(
      like(knowledgeBase.title, `%${keyword}%`),
      like(knowledgeBase.content, `%${keyword}%`),
      like(knowledgeBase.summary, `%${keyword}%`)
    )!,
  ];

  if (module) {
    conditions.push(eq(knowledgeBase.module, module));
  }
  if (type) {
    conditions.push(eq(knowledgeBase.type, type));
  }

  return db
    .select()
    .from(knowledgeBase)
    .where(and(...conditions))
    .orderBy(desc(knowledgeBase.usedCount), desc(knowledgeBase.viewCount))
    .limit(limit);
}

// ==================== 对话相关 ====================

export async function createConversation(data: InsertConversation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(conversations).values(data);
}

export async function getConversationBySessionId(sessionId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(conversations)
    .where(eq(conversations.sessionId, sessionId))
    .limit(1);

  return result[0];
}

export async function updateConversation(
  sessionId: string,
  data: Partial<InsertConversation>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(conversations)
    .set(data)
    .where(eq(conversations.sessionId, sessionId));
}

export async function getAllConversations() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.select().from(conversations).orderBy(desc(conversations.createdAt));
}

// ==================== 消息相关 ====================

export async function createMessage(data: InsertMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(messages).values(data);
}

export async function getMessagesByConversationId(conversationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);
}

// ==================== 线索相关 ====================

export async function createLead(
  data: InsertLead
): Promise<{ id: number } | void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .insert(leads)
    .values(data)
    .returning({ id: leads.id });
  return result[0] ? { id: result[0].id } : undefined;
}

export async function getLeadByPhone(phone: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(leads)
    .where(eq(leads.phone, phone))
    .limit(1);

  return result[0];
}

export async function updateLeadAirtableId(id: number, airtableId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(leads)
    .set({
      airtableId,
      syncedAt: new Date().toISOString(),
    })
    .where(eq(leads.id, id));
}

export async function getAllLeads() {
  try {
    const db = await getDb();
    if (!db) {
      console.error("[DB Error] Database not initialized");
      return [];
    }

    // 只选择必要的字段，避免 NULL 值问题
    return await db
      .select({
        id: leads.id,
        name: leads.name,
        phone: leads.phone,
        wechat: leads.wechat,
        age: leads.age,
        interestedServices: leads.interestedServices,
        budget: leads.budget,
        budgetLevel: leads.budgetLevel,
        status: leads.status,
        source: leads.source,
        customerTier: leads.customerTier,
        psychologyType: leads.psychologyType,
        createdAt: leads.createdAt,
        updatedAt: leads.updatedAt,
      })
      .from(leads)
      .orderBy(desc(leads.createdAt));
  } catch (error: any) {
    console.error("[DB Error] getAllLeads failed:", error?.message || error);
    return []; // 返回空数组而不是抛出错误
  }
}

export async function getLeadById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return result[0] || null;
}

/**
 * 更新线索信息
 * @param id 线索ID
 * @param data 更新字段，其中 birthday 应为 ISO 8601 字符串格式（例如 '1990-01-01'）
 */
export async function updateLead(id: number, data: Partial<InsertLead>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(leads)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(leads.id, id));
  return getLeadById(id);
}

/** 获取生日在 [startDate, endDate] 内的 leads（仅比较月-日，忽略年） */
export async function getLeadsWithBirthdayInRange(
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const startMM = String(startDate.getMonth() + 1).padStart(2, "0");
  const startDD = String(startDate.getDate()).padStart(2, "0");
  const endMM = String(endDate.getMonth() + 1).padStart(2, "0");
  const endDD = String(endDate.getDate()).padStart(2, "0");
  const startMd = `${startMM}-${startDD}`;
  const endMd = `${endMM}-${endDD}`;

  // 用 SQL 提取月-日进行范围比较，避免全表加载到内存
  if (startMd <= endMd) {
    // 同一年内不跨年：直接范围比较
    return await db
      .select()
      .from(leads)
      .where(
        and(
          sql`${leads.birthday} IS NOT NULL`,
          sql`TO_CHAR(${leads.birthday}, 'MM-DD') >= ${startMd}`,
          sql`TO_CHAR(${leads.birthday}, 'MM-DD') <= ${endMd}`
        )
      );
  }
  // 跨年（如 12-25 → 01-05）
  return await db
    .select()
    .from(leads)
    .where(
      and(
        sql`${leads.birthday} IS NOT NULL`,
        sql`(TO_CHAR(${leads.birthday}, 'MM-DD') >= ${startMd} OR TO_CHAR(${leads.birthday}, 'MM-DD') <= ${endMd})`
      )
    );
}

/** 获取 importantHolidays 包含指定节日关键词的 leads */
export async function getLeadsWithImportantHoliday(holidayName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const key = holidayName.trim();
  return await db
    .select()
    .from(leads)
    .where(
      and(
        sql`${leads.importantHolidays} IS NOT NULL`,
        ilike(leads.importantHolidays, `%${key}%`)
      )
    );
}

// ==================== 小红书相关 ====================

export async function getAllXiaohongshuPosts(
  status?: "draft" | "scheduled" | "published" | "deleted",
  limit = 20,
  offset = 0
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { xiaohongshuPosts } = await import("../drizzle/schema");

  let query = db.select().from(xiaohongshuPosts);
  if (status) {
    query = query.where(eq(xiaohongshuPosts.status, status)) as any;
  }

  const posts = await query
    .orderBy(desc(xiaohongshuPosts.createdAt))
    .limit(limit)
    .offset(offset);
  return posts;
}

export async function getXiaohongshuPostById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { xiaohongshuPosts } = await import("../drizzle/schema");

  const result = await db
    .select()
    .from(xiaohongshuPosts)
    .where(eq(xiaohongshuPosts.id, id))
    .limit(1);
  return result[0] || null;
}

export async function createXiaohongshuPost(data: InsertXiaohongshuPost) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { xiaohongshuPosts: xiaohongshuPostsTable } =
    await import("../drizzle/schema");
  const result = await db
    .insert(xiaohongshuPostsTable)
    .values(data)
    .returning({ id: xiaohongshuPostsTable.id });
  return { id: result[0]?.id || 0 };
}

export async function updateXiaohongshuPost(
  id: number,
  data: Partial<InsertXiaohongshuPost>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { xiaohongshuPosts } = await import("../drizzle/schema");

  await db
    .update(xiaohongshuPosts)
    .set(data)
    .where(eq(xiaohongshuPosts.id, id));
  return { success: true };
}

export async function getXiaohongshuComments(
  postId: number,
  replyStatus?: "pending" | "replied" | "ignored"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { xiaohongshuComments } = await import("../drizzle/schema");

  if (replyStatus) {
    const comments = await db
      .select()
      .from(xiaohongshuComments)
      .where(
        and(
          eq(xiaohongshuComments.postId, postId),
          eq(xiaohongshuComments.replyStatus, replyStatus)
        )
      )
      .orderBy(desc(xiaohongshuComments.commentedAt));
    return comments;
  }

  const comments = await db
    .select()
    .from(xiaohongshuComments)
    .where(eq(xiaohongshuComments.postId, postId))
    .orderBy(desc(xiaohongshuComments.commentedAt));
  return comments;
}

export async function replyXiaohongshuComment(
  id: number,
  replyContent: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { xiaohongshuComments } = await import("../drizzle/schema");

  await db
    .update(xiaohongshuComments)
    .set({
      replyContent,
      replyStatus: "replied",
      repliedAt: new Date().toISOString(),
    })
    .where(eq(xiaohongshuComments.id, id));

  return { success: true };
}

// ==================== Triggers ====================

export async function getAllTriggers() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { triggers } = await import("../drizzle/schema");

  const result = await db
    .select()
    .from(triggers)
    .orderBy(desc(triggers.createdAt));
  return result;
}

export async function getActiveTriggersByTypes(types: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { triggers } = await import("../drizzle/schema");
  if (types.length === 0) return [];
  const result = await db
    .select()
    .from(triggers)
    .where(
      and(or(...types.map(t => eq(triggers.type, t))), eq(triggers.isActive, 1))
    );
  return result;
}

export async function getTriggerById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { triggers } = await import("../drizzle/schema");

  const result = await db.select().from(triggers).where(eq(triggers.id, id));
  return result[0] || null;
}

export async function createTrigger(data: InsertTrigger) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { triggers: triggersTable } = await import("../drizzle/schema");
  const result = await db
    .insert(triggersTable)
    .values(data)
    .returning({ id: triggersTable.id });
  return { id: result[0]?.id || 0 };
}

export async function updateTrigger(id: number, data: Partial<InsertTrigger>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { triggers: triggersTable } = await import("../drizzle/schema");
  await db.update(triggersTable).set(data).where(eq(triggersTable.id, id));
  return { success: true };
}

export async function deleteTrigger(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { triggers: triggersTable } = await import("../drizzle/schema");
  await db.delete(triggersTable).where(eq(triggersTable.id, id));
  return { success: true };
}

export async function getTriggerExecutions(triggerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { triggerExecutions: triggerExecutionsTable } =
    await import("../drizzle/schema");
  const result = await db
    .select()
    .from(triggerExecutionsTable)
    .where(eq(triggerExecutionsTable.triggerId, triggerId))
    .orderBy(desc(triggerExecutionsTable.executedAt))
    .limit(50);
  return result;
}

export async function createTriggerExecution(data: InsertTriggerExecution) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { triggerExecutions: triggerExecutionsTable } =
    await import("../drizzle/schema");
  const result = await db
    .insert(triggerExecutionsTable)
    .values(data)
    .returning({ id: triggerExecutionsTable.id });
  return { id: result[0]?.id || 0 };
}

// ==================== 医美项目相关 ====================

export async function getAllMedicalProjects(activeOnly = true) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { medicalProjects: projectsTable } = await import("../drizzle/schema");

  let query = db.select().from(projectsTable);

  if (activeOnly) {
    query = query.where(eq(projectsTable.isActive, 1)) as any;
  }

  return query.orderBy(projectsTable.sortOrder);
}

export async function getMedicalProjectById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { medicalProjects: projectsTable } = await import("../drizzle/schema");

  const result = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.id, id))
    .limit(1);
  return result[0] || null;
}

export async function getMedicalProjectsByCategory(category: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { medicalProjects: projectsTable } = await import("../drizzle/schema");

  return db
    .select()
    .from(projectsTable)
    .where(
      and(eq(projectsTable.category, category), eq(projectsTable.isActive, 1))
    )
    .orderBy(projectsTable.sortOrder);
}

// ==================== 网站内容相关 ====================

export async function getWebsiteContent(pageKey: string, sectionKey?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { websiteContent: contentTable } = await import("../drizzle/schema");

  const conditions = [
    eq(contentTable.pageKey, pageKey),
    eq(contentTable.isActive, 1),
  ];
  if (sectionKey !== undefined) {
    conditions.push(eq(contentTable.sectionKey, sectionKey));
  }
  return db
    .select()
    .from(contentTable)
    .where(and(...conditions))
    .orderBy(contentTable.sortOrder);
}

export async function getWebsiteContentById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { websiteContent: contentTable } = await import("../drizzle/schema");

  const result = await db
    .select()
    .from(contentTable)
    .where(eq(contentTable.id, id))
    .limit(1);
  return result[0] || null;
}

export async function createWebsiteContent(data: InsertWebsiteContent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { websiteContent: contentTable } = await import("../drizzle/schema");
  const result = await db
    .insert(contentTable)
    .values(data)
    .returning({ id: contentTable.id });
  return { id: result[0]?.id || 0 };
}

export async function updateWebsiteContent(
  id: number,
  data: Partial<InsertWebsiteContent>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { websiteContent: contentTable } = await import("../drizzle/schema");
  await db.update(contentTable).set(data).where(eq(contentTable.id, id));
  return { success: true };
}

export async function deleteWebsiteContent(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { websiteContent: contentTable } = await import("../drizzle/schema");
  await db
    .update(contentTable)
    .set({ isActive: 0 })
    .where(eq(contentTable.id, id));
  return { success: true };
}

// ==================== 网站导航相关 ====================

export async function getWebsiteNavigation(parentKey?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { websiteNavigation: navTable } = await import("../drizzle/schema");

  const conditions = [eq(navTable.isActive, 1)];
  if (parentKey !== undefined) {
    conditions.push(eq(navTable.parentKey, parentKey));
  } else {
    conditions.push(isNull(navTable.parentKey));
  }
  return db
    .select()
    .from(navTable)
    .where(and(...conditions))
    .orderBy(navTable.sortOrder);
}

export async function getWebsiteNavigationByNavKey(navKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { websiteNavigation: navTable } = await import("../drizzle/schema");

  const result = await db
    .select()
    .from(navTable)
    .where(eq(navTable.navKey, navKey))
    .limit(1);
  return result[0] || null;
}

export async function createWebsiteNavigation(data: InsertWebsiteNavigation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { websiteNavigation: navTable } = await import("../drizzle/schema");
  const result = await db
    .insert(navTable)
    .values(data)
    .returning({ id: navTable.id });
  return { id: result[0]?.id || 0 };
}

export async function updateWebsiteNavigation(
  id: number,
  data: Partial<InsertWebsiteNavigation>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { websiteNavigation: navTable } = await import("../drizzle/schema");
  await db.update(navTable).set(data).where(eq(navTable.id, id));
  return { success: true };
}

export async function deleteWebsiteNavigation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { websiteNavigation: navTable } = await import("../drizzle/schema");
  await db.update(navTable).set({ isActive: 0 }).where(eq(navTable.id, id));
  return { success: true };
}

// ==================== 客户相关 ====================

export async function createCustomer(data: {
  name: string;
  phone: string;
  wechat?: string;
  gender?: string;
  birthday?: string;
  age?: number;
  occupation?: string;
  tier?: string;
  totalSpent?: number;
  source?: string;
  notes?: string;
  tags?: string;
  consultantId?: number;
  status?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { customers } = await import("../drizzle/schema");
  const result = await db
    .insert(customers)
    .values(data)
    .returning({ id: customers.id });
  return { id: result[0]?.id || 0 };
}

export async function getCustomerByPhone(phone: string) {
  const db = await getDb();
  if (!db) return null;

  const { customers } = await import("../drizzle/schema");
  const result = await db
    .select()
    .from(customers)
    .where(eq(customers.phone, phone))
    .limit(1);
  return result[0] || null;
}

export async function getCustomerById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const { customers } = await import("../drizzle/schema");
  const result = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);
  return result[0] || null;
}

export async function getAllCustomers(
  tier?: string,
  status?: string,
  limit = 50,
  offset = 0
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { customers } = await import("../drizzle/schema");
  let query = db.select().from(customers);

  const conditions = [];
  if (tier) conditions.push(eq(customers.tier, tier));
  if (status) conditions.push(eq(customers.status, status));

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return query.orderBy(desc(customers.createdAt)).limit(limit).offset(offset);
}

export async function updateCustomer(
  id: number,
  data: Partial<{
    name: string;
    wechat: string;
    gender: string;
    birthday: string;
    age: number;
    occupation: string;
    tier: string;
    totalSpent: number;
    notes: string;
    tags: string;
    consultantId: number;
    status: string;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { customers } = await import("../drizzle/schema");
  await db
    .update(customers)
    .set({ ...data, updatedAt: new Date().toISOString() })
    .where(eq(customers.id, id));
  return getCustomerById(id);
}

// ==================== 预约相关 ====================

export async function createAppointment(data: {
  customerId?: number;
  leadId?: number;
  serviceDetailId?: number;
  appointmentTime: Date | string;
  duration?: number;
  type?: string;
  status?: string;
  cancelReason?: string;
  notes?: string;
  doctorId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { appointments } = await import("../drizzle/schema");
  const appointmentTimeStr =
    data.appointmentTime instanceof Date
      ? data.appointmentTime.toISOString()
      : data.appointmentTime;
  const values = {
    ...data,
    appointmentTime: appointmentTimeStr,
  };
  const result = await db
    .insert(appointments)
    .values(values)
    .returning({ id: appointments.id });
  return { id: result[0]?.id || 0 };
}

export async function getAppointmentById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const { appointments } = await import("../drizzle/schema");
  const result = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, id))
    .limit(1);
  return result[0] || null;
}

export async function getAppointmentsByCustomerId(customerId: number) {
  const db = await getDb();
  if (!db) return [];

  const { appointments } = await import("../drizzle/schema");
  return db
    .select()
    .from(appointments)
    .where(eq(appointments.customerId, customerId))
    .orderBy(desc(appointments.appointmentTime));
}

export async function getAppointmentsByLeadId(leadId: number) {
  const db = await getDb();
  if (!db) return [];

  const { appointments } = await import("../drizzle/schema");
  return db
    .select()
    .from(appointments)
    .where(eq(appointments.leadId, leadId))
    .orderBy(desc(appointments.appointmentTime));
}

export async function getUpcomingAppointments(limit = 20) {
  const db = await getDb();
  if (!db) return [];

  const { appointments } = await import("../drizzle/schema");
  return db
    .select()
    .from(appointments)
    .where(
      and(
        eq(appointments.status, "pending"),
        sql`${appointments.appointmentTime} >= ${new Date()}`
      )
    )
    .orderBy(appointments.appointmentTime)
    .limit(limit);
}

export async function updateAppointment(
  id: number,
  data: Partial<{
    appointmentTime: Date | string;
    duration: number;
    type: string;
    status: string;
    cancelReason: string;
    notes: string;
    doctorId: number;
  }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { appointments } = await import("../drizzle/schema");
  const updateData: any = { ...data };
  if (data.appointmentTime !== undefined) {
    updateData.appointmentTime =
      data.appointmentTime instanceof Date
        ? data.appointmentTime.toISOString()
        : data.appointmentTime;
  }
  await db
    .update(appointments)
    .set({ ...updateData, updatedAt: new Date().toISOString() })
    .where(eq(appointments.id, id));
  return getAppointmentById(id);
}

// ==================== 订单相关 ====================

export async function createOrder(data: {
  customerId: number;
  appointmentId?: number;
  orderNo: string;
  totalAmount: number;
  discountAmount?: number;
  finalAmount: number;
  paymentStatus?: string;
  paymentMethod?: string;
  paidAt?: Date | string;
  status?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { orders } = await import("../drizzle/schema");
  const paidAtStr =
    data.paidAt instanceof Date ? data.paidAt.toISOString() : data.paidAt;
  const values = { ...data, paidAt: paidAtStr };
  const result = await db
    .insert(orders)
    .values(values)
    .returning({ id: orders.id });
  return { id: result[0]?.id || 0 };
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const { orders } = await import("../drizzle/schema");
  const result = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);
  return result[0] || null;
}

export async function getOrdersByCustomerId(customerId: number) {
  const db = await getDb();
  if (!db) return [];

  const { orders } = await import("../drizzle/schema");
  return db
    .select()
    .from(orders)
    .where(eq(orders.customerId, customerId))
    .orderBy(desc(orders.createdAt));
}

export async function getOrdersByPaymentStatus(
  paymentStatus: string,
  limit = 50
) {
  const db = await getDb();
  if (!db) return [];

  const { orders } = await import("../drizzle/schema");
  return db
    .select()
    .from(orders)
    .where(eq(orders.paymentStatus, paymentStatus))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
}

export async function updateOrderPaymentStatus(
  id: number,
  paymentStatus: string,
  paidAt?: Date | string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { orders } = await import("../drizzle/schema");
  const paidAtStr =
    paidAt instanceof Date
      ? paidAt.toISOString()
      : paidAt || new Date().toISOString();
  await db
    .update(orders)
    .set({
      paymentStatus,
      paidAt: paidAtStr,
    })
    .where(eq(orders.id, id));
  return getOrderById(id);
}

// ==================== 事务支持 ====================

// 事务回调函数类型 - 接收事务中的db实例
type TransactionCallback<T> = (tx: any) => Promise<T>;

/**
 * 在事务中执行数据库操作
 * 自动处理提交和回滚
 *
 * 使用示例:
 * ```typescript
 * const result = await withTransaction(async (tx) => {
 *   const conversation = await tx.insert(conversations).values({...}).returning();
 *   await tx.insert(messages).values({ conversationId: conversation[0].id, ... });
 *   return conversation[0];
 * });
 * ```
 */
export async function withTransaction<T>(
  callback: TransactionCallback<T>,
  options: { maxRetries?: number; retryDelay?: number } = {}
): Promise<T> {
  const { maxRetries = 3, retryDelay = 100 } = options;
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // @ts-ignore - drizzle-orm transaction API
      return await db.transaction(async tx => {
        return await callback(tx);
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 检查是否是可重试的错误（如死锁）
      const isRetryable =
        lastError.message?.includes("deadlock") ||
        lastError.message?.includes("connection") ||
        lastError.message?.includes("40P01"); // PostgreSQL deadlock code

      if (!isRetryable || attempt === maxRetries - 1) {
        logger.error(
          `[Transaction] Failed after ${attempt + 1} attempts:`,
          lastError
        );
        throw lastError;
      }

      logger.warn(
        `[Transaction] Retrying (${attempt + 1}/${maxRetries}) after ${retryDelay}ms...`
      );
      await new Promise(resolve =>
        setTimeout(resolve, retryDelay * (attempt + 1))
      );
    }
  }

  throw lastError || new Error("Transaction failed");
}

/**
 * 创建聊天会话的完整事务操作
 * 包含：创建会话 + 保存用户消息 + 保存AI回复 + 更新知识库使用
 */
export async function createChatMessageTransaction(data: {
  sessionId: string;
  userMessage: { content: string; role: "user" };
  aiMessage: {
    content: string;
    role: "assistant";
    knowledgeUsed?: number[];
    extractedInfo?: Record<string, unknown> | null;
  };
  visitorInfo?: {
    visitorName?: string | null;
    visitorPhone?: string | null;
    visitorWechat?: string | null;
  };
  psychologyInfo?: {
    psychologyType?: string;
    psychologyTags?: string[];
    budgetLevel?: string;
    customerTier?: string;
  } | null;
}): Promise<{ conversationId: number; messageIds: number[] }> {
  return withTransaction(async tx => {
    const { conversations, messages, knowledgeBase } =
      await import("../drizzle/schema");

    // 1. 查找或创建会话
    let conversation = await tx
      .select()
      .from(conversations)
      .where(eq(conversations.sessionId, data.sessionId))
      .limit(1)
      .then((rows: any[]) => rows[0]);

    if (!conversation) {
      const [newConversation] = await tx
        .insert(conversations)
        .values({
          sessionId: data.sessionId,
          source: "web",
          status: "active",
          ...data.visitorInfo,
        })
        .returning();
      conversation = newConversation;
    } else if (data.visitorInfo) {
      // 更新访客信息（使用 sql 模板标签直接绑定参数，绕过 drizzle 类型转换问题）
      const { visitorName, visitorPhone, visitorWechat } = data.visitorInfo;
      const convId = Number(conversation.id);
      if (visitorName != null || visitorPhone != null || visitorWechat != null) {
        const setParts: ReturnType<typeof sql>[] = [];
        if (visitorName != null) setParts.push(sql`visitor_name = ${String(visitorName)}`);
        if (visitorPhone != null) setParts.push(sql`visitor_phone = ${String(visitorPhone)}`);
        if (visitorWechat != null) setParts.push(sql`visitor_wechat = ${String(visitorWechat)}`);
        setParts.push(sql`updated_at = NOW()`);
        const setClause = sql.join(setParts, sql`, `);
        await tx.execute(sql`UPDATE conversations SET ${setClause} WHERE id = ${convId}`);
      }
    }

    // 2. 保存用户消息
    const [userMsg] = await tx
      .insert(messages)
      .values({
        conversationId: conversation.id,
        role: data.userMessage.role,
        content: data.userMessage.content,
      })
      .returning();

    // 3. 保存AI回复
    const [aiMsg] = await tx
      .insert(messages)
      .values({
        conversationId: conversation.id,
        role: data.aiMessage.role,
        content: data.aiMessage.content,
        knowledgeUsed: data.aiMessage.knowledgeUsed?.length
          ? JSON.stringify(data.aiMessage.knowledgeUsed)
          : null,
        extractedInfo: data.aiMessage.extractedInfo
          ? JSON.stringify(data.aiMessage.extractedInfo)
          : null,
      })
      .returning();

    // 4. 更新知识库使用次数
    if (data.aiMessage.knowledgeUsed?.length) {
      for (const id of data.aiMessage.knowledgeUsed) {
        await tx
          .update(knowledgeBase)
          .set({
            usedCount: sql`${knowledgeBase.usedCount} + 1`,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(knowledgeBase.id, id));
      }
    }

    // 5. 更新心理画像（如果有）
    if (data.psychologyInfo) {
      await tx
        .update(conversations)
        .set({
          psychologyType: data.psychologyInfo.psychologyType,
          psychologyTags: data.psychologyInfo.psychologyTags
            ? JSON.stringify(data.psychologyInfo.psychologyTags)
            : null,
          budgetLevel: data.psychologyInfo.budgetLevel,
          customerTier: data.psychologyInfo.customerTier,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(conversations.id, conversation.id));
    }

    // 6. 更新会话更新时间
    await tx
      .update(conversations)
      .set({
        updatedAt: new Date().toISOString(),
      })
      .where(eq(conversations.id, conversation.id));

    return {
      conversationId: conversation.id,
      messageIds: [userMsg!.id, aiMsg!.id],
    };
  });
}

/**
 * 创建线索的完整事务操作
 * 包含：创建本地线索 + 关联到会话
 */
export async function createLeadTransaction(data: {
  lead: InsertLead;
  sessionId?: string;
}): Promise<{ leadId: number; airtableId?: string }> {
  return withTransaction(async tx => {
    const { leads, conversations } = await import("../drizzle/schema");

    // 1. 创建线索
    const [lead] = await tx
      .insert(leads)
      .values({
        ...data.lead,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // 2. 如果有会话ID，更新会话状态
    if (data.sessionId) {
      await tx
        .update(conversations)
        .set({
          status: "converted",
          leadId: String(lead!.id),
          updatedAt: new Date(),
        })
        .where(eq(conversations.sessionId, data.sessionId));
    }

    return { leadId: lead!.id };
  });
}
