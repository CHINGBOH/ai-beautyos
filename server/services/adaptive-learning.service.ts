/**
 * Adaptive Learning Service
 * 自适应学习业务逻辑；router 只负责鉴权与参数校验。
 */

import { TRPCError } from "@trpc/server";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { knowledgeBase, userLearningPreferences } from "../../drizzle/schema";
import type { KnowledgeBase } from "../../drizzle/schema";

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

const DIFFICULTY_ORDER = { beginner: 1, intermediate: 2, advanced: 3 } as const;
type Difficulty = keyof typeof DIFFICULTY_ORDER;

function estimateContentTime(content: KnowledgeBase): number {
  const multiplier = { beginner: 1, intermediate: 1.5, advanced: 2 } as const;
  const diff = content.difficulty as keyof typeof multiplier | null;
  return 15 * (diff ? multiplier[diff] : 1);
}

function getPrerequisites(content: KnowledgeBase, previous: KnowledgeBase[]): string[] {
  return previous.map(item => item.title);
}

function getObjectives(content: KnowledgeBase): string[] {
  return [
    `理解${content.title}的基本概念`,
    `掌握${content.title}的核心要点`,
    `能够应用${content.title}的知识`,
  ];
}

function organizeLearningPath(content: KnowledgeBase[], userLevel: string) {
  const moduleGroups = content.reduce<Record<string, KnowledgeBase[]>>((groups, item) => {
    const mod = item.module;
    if (!groups[mod]) groups[mod] = [];
    groups[mod].push(item);
    return groups;
  }, {});

  Object.keys(moduleGroups).forEach(mod => {
    moduleGroups[mod].sort((a, b) => {
      const da = a.difficulty as Difficulty | null;
      const db_ = b.difficulty as Difficulty | null;
      return (DIFFICULTY_ORDER[da!] || 0) - (DIFFICULTY_ORDER[db_!] || 0);
    });
  });

  const pathSteps: Array<{
    id: number;
    title: string;
    summary: string | null;
    module: string;
    difficulty: string | null;
    stepOrder: number;
    stepType: string;
    estimatedTime: number;
    prerequisites: string[];
    objectives: string[];
  }> = [];
  let stepOrder = 1;

  Object.keys(moduleGroups).forEach(mod => {
    moduleGroups[mod].forEach((item, index) => {
      pathSteps.push({
        id: item.id,
        title: item.title,
        summary: item.summary,
        module: item.module,
        difficulty: item.difficulty,
        stepOrder: stepOrder++,
        stepType: index === 0 ? "module_intro" : "content",
        estimatedTime: estimateContentTime(item),
        prerequisites: getPrerequisites(item, moduleGroups[mod].slice(0, index)),
        objectives: getObjectives(item),
      });
    });
  });

  return pathSteps;
}

function calculateEstimatedTime(path: Array<{ estimatedTime?: number }>): number {
  return path.reduce((total, step) => total + (step.estimatedTime || 15), 0);
}

