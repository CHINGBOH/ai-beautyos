/**
 * Simple in-memory cache with TTL support
 * For production, consider using Redis or similar distributed cache
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

export class Cache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(private defaultTTL: number = 3600000) {
    // 1 hour default TTL
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 300000);
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
    };
    this.cache.set(key, entry);
  }

  /**
   * Get a value from the cache
   * Returns null if not found or expired
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Destroy the cache and stop cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Create singleton instances for different use cases
export const llmCache = new Cache<any>(1800000); // 30 minutes for LLM responses
export const imageCache = new Cache<any>(86400000); // 24 hours for generated images
