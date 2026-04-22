import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { getByApiPath, type ApiActionEntry } from "@shared/api-action-map";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { apiLimiter } from "./rateLimiter";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

/** 全局 tRPC 速率限制 — 每 IP 每分钟 200 次 */
const rateLimitMiddleware = t.middleware(async (opts) => {
  const ip =
    opts.ctx.req?.ip ||
    opts.ctx.req?.headers?.["x-forwarded-for"]?.toString()?.split(",")[0]?.trim() ||
    "unknown";
  const result = apiLimiter.check(ip);
  if (!result.allowed) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `请求过于频繁，请在 ${Math.ceil((result.resetAt - Date.now()) / 1000)} 秒后重试`,
    });
  }
  return opts.next();
});

/** 为每次调用注入「一一对应」的 action 信息，便于打点/校验 */
const actionMapMiddleware = t.middleware(async (opts) => {
  const entry: ApiActionEntry | undefined = getByApiPath(opts.path);
  return opts.next({
    ctx: {
      ...opts.ctx,
      actionEntry: entry ?? null,
    },
  });
});

export const router = t.router;
const withActionMap = t.procedure.use(rateLimitMiddleware).use(actionMapMiddleware);
export const publicProcedure = withActionMap;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = withActionMap.use(requireUser);

export const adminProcedure = withActionMap.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
