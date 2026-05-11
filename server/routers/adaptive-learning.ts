/**
 * 自适应学习路由
 * 实现个性化学习路径和进度跟踪
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { knowledgeBase, users } from '../drizzle/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';

// 学习路径输入验证
const generatePathInput = z.object({
  type: z.enum(['problem_oriented', 'goal_oriented', 'personalized']),
  problemDescription: z.string().optional(),
  goalDescription: z.string().optional(),
  userLevel: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  preferredModules: z.array(z.string()).optional(),
  timeLimit: z.number().optional(), // 预计学习时间（分钟）
  focusAreas: z.array(z.string()).optional(), // 重点关注的领域
});

// 学习进度输入验证
const trackProgressInput = z.object({
  contentId: z.number(),
  status: z.enum(['started', 'in_progress', 'completed', 'skipped']),
  timeSpent: z.number().optional(), // 学习时间（分钟）
  rating: z.number().min(1).max(5).optional(), // 用户评分
  feedback: z.string().optional(), // 用户反馈
});

// 学习偏好输入验证
const updatePreferencesInput = z.object({
  preferredDifficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  preferredContentType: z.array(z.string()).optional(),
  learningGoals: z.array(z.string()).optional(),
  timePreference: z.enum(['short', 'medium', 'long']).optional(), // 偏好的学习时长
  interests: z.array(z.string()).optional(),
});

/**
 * 自适应学习路由
 */
export const adaptiveLearningRouter = router({
  /**
   * 生成个性化学习路径
   */
  generatePath: protectedProcedure
    .input(generatePathInput)
    .query(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: '数据库连接失败',
          });
        }

        const userId = ctx.user!.id;

        // 获取用户学习历史和偏好
        const userProfile = await getUserLearningProfile(db, userId);
        
        let learningPath: any[] = [];

        switch (input.type) {
          case 'problem_oriented':
            learningPath = await generateProblemOrientedPath(db, input, userProfile);
            break;
          case 'goal_oriented':
            learningPath = await generateGoalOrientedPath(db, input, userProfile);
            break;
          case 'personalized':
            learningPath = await generatePersonalizedPath(db, input, userProfile);
            break;
        }

        // 估算学习时间
        const estimatedTime = calculateEstimatedTime(learningPath);

        return {
          path: learningPath,
          type: input.type,
          estimatedTime,
          generatedAt: new Date(),
          userProfile: {
            level: userProfile.currentLevel,
            interests: userProfile.interests,
            completedModules: userProfile.completedModules,
          },
        };

      } catch (error) {
        console.error('Generate path error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '生成学习路径失败',
        });
      }
    }),

  /**
   * 跟踪学习进度
   */
  trackProgress: protectedProcedure
    .input(trackProgressInput)
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: '数据库连接失败',
          });
        }

        const userId = ctx.user!.id;

        // 这里应该有一个学习进度表，暂时使用用户表的扩展字段
        // 实际项目中需要创建专门的进度跟踪表
        
        // 更新用户的学习统计
        await updateUserLearningStats(db, userId, input);

        return {
          success: true,
          message: '学习进度已更新',
          contentId: input.contentId,
          status: input.status,
        };

      } catch (error) {
        console.error('Track progress error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '跟踪学习进度失败',
        });
      }
    }),

  /**
   * 获取学习进度统计
   */
  getProgressStats: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: '数据库连接失败',
          });
        }

        const userId = ctx.user!.id;

        // 获取用户学习统计
        const stats = await getUserLearningStats(db, userId);

        return {
          totalCompleted: stats.totalCompleted,
          totalTimeSpent: stats.totalTimeSpent,
          averageRating: stats.averageRating,
          currentStreak: stats.currentStreak,
          modulesProgress: stats.modulesProgress,
          recentActivity: stats.recentActivity,
          achievements: stats.achievements,
        };

      } catch (error) {
        console.error('Get progress stats error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '获取学习统计失败',
        });
      }
    }),

  /**
   * 更新学习偏好
   */
  updatePreferences: protectedProcedure
    .input(updatePreferencesInput)
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: '数据库连接失败',
          });
        }

        const userId = ctx.user!.id;

        // 更新用户偏好设置
        await updateUserPreferences(db, userId, input);

        return {
          success: true,
          message: '学习偏好已更新',
          preferences: input,
        };

      } catch (error) {
        console.error('Update preferences error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '更新学习偏好失败',
        });
      }
    }),

  /**
   * 获取推荐内容
   */
  getRecommendations: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(20).default(10),
      context: z.enum(['continue_learning', 'explore_new', 'review']).default('continue_learning'),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: '数据库连接失败',
          });
        }

        const userId = ctx.user!.id;
        const userProfile = await getUserLearningProfile(db, userId);

        let recommendations: any[] = [];

        switch (input.context) {
          case 'continue_learning':
            recommendations = await getContinueLearningRecommendations(db, userProfile);
            break;
          case 'explore_new':
            recommendations = await getExploreNewRecommendations(db, userProfile);
            break;
          case 'review':
            recommendations = await getReviewRecommendations(db, userProfile);
            break;
        }

        return {
          recommendations: recommendations.slice(0, input.limit),
          context: input.context,
          generatedAt: new Date(),
        };

      } catch (error) {
        console.error('Get recommendations error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '获取推荐内容失败',
        });
      }
    }),

  /**
   * 获取学习分析报告
   */
  getAnalytics: protectedProcedure
    .input(z.object({
      period: z.enum(['week', 'month', 'quarter', 'year']).default('month'),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: '数据库连接失败',
          });
        }

        const userId = ctx.user!.id;

        // 获取学习分析数据
        const analytics = await getLearningAnalytics(db, userId, input.period);

        return {
          period: input.period,
          analytics: {
            learningTrend: analytics.learningTrend,
            moduleDistribution: analytics.moduleDistribution,
            difficultyProgression: analytics.difficultyProgression,
            engagementMetrics: analytics.engagementMetrics,
            improvementAreas: analytics.improvementAreas,
            strengths: analytics.strengths,
          },
          generatedAt: new Date(),
        };

      } catch (error) {
        console.error('Get analytics error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: '获取学习分析失败',
        });
      }
    }),
});

