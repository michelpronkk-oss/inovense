import type { NextRequest } from "next/server";

export const MAX_JSON_BODY_BYTES = 256 * 1024;

type Bucket = { startedAt: number; count: number };
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

/**
 * Small in-process abuse guard for high-cost routes. It is deliberately only
 * a speed bump; production deployments should also enforce edge/provider
 * limits because serverless instances do not share memory.
 */
export function allowRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || now - current.startedAt >= windowMs) {
    if (buckets.size >= MAX_BUCKETS) {
      const oldest = buckets.keys().next().value;
      if (oldest) buckets.delete(oldest);
    }
    buckets.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

export function requestBodyWithinLimit(request: Request, maxBytes = MAX_JSON_BODY_BYTES): boolean {
  const contentLength = request.headers.get("content-length");
  if (!contentLength) return true;
  const parsed = Number(contentLength);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= maxBytes;
}

export function clientAddress(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}
