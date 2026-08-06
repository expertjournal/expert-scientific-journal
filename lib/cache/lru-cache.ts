/**
 * High-Performance In-Memory LRU Cache Engine with TTL
 */

interface CacheItem<T> {
  value: T;
  expiresAt: number;
}

export class LRUCache<T = any> {
  private cache = new Map<string, CacheItem<T>>();

  constructor(private maxCapacity = 500, private defaultTtlMs = 60000) {}

  public get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // Refresh position in Map for LRU order
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  public set(key: string, value: T, ttlMs = this.defaultTtlMs) {
    if (this.cache.size >= this.maxCapacity) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  public clear() {
    this.cache.clear();
  }
}

export const globalQueryCache = new LRUCache(1000, 120000);
