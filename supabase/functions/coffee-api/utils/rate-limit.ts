import { createLogger } from "./logger.ts";

const logger = createLogger("rate-limit");

export interface RateLimitBucket {
  count: number;
  resetTime: number;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitStore {
  consume(
    key: string,
    config: RateLimitConfig,
    now: number,
  ): Promise<number | null>;
}

interface MemoryRateLimitStoreOptions {
  maxBuckets: number;
  cleanupIntervalMs?: number;
}

interface UpstashRateLimitStoreOptions {
  url: string;
  token: string;
  fetchImpl?: typeof fetch;
  fallbackStore?: RateLimitStore | null;
}

function normalizeUpstashBaseUrl(url: string): string {
  return String(url || "").replace(/\/+$/, "");
}

export function createMemoryRateLimitStore(
  options: MemoryRateLimitStoreOptions,
): RateLimitStore {
  const buckets = new Map<string, RateLimitBucket>();
  const cleanupIntervalMs = options.cleanupIntervalMs ?? 10_000;
  let lastCleanupAt = 0;

  function cleanup(now: number) {
    for (const [key, value] of buckets.entries()) {
      if (now > value.resetTime) buckets.delete(key);
    }

    if (buckets.size <= options.maxBuckets) return;

    const overflow = buckets.size - options.maxBuckets;
    let removed = 0;
    for (const key of buckets.keys()) {
      buckets.delete(key);
      removed++;
      if (removed >= overflow) break;
    }
  }

  return {
    consume(key, config, now) {
      if (
        now - lastCleanupAt >= cleanupIntervalMs ||
        buckets.size > options.maxBuckets
      ) {
        cleanup(now);
        lastCleanupAt = now;
      }

      const record = buckets.get(key);
      if (!record || now > record.resetTime) {
        buckets.set(key, {
          count: 1,
          resetTime: now + config.windowMs,
        });
        return Promise.resolve(null);
      }

      record.count++;
      if (record.count <= config.maxRequests) return Promise.resolve(null);

      return Promise.resolve(
        Math.max(1, Math.ceil((record.resetTime - now) / 1000)),
      );
    },
  };
}

export function createUpstashRateLimitStore(
  options: UpstashRateLimitStoreOptions,
): RateLimitStore {
  const baseUrl = normalizeUpstashBaseUrl(options.url);
  const fetchImpl = options.fetchImpl || fetch;

  return {
    async consume(key, config, now) {
      const windowSec = Math.max(1, Math.ceil(config.windowMs / 1000));

      try {
        const response = await fetchImpl(`${baseUrl}/multi-exec`, {
          method: "POST",
          headers: {
            "authorization": `Bearer ${options.token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify([
            ["INCR", key],
            ["EXPIRE", key, windowSec, "NX"],
            ["TTL", key],
          ]),
        });
        if (!response.ok) {
          throw new Error(`Upstash rate limit failed: HTTP ${response.status}`);
        }

        const payload = await response.json();
        if (!Array.isArray(payload) || payload.length < 3) {
          throw new Error("Upstash rate limit failed: malformed response");
        }

        const count = Number(payload[0]?.result);
        const ttlSec = Number(payload[2]?.result);
        if (!Number.isFinite(count)) {
          throw new Error("Upstash rate limit failed: invalid counter");
        }

        if (count <= config.maxRequests) return null;
        if (Number.isFinite(ttlSec) && ttlSec > 0) return ttlSec;
        return Math.max(1, Math.ceil(config.windowMs / 1000));
      } catch (error) {
        if (options.fallbackStore) {
          return await options.fallbackStore.consume(key, config, now);
        }
        logger.warn("Upstash backend unavailable", error);
        return null;
      }
    },
  };
}
