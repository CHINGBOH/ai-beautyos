/**
 * Enhanced LLM service with caching, retry logic, and error handling
 */

import { invokeLLM, InvokeParams, InvokeResult } from "./llm";
import { llmCache } from "./cache";
import { logger } from "./logger";

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

/**
 * Generate a cache key from LLM parameters
 */
function generateCacheKey(params: InvokeParams): string {
  const keyParts = [
    params.messages.map(m => `${m.role}:${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`).join('|'),
    JSON.stringify(params.responseFormat),
    JSON.stringify(params.outputSchema),
  ];
  return `llm:${Buffer.from(keyParts.join('||')).toString('base64')}`;
}

/**
 * Sleep utility for retry delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Enhanced LLM invocation with caching and retry logic
 */
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

  // Try to get from cache
  if (enableCache) {
    const cached = llmCache.get<InvokeResult>(key);
    if (cached) {
      logger.info(`[LLM] Cache hit for key: ${key.substring(0, 50)}...`);
      return {
        ...cached,
        fromCache: true,
        retryCount: 0,
      };
    }
  }

  // Invoke LLM with retry logic
  let lastError: Error | null = null;
  let retryCount = 0;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        logger.info(`[LLM] Retry attempt ${attempt}/${maxRetries}`);
        await sleep(retryDelay * attempt); // Exponential backoff
      }

      const result = await invokeLLM(params);

      // Cache the result
      if (enableCache) {
        llmCache.set(key, result, cacheTTL);
        logger.info(`[LLM] Cached result for key: ${key.substring(0, 50)}...`);
      }

      return {
        ...result,
        fromCache: false,
        retryCount: attempt,
      };
    } catch (error) {
      lastError = error as Error;
      retryCount = attempt;

      // Check if error is retryable
      const isRetryable = lastError.message.includes('429') || // Rate limit
                         lastError.message.includes('500') || // Server error
                         lastError.message.includes('502') || // Bad gateway
                         lastError.message.includes('503') || // Service unavailable
                         lastError.message.includes('timeout'); // Timeout

      if (!isRetryable || attempt >= maxRetries) {
        logger.error(`[LLM] Invocation failed after ${attempt + 1} attempts:`, lastError);
        throw lastError;
      }

      logger.warn(`[LLM] Attempt ${attempt + 1} failed, retrying...`, lastError.message);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('LLM invocation failed');
}

/**
 * Clear cache for a specific key or all cache
 */
export function clearLLMCache(key?: string): void {
  if (key) {
    llmCache.delete(key);
    logger.info(`[LLM] Cleared cache for key: ${key.substring(0, 50)}...`);
  } else {
    llmCache.clear();
    logger.info('[LLM] Cleared all cache');
  }
}

/**
 * Get cache statistics
 */
export function getLLMCacheStats() {
  return llmCache.getStats();
}
