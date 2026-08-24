import "server-only";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

function pruneBuckets(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }

  if (buckets.size < MAX_BUCKETS) return;

  // Keep the limiter bounded when an attacker rotates identities/IP headers.
  // This is intentionally a small, in-process safeguard; distributed rate
  // limiting should still be provided at the edge for multi-instance deploys.
  const oldest = [...buckets.entries()]
    .sort(([, left], [, right]) => left.resetAt - right.resetAt)
    .slice(0, Math.ceil(MAX_BUCKETS * 0.1));
  for (const [key] of oldest) buckets.delete(key);
}

export function checkRateLimit(key: string, limit = 20, windowMs = 60_000) {
  const now = Date.now();
  pruneBuckets(now);
  const current = buckets.get(key);

  if (!current || current.resetAt < now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return true;
  }

  if (current.count >= limit) {
    return false;
  }

  current.count += 1;
  return true;
}
