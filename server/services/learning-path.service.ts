/**
 * Learning Path Service
 * 学习路径生成业务逻辑；router 只负责鉴权与参数校验。
 */

import { searchKnowledge } from "../db";
import { invokeLLM } from "../llm";
import { KNOWLEDGE_MODULES, MODULE_NAMES, MODULE_DESCRIPTIONS } from "@shared/types";
import type { KnowledgeModule } from "@shared/types";

const VALID_MODULES = new Set<string>(Object.values(KNOWLEDGE_MODULES));

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function buildModuleListForPrompt(): string {
  return (Object.keys(MODULE_NAMES) as KnowledgeModule[])
    .map(id => `${id} -> ${MODULE_NAMES[id]}，${MODULE_DESCRIPTIONS[id]}`)
    .join("；");
}

function extractKeywords(text: string): string[] {
  const keywords = [
    "超皮秒", "热玛吉", "水光", "激光",
    "色斑", "痘痘", "敏感", "老化", "干燥", "油腻", "暗沉",
    "睡眠", "水分", "饮食", "运动",
    "中医", "体质", "食疗", "经络",
  ];
  return keywords.filter(kw => text.includes(kw));
}

function detectModule(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("睡眠") || t.includes("水分") || t.includes("心情") || t.includes("饮食") || t.includes("运动"))
    return KNOWLEDGE_MODULES.HEALTH_FOUNDATION;
  if (t.includes("皮肤") || t.includes("色斑") || t.includes("痘痘") || t.includes("敏感"))
    return KNOWLEDGE_MODULES.SKIN_CARE;
  if (t.includes("牙齿") || t.includes("口腔"))
    return KNOWLEDGE_MODULES.DENTAL_CARE;
  if (t.includes("中医") || t.includes("体质") || t.includes("食疗"))
    return KNOWLEDGE_MODULES.TCM;
  if (t.includes("医美") || t.includes("超皮秒") || t.includes("热玛吉") || t.includes("激光"))
    return KNOWLEDGE_MODULES.AESTHETICS;
  return KNOWLEDGE_MODULES.SKIN_CARE;
}

function filterByLevel(results: any[], level: string): any[] {
  if (level === "beginner") return results.filter(r => !r.difficulty || r.difficulty === "beginner");
  if (level === "intermediate") return results.filter(r => !r.difficulty || r.difficulty === "beginner" || r.difficulty === "intermediate");
  return results;
}

function buildLearningPath(keywords: string[], module: string, results: any[]): Array<{ stage: string; knowledge: any[]; description: string }> {
  const path: Array<{ stage: string; knowledge: any[]; description: string }> = [];

  const basics = results.filter(r =>
    r.level <= 2 || r.title.includes("基础") || r.title.includes("介绍") || r.title.includes("原理")
  ).slice(0, 3);
  if (basics.length > 0) path.push({ stage: "基础知识", knowledge: basics, description: "了解基本概念和原理" });

  const diagnosis = results.filter(r =>
    r.title.includes("诊断") || r.title.includes("识别") || r.title.includes("判断") || r.category?.includes("诊断")
  ).slice(0, 2);
  if (diagnosis.length > 0) path.push({ stage: "问题诊断", knowledge: diagnosis, description: "学会识别和诊断问题" });

  const solutions = results.filter(r =>
    r.title.includes("治疗") || r.title.includes("方案") || r.title.includes("方法") || r.title.includes("护理") || r.category?.includes("方案")
  ).slice(0, 3);
  if (solutions.length > 0) path.push({ stage: "解决方案", knowledge: solutions, description: "掌握具体的解决方案" });

  const maintenance = results.filter(r =>
    r.title.includes("护理") || r.title.includes("维护") || r.title.includes("预防") || r.title.includes("日常")
  ).slice(0, 2);
  if (maintenance.length > 0) path.push({ stage: "日常维护", knowledge: maintenance, description: "学习日常护理和预防方法" });

  return path;
}

function calculateEstimatedTime(path: Array<{ knowledge: any[] }>): number {
  return path.reduce((sum, stage) => sum + stage.knowledge.length, 0) * 7;
}

function generateMilestones(path: Array<{ stage: string; knowledge: any[] }>): Array<{ title: string; description: string }> {
  return path.map(stage => ({
    title: `完成${stage.stage}`,
    description: `学习${stage.knowledge.length}个相关知识点`,
  }));
}

type LearningIntent = {
  keywords: string[];
  module: string;
  goalSummary: string | null;
  suggestedLevel: "beginner" | "intermediate" | "advanced" | null;
};

