import { assertEquals } from "@std/assert";
import {
  createMemoryRateLimitStore,
  createUpstashRateLimitStore,
} from "../utils/rate-limit.ts";

Deno.test({
  name: "Rate Limit Store - memory store blocks after max requests",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const store = createMemoryRateLimitStore({ maxBuckets: 16 });
    const config = { maxRequests: 2, windowMs: 60_000 };
    const now = 1_000;

    assertEquals(await store.consume("ip:1", config, now), null);
    assertEquals(await store.consume("ip:1", config, now + 10), null);
    assertEquals(await store.consume("ip:1", config, now + 20), 60);
    assertEquals(await store.consume("ip:1", config, now + 60_100), null);
  },
});

Deno.test({
  name: "Rate Limit Store - upstash store uses transaction results",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const requests: Array<{
      url: string;
      headers: Headers;
      body: string;
    }> = [];
    const store = createUpstashRateLimitStore({
      url: "https://upstash.example.com",
      token: "token-123",
      fetchImpl: (input: Request | URL | string, init?: RequestInit) => {
        requests.push({
          url: String(input),
          headers: new Headers(init?.headers),
          body: String(init?.body || ""),
        });
        return Promise.resolve(
          new Response(
            JSON.stringify([
              { result: 6 },
              { result: 0 },
              { result: 42 },
            ]),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          ),
        );
      },
    });

    const retryAfter = await store.consume(
      "submitOrder:user-1",
      { maxRequests: 5, windowMs: 5 * 60 * 1000 },
      1_700_000_000_000,
    );

    assertEquals(retryAfter, 42);
    assertEquals(requests.length, 1);
    assertEquals(requests[0].url, "https://upstash.example.com/multi-exec");
    assertEquals(requests[0].headers.get("authorization"), "Bearer token-123");
    assertEquals(
      requests[0].body,
      JSON.stringify([
        ["INCR", "submitOrder:user-1"],
        ["EXPIRE", "submitOrder:user-1", 300, "NX"],
        ["TTL", "submitOrder:user-1"],
      ]),
    );
  },
});

Deno.test({
  name: "Rate Limit Store - upstash store falls back to memory on fetch error",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const store = createUpstashRateLimitStore({
      url: "https://upstash.example.com",
      token: "token-123",
      fetchImpl: () => Promise.reject(new Error("upstash unavailable")),
      fallbackStore: createMemoryRateLimitStore({ maxBuckets: 16 }),
    });
    const config = { maxRequests: 1, windowMs: 60_000 };
    const now = 10_000;

    assertEquals(await store.consume("ip:2", config, now), null);
    assertEquals(await store.consume("ip:2", config, now + 1), 60);
  },
});
