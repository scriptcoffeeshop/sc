import { expect, test } from "@playwright/test";
import {
  installDashboardRoutes,
  installGlobalStubs,
} from "../support/smoke-fixtures";

test.describe("smoke / dashboard bridge removal", () => {
  test("dashboard no longer exposes legacy window globals", async ({ page }) => {
    await installGlobalStubs(page);
    await installDashboardRoutes(page);

    await page.addInitScript(() => {
      localStorage.setItem(
        "coffee_admin",
        JSON.stringify({
          userId: "admin-1",
          displayName: "測試管理員",
          role: "SUPER_ADMIN",
        }),
      );
      localStorage.setItem("coffee_jwt", "mock-token");
    });

    await page.goto("/dashboard.html");
    await expect(page.locator("#admin-page")).toBeVisible();

    const globals = await page.evaluate(() => ({
      loginWithLine: typeof (window as any).loginWithLine,
      logout: typeof (window as any).logout,
      showTab: typeof (window as any).showTab,
      linePayRefundOrder: typeof (window as any).linePayRefundOrder,
      showPromotionModal: typeof (window as any).showPromotionModal,
    }));

    expect(globals).toEqual({
      loginWithLine: "undefined",
      logout: "undefined",
      showTab: "undefined",
      linePayRefundOrder: "undefined",
      showPromotionModal: "undefined",
    });
  });

  test("dashboard orders work without custom-event bridge", async ({ page }) => {
    await installGlobalStubs(page);
    await installDashboardRoutes(page);

    await page.addInitScript(() => {
      const originalDispatchEvent = window.dispatchEvent.bind(window);
      (window as any).__blockedDashboardOrdersEventCount = 0;
      window.dispatchEvent = ((event: Event) => {
        if (event?.type === "coffee:dashboard-orders-updated") {
          (window as any).__blockedDashboardOrdersEventCount += 1;
          return true;
        }
        return originalDispatchEvent(event);
      }) as typeof window.dispatchEvent;

      localStorage.setItem(
        "coffee_admin",
        JSON.stringify({
          userId: "admin-1",
          displayName: "測試管理員",
          role: "SUPER_ADMIN",
        }),
      );
      localStorage.setItem("coffee_jwt", "mock-token");
    });

    await page.goto("/dashboard.html");

    await expect(page.locator("#admin-page")).toBeVisible();
    await expect(page.locator("#orders-list")).toContainText("#ORD001");
    await expect.poll(() =>
      page.evaluate(() => (window as any).__blockedDashboardOrdersEventCount)
    ).toBe(0);
  });

  test("dashboard products work without custom-event bridge", async ({ page }) => {
    await installGlobalStubs(page);
    await installDashboardRoutes(page);

    await page.addInitScript(() => {
      const originalDispatchEvent = window.dispatchEvent.bind(window);
      (window as any).__blockedDashboardProductsEventCount = 0;
      window.dispatchEvent = ((event: Event) => {
        if (event?.type === "coffee:dashboard-products-updated") {
          (window as any).__blockedDashboardProductsEventCount += 1;
          return true;
        }
        return originalDispatchEvent(event);
      }) as typeof window.dispatchEvent;

      localStorage.setItem(
        "coffee_admin",
        JSON.stringify({
          userId: "admin-1",
          displayName: "測試管理員",
          role: "SUPER_ADMIN",
        }),
      );
      localStorage.setItem("coffee_jwt", "mock-token");
    });

    await page.goto("/dashboard.html");
    await page.locator("#tab-products").click();

    await expect(page.locator("#products-main-table")).toContainText(
      "後台測試商品",
    );
    await page
      .locator("#products-main-table tbody.sortable-tbody tr")
      .filter({ hasText: "後台測試商品" })
      .getByRole("button", { name: "編輯" })
      .click();
    await expect(page.locator("#product-modal")).toBeVisible();
    await expect(page.locator("#pm-title")).toHaveText("編輯商品");
    await expect.poll(() =>
      page.evaluate(() => (window as any).__blockedDashboardProductsEventCount)
    ).toBe(0);
  });

  test("dashboard categories work without custom-event bridge", async ({ page }) => {
    await installGlobalStubs(page);
    await installDashboardRoutes(page);

    await page.addInitScript(() => {
      const originalDispatchEvent = window.dispatchEvent.bind(window);
      (window as any).__blockedDashboardCategoriesEventCount = 0;
      window.dispatchEvent = ((event: Event) => {
        if (event?.type === "coffee:dashboard-categories-updated") {
          (window as any).__blockedDashboardCategoriesEventCount += 1;
          return true;
        }
        return originalDispatchEvent(event);
      }) as typeof window.dispatchEvent;

      localStorage.setItem(
        "coffee_admin",
        JSON.stringify({
          userId: "admin-1",
          displayName: "測試管理員",
          role: "SUPER_ADMIN",
        }),
      );
      localStorage.setItem("coffee_jwt", "mock-token");
    });

    await page.goto("/dashboard.html");
    await page.locator("#tab-categories").click();

    await expect(page.locator("#categories-list")).toContainText("測試分類");
    await expect.poll(() =>
      page.evaluate(() => (window as any).__blockedDashboardCategoriesEventCount)
    ).toBe(0);
  });

  test("dashboard promotions work without custom-event bridge", async ({ page }) => {
    await installGlobalStubs(page);
    await installDashboardRoutes(page);

    await page.addInitScript(() => {
      const originalDispatchEvent = window.dispatchEvent.bind(window);
      (window as any).__blockedDashboardPromotionsEventCount = 0;
      window.dispatchEvent = ((event: Event) => {
        if (event?.type === "coffee:dashboard-promotions-updated") {
          (window as any).__blockedDashboardPromotionsEventCount += 1;
          return true;
        }
        return originalDispatchEvent(event);
      }) as typeof window.dispatchEvent;

      localStorage.setItem(
        "coffee_admin",
        JSON.stringify({
          userId: "admin-1",
          displayName: "測試管理員",
          role: "SUPER_ADMIN",
        }),
      );
      localStorage.setItem("coffee_jwt", "mock-token");
    });

    await page.goto("/dashboard.html");
    await page.locator("#tab-promotions").click();

    await expect(page.locator("#promotions-table")).toContainText("任選 2 件 9 折");
    await page
      .locator("#promotions-table tr")
      .filter({ hasText: "任選 2 件 9 折" })
      .getByRole("button", { name: "編輯" })
      .click();
    await expect(page.locator("#promotion-modal")).toBeVisible();
    await expect(page.locator("#prm-title")).toHaveText("編輯活動");
    await expect(page.locator("#prm-products-list")).toContainText("後台測試商品");
    await expect.poll(() =>
      page.evaluate(() => (window as any).__blockedDashboardPromotionsEventCount)
    ).toBe(0);
  });

  test("dashboard form fields work without custom-event bridge", async ({ page }) => {
    await installGlobalStubs(page);
    await installDashboardRoutes(page);

    await page.addInitScript(() => {
      const originalDispatchEvent = window.dispatchEvent.bind(window);
      (window as any).__blockedDashboardFormFieldsEventCount = 0;
      window.dispatchEvent = ((event: Event) => {
        if (event?.type === "coffee:dashboard-formfields-updated") {
          (window as any).__blockedDashboardFormFieldsEventCount += 1;
          return true;
        }
        return originalDispatchEvent(event);
      }) as typeof window.dispatchEvent;

      localStorage.setItem(
        "coffee_admin",
        JSON.stringify({
          userId: "admin-1",
          displayName: "測試管理員",
          role: "SUPER_ADMIN",
        }),
      );
      localStorage.setItem("coffee_jwt", "mock-token");
    });

    await page.goto("/dashboard.html");
    await page.locator("#tab-formfields").click();

    await expect(page.locator("#formfields-list")).toContainText("收據類型");
    await expect(page.locator("#formfields-list")).toContainText("receipt_type");
    await expect.poll(() =>
      page.evaluate(() => (window as any).__blockedDashboardFormFieldsEventCount)
    ).toBe(0);
  });

  test("dashboard users work without custom-event bridge", async ({ page }) => {
    await installGlobalStubs(page);
    await installDashboardRoutes(page);

    await page.addInitScript(() => {
      const originalDispatchEvent = window.dispatchEvent.bind(window);
      (window as any).__blockedDashboardUsersEventCount = 0;
      window.dispatchEvent = ((event: Event) => {
        if (event?.type === "coffee:dashboard-users-updated") {
          (window as any).__blockedDashboardUsersEventCount += 1;
          return true;
        }
        return originalDispatchEvent(event);
      }) as typeof window.dispatchEvent;

      localStorage.setItem(
        "coffee_admin",
        JSON.stringify({
          userId: "admin-1",
          displayName: "測試管理員",
          role: "SUPER_ADMIN",
        }),
      );
      localStorage.setItem("coffee_jwt", "mock-token");
    });

    await page.goto("/dashboard.html");
    await page.locator("#tab-users").click();

    await expect(page.locator("#users-table")).toContainText("測試會員");
    await expect(page.locator("#users-table")).toContainText("管理測試員");
    await expect(page.getByRole("button", { name: "設為管理員" }).first()).toBeVisible();
    await expect.poll(() =>
      page.evaluate(() => (window as any).__blockedDashboardUsersEventCount)
    ).toBe(0);
  });

  test("dashboard blacklist works without custom-event bridge", async ({ page }) => {
    await installGlobalStubs(page);
    await installDashboardRoutes(page);

    await page.addInitScript(() => {
      const originalDispatchEvent = window.dispatchEvent.bind(window);
      (window as any).__blockedDashboardBlacklistEventCount = 0;
      window.dispatchEvent = ((event: Event) => {
        if (event?.type === "coffee:dashboard-blacklist-updated") {
          (window as any).__blockedDashboardBlacklistEventCount += 1;
          return true;
        }
        return originalDispatchEvent(event);
      }) as typeof window.dispatchEvent;

      localStorage.setItem(
        "coffee_admin",
        JSON.stringify({
          userId: "admin-1",
          displayName: "測試管理員",
          role: "SUPER_ADMIN",
        }),
      );
      localStorage.setItem("coffee_jwt", "mock-token");
    });

    await page.goto("/dashboard.html");
    await page.locator("#tab-blacklist").click();

    await expect(page.locator("#blacklist-table")).toContainText("管理測試員");
    await expect(page.locator("#blacklist-table")).toContainText("惡意測試");
    await expect.poll(() =>
      page.evaluate(() => (window as any).__blockedDashboardBlacklistEventCount)
    ).toBe(0);
  });
});
