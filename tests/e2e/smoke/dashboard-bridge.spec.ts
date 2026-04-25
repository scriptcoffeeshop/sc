import { expect, test } from "@playwright/test";
import {
  installDashboardRoutes,
  installGlobalStubs,
} from "../support/smoke-fixtures";
import {
  getBlockedDashboardEventBridgeCount,
  getDashboardLegacyGlobalTypes,
  gotoDashboard,
  installDashboardAdminSession,
  installDashboardEventBridgeBlocker,
} from "../support/dashboard-smoke";

test.describe("smoke / dashboard bridge removal", () => {
  test("dashboard no longer exposes legacy window globals", async ({ page }) => {
    await installGlobalStubs(page);
    await installDashboardRoutes(page);
    await installDashboardAdminSession(page);

    await gotoDashboard(page);
    await expect(page.locator("#admin-page")).toBeVisible();

    const globals = await getDashboardLegacyGlobalTypes(page);

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
    await installDashboardEventBridgeBlocker(
      page,
      "coffee:dashboard-orders-updated",
    );

    await gotoDashboard(page);

    await expect(page.locator("#admin-page")).toBeVisible();
    await expect(page.locator("#orders-list")).toContainText("#ORD001");
    await expect.poll(() => getBlockedDashboardEventBridgeCount(page)).toBe(0);
  });

  test("dashboard products work without custom-event bridge", async ({ page }) => {
    await installGlobalStubs(page);
    await installDashboardRoutes(page);
    await installDashboardEventBridgeBlocker(
      page,
      "coffee:dashboard-products-updated",
    );

    await gotoDashboard(page);
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
    await expect.poll(() => getBlockedDashboardEventBridgeCount(page)).toBe(0);
  });

  test("dashboard categories work without custom-event bridge", async ({ page }) => {
    await installGlobalStubs(page);
    await installDashboardRoutes(page);
    await installDashboardEventBridgeBlocker(
      page,
      "coffee:dashboard-categories-updated",
    );

    await gotoDashboard(page);
    await page.locator("#tab-categories").click();

    await expect(page.locator("#categories-list")).toContainText("測試分類");
    await expect.poll(() => getBlockedDashboardEventBridgeCount(page)).toBe(0);
  });

  test("dashboard promotions work without custom-event bridge", async ({ page }) => {
    await installGlobalStubs(page);
    await installDashboardRoutes(page);
    await installDashboardEventBridgeBlocker(
      page,
      "coffee:dashboard-promotions-updated",
    );

    await gotoDashboard(page);
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
    await expect.poll(() => getBlockedDashboardEventBridgeCount(page)).toBe(0);
  });

  test("dashboard form fields work without custom-event bridge", async ({ page }) => {
    await installGlobalStubs(page);
    await installDashboardRoutes(page);
    await installDashboardEventBridgeBlocker(
      page,
      "coffee:dashboard-formfields-updated",
    );

    await gotoDashboard(page);
    await page.locator("#tab-formfields").click();

    await expect(page.locator("#formfields-list")).toContainText("收據類型");
    await expect(page.locator("#formfields-list")).toContainText("receipt_type");
    await expect.poll(() => getBlockedDashboardEventBridgeCount(page)).toBe(0);
  });

  test("dashboard users work without custom-event bridge", async ({ page }) => {
    await installGlobalStubs(page);
    await installDashboardRoutes(page);
    await installDashboardEventBridgeBlocker(
      page,
      "coffee:dashboard-users-updated",
    );

    await gotoDashboard(page);
    await page.locator("#tab-users").click();

    await expect(page.locator("#users-table")).toContainText("測試會員");
    await expect(page.locator("#users-table")).toContainText("管理測試員");
    await expect(page.getByRole("button", { name: "設為管理員" }).first()).toBeVisible();
    await expect.poll(() => getBlockedDashboardEventBridgeCount(page)).toBe(0);
  });

  test("dashboard blacklist works without custom-event bridge", async ({ page }) => {
    await installGlobalStubs(page);
    await installDashboardRoutes(page);
    await installDashboardEventBridgeBlocker(
      page,
      "coffee:dashboard-blacklist-updated",
    );

    await gotoDashboard(page);
    await page.locator("#tab-blacklist").click();

    await expect(page.locator("#blacklist-table")).toContainText("管理測試員");
    await expect(page.locator("#blacklist-table")).toContainText("惡意測試");
    await expect.poll(() => getBlockedDashboardEventBridgeCount(page)).toBe(0);
  });
});
