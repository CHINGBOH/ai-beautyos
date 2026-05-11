import { eq, desc, and, or, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
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
  InsertTriggerExecution
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { logger } from './_core/logger';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const client = postgres(process.env.DATABASE_URL);
      _db = drizzle(client);
      logger.info("[Database] Connected successfully");
    } catch (error) {
      logger.error("[Database] Failed to connect:", error);
      _db = null;
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
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
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

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

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
  
  return db.select().from(knowledgeBase)
    .where(and(...conditions))
    .orderBy(desc(knowledgeBase.usedCount));
}

/**
 * 获取所有知识库
 * 支持按类型、模块筛选
 */
export async function getAllKnowledge(
  type?: "customer" | "internal",
  module?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const conditions = [];
  if (type) {
    conditions.push(eq(knowledgeBase.type, type));
  }
  if (module) {
    conditions.push(eq(knowledgeBase.module, module));
  }
  
  if (conditions.length > 0) {
    return db.select().from(knowledgeBase)
      .where(and(...conditions))
      .orderBy(knowledgeBase.order, desc(knowledgeBase.createdAt));
  }
  
  return db.select().from(knowledgeBase)
    .orderBy(knowledgeBase.order, desc(knowledgeBase.createdAt));
}

/**
 * 根据ID获取知识库详情
 */
export async function getKnowledgeById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(knowledgeBase)
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
    return db.select().from(knowledgeBase)
      .where(and(
        eq(knowledgeBase.level, 1),
        eq(knowledgeBase.isActive, 1)
      ))
      .orderBy(knowledgeBase.order);
  }
  
  return db.select().from(knowledgeBase)
    .where(and(
      eq(knowledgeBase.parentId, parentId),
      eq(knowledgeBase.isActive, 1)
    ))
    .orderBy(knowledgeBase.order);
}

/**
 * 根据模块获取知识库树形结构
 */
export async function getKnowledgeTreeByModule(module: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 获取该模块下的所有知识
  const allKnowledge = await db.select().from(knowledgeBase)
    .where(and(
      eq(knowledgeBase.module, module),
      eq(knowledgeBase.isActive, 1)
    ))
    // @ts-ignore - drizzle orderBy支持多个字段
    .orderBy(knowledgeBase.level, knowledgeBase.order);
  
  // 构建树形结构
  type KnowledgeRow = typeof knowledgeBase.$inferSelect;
  type KnowledgeNode = KnowledgeRow & { children: KnowledgeNode[] };
  const knowledgeMap = new Map<number, KnowledgeNode>();
  const rootNodes: KnowledgeNode[] = [];
  
  // 第一遍：创建所有节点的映射
  for (const item of allKnowledge) {
    knowledgeMap.set(item.id, { ...item, children: [] });
  }
  
  // 第二遍：构建父子关系
  for (const item of allKnowledge) {
    const node = knowledgeMap.get(item.id)!;
    if (item.parentId === null || item.parentId === undefined) {
      rootNodes.push(node);
    } else {
      const parent = knowledgeMap.get(item.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        // 如果找不到父节点，作为根节点
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
  
  return db.select().from(knowledgeBase)
    .where(eq(knowledgeBase.path, path))
    .limit(1)
    .then(result => result[0]);
}

/**
 * 更新知识库
 */
export async function updateKnowledge(id: number, data: Partial<InsertKnowledgeBase>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(knowledgeBase)
    .set(data)
    .where(eq(knowledgeBase.id, id));
}

/**
 * 删除知识库（软删除：设置为非激活状态）
 */
export async function deleteKnowledge(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // 检查是否有子节点
  const children = await db.select().from(knowledgeBase)
    .where(eq(knowledgeBase.parentId, id))
    .limit(1);
  
  if (children.length > 0) {
    throw new Error("Cannot delete knowledge with children. Please delete children first.");
  }
  
  // 软删除：设置为非激活状态
  await db.update(knowledgeBase)
    .set({ isActive: 0 })
    .where(eq(knowledgeBase.id, id));
}

/**
 * 增加知识库使用次数
 */
export async function incrementKnowledgeUsage(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const knowledge = await db.select().from(knowledgeBase).where(eq(knowledgeBase.id, id)).limit(1);
  if (knowledge[0]) {
    await db.update(knowledgeBase)
      .set({ usedCount: knowledge[0].usedCount + 1 })
      .where(eq(knowledgeBase.id, id));
  }
}

/**
 * 增加知识库查看次数
 */
export async function incrementKnowledgeView(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const knowledge = await db.select().from(knowledgeBase).where(eq(knowledgeBase.id, id)).limit(1);
  if (knowledge[0]) {
    await db.update(knowledgeBase)
      .set({ viewCount: knowledge[0].viewCount + 1 })
      .where(eq(knowledgeBase.id, id));
  }
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
    )!
  ];
  
  if (module) {
    conditions.push(eq(knowledgeBase.module, module));
  }
  if (type) {
    conditions.push(eq(knowledgeBase.type, type));
  }
  
  return db.select().from(knowledgeBase)
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
  
  const result = await db.select().from(conversations)
    .where(eq(conversations.sessionId, sessionId))
    .limit(1);
  
  return result[0];
}

export async function updateConversation(sessionId: string, data: Partial<InsertConversation>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(conversations)
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
  
  return db.select().from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt);
}

