/**
 * Simple in-memory rate limiter
 * For production, consider using Redis with sliding window algorithm
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private requests: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Check if a request is allowed
   * @param identifier - Unique identifier (e.g., userId, IP address)
   * @returns Object with allowed flag and remaining requests
   */
  check(identifier: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    // If no entry or window expired, create new entry
    if (!entry || now >= entry.resetAt) {
      const resetAt = now + this.windowMs;
      this.requests.set(identifier, {
        count: 1,
        resetAt,
      });

      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetAt,
      };
    }

    // Check if within limit
    if (entry.count < this.maxRequests) {
      entry.count++;
      return {
        allowed: true,
        remaining: this.maxRequests - entry.count,
        resetAt: entry.resetAt,
      };
    }

    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  /**
   * Reset rate limit for a specific identifier
   */
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }

  /**
   * Get current usage for an identifier
   */
  getUsage(identifier: string): { count: number; remaining: number; resetAt: number } {
    const entry = this.requests.get(identifier);
    const now = Date.now();

    if (!entry || now >= entry.resetAt) {
      return {
        count: 0,
        remaining: this.maxRequests,
        resetAt: now + this.windowMs,
      };
    }

    return {
      count: entry.count,
      remaining: Math.max(0, this.maxRequests - entry.count),
      resetAt: entry.resetAt,
    };
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.requests.entries()) {
      if (now >= entry.resetAt) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Destroy the rate limiter and stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.requests.clear();
  }
}

// Create singleton instances for different use cases
export const contentGenerationLimiter = new RateLimiter(10, 60000); // 10 requests per minute
export const imageGenerationLimiter = new RateLimiter(5, 60000); // 5 requests per minute
export const apiLimiter = new RateLimiter(100, 60000); // 100 requests per minute
