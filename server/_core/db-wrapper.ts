/**
 * 数据库操作包装函数
 * 统一错误处理和日志记录
 */

import { logger } from "./logger";
import { getDb } from "../db";

export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

/**
 * 执行数据库操作，统一错误处理
 */
export async function withDb<T>(
  operation: string,
  fn: (db: NonNullable<Awaited<ReturnType<typeof getDb>>>) => Promise<T>
): Promise<T> {
  const db = await getDb();

  if (!db) {
    const error = new DatabaseError(
      "Database connection is not available",
      operation
    );
    logger.error(`[DB] ${operation} failed:`, error.message);
    throw error;
  }

  try {
    logger.debug(`[DB] Executing: ${operation}`);
    const result = await fn(db);
    logger.debug(`[DB] ${operation} completed successfully`);
    return result;
  } catch (error) {
    const dbError = new DatabaseError(
      `Database operation failed: ${error instanceof Error ? error.message : String(error)}`,
      operation,
      error
    );

    logger.error(`[DB] ${operation} failed:`, {
      message: dbError.message,
      operation,
      originalError: error,
    });

    throw dbError;
  }
}

/**
 * 执行数据库操作，允许返回 null（用于可选操作）
 */
export async function withDbOptional<T>(
  operation: string,
  fn: (db: NonNullable<Awaited<ReturnType<typeof getDb>>>) => Promise<T>
): Promise<T | null> {
  try {
    return await withDb(operation, fn);
  } catch (error) {
    if (error instanceof DatabaseError) {
      logger.warn(`[DB] ${operation} failed (optional):`, error.message);
      return null;
    }
    throw error;
  }
}

/**
 * 检查数据库连接池健康状态
 * 返回连接池指标（如果底层驱动暴露了这些信息）
 */
export async function checkDbHealth(): Promise<{
  available: boolean;
  latencyMs: number;
  poolMetrics?: Record<string, unknown>;
}> {
  const start = Date.now();
  try {
    const db = await getDb();
    if (!db) {
      return { available: false, latencyMs: 0 };
    }
    // 轻量查询验证连接可用
    await db.execute("SELECT 1");
    const latencyMs = Date.now() - start;

    // postgres.js 驱动将 pool 挂在 client 上，尝试读取
    let poolMetrics: Record<string, unknown> | undefined;
    try {
      const client = (db as any).$client;
      if (client?.options) {
        poolMetrics = {
          maxConnections: client.options.max ?? null,
          idleTimeout: client.options.idle_timeout ?? null,
          connectTimeout: client.options.connect_timeout ?? null,
        };
      }
    } catch {
      // 驱动未暴露 pool 信息，忽略
    }

    return { available: true, latencyMs, poolMetrics };
  } catch (error) {
    return { available: false, latencyMs: Date.now() - start };
  }
}
