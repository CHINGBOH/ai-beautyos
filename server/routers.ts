import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { chatRouter } from "./routers/chat";
import { adminRouter } from "./routers/admin";
import { analyticsRouter } from "./routers/analytics";
import { knowledgeRouter } from "./routers/knowledge";
import { contentRouter } from "./routers/content";
import { customersRouter } from "./routers/customers";
import { xiaohongshuRouter } from "./routers/xiaohongshu";
import { adminAiRouter } from "./routers/admin-ai";
import { triggersRouter } from "./routers/triggers";
import { weworkRouter } from "./routers/wework";
import { learningPathRouter } from "./routers/learning-path";
import { vectorSearchRouter } from "./routers/vector-search";
import { adaptiveLearningRouter } from "./routers/adaptive-learning";
import { crawlerRouter } from "./routers/crawler";
import { websiteRouter } from "./routers/website";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  chat: chatRouter,
  admin: adminRouter,
  analytics: analyticsRouter,
  knowledge: knowledgeRouter,
  learningPath: learningPathRouter,
  vectorSearch: vectorSearchRouter,
  adaptiveLearning: adaptiveLearningRouter,
  content: contentRouter,
  customers: customersRouter,
  xiaohongshu: xiaohongshuRouter,
  adminAi: adminAiRouter,
  triggers: triggersRouter,
  wework: weworkRouter,
  crawler: crawlerRouter,
  website: websiteRouter,
});

export type AppRouter = typeof appRouter;
