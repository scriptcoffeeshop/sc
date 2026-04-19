import { assertEquals } from "@std/assert";
import app from "../index.ts";

function buildActionRequest(
  action: string,
  options: {
    method?: "GET" | "POST";
    body?: Record<string, unknown>;
    headers?: HeadersInit;
  } = {},
): Request {
  const method = options.method || "GET";
  const headers = new Headers(options.headers);

  if (method === "GET") {
    return new Request(`https://example.com/?action=${action}`, {
      method,
      headers,
    });
  }

  headers.set("content-type", "application/json");
  return new Request("https://example.com/", {
    method,
    headers,
    body: JSON.stringify({
      action,
      ...(options.body || {}),
    }),
  });
}

Deno.test({
  name: "Routing Guards - write actions reject GET requests",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const response = await app.fetch(
      buildActionRequest("updateSettings", { method: "GET" }),
    );
    const payload = await response.json();

    assertEquals(response.status, 405);
    assertEquals(response.headers.get("Allow"), "POST");
    assertEquals(payload.success, false);
  },
});

Deno.test({
  name: "Routing Guards - admin actions require authentication",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const response = await app.fetch(
      buildActionRequest("getOrders", { method: "GET" }),
    );
    const payload = await response.json();

    assertEquals(response.status, 401);
    assertEquals(payload.success, false);
    assertEquals(payload.error, "請先登入");
  },
});

Deno.test({
  name: "Routing Guards - submitOrder has stricter action rate limit",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const headers = { "x-real-ip": `rate-limit-${crypto.randomUUID()}` };
    let response = await app.fetch(
      buildActionRequest("submitOrder", { method: "POST", headers }),
    );

    for (let i = 0; i < 5; i++) {
      response = await app.fetch(
        buildActionRequest("submitOrder", { method: "POST", headers }),
      );
    }

    const payload = await response.json();
    assertEquals(response.status, 429);
    assertEquals(response.headers.get("Retry-After") !== null, true);
    assertEquals(payload.success, false);
    assertEquals(payload.error, "操作過於頻繁，請稍後再試");
  },
});
