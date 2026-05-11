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
