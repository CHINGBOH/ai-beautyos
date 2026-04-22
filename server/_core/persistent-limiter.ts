/**
 * 持久化限流器
 * 特性：1) 服务重启后状态保留 2) 定期持久化到文件 3) 自动清理过期条目
 */

import { logger } from "./logger";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface LimiterState {
  version: number;
  lastPersisted: number;
  entries: Record<string, RateLimitEntry>;
}

const STATE_VERSION = 1;
const DEFAULT_PERSIST_INTERVAL = 60000; // 60秒
const CLEANUP_INTERVAL = 300000; // 5分钟

export class PersistentRateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private persistTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private lastPersisted = 0;
  private persistPath: string | null = null;

  constructor(
    private maxRequests: number,
    private windowMs: number,
    options: {
      persistPath?: string;
      persistInterval?: number;
    } = {}
  ) {
    const { persistPath, persistInterval = DEFAULT_PERSIST_INTERVAL } = options;
    this.persistPath = persistPath || null;

    // 尝试恢复状态
    this.loadState();

    // 设置定期持久化
    this.persistTimer = setInterval(() => {
      this.persistState();
    }, persistInterval);

    // 设置定期清理
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, CLEANUP_INTERVAL);

    logger.info(
      `[PersistentRateLimiter] Initialized: ${maxRequests}req/${windowMs}ms`
    );
  }

  /**
   * 检查请求是否允许
   */
  check(identifier: string): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
  } {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    // 无记录或窗口已过期
    if (!entry || now >= entry.resetAt) {
      const resetAt = now + this.windowMs;
      this.requests.set(identifier, {
        count: 1,
        resetAt,
      });
      this.markDirty();

      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetAt,
      };
    }

    // 检查是否超过限制
    if (entry.count < this.maxRequests) {
      entry.count++;
      this.markDirty();
      return {
        allowed: true,
        remaining: this.maxRequests - entry.count,
        resetAt: entry.resetAt,
      };
    }

    // 超过限制
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  /**
   * 重置特定标识符的限流
   */
  reset(identifier: string): void {
    if (this.requests.delete(identifier)) {
      this.markDirty();
    }
  }

  /**
   * 获取当前使用统计
   */
  getStats(identifier: string): {
    count: number;
    remaining: number;
    resetAt: number;
    windowMs: number;
  } {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    if (!entry || now >= entry.resetAt) {
      return {
        count: 0,
        remaining: this.maxRequests,
        resetAt: now + this.windowMs,
        windowMs: this.windowMs,
      };
    }

    return {
      count: entry.count,
      remaining: Math.max(0, this.maxRequests - entry.count),
      resetAt: entry.resetAt,
      windowMs: this.windowMs,
    };
  }

  /**
   * 获取全局统计
   */
  getGlobalStats(): {
    totalEntries: number;
    activeEntries: number;
    memoryEstimate: string;
  } {
    const now = Date.now();
    let activeCount = 0;

    this.requests.forEach(entry => {
      if (entry.resetAt > now) {
        activeCount++;
      }
    });

    // 粗略估算内存使用
    const bytesPerEntry = 100; // 近似值
    const totalBytes = this.requests.size * bytesPerEntry;

    return {
      totalEntries: this.requests.size,
      activeEntries: activeCount,
      memoryEstimate: this.formatBytes(totalBytes),
    };
  }

  /**
   * 销毁限流器
   */
  destroy(): void {
    if (this.persistTimer) {
      clearInterval(this.persistTimer);
      this.persistTimer = null;
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    // 最后保存一次
    this.persistState();
  }

  private markDirty(): void {
    // 标记状态已变更，但不需要立即持久化
    // 实际持久化由定时器处理
  }

  /**
   * 清理过期条目
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    this.requests.forEach((entry, key) => {
      if (now >= entry.resetAt + this.windowMs) {
        // 过期超过一个窗口的条目可以安全删除
        this.requests.delete(key);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      logger.debug(
        `[PersistentRateLimiter] Cleaned up ${cleaned} expired entries`
      );
      this.persistState();
    }
  }

  /**
   * 持久化状态到文件
   */
  private persistState(): void {
    if (!this.persistPath) return;

    try {
      const state: LimiterState = {
        version: STATE_VERSION,
        lastPersisted: Date.now(),
        entries: Object.fromEntries(this.requests),
      };

      // 使用同步写入确保数据安全
      const fs = require("fs");
      const data = JSON.stringify(state);
      fs.writeFileSync(this.persistPath, data, "utf-8");
      this.lastPersisted = Date.now();

      logger.debug(
        `[PersistentRateLimiter] State persisted to ${this.persistPath}`
      );
    } catch (error) {
      logger.error("[PersistentRateLimiter] Failed to persist state:", error);
    }
  }

  /**
   * 从文件加载状态
   */
  private loadState(): void {
    if (!this.persistPath) return;

    try {
      const fs = require("fs");

      if (!fs.existsSync(this.persistPath)) {
        logger.info("[PersistentRateLimiter] No previous state found");
        return;
      }

      const data = fs.readFileSync(this.persistPath, "utf-8");
      const state: LimiterState = JSON.parse(data);

      if (state.version !== STATE_VERSION) {
        logger.warn(
          `[PersistentRateLimiter] State version mismatch: ${state.version} vs ${STATE_VERSION}`
        );
        return;
      }

      // 过滤掉过期的条目
      const now = Date.now();
      let restored = 0;
      let expired = 0;

      for (const [key, entry] of Object.entries(state.entries)) {
        if (entry.resetAt > now) {
          this.requests.set(key, entry);
          restored++;
        } else {
          expired++;
        }
      }

      this.lastPersisted = state.lastPersisted;
      logger.info(
        `[PersistentRateLimiter] Restored ${restored} entries (${expired} expired)`
      );
    } catch (error) {
      logger.error("[PersistentRateLimiter] Failed to load state:", error);
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }
}

// 全局限流器实例
let contentLimiter: PersistentRateLimiter | null = null;
let apiLimiter: PersistentRateLimiter | null = null;
let imageLimiter: PersistentRateLimiter | null = null;

/**
 * 获取内容生成限流器
 */
export function getContentLimiter(): PersistentRateLimiter {
  if (!contentLimiter) {
    contentLimiter = new PersistentRateLimiter(10, 60000, {
      persistPath: ".cache/content-limiter.json",
    });
  }
  return contentLimiter;
}

/**
 * 获取API限流器
 */
export function getApiLimiter(): PersistentRateLimiter {
  if (!apiLimiter) {
    apiLimiter = new PersistentRateLimiter(200, 60000, {
      persistPath: ".cache/api-limiter.json",
    });
  }
  return apiLimiter;
}

/**
 * 获取图片生成限流器
 */
export function getImageLimiter(): PersistentRateLimiter {
  if (!imageLimiter) {
    imageLimiter = new PersistentRateLimiter(5, 60000, {
      persistPath: ".cache/image-limiter.json",
    });
  }
  return imageLimiter;
}

/**
 * 关闭所有限流器（优雅关机）
 */
export function shutdownLimiters(): void {
  contentLimiter?.destroy();
  apiLimiter?.destroy();
  imageLimiter?.destroy();
  contentLimiter = null;
  apiLimiter = null;
  imageLimiter = null;
}
