import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import {
  generatePathByQuestion,
  generatePathByGoal,
  getRecommendedPaths,
} from "../services/learning-path.service";

export const learningPathRouter = router({
  generateByQuestion: publicProcedure
    .input(z.object({
      question: z.string().min(1).max(5000),
      module: z.string().optional(),
      includeRecommendationText: z.boolean().optional().default(true),
    }))
    .query(({ input }) => generatePathByQuestion(input)),

  generateByGoal: publicProcedure
    .input(z.object({
      goal: z.string().min(1).max(5000),
      currentLevel: z.enum(["beginner", "intermediate", "advanced"]).optional().default("beginner"),
      includeRecommendationText: z.boolean().optional().default(true),
    }))
    .query(({ input }) => generatePathByGoal(input)),

  getRecommendedPaths: publicProcedure
    .input(z.object({
      module: z.string().optional(),
      limit: z.number().min(1).max(10).optional().default(5),
    }))
    .query(({ input }) => getRecommendedPaths(input)),
});
