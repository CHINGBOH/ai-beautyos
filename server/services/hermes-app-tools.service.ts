import { createKnowledgeEntry, getAll, search } from "./knowledge.service";
import { generateContent, schedulePost } from "./content.service";
import { getPost, updatePost } from "./xiaohongshu.service";
import { getCustomerById, updateCustomer } from "./customers.service";

type ContentType = "project" | "case" | "price" | "guide" | "holiday" | "new_product";
type ToneType = "enthusiastic" | "professional" | "casual";
type KnowledgeType = "customer" | "internal";
type Difficulty = "beginner" | "intermediate" | "advanced";

export interface HermesToolContext {
  tenantId: string;
  agentId: string;
  dryRun: boolean;
  confirmed: boolean;
}

type ToolInput = Record<string, unknown>;

const CONTENT_TYPES = new Set<ContentType>(["project", "case", "price", "guide", "holiday", "new_product"]);
const TONES = new Set<ToneType>(["enthusiastic", "professional", "casual"]);
const KNOWLEDGE_TYPES = new Set<KnowledgeType>(["customer", "internal"]);
const DIFFICULTIES = new Set<Difficulty>(["beginner", "intermediate", "advanced"]);

function optionalString(input: ToolInput, key: string): string | undefined {
  const value = input[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function requiredString(input: ToolInput, key: string): string {
  const value = optionalString(input, key);
  if (!value) throw new Error(`${key} required`);
  return value;
}

function optionalNumber(input: ToolInput, key: string): number | undefined {
  const value = input[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function requiredNumber(input: ToolInput, key: string): number {
  const value = optionalNumber(input, key);
  if (value === undefined) throw new Error(`${key} required`);
  return value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function optionalStringArray(input: ToolInput, key: string): string[] | undefined {
  const value = input[key];
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function requiredContentType(input: ToolInput): ContentType {
  const value = requiredString(input, "type");
  if (!CONTENT_TYPES.has(value as ContentType)) throw new Error("type must be project, case, price, guide, holiday, or new_product");
  return value as ContentType;
}

function optionalTone(input: ToolInput): ToneType {
  const value = optionalString(input, "tone");
  if (!value) return "enthusiastic";
  if (!TONES.has(value as ToneType)) throw new Error("tone must be enthusiastic, professional, or casual");
  return value as ToneType;
}

function optionalKnowledgeType(input: ToolInput): KnowledgeType | undefined {
  const value = optionalString(input, "type");
  if (!value) return undefined;
  if (!KNOWLEDGE_TYPES.has(value as KnowledgeType)) throw new Error("type must be customer or internal");
  return value as KnowledgeType;
}

function optionalDifficulty(input: ToolInput): Difficulty {
  const value = optionalString(input, "difficulty");
  if (!value) return "beginner";
  if (!DIFFICULTIES.has(value as Difficulty)) throw new Error("difficulty must be beginner, intermediate, or advanced");
  return value as Difficulty;
}

function assertConfirmed(ctx: HermesToolContext, action: string) {
  if (!ctx.confirmed) throw new Error(`${action} requires confirmed: true`);
}

function compactUpdate(input: ToolInput, allowedKeys: string[]) {
  const update: Record<string, unknown> = {};
  for (const key of allowedKeys) {
    if (input[key] !== undefined) update[key] = input[key];
  }
  if (Object.keys(update).length === 0) throw new Error(`at least one of ${allowedKeys.join(", ")} required`);
  return update;
}

function summarizeKnowledge(row: {
  id: number;
  title: string;
  content?: string | null;
  summary?: string | null;
  category?: string | null;
  module?: string | null;
  type?: string | null;
  tags?: string | null;
  sources?: string | null;
}) {
  const text = row.summary || row.content || "";
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    module: row.module,
    category: row.category,
    snippet: text.length > 300 ? `${text.slice(0, 300)}...` : text,
    tags: row.tags,
    sources: row.sources,
  };
}

export async function queryKnowledgeBaseTool(input: ToolInput) {
  const keyword = optionalString(input, "keyword") ?? optionalString(input, "query");
  const module = optionalString(input, "module");
  const type = optionalKnowledgeType(input);
  const limit = clamp(optionalNumber(input, "limit") ?? 20, 1, 50);
  const offset = clamp(optionalNumber(input, "offset") ?? 0, 0, 5000);

  if (keyword) {
    const rows = await search(keyword, module, type, limit);
    return { rows: rows.map(summarizeKnowledge), total: rows.length, limit, offset: 0 };
  }

  const result = await getAll({ type, module, limit, offset });
  return {
    rows: result.items.map(summarizeKnowledge),
    total: result.total,
    limit,
    offset,
  };
}

export async function createContentDraftTool(input: ToolInput, ctx: HermesToolContext) {
  const payload = {
    type: requiredContentType(input),
    project: optionalString(input, "project"),
    keywords: optionalStringArray(input, "keywords"),
    tone: optionalTone(input),
    useCache: input.useCache !== false,
  };

  if (ctx.dryRun) {
    return { wouldCreate: "xiaohongshu_posts draft", payload };
  }

  assertConfirmed(ctx, "create_content_draft");
  return generateContent(payload, ctx.agentId);
}

export async function updateContentDraftTool(input: ToolInput, ctx: HermesToolContext) {
  const postId = requiredNumber(input, "postId");
  const existing = await getPost(postId);
  if (!existing) throw new Error(`post ${postId} not found`);

  const update = compactUpdate(input, ["title", "content", "tags"]);
  const payload = {
    title: typeof update.title === "string" ? update.title : undefined,
    content: typeof update.content === "string" ? update.content : undefined,
    tags: Array.isArray(update.tags) ? update.tags.filter((tag): tag is string => typeof tag === "string") : undefined,
  };

  if (!payload.title && !payload.content && !payload.tags) {
    throw new Error("title, content, or tags must be valid");
  }

  if (ctx.dryRun) {
    return { wouldUpdate: "xiaohongshu_posts", postId, before: existing, patch: payload };
  }

  assertConfirmed(ctx, "update_content_draft");
  return updatePost(postId, payload);
}

export async function scheduleXiaohongshuPostTool(input: ToolInput, ctx: HermesToolContext) {
  const postId = requiredNumber(input, "postId");
  const scheduledAt = requiredString(input, "scheduledAt");
  const scheduledTime = new Date(scheduledAt);
  if (Number.isNaN(scheduledTime.getTime())) throw new Error("scheduledAt must be a valid date");

  const existing = await getPost(postId);
  if (!existing) throw new Error(`post ${postId} not found`);

  if (ctx.dryRun) {
    return { wouldSchedule: "xiaohongshu_posts", postId, beforeStatus: existing.status, scheduledAt: scheduledTime.toISOString() };
  }

  assertConfirmed(ctx, "schedule_xiaohongshu_post");
  return schedulePost(postId, scheduledTime);
}

export async function updateCustomerFollowupTool(input: ToolInput, ctx: HermesToolContext) {
  const customerId = requiredNumber(input, "customerId");
  const existing = await getCustomerById(customerId);
  if (!existing) throw new Error(`customer ${customerId} not found`);

  const patch = compactUpdate(input, ["status", "followUpDate", "notes", "customerTier"]);
  for (const [key, value] of Object.entries(patch)) {
    if (value !== null && typeof value !== "string") throw new Error(`${key} must be a string or null`);
  }

  if (ctx.dryRun) {
    return { wouldUpdate: "customer follow-up", customerId, before: existing, patch };
  }

  assertConfirmed(ctx, "update_customer_followup");
  const updated = await updateCustomer(customerId, patch);
  if (!updated) throw new Error(`customer ${customerId} not found`);
  return { success: true, customer: updated };
}

export async function createMarketingTaskTool(input: ToolInput, ctx: HermesToolContext) {
  const customerId = requiredNumber(input, "customerId");
  const existing = await getCustomerById(customerId);
  if (!existing) throw new Error(`customer ${customerId} not found`);

  const title = requiredString(input, "title");
  const description = optionalString(input, "description");
  const dueAt = optionalString(input, "dueAt");
  if (dueAt && Number.isNaN(new Date(dueAt).getTime())) throw new Error("dueAt must be a valid date");

  const currentNotes = typeof existing.notes === "string" ? existing.notes.trim() : "";
  const taskLine = [
    `[Hermes营销任务] ${title}`,
    description ? `说明: ${description}` : undefined,
    dueAt ? `截止: ${new Date(dueAt).toISOString()}` : undefined,
  ].filter(Boolean).join(" | ");
  const patch = {
    status: optionalString(input, "status") ?? existing.status ?? "follow_up",
    followUpDate: dueAt ?? existing.followUpDate,
    notes: currentNotes ? `${currentNotes}\n${taskLine}` : taskLine,
  };

  if (ctx.dryRun) {
    return { wouldCreate: "marketing task", storedAs: "customer_followup", customerId, before: existing, patch };
  }

  assertConfirmed(ctx, "create_marketing_task");
  const updated = await updateCustomer(customerId, patch);
  if (!updated) throw new Error(`customer ${customerId} not found`);
  return { success: true, storedAs: "customer_followup", customer: updated };
}

export async function createKnowledgeEntryTool(input: ToolInput, ctx: HermesToolContext) {
  const payload = {
    parentId: optionalNumber(input, "parentId") ?? null,
    level: clamp(optionalNumber(input, "level") ?? 1, 1, 6),
    path: optionalString(input, "path"),
    order: optionalNumber(input, "order") ?? 0,
    module: optionalString(input, "module") ?? "repo_docs",
    category: optionalString(input, "category") ?? "Hermes",
    subCategory: optionalString(input, "subCategory"),
    title: requiredString(input, "title"),
    summary: optionalString(input, "summary"),
    content: requiredString(input, "content"),
    tags: optionalStringArray(input, "tags"),
    sources: optionalString(input, "sources"),
    credibility: clamp(optionalNumber(input, "credibility") ?? 5, 1, 10),
    difficulty: optionalDifficulty(input),
    type: optionalKnowledgeType(input) ?? "internal",
    isActive: input.isActive === 0 ? 0 : 1,
  };

  if (ctx.dryRun) {
    return { wouldCreate: "knowledge_base", payload };
  }

  assertConfirmed(ctx, "create_knowledge_entry");
  return createKnowledgeEntry(payload);
}