// ==================== 线索相关 ====================

export async function createLead(data: InsertLead) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(leads).values(data);
  return result;
}

export async function getLeadByPhone(phone: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(leads)
    .where(eq(leads.phone, phone))
    .limit(1);
  
  return result[0];
}

export async function updateLeadAirtableId(id: number, airtableId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(leads)
    .set({ 
      airtableId, 
      syncedAt: new Date() 
    })
    .where(eq(leads.id, id));
}

export async function getAllLeads() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return db.select().from(leads).orderBy(desc(leads.createdAt));
}

export async function getLeadById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return result[0] || null;
}


// ==================== 小红书相关 ====================

export async function getAllXiaohongshuPosts(status?: "draft" | "scheduled" | "published" | "deleted", limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { xiaohongshuPosts } = await import("../drizzle/schema");
  
  let query = db.select().from(xiaohongshuPosts);
  if (status) {
    query = query.where(eq(xiaohongshuPosts.status, status)) as any;
  }
  
  const posts = await query.orderBy(desc(xiaohongshuPosts.createdAt)).limit(limit).offset(offset);
  return posts;
}

export async function getXiaohongshuPostById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { xiaohongshuPosts } = await import("../drizzle/schema");
  
  const result = await db.select().from(xiaohongshuPosts).where(eq(xiaohongshuPosts.id, id)).limit(1);
  return result[0] || null;
}

export async function createXiaohongshuPost(data: InsertXiaohongshuPost) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { xiaohongshuPosts: xiaohongshuPostsTable } = await import("../drizzle/schema");
  const result = await db.insert(xiaohongshuPostsTable).values(data).returning({ id: xiaohongshuPostsTable.id });
  return { id: result[0]?.id || 0 };
}

export async function updateXiaohongshuPost(id: number, data: Partial<InsertXiaohongshuPost>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { xiaohongshuPosts } = await import("../drizzle/schema");
  
  await db.update(xiaohongshuPosts).set(data).where(eq(xiaohongshuPosts.id, id));
  return { success: true };
}

export async function getXiaohongshuComments(postId: number, replyStatus?: "pending" | "replied" | "ignored") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { xiaohongshuComments } = await import("../drizzle/schema");
  
  if (replyStatus) {
    const comments = await db.select().from(xiaohongshuComments)
      .where(and(eq(xiaohongshuComments.postId, postId), eq(xiaohongshuComments.replyStatus, replyStatus)))
      .orderBy(desc(xiaohongshuComments.commentedAt));
    return comments;
  }
  
  const comments = await db.select().from(xiaohongshuComments)
    .where(eq(xiaohongshuComments.postId, postId))
    .orderBy(desc(xiaohongshuComments.commentedAt));
  return comments;
}

