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
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
});

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
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
