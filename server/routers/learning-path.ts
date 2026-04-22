import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { searchKnowledge, getKnowledgeById, getKnowledgeByParentId } from "../db";
import { invokeLLM } from "../llm";
import { KNOWLEDGE_MODULES, MODULE_NAMES, MODULE_DESCRIPTIONS } from "@shared/types";
import type { KnowledgeModule } from "@shared/types";

const VALID_MODULES = new Set<string>(Object.values(KNOWLEDGE_MODULES));

function buildModuleListForPrompt(): string {
  return (Object.keys(MODULE_NAMES) as KnowledgeModule[])
    .map((id) => `${id} -> ${MODULE_NAMES[id]}，${MODULE_DESCRIPTIONS[id]}`)
    .join("；");
}

type LearningIntent = {
  keywords: string[];
  module: string;
  goalSummary: string | null;
  suggestedLevel: "beginner" | "intermediate" | "advanced" | null;
};

async function parseLearningIntentWithLLM(userText: string): Promise<LearningIntent | null> {
  const moduleList = buildModuleListForPrompt();
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `你是医美/美业知识库的学习路径助手。根据用户输入的问题或目标，解析出学习意图。

知识库可用模块列表（module 必须是下列 id 之一）：
${moduleList}

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
    const parsed = JSON.parse(text) as {
      keywords?: string[];
      module?: string;
      goalSummary?: string;
      suggestedLevel?: string;
    };
    if (!Array.isArray(parsed.keywords) || typeof parsed.module !== "string") return null;
    if (!VALID_MODULES.has(parsed.module)) return null;
    return {
      keywords: parsed.keywords.filter((k) => typeof k === "string" && k.length > 0),
      module: parsed.module,
      goalSummary:
        typeof parsed.goalSummary === "string" && parsed.goalSummary.trim()
          ? parsed.goalSummary.trim()
          : null,
      suggestedLevel:
        parsed.suggestedLevel === "beginner" ||
        parsed.suggestedLevel === "intermediate" ||
        parsed.suggestedLevel === "advanced"
          ? parsed.suggestedLevel
          : null,
    };
  } catch {
    return null;
  }
}

type PathStage = { stage: string; knowledge: any[]; description: string };

async function generateRecommendationText(
  userInput: string,
  path: PathStage[]
): Promise<string | null> {
  const pathSummary = path
    .map(
      (s) =>
        `${s.stage}：${s.knowledge.slice(0, 2).map((k: any) => k?.title ?? "").filter(Boolean).join("、")}`
    )
    .join("；");
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "你是美业知识库的文案助手。根据用户的问题或目标以及已生成的学习路径摘要，写一句 1～2 行的「为您推荐的学习计划」短文案，用于页面展示。要求：亲切、简洁、突出路径价值，不要重复罗列知识点标题。只返回这句文案，不要其他内容。",
        },
        {
          role: "user",
          content: `用户输入：${userInput}\n\n学习路径摘要：${pathSummary}`,
        },
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

/**
 * 学习路径生成器
 * 根据用户需求自动生成学习路径
 */
export const learningPathRouter = router({
  /**
   * 根据问题生成学习路径
   * 例如："我想了解色斑问题" → 生成从基础知识到解决方案的完整路径
   */
  generateByQuestion: publicProcedure
    .input(
      z.object({
        question: z.string().min(1).max(5000),
        module: z.string().optional(),
        includeRecommendationText: z.boolean().optional().default(true),
      })
    )
    .query(async ({ input }) => {
      const { question, module: inputModule, includeRecommendationText } = input;

      // LLM 问题理解（方案 A：system 含模块清单），失败则降级规则
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

      // 搜索相关知识
      const allResults = await searchKnowledge(question, detectedModule, undefined, 20);

      // 构建学习路径
      const path = buildLearningPath(keywords, detectedModule, allResults);

      // 可选：LLM 生成推荐话术
      let recommendationText: string | null = null;
      if (includeRecommendationText && path.length > 0) {
        recommendationText = await generateRecommendationText(question, path);
      }

      return {
        question,
        module: detectedModule,
        keywords,
        path,
        estimatedTime: calculateEstimatedTime(path),
        recommendationText,
      };
    }),

  /**
   * 根据目标生成学习路径
   * 例如："我想改善皮肤色斑" → 生成目标导向的学习路径
   */
  generateByGoal: publicProcedure
    .input(
      z.object({
        goal: z.string().min(1).max(5000),
        currentLevel: z.enum(["beginner", "intermediate", "advanced"]).optional().default("beginner"),
        includeRecommendationText: z.boolean().optional().default(true),
      })
    )
    .query(async ({ input }) => {
      const { goal, currentLevel: inputLevel, includeRecommendationText } = input;

      // LLM 问题理解，失败则降级规则
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

      // 搜索相关知识
      const allResults = await searchKnowledge(goal, module, undefined, 30);

      // 根据当前水平筛选和排序
      const filteredResults = filterByLevel(allResults, effectiveLevel);

      // 构建目标导向的学习路径
      const path = buildGoalPath(goal, keywords, module, filteredResults, effectiveLevel);

      // 可选：LLM 生成推荐话术
      let recommendationText: string | null = null;
      if (includeRecommendationText && path.length > 0) {
        recommendationText = await generateRecommendationText(goal, path);
      }

      return {
        goal,
        currentLevel: effectiveLevel,
        module,
        path,
        estimatedTime: calculateEstimatedTime(path),
        milestones: generateMilestones(path),
        recommendationText,
      };
    }),

  /**
   * 获取推荐的学习路径（基于知识库内容自动生成）
   */
  getRecommendedPaths: publicProcedure
    .input(
      z.object({
        module: z.string().optional(),
        limit: z.number().min(1).max(10).optional().default(5),
      })
    )
    .query(async ({ input }) => {
      // 基于知识库内容动态生成推荐路径
      const allKnowledge = await searchKnowledge("", input.module, undefined, 30);
      if (!allKnowledge || allKnowledge.length === 0) {
        return [];
      }

      // 按模块分组，每个模块取前几条作为一条推荐路径
      const grouped: Record<string, any[]> = {};
      for (const item of allKnowledge) {
        const mod = item.module || "general";
        if (!grouped[mod]) grouped[mod] = [];
        if (grouped[mod].length < 5) grouped[mod].push(item);
      }

      return Object.entries(grouped)
        .slice(0, input.limit)
        .map(([mod, items]) => ({
          id: `auto-${mod}`,
          title: items[0]?.title ? `${MODULE_NAMES[mod as keyof typeof MODULE_NAMES] || mod}学习路径` : `${mod}学习路径`,
          description: items.slice(0, 2).map((k) => k.title).join("、"),
          module: mod,
          estimatedTime: items.length * 7,
          knowledgeCount: items.length,
        }));
    }),
});

/**
 * 提取关键词
 */
function extractKeywords(text: string): string[] {
  // 从文本中按字符长度降序提取已知关键词
  const keywords = ["超皮秒", "热玛吉", "水光", "激光",
    "色斑", "痘痘", "敏感", "老化", "干燥", "油腻", "暗沉",
    "睡眠", "水分", "饮食", "运动",
    "中医", "体质", "食疗", "经络",
  ];

  const found: string[] = [];
  for (const keyword of keywords) {
    if (text.includes(keyword)) {
      found.push(keyword);
    }
  }

  return found;
}

/**
 * 检测模块
 */
function detectModule(text: string): string {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes("睡眠") || lowerText.includes("水分") || lowerText.includes("心情") || lowerText.includes("饮食") || lowerText.includes("运动")) {
    return KNOWLEDGE_MODULES.HEALTH_FOUNDATION;
  }
  if (lowerText.includes("皮肤") || lowerText.includes("色斑") || lowerText.includes("痘痘") || lowerText.includes("敏感")) {
    return KNOWLEDGE_MODULES.SKIN_CARE;
  }
  if (lowerText.includes("牙齿") || lowerText.includes("口腔")) {
    return KNOWLEDGE_MODULES.DENTAL_CARE;
  }
  if (lowerText.includes("中医") || lowerText.includes("体质") || lowerText.includes("食疗")) {
    return KNOWLEDGE_MODULES.TCM;
  }
  if (lowerText.includes("医美") || lowerText.includes("超皮秒") || lowerText.includes("热玛吉") || lowerText.includes("激光")) {
    return KNOWLEDGE_MODULES.AESTHETICS;
  }
  
  return KNOWLEDGE_MODULES.SKIN_CARE; // 默认
}

/**
 * 构建学习路径
 */
function buildLearningPath(
  keywords: string[],
  module: string,
  results: any[]
): Array<{ stage: string; knowledge: any[]; description: string }> {
  const path: Array<{ stage: string; knowledge: any[]; description: string }> = [];
  
  // 阶段1：基础知识
  const basics = results.filter(r => 
    r.level <= 2 || 
    r.title.includes("基础") || 
    r.title.includes("介绍") ||
    r.title.includes("原理")
  ).slice(0, 3);
  
  if (basics.length > 0) {
    path.push({
      stage: "基础知识",
      knowledge: basics,
      description: "了解基本概念和原理",
    });
  }
  
  // 阶段2：问题诊断
  const diagnosis = results.filter(r =>
    r.title.includes("诊断") ||
    r.title.includes("识别") ||
    r.title.includes("判断") ||
    r.category?.includes("诊断")
  ).slice(0, 2);
  
  if (diagnosis.length > 0) {
    path.push({
      stage: "问题诊断",
      knowledge: diagnosis,
      description: "学会识别和诊断问题",
    });
  }
  
  // 阶段3：解决方案
  const solutions = results.filter(r =>
    r.title.includes("治疗") ||
    r.title.includes("方案") ||
    r.title.includes("方法") ||
    r.title.includes("护理") ||
    r.category?.includes("方案")
  ).slice(0, 3);
  
  if (solutions.length > 0) {
    path.push({
      stage: "解决方案",
      knowledge: solutions,
      description: "掌握具体的解决方案",
    });
  }
  
  // 阶段4：日常维护
  const maintenance = results.filter(r =>
    r.title.includes("护理") ||
    r.title.includes("维护") ||
    r.title.includes("预防") ||
    r.title.includes("日常")
  ).slice(0, 2);
  
  if (maintenance.length > 0) {
    path.push({
      stage: "日常维护",
      knowledge: maintenance,
      description: "学习日常护理和预防方法",
    });
  }
  
  return path;
}

/**
 * 构建目标导向的学习路径
 */
function buildGoalPath(
  goal: string,
  keywords: string[],
  module: string,
  results: any[],
  currentLevel: string
): Array<{ stage: string; knowledge: any[]; description: string }> {
  // 根据目标调整路径结构
  return buildLearningPath(keywords, module, results);
}

/**
 * 根据难度级别筛选
 */
function filterByLevel(results: any[], level: string): any[] {
  if (level === "beginner") {
    return results.filter(r => !r.difficulty || r.difficulty === "beginner");
  } else if (level === "intermediate") {
    return results.filter(r => 
      !r.difficulty || 
      r.difficulty === "beginner" || 
      r.difficulty === "intermediate"
    );
  }
  return results; // advanced 显示所有
}

/**
 * 计算预计学习时间（分钟）
 */
function calculateEstimatedTime(path: Array<{ knowledge: any[] }>): number {
  // 每个知识点预计5-10分钟
  const totalKnowledge = path.reduce((sum, stage) => sum + stage.knowledge.length, 0);
  return totalKnowledge * 7; // 平均7分钟每个知识点
}

/**
 * 生成里程碑
 */
function generateMilestones(path: Array<{ stage: string; knowledge: any[] }>): Array<{ title: string; description: string }> {
  return path.map((stage) => ({
    title: `完成${stage.stage}`,
    description: `学习${stage.knowledge.length}个相关知识点`,
  }));
}