/**
 * 获取用户学习档案
 */
async function getUserLearningProfile(db: any, userId: number) {
  // 这里应该从用户表和学习进度表获取数据
  // 暂时返回模拟数据
  return {
    currentLevel: 'beginner',
    interests: ['skin_care', 'health_foundation'],
    completedModules: [],
    preferredDifficulty: 'beginner',
    learningGoals: ['基础护肤', '健康生活'],
    timePreference: 'medium',
    averageSessionTime: 30,
    totalLearningTime: 0,
    lastActiveDate: new Date(),
  };
}

/**
 * 生成问题导向的学习路径
 */
async function generateProblemOrientedPath(db: any, input: any, userProfile: any) {
  if (!input.problemDescription) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: '问题描述不能为空',
    });
  }

  // 基于问题描述搜索相关内容
  const searchTerm = `%${input.problemDescription}%`;
  const relatedContent = await db
    .select({
      id: knowledgeBase.id,
      title: knowledgeBase.title,
      summary: knowledgeBase.summary,
      module: knowledgeBase.module,
      difficulty: knowledgeBase.difficulty,
      credibility: knowledgeBase.credibility,
    })
    .from(knowledgeBase)
    .where(
      and(
        eq(knowledgeBase.isActive, 1),
        sql`(${knowledgeBase.title} ILIKE ${searchTerm} OR ${knowledgeBase.summary} ILIKE ${searchTerm} OR ${knowledgeBase.content} ILIKE ${searchTerm})`
      )
    )
    .orderBy(desc(knowledgeBase.credibility))
    .limit(10);

  // 按难度和逻辑顺序组织学习路径
  const organizedPath = organizeLearningPath(relatedContent, input.userLevel);

  return organizedPath;
}

/**
 * 生成目标导向的学习路径
 */
async function generateGoalOrientedPath(db: any, input: any, userProfile: any) {
  if (!input.goalDescription) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: '目标描述不能为空',
    });
  }

  // 基于目标描述匹配相关模块和内容
  const targetModules = identifyTargetModules(input.goalDescription);
  
  let contentQuery = db
    .select({
      id: knowledgeBase.id,
      title: knowledgeBase.title,
      summary: knowledgeBase.summary,
      module: knowledgeBase.module,
      difficulty: knowledgeBase.difficulty,
      credibility: knowledgeBase.credibility,
    })
    .from(knowledgeBase)
    .where(eq(knowledgeBase.isActive, 1));

  if (targetModules.length > 0) {
    contentQuery = contentQuery.where(inArray(knowledgeBase.module, targetModules));
  }

  const relatedContent = await contentQuery
    .orderBy(desc(knowledgeBase.credibility))
    .limit(15);

  const organizedPath = organizeLearningPath(relatedContent, input.userLevel);

  return organizedPath;
}

/**
 * 生成个性化学习路径
 */
async function generatePersonalizedPath(db: any, input: any, userProfile: any) {
  // 基于用户历史和偏好生成路径
  let contentQuery = db
    .select({
      id: knowledgeBase.id,
      title: knowledgeBase.title,
      summary: knowledgeBase.summary,
      module: knowledgeBase.module,
      difficulty: knowledgeBase.difficulty,
      credibility: knowledgeBase.credibility,
    })
    .from(knowledgeBase)
    .where(eq(knowledgeBase.isActive, 1));

  // 根据用户偏好模块过滤
  if (input.preferredModules && input.preferredModules.length > 0) {
    contentQuery = contentQuery.where(inArray(knowledgeBase.module, input.preferredModules));
  }

  // 根据用户水平过滤难度
  if (input.userLevel !== 'advanced') {
    const allowedDifficulties = input.userLevel === 'beginner' 
      ? ['beginner'] 
      : ['beginner', 'intermediate'];
    contentQuery = contentQuery.where(inArray(knowledgeBase.difficulty, allowedDifficulties));
  }

  const relatedContent = await contentQuery
    .orderBy(desc(knowledgeBase.credibility))
    .limit(20);

  const organizedPath = organizeLearningPath(relatedContent, input.userLevel);

  return organizedPath;
}