async function parseLearningIntentWithLLM(userText: string): Promise<LearningIntent | null> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `你是医美/美业知识库的学习路径助手。根据用户输入的问题或目标，解析出学习意图。

知识库可用模块列表（module 必须是下列 id 之一）：
${buildModuleListForPrompt()}

请返回 JSON：
- keywords：从用户输入中抽取的关键词数组，用于后续检索，至少 1 个。
- module：上述列表中的模块 id，与用户意图最相关的一个。
- goalSummary：用户目标或问题的简短概括，可选，无则填空字符串。
- suggestedLevel：建议学习级别，可选值 beginner / intermediate / advanced，无则填空字符串。`,
        },
        { role: "user", content: userText },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "learning_intent",
          strict: true,
          schema: {
            type: "object",
            properties: {
              keywords: { type: "array", items: { type: "string" } },
              module: { type: "string" },
              goalSummary: { type: "string" },
              suggestedLevel: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
            },
            required: ["keywords", "module"],
            additionalProperties: false,
          },
        },
      },
    });
    const raw = response.choices?.[0]?.message?.content;
    if (!raw) return null;
    const text = typeof raw === "string" ? raw : JSON.stringify(raw);
    const parsed = JSON.parse(text) as { keywords?: string[]; module?: string; goalSummary?: string; suggestedLevel?: string };
    if (!Array.isArray(parsed.keywords) || typeof parsed.module !== "string") return null;
    if (!VALID_MODULES.has(parsed.module)) return null;
    return {
      keywords: parsed.keywords.filter(k => typeof k === "string" && k.length > 0),
      module: parsed.module,
      goalSummary: typeof parsed.goalSummary === "string" && parsed.goalSummary.trim() ? parsed.goalSummary.trim() : null,
      suggestedLevel: (["beginner", "intermediate", "advanced"] as const).includes(parsed.suggestedLevel as any)
        ? (parsed.suggestedLevel as LearningIntent["suggestedLevel"])
        : null,
    };
  } catch {
    return null;
  }
}

async function generateRecommendationText(userInput: string, path: Array<{ stage: string; knowledge: any[] }>): Promise<string | null> {
  const pathSummary = path
    .map(s => `${s.stage}：${s.knowledge.slice(0, 2).map((k: any) => k?.title ?? "").filter(Boolean).join("、")}`)
    .join("；");
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "你是美业知识库的文案助手。根据用户的问题或目标以及已生成的学习路径摘要，写一句 1～2 行的「为您推荐的学习计划」短文案，用于页面展示。要求：亲切、简洁、突出路径价值，不要重复罗列知识点标题。只返回这句文案，不要其他内容。",
        },
        { role: "user", content: `用户输入：${userInput}\n\n学习路径摘要：${pathSummary}` },
      ],
    });
    const raw = response.choices?.[0]?.message?.content;
    if (!raw) return null;
    const text = (typeof raw === "string" ? raw : JSON.stringify(raw)).trim();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function generatePathByQuestion(input: {
  question: string;
  module?: string;
  includeRecommendationText?: boolean;
}) {
  const { question, module: inputModule, includeRecommendationText = true } = input;

  let keywords: string[];
  let detectedModule: string;
  const parsed = await parseLearningIntentWithLLM(question);
  if (parsed && parsed.keywords.length > 0) {
    keywords = parsed.keywords;
    detectedModule = inputModule && VALID_MODULES.has(inputModule) ? inputModule : parsed.module;
  } else {
    keywords = extractKeywords(question);
    detectedModule = inputModule || detectModule(question);
  }

  const allResults = await searchKnowledge(question, detectedModule, undefined, 20);
  const path = buildLearningPath(keywords, detectedModule, allResults);

  let recommendationText: string | null = null;
  if (includeRecommendationText && path.length > 0) {
    recommendationText = await generateRecommendationText(question, path);
  }

  return { question, module: detectedModule, keywords, path, estimatedTime: calculateEstimatedTime(path), recommendationText };
}

export async function generatePathByGoal(input: {
  goal: string;
  currentLevel?: "beginner" | "intermediate" | "advanced";
  includeRecommendationText?: boolean;
}) {
  const { goal, currentLevel: inputLevel = "beginner", includeRecommendationText = true } = input;

  let keywords: string[];
  let module: string;
  let effectiveLevel = inputLevel;
  const parsed = await parseLearningIntentWithLLM(goal);
  if (parsed && parsed.keywords.length > 0) {
    keywords = parsed.keywords;
    module = parsed.module;
    if (parsed.suggestedLevel) effectiveLevel = parsed.suggestedLevel;
  } else {
    keywords = extractKeywords(goal);
    module = detectModule(goal);
  }

  const allResults = await searchKnowledge(goal, module, undefined, 30);
  const filteredResults = filterByLevel(allResults, effectiveLevel);
  const path = buildLearningPath(keywords, module, filteredResults);

  let recommendationText: string | null = null;
  if (includeRecommendationText && path.length > 0) {
    recommendationText = await generateRecommendationText(goal, path);
  }

  return {
    goal, currentLevel: effectiveLevel, module, path,
    estimatedTime: calculateEstimatedTime(path),
    milestones: generateMilestones(path),
    recommendationText,
  };
}

export async function getRecommendedPaths(input: { module?: string; limit?: number }) {
  const { module, limit = 5 } = input;
  const allKnowledge = await searchKnowledge("", module, undefined, 30);
  if (!allKnowledge || allKnowledge.length === 0) return [];

  const grouped: Record<string, any[]> = {};
  for (const item of allKnowledge) {
    const mod = item.module || "general";
    if (!grouped[mod]) grouped[mod] = [];
    if (grouped[mod].length < 5) grouped[mod].push(item);
  }

  return Object.entries(grouped)
    .slice(0, limit)
    .map(([mod, items]) => ({
      id: `auto-${mod}`,
      title: items[0]?.title ? `${MODULE_NAMES[mod as keyof typeof MODULE_NAMES] || mod}学习路径` : `${mod}学习路径`,
      description: items.slice(0, 2).map((k: any) => k.title).join("、"),
      module: mod,
      estimatedTime: items.length * 7,
      knowledgeCount: items.length,
    }));
}
