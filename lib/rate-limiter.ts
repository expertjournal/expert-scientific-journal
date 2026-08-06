interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

export function checkRateLimit(key: string, maxAttempts = 5, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return true;
  }

  if (entry.count >= maxAttempts) {
    return false;
  }

  entry.count += 1;
  return true;
}
