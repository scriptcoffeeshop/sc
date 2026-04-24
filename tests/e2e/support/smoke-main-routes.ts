import {
  type Page,
  type Request as PlaywrightRequest,
} from "@playwright/test";
import { API_URL, fulfillJson, SUPABASE_REST_PREFIX } from "./smoke-shared.ts";
import {
  buildMainInitDataPayload,
  buildQuotePayload,
  createMainRouteState,
  type MainRouteOptions,
} from "./smoke-main-state.ts";

export type { MainRouteOptions } from "./smoke-main-state.ts";

export async function installMainRoutes(
  page: Page,
  options: MainRouteOptions = {},
) {
  const state = createMainRouteState(options);

  await page.route(`${SUPABASE_REST_PREFIX}**`, async (route) => {
    await route.abort();
  });

  await page.route(`${API_URL}**`, async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await fulfillJson(route, {});
      return;
    }

    const url = new URL(request.url());
    const action = url.searchParams.get("action");

    if (action === "getInitData") {
      await fulfillJson(route, buildMainInitDataPayload(state));
      return;
    }

    if (action === "quoteOrder") {
      const body = request.postDataJSON() as {
        items?: Array<{
          productId?: number | string;
          specKey?: string;
          qty?: number | string;
        }>;
        deliveryMethod?: string;
      };
      await fulfillJson(route, buildQuotePayload(body, state.payment));
      return;
    }

    if (action === "customerLineLogin") {
      options.onCustomerLineLogin?.(request as PlaywrightRequest);
      await fulfillJson(route, {
        success: true,
        user: {
          userId: "customer-line-1",
          displayName: "LINE 測試客戶",
          pictureUrl: "",
        },
        token: "mock-customer-token",
      });
      return;
    }

    await fulfillJson(route, { success: true });
  });
}
