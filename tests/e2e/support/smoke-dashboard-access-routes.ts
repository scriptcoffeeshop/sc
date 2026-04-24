import { fulfillJson } from "./smoke-shared.ts";
import { type DashboardRouteContext } from "./smoke-dashboard-state.ts";

export async function handleDashboardAccessRoutes(
  ctx: DashboardRouteContext,
): Promise<boolean> {
  const { action, options, request, route } = ctx;

  if (action === "lineLogin") {
    options.onAdminLineLogin?.(request);
    await fulfillJson(route, {
      success: true,
      isAdmin: true,
      user: {
        userId: "admin-line-1",
        displayName: "LINE 測試管理員",
        pictureUrl: "",
      },
      token: "mock-admin-token",
    });
    return true;
  }

  return false;
}
