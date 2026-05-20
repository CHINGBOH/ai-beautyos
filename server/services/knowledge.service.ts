/**
 * Knowledge Service
 * 知识库业务逻辑；router 只负责鉴权与参数校验。
 */

import {
  createKnowledge,
  getAllKnowledge,
  getKnowledgeById,
  updateKnowledge,
  deleteKnowledge,
  getActiveKnowledge,
  getKnowledgeByParentId,
  getKnowledgeTreeByModule,
  getKnowledgeByPath,
  searchKnowledge,
  incrementKnowledgeView,
} from "../db";
import { MODULE_NAMES } from "@shared/types";

export async function getAll(input: {
  type?: "customer" | "internal";
  module?: string;
  limit: number;
  offset: number;
  searchTerm?: string;
}) {
  try {
    return await getAllKnowledge(input);
  } catch (error) {
    console.warn("[knowledge.getAll] fallback empty list:", error instanceof Error ? error.message : error);
    return { items: [], total: 0 };
  }
}

export async function getById(id: number) {
  const knowledge = await getKnowledgeById(id);
  if (!knowledge) throw new Error("Knowledge not found");
  return knowledge;
}

export async function getByParentId(parentId: number | null) {
  return getKnowledgeByParentId(parentId);
}

export async function getTree() {
  try {
    return await getKnowledgeTreeByModule("health_foundation");
  } catch (error) {
    console.warn("[knowledge.getTree] fallback empty tree:", error instanceof Error ? error.message : error);
    return [];
  }
}

export async function getTreeByModule(module: string) {
  try {
    return await getKnowledgeTreeByModule(module);
  } catch (error) {
    console.warn("[knowledge.getTreeByModule] fallback empty tree:", error instanceof Error ? error.message : error);
    return [];
  }
}

export async function getByPath(path: string) {
  const knowledge = await getKnowledgeByPath(path);
  if (!knowledge) throw new Error("Knowledge not found");
  return knowledge;
}

export async function search(
  keyword: string,
  module?: string,
  type?: "customer" | "internal",
  limit = 20
) {
  try {
    return await searchKnowledge(keyword, module, type, limit);
  } catch (error) {
    console.warn("[knowledge.search] fallback empty results:", error instanceof Error ? error.message : error);
    return [];
  }
}

export async function incrementView(id: number) {
  await incrementKnowledgeView(id);
  return { success: true };
}

export async function createKnowledgeEntry(input: {
  parentId?: number | null;
  level: number;
  path?: string;
  order: number;
  module: string;
  category?: string;
  subCategory?: string;
  title: string;
  summary?: string;
  content: string;
  positiveEvidence?: string;
  negativeEvidence?: string;
  neutralAnalysis?: string;
  practicalGuide?: string;
  caseStudies?: string;
  expertOpinions?: string;
  images?: string;
  videos?: string;
  audio?: string;
  tags?: string[];
  sources?: string;
  credibility: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  type: "customer" | "internal";
  isActive: number;
}) {
  const { tags, category, ...rest } = input;
  await createKnowledge({
    ...rest,
    category: category ?? "",
    tags: tags ? JSON.stringify(tags) : null,
  });
  return { success: true };
}

export async function updateKnowledgeEntry(
  id: number,
  input: {
    parentId?: number | null;
    level?: number;
    path?: string;
    order?: number;
    module?: string;
    category?: string;
    subCategory?: string;
    title?: string;
    summary?: string;
    content?: string;
    positiveEvidence?: string;
    negativeEvidence?: string;
    neutralAnalysis?: string;
    practicalGuide?: string;
    caseStudies?: string;
    expertOpinions?: string;
    images?: string;
    videos?: string;
    audio?: string;
    tags?: string[];
    sources?: string;
    credibility?: number;
    difficulty?: "beginner" | "intermediate" | "advanced";
    type?: "customer" | "internal";
    isActive?: number;
  }
) {
  const { tags, ...rest } = input;
  const updateData: Record<string, unknown> = { ...rest };
  if (tags !== undefined) updateData.tags = JSON.stringify(tags);
  await updateKnowledge(id, updateData);
  return { success: true };
}

export async function deleteKnowledgeEntry(id: number) {
  await deleteKnowledge(id);
  return { success: true };
}

export async function getActive(
  category?: string,
  type?: "customer" | "internal",
  module?: string
) {
  return getActiveKnowledge(category, type, module);
}

export function getModules() {
  return {
    modules: Object.entries(MODULE_NAMES).map(([key, name]) => ({ key, name })),
  };
}
