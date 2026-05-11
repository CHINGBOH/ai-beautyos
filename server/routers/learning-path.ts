import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { searchKnowledge, getKnowledgeById, getKnowledgeByParentId } from "../db";
import { KNOWLEDGE_MODULES } from "@shared/types";

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
        question: z.string().min(1),
        module: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { question, module } = input;
      
      // 分析问题，识别关键词和模块
      const keywords = extractKeywords(question);
      const detectedModule = module || detectModule(question);
      
      // 搜索相关知识
      const allResults = await searchKnowledge(question, detectedModule, undefined, 20);
      
      // 构建学习路径
      const path = buildLearningPath(keywords, detectedModule, allResults);
      
      return {
        question,
        module: detectedModule,
        keywords,
        path,
        estimatedTime: calculateEstimatedTime(path),
      };
    }),

  /**
   * 根据目标生成学习路径
   * 例如："我想改善皮肤色斑" → 生成目标导向的学习路径
   */
  generateByGoal: publicProcedure
    .input(
      z.object({
        goal: z.string().min(1),
        currentLevel: z.enum(["beginner", "intermediate", "advanced"]).optional().default("beginner"),
      })
    )
    .query(async ({ input }) => {
      const { goal, currentLevel } = input;
      
      // 识别目标相关的模块和知识点
      const keywords = extractKeywords(goal);
      const module = detectModule(goal);
      
      // 搜索相关知识
      const allResults = await searchKnowledge(goal, module, undefined, 30);
      
      // 根据当前水平筛选和排序
      const filteredResults = filterByLevel(allResults, currentLevel);
      
      // 构建目标导向的学习路径
      const path = buildGoalPath(goal, keywords, module, filteredResults, currentLevel);
      
      return {
        goal,
        currentLevel,
        module,
        path,
        estimatedTime: calculateEstimatedTime(path),
        milestones: generateMilestones(path),
      };
    }),

  /**
   * 获取推荐的学习路径（基于热门内容）
   */
  getRecommendedPaths: publicProcedure
    .input(
      z.object({
        module: z.string().optional(),
        limit: z.number().min(1).max(10).optional().default(5),
      })
    )
    .query(async ({ input }) => {
      // 这里可以基于用户行为、热门内容等生成推荐路径
      // 暂时返回预设的推荐路径
      return getPresetPaths(input.module, input.limit);
    }),
});

/**
 * 提取关键词
 */
function extractKeywords(text: string): string[] {
  const commonKeywords = [
    "色斑", "痘痘", "敏感", "老化", "干燥", "油腻", "暗沉",
    "睡眠", "水分", "心情", "饮食", "运动",
    "超皮秒", "热玛吉", "水光", "激光",
    "中医", "体质", "食疗", "经络",
  ];
  
  const found: string[] = [];
  for (const keyword of commonKeywords) {
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
  return path.map((stage, index) => ({
    title: `完成${stage.stage}`,
    description: `学习${stage.knowledge.length}个相关知识点`,
  }));
}

/**
 * 获取预设的学习路径
 */
function getPresetPaths(module?: string, limit: number = 5): Array<{
  id: string;
  title: string;
  description: string;
  module: string;
  estimatedTime: number;
  knowledgeCount: number;
}> {
  const presetPaths = [
    {
      id: "skin-spots",
      title: "色斑问题完整解决方案",
      description: "从色斑成因到治疗方案，全面了解色斑问题",
      module: KNOWLEDGE_MODULES.SKIN_CARE,
      estimatedTime: 45,
      knowledgeCount: 8,
    },
    {
      id: "sleep-beauty",
      title: "睡眠与美容的关系",
      description: "深入了解睡眠如何影响皮肤健康",
      module: KNOWLEDGE_MODULES.HEALTH_FOUNDATION,
      estimatedTime: 30,
      knowledgeCount: 6,
    },
    {
      id: "acne-treatment",
      title: "痘痘问题全攻略",
      description: "从成因分析到日常护理，科学战痘",
      module: KNOWLEDGE_MODULES.SKIN_CARE,
      estimatedTime: 50,
      knowledgeCount: 10,
    },
    {
      id: "tcm-beauty",
      title: "中医美容入门",
      description: "了解中医美容理论和实践方法",
      module: KNOWLEDGE_MODULES.TCM,
      estimatedTime: 60,
      knowledgeCount: 12,
    },
    {
      id: "aesthetics-basics",
      title: "医美技术基础",
      description: "了解常见医美项目的原理和效果",
      module: KNOWLEDGE_MODULES.AESTHETICS,
      estimatedTime: 40,
      knowledgeCount: 7,
    },
  ];
  
  if (module) {
    return presetPaths.filter(p => p.module === module).slice(0, limit);
  }
  
  return presetPaths.slice(0, limit);
}
