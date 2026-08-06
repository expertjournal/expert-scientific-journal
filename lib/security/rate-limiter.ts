/**
 * Enterprise Token Bucket & Sliding Window Rate Limiter
 */

interface RateBucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, RateBucket>();

export class SecurityRateLimiter {
  public static check(
    identifier: string,
    limit = 60,
    windowMs = 60000
  ): { allowed: boolean; remaining: number; resetMs: number } {
    const now = Date.now();
    let bucket = buckets.get(identifier);

    if (!bucket) {
      bucket = { tokens: limit, lastRefill: now };
      buckets.set(identifier, bucket);
    }

    const elapsed = now - bucket.lastRefill;

    if (elapsed > windowMs) {
      bucket.tokens = limit;
      bucket.lastRefill = now;
    }

    if (bucket.tokens > 0) {
      bucket.tokens -= 1;
      return { allowed: true, remaining: bucket.tokens, resetMs: windowMs - elapsed };
    }

    return { allowed: false, remaining: 0, resetMs: windowMs - elapsed };
  }
}
