import { UPSTASH_REDIS_REST_TOKEN, UPSTASH_REDIS_REST_URL } from "./config.ts";
import {
  createMemoryRateLimitStore,
  createUpstashRateLimitStore,
  type RateLimitConfig,
  type RateLimitStore,
} from "./rate-limit.ts";

const RATE_LIMIT_WINDOW_MS = 60000;
const RATE_LIMIT_MAX_REQ = 100;
const RATE_LIMIT_MAX_BUCKETS = 5000;
const ACTION_RATE_LIMIT_MAX_BUCKETS = 5000;

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: RATE_LIMIT_MAX_REQ,
  windowMs: RATE_LIMIT_WINDOW_MS,
};

export const SUBMIT_ORDER_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 5,
  windowMs: 5 * 60 * 1000,
};

export const PAYMENT_ACTION_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 12,
  windowMs: 5 * 60 * 1000,
};

export const AUTH_ACTION_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 20,
  windowMs: 5 * 60 * 1000,
};

const memoryGlobalRateLimitStore = createMemoryRateLimitStore({
  maxBuckets: RATE_LIMIT_MAX_BUCKETS,
});

const memoryActionRateLimitStore = createMemoryRateLimitStore({
  maxBuckets: ACTION_RATE_LIMIT_MAX_BUCKETS,
});

export const globalRateLimitStore: RateLimitStore =
  UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN
    ? createUpstashRateLimitStore({
      url: UPSTASH_REDIS_REST_URL,
      token: UPSTASH_REDIS_REST_TOKEN,
      fallbackStore: memoryGlobalRateLimitStore,
    })
    : memoryGlobalRateLimitStore;

export const actionRateLimitStore: RateLimitStore =
  UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN
    ? createUpstashRateLimitStore({
      url: UPSTASH_REDIS_REST_URL,
      token: UPSTASH_REDIS_REST_TOKEN,
      fallbackStore: memoryActionRateLimitStore,
    })
    : memoryActionRateLimitStore;
