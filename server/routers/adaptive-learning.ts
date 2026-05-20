/**
 * 自适应学习路由
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  generateLearningPath,
  trackLearningProgress,
  getProgressStats,
  updateLearningPreferences,
  getRecommendations,
  getLearningAnalytics,
} from "../services/adaptive-learning.service";

const contentTypeEnum = z.enum(["project", "case", "price", "guide", "holiday", "new_product"]);

export const adaptiveLearningRouter = router({
  generatePath: protectedProcedure
    .input(z.object({
      type: z.enum(["problem_oriented", "goal_oriented", "personalized"]),
      problemDescription: z.string().max(5000).optional(),
      goalDescription: z.string().max(5000).optional(),
      userLevel: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
      preferredModules: z.array(z.string().max(100)).optional(),
      timeLimit: z.number().optional(),
      focusAreas: z.array(z.string().max(100)).optional(),
    }))
    .query(({ input, ctx }) => generateLearningPath(input, ctx.user!.id)),

  trackProgress: protectedProcedure
    .input(z.object({
      contentId: z.number(),
      status: z.enum(["started", "in_progress", "completed", "skipped"]),
      timeSpent: z.number().optional(),
      rating: z.number().min(1).max(5).optional(),
      feedback: z.string().max(5000).optional(),
    }))
    .mutation(({ input, ctx }) => trackLearningProgress(input, ctx.user!.id)),

  getProgressStats: protectedProcedure
    .query(({ ctx }) => getProgressStats(ctx.user!.id)),

  updatePreferences: protectedProcedure
    .input(z.object({
      preferredDifficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
      preferredContentType: z.array(z.string().max(100)).optional(),
      learningGoals: z.array(z.string().max(200)).optional(),
      timePreference: z.enum(["short", "medium", "long"]).optional(),
      interests: z.array(z.string().max(100)).optional(),
    }))
    .mutation(({ input, ctx }) => updateLearningPreferences(input, ctx.user!.id)),

  getRecommendations: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(20).default(10),
      context: z.enum(["continue_learning", "explore_new", "review"]).default("continue_learning"),
    }))
    .query(({ input, ctx }) => getRecommendations(input, ctx.user!.id)),

  getAnalytics: protectedProcedure
    .input(z.object({
      period: z.enum(["week", "month", "quarter", "year"]).default("month"),
    }))
    .query(({ input, ctx }) => getLearningAnalytics(input, ctx.user!.id)),
});