export async function replyXiaohongshuComment(id: number, replyContent: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { xiaohongshuComments } = await import("../drizzle/schema");
  
  await db.update(xiaohongshuComments).set({
    replyContent,
    replyStatus: "replied",
    repliedAt: new Date(),
  }).where(eq(xiaohongshuComments.id, id));
  
  return { success: true };
}


// ==================== Triggers ====================

export async function getAllTriggers() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { triggers } = await import("../drizzle/schema");
  
  const result = await db.select().from(triggers).orderBy(desc(triggers.createdAt));
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
  const result = await db.insert(triggersTable).values(data).returning({ id: triggersTable.id });
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
  
  const { triggerExecutions: triggerExecutionsTable } = await import("../drizzle/schema");
  const result = await db.select().from(triggerExecutionsTable)
    .where(eq(triggerExecutionsTable.triggerId, triggerId))
    .orderBy(desc(triggerExecutionsTable.executedAt))
    .limit(50);
  return result;
}

export async function createTriggerExecution(data: InsertTriggerExecution) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { triggerExecutions: triggerExecutionsTable } = await import("../drizzle/schema");
  const result = await db.insert(triggerExecutionsTable).values(data).returning({ id: triggerExecutionsTable.id });
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
  
  const result = await db.select().from(projectsTable).where(eq(projectsTable.id, id)).limit(1);
  return result[0] || null;
}

export async function getMedicalProjectsByCategory(category: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { medicalProjects: projectsTable } = await import("../drizzle/schema");
  
  return db.select().from(projectsTable)
    .where(and(eq(projectsTable.category, category), eq(projectsTable.isActive, 1)))
    .orderBy(projectsTable.sortOrder);
}

// ==================== 网站内容相关 ====================

export async function getWebsiteContent(pageKey: string, sectionKey?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { websiteContent: contentTable } = await import("../drizzle/schema");
  
  let query = db.select().from(contentTable)
    .where(and(eq(contentTable.pageKey, pageKey), eq(contentTable.isActive, 1)));
  
  if (sectionKey) {
    query = query.where(eq(contentTable.sectionKey, sectionKey)) as any;
  }
  
  return query.orderBy(contentTable.sortOrder);
}

export async function getWebsiteContentById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { websiteContent: contentTable } = await import("../drizzle/schema");
  
  const result = await db.select().from(contentTable).where(eq(contentTable.id, id)).limit(1);
  return result[0] || null;
}

export async function createWebsiteContent(data: InsertWebsiteContent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { websiteContent: contentTable } = await import("../drizzle/schema");
  const result = await db.insert(contentTable).values(data).returning({ id: contentTable.id });
  return { id: result[0]?.id || 0 };
}

export async function updateWebsiteContent(id: number, data: Partial<InsertWebsiteContent>) {
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
  await db.update(contentTable).set({ isActive: 0 }).where(eq(contentTable.id, id));
  return { success: true };
}

// ==================== 网站导航相关 ====================

export async function getWebsiteNavigation(parentKey?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { websiteNavigation: navTable } = await import("../drizzle/schema");
  
  let query = db.select().from(navTable).where(eq(navTable.isActive, 1));
  
  if (parentKey) {
    query = query.where(eq(navTable.parentKey, parentKey)) as any;
  } else {
    query = query.where(sql`${navTable.parentKey} IS NULL`) as any;
  }
  
  return query.orderBy(navTable.sortOrder);
}

export async function getWebsiteNavigationByNavKey(navKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { websiteNavigation: navTable } = await import("../drizzle/schema");
  
  const result = await db.select().from(navTable).where(eq(navTable.navKey, navKey)).limit(1);
  return result[0] || null;
}

export async function createWebsiteNavigation(data: InsertWebsiteNavigation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { websiteNavigation: navTable } = await import("../drizzle/schema");
  const result = await db.insert(navTable).values(data).returning({ id: navTable.id });
  return { id: result[0]?.id || 0 };
}

export async function updateWebsiteNavigation(id: number, data: Partial<InsertWebsiteNavigation>) {
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
