import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import { createCoffeeApiMswHandlers } from "../../../../tests/support/api-mock/coffee-api-msw.ts";

const apiUrl = "https://mock.example/functions/v1/coffee-api";
const server = setupServer(...createCoffeeApiMswHandlers(apiUrl));

describe("coffee API MSW mock layer", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it("serves shared init fixtures to unit tests", async () => {
    const response = await fetch(`${apiUrl}?action=getInitData`);
    const payload = await response.json() as {
      success?: boolean;
      products?: Array<{ name?: string }>;
    };

    expect(payload.success).toBe(true);
    expect(payload.products?.[0]?.name).toBe("測試豆");
  });

  it("builds quote responses from the same fixture layer", async () => {
    const response = await fetch(`${apiUrl}?action=quoteOrder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deliveryMethod: "delivery",
        items: [{ productId: 101, specKey: "quarter", qty: 2 }],
      }),
    });
    const payload = await response.json() as {
      quote?: {
        total?: number;
        items?: Array<{ qty?: number; lineTotal?: number }>;
      };
    };

    expect(payload.quote?.items?.[0]).toMatchObject({
      qty: 2,
      lineTotal: 440,
    });
    expect(payload.quote?.total).toBe(440);
  });
});