function identifyTargetModules(goalDescription: string): string[] {
  const goalLower = goalDescription.toLowerCase();
  const moduleKeywords: Record<string, string[]> = {
    skin_care: ["皮肤", "护肤", "美容", "祛斑", "美白"],
    health_foundation: ["健康", "睡眠", "饮食", "运动", "心理"],
    aesthetics: ["医美", "激光", "注射", "手术"],
    dental_care: ["牙齿", "口腔", "美白", "矫正"],
    tcm: ["中医", "养生", "经络", "体质"],
  };

  const matched = Object.keys(moduleKeywords).filter(mod =>
    moduleKeywords[mod].some(kw => goalLower.includes(kw))
  );
  return matched.length > 0 ? matched : ["skin_care"];
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });
  return db;
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function getUserLearningProfile(userId: number) {
  const db = await requireDb();

  const topModules = await db
    .select({ module: knowledgeBase.module, total: sql<number>`count(*)` })
    .from(knowledgeBase)
    .where(eq(knowledgeBase.isActive, 1))
    .groupBy(knowledgeBase.module)
    .orderBy(desc(sql`count(*)`))
    .limit(3);
  const interests = topModules.map((r: any) => r.module).filter(Boolean);

  return {
    currentLevel: "beginner",
    interests: interests.length > 0 ? interests : ["skin_care"],
    completedModules: [] as string[],
    preferredDifficulty: "beginner",
    learningGoals: [] as string[],
    timePreference: "medium",
    averageSessionTime: 30,
    totalLearningTime: 0,
    lastActiveDate: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function generateLearningPath(
  input: {
    type: "problem_oriented" | "goal_oriented" | "personalized";
    problemDescription?: string;
    goalDescription?: string;
    userLevel: "beginner" | "intermediate" | "advanced";
    preferredModules?: string[];
    timeLimit?: number;
    focusAreas?: string[];
  },
  userId: number
) {
  const db = await requireDb();
  const userProfile = await getUserLearningProfile(userId);

  let learningPath: any[] = [];

  if (input.type === "problem_oriented") {
    if (!input.problemDescription) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "问题描述不能为空" });
    }
    const searchTerm = `%${input.problemDescription}%`;
    const relatedContent = await db
      .select({
        id: knowledgeBase.id, title: knowledgeBase.title, summary: knowledgeBase.summary,
        module: knowledgeBase.module, difficulty: knowledgeBase.difficulty, credibility: knowledgeBase.credibility,
      })
      .from(knowledgeBase)
      .where(and(
        eq(knowledgeBase.isActive, 1),
        sql`(${knowledgeBase.title} ILIKE ${searchTerm} OR ${knowledgeBase.summary} ILIKE ${searchTerm} OR ${knowledgeBase.content} ILIKE ${searchTerm})`
      ))
      .orderBy(desc(knowledgeBase.credibility))
      .limit(10);
    learningPath = organizeLearningPath(relatedContent as KnowledgeBase[], input.userLevel);

  } else if (input.type === "goal_oriented") {
    if (!input.goalDescription) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "目标描述不能为空" });
    }
    const targetModules = identifyTargetModules(input.goalDescription);
    let q = db
      .select({
        id: knowledgeBase.id, title: knowledgeBase.title, summary: knowledgeBase.summary,
        module: knowledgeBase.module, difficulty: knowledgeBase.difficulty, credibility: knowledgeBase.credibility,
      })
      .from(knowledgeBase)
      .where(eq(knowledgeBase.isActive, 1)) as any;

    if (targetModules.length > 0) {
      q = q.where(inArray(knowledgeBase.module, targetModules));
    }
    const relatedContent = await q.orderBy(desc(knowledgeBase.credibility)).limit(15);
    learningPath = organizeLearningPath(relatedContent as KnowledgeBase[], input.userLevel);

  } else {
    let q = db
      .select({
        id: knowledgeBase.id, title: knowledgeBase.title, summary: knowledgeBase.summary,
        module: knowledgeBase.module, difficulty: knowledgeBase.difficulty, credibility: knowledgeBase.credibility,
      })
      .from(knowledgeBase)
      .where(eq(knowledgeBase.isActive, 1)) as any;

    if (input.preferredModules && input.preferredModules.length > 0) {
      q = q.where(inArray(knowledgeBase.module, input.preferredModules));
    }
    if (input.userLevel !== "advanced") {
      const allowed = input.userLevel === "beginner" ? ["beginner"] : ["beginner", "intermediate"];
      q = q.where(inArray(knowledgeBase.difficulty, allowed));
    }
    const relatedContent = await q.orderBy(desc(knowledgeBase.credibility)).limit(20);
    learningPath = organizeLearningPath(relatedContent as KnowledgeBase[], input.userLevel);
  }

  return {
    path: learningPath,
    type: input.type,
    estimatedTime: calculateEstimatedTime(learningPath),
    generatedAt: new Date(),
    userProfile: {
      level: userProfile.currentLevel,
      interests: userProfile.interests,
      completedModules: userProfile.completedModules,
    },
  };
}

export async function trackLearningProgress(
  input: {
    contentId: number;
    status: "started" | "in_progress" | "completed" | "skipped";
    timeSpent?: number;
    rating?: number;
    feedback?: string;
  },
  userId: number
) {
  const db = await requireDb();

  if (input.contentId) {
    await db.execute(
      sql`UPDATE ${knowledgeBase} SET ${knowledgeBase.usedCount} = ${knowledgeBase.usedCount} + 1 WHERE ${knowledgeBase.id} = ${input.contentId}`
    );
  }

  return {
    success: true,
    message: "学习进度已更新",
    contentId: input.contentId,
    status: input.status,
  };
}

