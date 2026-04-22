/**
 * 可靠的 Airtable 同步模块
 * 特性：1) 指数退避重试 2) 失败队列 3) 异步批量处理
 */

import {
  createAirtableRecord,
  updateAirtableRecord,
  createLeadInAirtable,
  syncConversationToAirtable as originalSyncConversation,
  updateCustomerProfileInAirtable,
} from "./airtable";
import { logger } from "./_core/logger";

// 失败任务队列
interface FailedTask {
  id: string;
  type: "create_lead" | "sync_conversation" | "update_profile";
  data: Record<string, unknown>;
  retryCount: number;
  lastError?: string;
  createdAt: number;
}

const failedQueue: FailedTask[] = [];
const MAX_RETRY = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // 指数退避延迟

/**
 * 带重试的异步操作包装器
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  options: { 
    maxRetries?: number; 
    operationName: string;
    shouldRetry?: (error: Error) => boolean;
  }
): Promise<T | null> {
  const { maxRetries = MAX_RETRY, operationName, shouldRetry } = options;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      if (attempt > 0) {
        logger.info(`[Airtable] ${operationName} succeeded after ${attempt} retries`);
      }
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      // 检查是否应该重试
      if (shouldRetry && !shouldRetry(err)) {
        logger.warn(`[Airtable] ${operationName} failed with non-retryable error:`, err.message);
        throw error;
      }
      
      if (attempt === maxRetries) {
        logger.error(`[Airtable] ${operationName} failed after ${maxRetries} retries:`, err.message);
        throw error;
      }
      
      const delay = RETRY_DELAYS[attempt] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
      logger.warn(`[Airtable] ${operationName} failed (attempt ${attempt + 1}), retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return null;
}

/**
 * 判断错误是否可重试
 */
function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  // 网络错误、速率限制、服务不可用
  if (message.includes("network") || 
      message.includes("timeout") || 
      message.includes("429") || 
      message.includes("503") ||
      message.includes("502") ||
      message.includes("504")) {
    return true;
  }
  // 认证错误、数据错误不重试
  if (message.includes("401") || 
      message.includes("403") || 
      message.includes("validation")) {
    return false;
  }
  return true;
}

/**
 * 可靠地创建线索
 */
export async function createLeadReliable(
  leadData: Parameters<typeof createLeadInAirtable>[0]
): Promise<string | null> {
  try {
    return await withRetry(
      () => createLeadInAirtable(leadData),
      { operationName: "createLead", shouldRetry: isRetryableError }
    );
  } catch (error) {
    // 记录到失败队列，稍后重试
    const task: FailedTask = {
      id: `lead_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type: "create_lead",
      data: leadData as Record<string, unknown>,
      retryCount: 0,
      lastError: (error as Error).message,
      createdAt: Date.now(),
    };
    failedQueue.push(task);
    logger.error("[Airtable] createLead queued for retry:", (error as Error).message);
    return null;
  }
}

/**
 * 可靠地同步对话
 */
export async function syncConversationReliable(
  conversationData: Parameters<typeof originalSyncConversation>[0]
): Promise<string | null> {
  try {
    return await withRetry(
      () => originalSyncConversation(conversationData),
      { operationName: "syncConversation", shouldRetry: isRetryableError }
    );
  } catch (error) {
    logger.error("[Airtable] syncConversation failed:", (error as Error).message);
    // 对话同步失败不影响业务流程，不加入重试队列
    return null;
  }
}

/**
 * 批量重试失败的任务
 */
export async function retryFailedTasks(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  if (failedQueue.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }
  
  logger.info(`[Airtable] Processing ${failedQueue.length} failed tasks...`);
  
  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  
  // 复制队列并清空原队列
  const tasks = [...failedQueue];
  failedQueue.length = 0;
  
  for (const task of tasks) {
    // 跳过超过24小时的任务
    if (Date.now() - task.createdAt > 24 * 60 * 60 * 1000) {
      logger.warn(`[Airtable] Task ${task.id} expired (>24h), skipping`);
      failed++;
      continue;
    }
    
    if (task.retryCount >= MAX_RETRY) {
      logger.error(`[Airtable] Task ${task.id} exceeded max retries`);
      failed++;
      continue;
    }
    
    try {
      if (task.type === "create_lead") {
        await withRetry(
          () => createLeadInAirtable(task.data as Parameters<typeof createLeadInAirtable>[0]),
          { operationName: `retryCreateLead_${task.id}`, shouldRetry: isRetryableError }
        );
      }
      
      succeeded++;
      logger.info(`[Airtable] Task ${task.id} succeeded on retry`);
    } catch (error) {
      task.retryCount++;
      task.lastError = (error as Error).message;
      failedQueue.push(task);
      failed++;
      logger.error(`[Airtable] Task ${task.id} failed again:`, (error as Error).message);
    }
    
    processed++;
  }
  
  return { processed, succeeded, failed };
}

/**
 * 获取队列状态
 */
export function getQueueStatus(): {
  queueLength: number;
  oldestTaskAge: number;
  tasksByType: Record<string, number>;
} {
  const now = Date.now();
  const oldest = failedQueue.length > 0 
    ? Math.min(...failedQueue.map(t => t.createdAt))
    : now;
  
  const tasksByType: Record<string, number> = {};
  for (const task of failedQueue) {
    tasksByType[task.type] = (tasksByType[task.type] || 0) + 1;
  }
  
  return {
    queueLength: failedQueue.length,
    oldestTaskAge: Math.floor((now - oldest) / 1000), // seconds
    tasksByType,
  };
}

// 定期清理过期任务（每10分钟）
setInterval(() => {
  const before = failedQueue.length;
  const now = Date.now();
  for (let i = failedQueue.length - 1; i >= 0; i--) {
    if (now - failedQueue[i]!.createdAt > 24 * 60 * 60 * 1000) {
      failedQueue.splice(i, 1);
    }
  }
  const removed = before - failedQueue.length;
  if (removed > 0) {
    logger.info(`[Airtable] Cleaned up ${removed} expired tasks from queue`);
  }
}, 10 * 60 * 1000);
