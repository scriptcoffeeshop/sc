import { beforeEach, describe, expect, it, vi } from "vitest";

function jsonResponse(payload) {
  return { json: async () => payload };
}

async function loadCategoriesModule() {
  vi.resetModules();
  return await import("./useDashboardCategories.js");
}

describe("useDashboardCategories", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads categories, keeps input state, and adds a new category", async () => {
    const module = await loadCategoriesModule();
    const payloads = [];
    const authFetch = vi.fn(async (url, options = {}) => {
      if (String(url).includes("getCategories")) {
        return jsonResponse({
          success: true,
          categories: [
            { id: 1, name: "咖啡豆" },
            { id: 2, name: "耳掛" },
          ],
        });
      }
      if (String(url).includes("addCategory")) {
        payloads.push(JSON.parse(String(options.body || "{}")));
        return jsonResponse({ success: true });
      }
      throw new Error(`unexpected url: ${url}`);
    });
    const onCategoriesChanged = vi.fn();
    const Toast = { fire: vi.fn() };

    module.configureDashboardCategoriesServices({
      API_URL: "https://api.example",
      authFetch,
      getAuthUserId: () => "admin-user",
      onCategoriesChanged,
      loadProducts: vi.fn(),
      Sortable: null,
      Swal: { fire: vi.fn() },
      Toast,
    });

    await module.dashboardCategoriesActions.loadCategories();
    const dashboard = module.useDashboardCategories();
    expect(dashboard.categoriesView.value).toEqual([
      { id: 1, name: "咖啡豆" },
      { id: 2, name: "耳掛" },
    ]);

    dashboard.newCategoryName.value = " 配方豆 ";
    await module.dashboardCategoriesActions.addCategory();

    expect(payloads[0]).toEqual({
      userId: "admin-user",
      name: "配方豆",
    });
    expect(dashboard.newCategoryName.value).toBe("");
    expect(Toast.fire).toHaveBeenCalledWith({
      icon: "success",
      title: "已新增",
    });
    expect(onCategoriesChanged).toHaveBeenCalled();
  });

  it("updates and deletes categories while reloading products", async () => {
    const module = await loadCategoriesModule();
    const payloads = [];
    const authFetch = vi.fn(async (url, options = {}) => {
      if (String(url).includes("getCategories")) {
        return jsonResponse({
          success: true,
          categories: [
            { id: 1, name: "咖啡豆" },
            { id: 2, name: "耳掛" },
          ],
        });
      }
      if (
        String(url).includes("updateCategory") ||
        String(url).includes("deleteCategory")
      ) {
        payloads.push({
          url: String(url),
          body: JSON.parse(String(options.body || "{}")),
        });
        return jsonResponse({ success: true });
      }
      throw new Error(`unexpected url: ${url}`);
    });
    const loadProducts = vi.fn();
    const Toast = { fire: vi.fn() };
    const Swal = {
      fire: vi.fn(async (options) => {
        if (options?.title === "修改分類") {
          return { value: "配方豆" };
        }
        if (options?.title === "刪除分類？") {
          return { isConfirmed: true };
        }
        return {};
      }),
    };

    module.configureDashboardCategoriesServices({
      API_URL: "https://api.example",
      authFetch,
      getAuthUserId: () => "admin-user",
      onCategoriesChanged: vi.fn(),
      loadProducts,
      Sortable: null,
      Swal,
      Toast,
    });

    await module.dashboardCategoriesActions.loadCategories();
    await module.dashboardCategoriesActions.editCategory(2);
    await module.dashboardCategoriesActions.delCategory(2);

    expect(payloads[0]).toMatchObject({
      url: expect.stringContaining("updateCategory"),
      body: { userId: "admin-user", id: 2, name: "配方豆" },
    });
    expect(payloads[1]).toMatchObject({
      url: expect.stringContaining("deleteCategory"),
      body: { userId: "admin-user", id: 2 },
    });
    expect(loadProducts).toHaveBeenCalledTimes(2);
    expect(Toast.fire).toHaveBeenCalledWith({
      icon: "success",
      title: "分類已更新，商品同步完成",
    });
    expect(Toast.fire).toHaveBeenCalledWith({
      icon: "success",
      title: "已刪除",
    });
  });
});