export async function getProgressStats(userId: number) {
  const db = await requireDb();

  const moduleStats = await db
    .select({
      module: knowledgeBase.module,
      count: sql<number>`count(*)`,
      totalUsed: sql<number>`COALESCE(SUM(${knowledgeBase.usedCount}), 0)`,
      totalViews: sql<number>`COALESCE(SUM(${knowledgeBase.viewCount}), 0)`,
    })
    .from(knowledgeBase)
    .where(eq(knowledgeBase.isActive, 1))
    .groupBy(knowledgeBase.module);

  const modulesProgress: Record<string, { count: number; used: number; views: number }> = {};
  let totalCompleted = 0;
  for (const row of moduleStats) {
    modulesProgress[row.module || "general"] = {
      count: Number(row.count),
      used: Number(row.totalUsed),
      views: Number(row.totalViews),
    };
    totalCompleted += Number(row.totalUsed);
  }

  return {
    totalCompleted,
    totalTimeSpent: totalCompleted * 7,
    averageRating: 0,
    currentStreak: 0,
    modulesProgress,
    recentActivity: [] as any[],
    achievements: [] as any[],
  };
}

export async function updateLearningPreferences(
  input: {
    preferredDifficulty?: "beginner" | "intermediate" | "advanced";
    preferredContentType?: string[];
    learningGoals?: string[];
    timePreference?: "short" | "medium" | "long";
    interests?: string[];
  },
  userId: number
) {
  const db = await requireDb();

  const set: Record<string, unknown> = {};
  if (input.preferredDifficulty !== undefined) set.preferredDifficulty = input.preferredDifficulty;
  if (input.preferredContentType !== undefined) set.preferredContentTypes = input.preferredContentType;
  if (input.learningGoals !== undefined) set.learningGoals = input.learningGoals;
  if (input.timePreference !== undefined) set.timePreference = input.timePreference;
  if (input.interests !== undefined) set.interests = input.interests;
  set.updatedAt = new Date().toISOString();

  await db
    .insert(userLearningPreferences)
    .values({
      userId,
      preferredDifficulty: input.preferredDifficulty,
      preferredContentTypes: input.preferredContentType,
      learningGoals: input.learningGoals,
      timePreference: input.timePreference,
      interests: input.interests,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoUpdate({ target: userLearningPreferences.userId, set });

  return { success: true, message: "学习偏好已更新", preferences: input };
}

export async function getRecommendations(
  input: {
    limit: number;
    context: "continue_learning" | "explore_new" | "review";
  },
  userId: number
) {
  const db = await requireDb();
  const userProfile = await getUserLearningProfile(userId);

  let recommendations: any[] = [];

  if (input.context === "continue_learning") {
    const modules = userProfile.interests.length > 0 ? userProfile.interests : ["skin_care"];
    recommendations = await db
      .select({ id: knowledgeBase.id, title: knowledgeBase.title, module: knowledgeBase.module, difficulty: knowledgeBase.difficulty })
      .from(knowledgeBase)
      .where(and(eq(knowledgeBase.isActive, 1), inArray(knowledgeBase.module, modules)))
      .orderBy(desc(knowledgeBase.usedCount))
      .limit(10);
  } else if (input.context === "explore_new") {
    recommendations = await db
      .select({ id: knowledgeBase.id, title: knowledgeBase.title, module: knowledgeBase.module, difficulty: knowledgeBase.difficulty })
      .from(knowledgeBase)
      .where(and(eq(knowledgeBase.isActive, 1), sql`${knowledgeBase.usedCount} = 0`))
      .orderBy(desc(knowledgeBase.credibility))
      .limit(10);
  } else {
    recommendations = await db
      .select({ id: knowledgeBase.id, title: knowledgeBase.title, module: knowledgeBase.module, viewCount: knowledgeBase.viewCount })
      .from(knowledgeBase)
      .where(eq(knowledgeBase.isActive, 1))
      .orderBy(desc(knowledgeBase.viewCount))
      .limit(10);
  }

  return {
    recommendations: recommendations.slice(0, input.limit),
    context: input.context,
    generatedAt: new Date(),
  };
}

export async function getLearningAnalytics(
  input: { period: "week" | "month" | "quarter" | "year" },
  userId: number
) {
  const db = await requireDb();

  const moduleStats = await db
    .select({
      module: knowledgeBase.module,
      count: sql<number>`count(*)`,
      totalUsed: sql<number>`COALESCE(SUM(${knowledgeBase.usedCount}), 0)`,
    })
    .from(knowledgeBase)
    .where(eq(knowledgeBase.isActive, 1))
    .groupBy(knowledgeBase.module);

  const moduleDistribution: Record<string, number> = {};
  for (const row of moduleStats) {
    moduleDistribution[row.module || "general"] = Number(row.count);
  }

  return {
    period: input.period,
    analytics: {
      learningTrend: [] as any[],
      moduleDistribution,
      difficultyProgression: [] as any[],
      engagementMetrics: {} as Record<string, unknown>,
      improvementAreas: [] as string[],
      strengths: [] as string[],
    },
    generatedAt: new Date(),
  };
}