/**
 * 组织学习路径
 */
function organizeLearningPath(content: any[], userLevel: string) {
  // 按模块分组
  const moduleGroups = content.reduce((groups, item) => {
    const module = item.module;
    if (!groups[module]) {
      groups[module] = [];
    }
    groups[module].push(item);
    return groups;
  }, {});

  // 按难度排序每个模块内的内容
  Object.keys(moduleGroups).forEach(module => {
    moduleGroups[module].sort((a, b) => {
      const difficultyOrder = { 'beginner': 1, 'intermediate': 2, 'advanced': 3 };
      return difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
    });
  });

  // 生成学习路径步骤
  const pathSteps: any[] = [];
  let stepOrder = 1;

  Object.keys(moduleGroups).forEach(module => {
    moduleGroups[module].forEach((item, index) => {
      pathSteps.push({
        id: item.id,
        title: item.title,
        summary: item.summary,
        module: item.module,
        difficulty: item.difficulty,
        stepOrder: stepOrder++,
        stepType: index === 0 ? 'module_intro' : 'content',
        estimatedTime: estimateContentTime(item),
        prerequisites: getPrerequisites(item, moduleGroups[module].slice(0, index)),
        objectives: getObjectives(item),
      });
    });
  });

  return pathSteps;
}

/**
 * 估算内容学习时间
 */
function estimateContentTime(content: any): number {
  const baseTime = 15; // 基础时间15分钟
  const difficultyMultiplier = {
    'beginner': 1,
    'intermediate': 1.5,
    'advanced': 2,
  };
  
  return baseTime * (difficultyMultiplier[content.difficulty] || 1);
}

/**
 * 获取前置条件
 */
function getPrerequisites(content: any, previousContent: any[]): string[] {
  return previousContent.map(item => item.title);
}

/**
 * 获取学习目标
 */
function getObjectives(content: any): string[] {
  return [
    `理解${content.title}的基本概念`,
    `掌握${content.title}的核心要点`,
    `能够应用${content.title}的知识`
  ];
}

/**
 * 计算预计学习时间
 */
function calculateEstimatedTime(path: any[]): number {
  return path.reduce((total, step) => total + (step.estimatedTime || 15), 0);
}

/**
 * 识别目标模块
 */
function identifyTargetModules(goalDescription: string): string[] {
  const goalLower = goalDescription.toLowerCase();
  const moduleKeywords = {
    'skin_care': ['皮肤', '护肤', '美容', '祛斑', '美白'],
    'health_foundation': ['健康', '睡眠', '饮食', '运动', '心理'],
    'aesthetics': ['医美', '激光', '注射', '手术'],
    'dental_care': ['牙齿', '口腔', '美白', '矫正'],
    'tcm': ['中医', '养生', '经络', '体质'],
  };

  const matchedModules: string[] = [];
  
  Object.keys(moduleKeywords).forEach(module => {
    const keywords = moduleKeywords[module as keyof typeof moduleKeywords];
    if (keywords.some(keyword => goalLower.includes(keyword))) {
      matchedModules.push(module);
    }
  });

  return matchedModules.length > 0 ? matchedModules : ['skin_care']; // 默认皮肤护理
}

/**
 * 更新用户学习统计
 */
async function updateUserLearningStats(db: any, userId: number, input: any) {
  // 这里应该更新专门的学习进度表
  // 暂时只是模拟实现
  console.log(`Updating learning stats for user ${userId}:`, input);
}

/**
 * 获取用户学习统计
 */
async function getUserLearningStats(db: any, userId: number) {
  // 模拟数据，实际应该从数据库查询
  return {
    totalCompleted: 0,
    totalTimeSpent: 0,
    averageRating: 0,
    currentStreak: 0,
    modulesProgress: {},
    recentActivity: [],
    achievements: [],
  };
}

/**
 * 更新用户偏好
 */
async function updateUserPreferences(db: any, userId: number, preferences: any) {
  // 这里应该更新用户表的偏好字段
  console.log(`Updating preferences for user ${userId}:`, preferences);
}

/**
 * 获取继续学习推荐
 */
async function getContinueLearningRecommendations(db: any, userProfile: any) {
  // 基于用户当前进度推荐相关内容
  return [];
}

/**
 * 获取探索新内容推荐
 */
async function getExploreNewRecommendations(db: any, userProfile: any) {
  // 推荐用户未接触过的新内容
  return [];
}

/**
 * 获取复习推荐
 */
async function getReviewRecommendations(db: any, userProfile: any) {
  // 推荐需要复习的内容
  return [];
}

/**
 * 获取学习分析
 */
async function getLearningAnalytics(db: any, userId: number, period: string) {
  // 返回学习分析数据
  return {
    learningTrend: [],
    moduleDistribution: {},
    difficultyProgression: [],
    engagementMetrics: {},
    improvementAreas: [],
    strengths: [],
  };
}
