import { type Page } from "@playwright/test";
import { API_URL, fulfillJson } from "./smoke-shared.ts";
import { handleDashboardAccessRoutes } from "./smoke-dashboard-access-routes.ts";
import { handleDashboardCatalogRoutes } from "./smoke-dashboard-catalog-routes.ts";
import { handleDashboardMembersRoutes } from "./smoke-dashboard-members-routes.ts";
import { handleDashboardOrdersRoutes } from "./smoke-dashboard-orders-routes.ts";
import {
  createDashboardRouteState,
  type DashboardRouteOptions,
} from "./smoke-dashboard-state.ts";
import { handleDashboardSettingsRoutes } from "./smoke-dashboard-settings-routes.ts";

export type { DashboardRouteOptions } from "./smoke-dashboard-state.ts";

const dashboardRouteHandlers = [
  handleDashboardAccessRoutes,
  handleDashboardCatalogRoutes,
  handleDashboardOrdersRoutes,
  handleDashboardMembersRoutes,
  handleDashboardSettingsRoutes,
];

export async function installDashboardRoutes(
  page: Page,
  options: DashboardRouteOptions = {},
) {
  const state = createDashboardRouteState(options);

  await page.route(`${API_URL}**`, async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await fulfillJson(route, {});
      return;
    }

    const url = new URL(request.url());
    const action = url.searchParams.get("action");
    const context = {
      action,
      options,
      request,
      route,
      state,
      url,
    };

    for (const handler of dashboardRouteHandlers) {
      if (await handler(context)) {
        return;
      }
    }

    await fulfillJson(route, { success: true });
  });
}
