/**
 * LLM 带缓存与重试的调用（助手/内容增强等共用）
 */

import { invokeLLM } from "./invoke";
import type { InvokeParams, InvokeResult } from "./types";
import { llmCache } from "../_core/cache";
import { logger } from "../_core/logger";

export interface LLMOptions {
  enableCache?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  cacheKey?: string;
  cacheTTL?: number;
}

export interface LLMResult extends InvokeResult {
  fromCache: boolean;
  retryCount: number;
}

function generateCacheKey(params: InvokeParams): string {
  const keyParts = [
    params.messages
      .map(
        m =>
          `${m.role}:${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`
      )
      .join("|"),
    JSON.stringify(params.responseFormat),
    JSON.stringify(params.outputSchema),
  ];
  return `llm:${Buffer.from(keyParts.join("||")).toString("base64")}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function invokeLLMWithRetry(
  params: InvokeParams,
  options: LLMOptions = {}
): Promise<LLMResult> {
  const {
    enableCache = true,
    maxRetries = 3,
    retryDelay = 1000,
    cacheKey,
    cacheTTL,
  } = options;

  const key = cacheKey || generateCacheKey(params);

  if (enableCache) {
    const cached = llmCache.get(key) as InvokeResult | null;
    if (cached) {
      logger.info(`[LLM] Cache hit for key: ${key.substring(0, 50)}...`);
      return { ...cached, fromCache: true, retryCount: 0 };
    }
  }

  let lastError: Error | null = null;
  let retryCount = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        logger.info(`[LLM] Retry attempt ${attempt}/${maxRetries}`);
        await sleep(retryDelay * attempt);
      }
      const result = await invokeLLM(params);
      if (enableCache) {
        llmCache.set(key, result, cacheTTL);
        logger.info(`[LLM] Cached result for key: ${key.substring(0, 50)}...`);
      }
      return { ...result, fromCache: false, retryCount: attempt };
    } catch (error) {
      lastError = error as Error;
      retryCount = attempt;
      const isRetryable =
        lastError.message.includes("429") ||
        lastError.message.includes("500") ||
        lastError.message.includes("502") ||
        lastError.message.includes("503") ||
        lastError.message.includes("timeout");
      if (!isRetryable || attempt >= maxRetries) {
        logger.error(
          `[LLM] Invocation failed after ${attempt + 1} attempts:`,
          lastError
        );
        throw lastError;
      }
      logger.warn(
        `[LLM] Attempt ${attempt + 1} failed, retrying...`,
        lastError.message
      );
    }
  }

  throw lastError || new Error("LLM invocation failed");
}

export function clearLLMCache(key?: string): void {
  if (key) {
    llmCache.delete(key);
    logger.info(`[LLM] Cleared cache for key: ${key.substring(0, 50)}...`);
  } else {
    llmCache.clear();
    logger.info("[LLM] Cleared all cache");
  }
}

export function getLLMCacheStats() {
  return llmCache.getStats();
}
