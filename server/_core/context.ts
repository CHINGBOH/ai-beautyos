import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { ENV } from "./env";

const buildDevUser = (): User => ({
  id: 1,
  openId: "dev-admin",
  name: "开发管理员",
  email: null,
  loginMethod: null,
  role: "admin",
  tenantId: "00000000-0000-0000-0000-000000000001",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  lastSignedIn: new Date().toISOString(),
});

import type { ApiActionEntry } from "@shared/api-action-map";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  /** 由 trpc 中间件注入：当前 procedure 在「一一调用」配对表中的条目，用于打点/校验 */
  actionEntry?: ApiActionEntry | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    if (ENV.disableAuth) {
      user = buildDevUser();
    } else {
      user = await sdk.authenticateRequest(opts.req);
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = ENV.disableAuth ? buildDevUser() : null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
