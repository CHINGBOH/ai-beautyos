import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { eq } from "drizzle-orm";
import { systemConfig } from "../../drizzle/schema";
import { getDb } from "../db";
import { setupAirtableCRM } from "../airtable-setup";

export const adminRouter = router({
  /**
   * 保存 Airtable 配置
   */
  saveAirtableConfig: publicProcedure
    .input(
      z.object({
        token: z.string(),
        baseId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const configValue = JSON.stringify({
        token: input.token,
        baseId: input.baseId,
      });

      // 使用 upsert 逻辑
      const existing = await db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.configKey, "airtable"))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(systemConfig)
          .set({
            configValue,
            updatedAt: new Date(),
          })
          .where(eq(systemConfig.configKey, "airtable"));
      } else {
        await db.insert(systemConfig).values({
          configKey: "airtable",
          configValue,
          description: "Airtable CRM integration configuration",
        });
      }

      return { success: true };
    }),

  /**
   * 获取 Airtable 配置
   */
  getAirtableConfig: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { token: null, baseId: null };

    const result = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.configKey, "airtable"))
      .limit(1);

    if (result.length === 0) {
      return { token: null, baseId: null };
    }

    try {
      const config = JSON.parse(result[0]!.configValue || "{}");
      return {
        token: config.token || null,
        baseId: config.baseId || null,
      };
    } catch {
      return { token: null, baseId: null };
    }
  }),

  /**
   * 测试 Airtable 连接
   */
  testAirtableConnection: publicProcedure
    .input(
      z.object({
        token: z.string(),
        baseId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // 测试 API 连接 - 尝试列出表
        const response = await fetch(
          `https://api.airtable.com/v0/meta/bases/${input.baseId}/tables`,
          {
            headers: {
              Authorization: `Bearer ${input.token}`,
            },
          }
        );

        if (!response.ok) {
          const error = await response.text();
          return {
            success: false,
            error: `API 错误 (${response.status}): ${error}`,
          };
        }

        const data = await response.json();
        return {
          success: true,
          tables: data.tables?.map((t: { name: string }) => t.name) || [],
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "未知错误",
        };      };
    }),

  /**
   * 自动设置 Airtable CRM 表结构
   */
  setupAirtableTables: publicProcedure
    .input(
      z.object({
        token: z.string(),
        baseId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await setupAirtableCRM({
        token: input.token,
        baseId: input.baseId,
      });
      return result;
    }),
});
