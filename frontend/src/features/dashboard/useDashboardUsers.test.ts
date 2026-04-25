import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DashboardApiJson } from "./dashboardOrderTypes.ts";

function jsonResponse(payload: DashboardApiJson) {
  return { json: async () => payload };
}

async function loadUsersModule(activeTab = "orders") {
  vi.resetModules();
  vi.doMock("./useDashboardSession.ts", () => ({
    getDashboardActiveTab: () => activeTab,
  }));
  return await import("./useDashboardUsers.ts");
}

describe("useDashboardUsers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads users and blacklist entries into dashboard-friendly view models", async () => {
    const module = await loadUsersModule();
    const Swal = {
      fire: vi.fn(async () => ({})),
      showLoading: vi.fn(),
      close: vi.fn(),
    };
    const authFetch = vi.fn(async (url) => {
      if (String(url).includes("getUsers")) {
        return jsonResponse({
          success: true,
          users: [
            {
              userId: "user-1",
              displayName: "一般管理員",
              role: "ADMIN",
              status: "ACTIVE",
              defaultDeliveryMethod: "delivery",
              defaultCity: "新竹市",
              defaultDistrict: "東區",
              defaultAddress: "測試路 1 號",
            },
            {
              userId: "user-2",
              displayName: "黑名單用戶",
              role: "USER",
              status: "BLACKLISTED",
              defaultDeliveryMethod: "seven_eleven",
              defaultStoreName: "光復門市",
              defaultStoreId: "711001",
            },
          ],
        });
      }
      if (String(url).includes("getBlacklist")) {
        return jsonResponse({
          success: true,
          blacklist: [{
            displayName: "黑名單用戶",
            lineUserId: "user-2",
            blockedAt: "2026-04-22T10:00:00.000Z",
            reason: "惡意棄單",
          }],
        });
      }
      throw new Error(`unexpected url: ${url}`);
    });

    module.configureDashboardUsersServices({
      API_URL: "https://api.example",
      authFetch,
      getAuthUserId: () => "super-admin",
      getCurrentUser: () => ({ role: "SUPER_ADMIN" }),
      Swal,
      Toast: { fire: vi.fn() },
    });

    const dashboard = module.useDashboardUsers();
    dashboard.updateUserSearch("Script Coffee");
    await module.dashboardUsersActions.loadUsers();
    await module.dashboardUsersActions.loadBlacklist();

    expect(authFetch.mock.calls[0][0]).toContain("search=Script%20Coffee");
    expect(dashboard.usersView.value[0]).toMatchObject({
      userId: "user-1",
      roleBadgeText: "管理員",
      defaultDeliveryText: "宅配 (新竹市東區 測試路 1 號)",
      roleAction: {
        newRole: "USER",
        label: "移除管理員",
      },
    });
    expect(dashboard.usersView.value[1]).toMatchObject({
      userId: "user-2",
      statusBadgeText: "黑名單",
      blacklistActionLabel: "解除封鎖",
      defaultDeliveryText: "7-11 (光復門市 - 711001)",
    });
    expect(dashboard.blacklistView.value).toEqual([
      {
        displayName: "黑名單用戶",
        lineUserId: "user-2",
        blockedAtText: new Date("2026-04-22T10:00:00.000Z").toLocaleString("zh-TW"),
        reasonText: "惡意棄單",
      },
    ]);
    expect(Swal.close).toHaveBeenCalledTimes(1);
  });

  it("adds users to blacklist and refreshes blacklist data when the blacklist tab is active", async () => {
    const module = await loadUsersModule("blacklist");
    const requestBodies: Array<Record<string, unknown>> = [];
    const Swal = {
      fire: vi.fn(async (options) => {
        if (options?.title === "封鎖用戶") {
          return { value: "惡意棄單" };
        }
        return {};
      }),
      showLoading: vi.fn(),
      close: vi.fn(),
    };
    const Toast = { fire: vi.fn() };
    const authFetch = vi.fn(async (url, options = {}) => {
      if (String(url).includes("getUsers")) {
        return jsonResponse({ success: true, users: [] });
      }
      if (String(url).includes("getBlacklist")) {
        return jsonResponse({ success: true, blacklist: [] });
      }
      if (String(url).includes("addToBlacklist")) {
        requestBodies.push(JSON.parse(String(options.body || "{}")));
        return jsonResponse({ success: true });
      }
      throw new Error(`unexpected url: ${url}`);
    });

    module.configureDashboardUsersServices({
      API_URL: "https://api.example",
      authFetch,
      getAuthUserId: () => "super-admin",
      getCurrentUser: () => ({ role: "SUPER_ADMIN" }),
      Swal,
      Toast,
    });

    await module.dashboardUsersActions.toggleUserBlacklist("user-9", true);

    expect(requestBodies).toEqual([{
      targetUserId: "user-9",
      reason: "惡意棄單",
    }]);
    expect(Toast.fire).toHaveBeenCalledWith({
      icon: "success",
      title: "已加入黑名單",
    });
    expect(authFetch).toHaveBeenCalledWith(
      expect.stringContaining("getBlacklist"),
    );
  });
});
