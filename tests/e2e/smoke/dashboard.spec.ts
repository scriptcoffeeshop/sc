import { expect, test } from "@playwright/test";
import {
  API_URL,
  expectColorsClose,
  fulfillJson,
  installDashboardRoutes,
  installGlobalStubs,
} from "../support/smoke-fixtures";

interface SmokeApiPayload {
  [key: string]: unknown;
}

type LineFlexNotificationPayload = {
  flexMessage?: {
    altText?: string;
  };
  orderId?: string;
  to?: string;
};

type OrderEmailPayload = {
  orderId?: string;
  userId?: string;
};

test.describe("smoke / dashboard core", () => {
  test("dashboard order status flow works", async ({ page }) => {
    await installGlobalStubs(page);
    await installDashboardRoutes(page);

    let updateStatusCalls = 0;
    await page.route(`${API_URL}?action=updateOrderStatus**`, async (route) => {
      updateStatusCalls += 1;
      await fulfillJson(route, { success: true });
    });

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
    await expect(page.locator("#orders-list")).toContainText("#ORD001");

    const orderRow = page.locator("#orders-list > div").filter({ hasText: "#ORD001" });
    const statusSelect = orderRow.locator("select");
    await statusSelect.click();
    await page.waitForTimeout(250);
    expect(updateStatusCalls).toBe(0);

    await statusSelect.evaluate((el) => {
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.waitForTimeout(250);
    expect(updateStatusCalls).toBe(0);

    await statusSelect.selectOption("processing");
    await orderRow.getByRole("button", { name: "確認" }).click();
    await expect.poll(() => updateStatusCalls).toBeGreaterThan(0);

    await page.locator("#tab-products").click();
    await page
      .locator("#products-main-table tbody.sortable-tbody tr")
      .filter({ hasText: "後台測試商品" })
      .getByRole("button", { name: "編輯" })
      .click();
    await expect(page.locator("#product-modal")).toBeVisible();
    await expect(page.locator("#pm-title")).toHaveText("編輯商品");
  });

  test("dashboard order notification actions still work after controller split", async ({ page }) => {
    await installGlobalStubs(page);

    let lineFlexCalls = 0;
    let emailCalls = 0;
    let lineFlexPayload: LineFlexNotificationPayload | null = null;
    let emailPayload: OrderEmailPayload | null = null;

    await installDashboardRoutes(page, {
      onSendLineFlexMessage: (request) => {
        lineFlexCalls += 1;
        lineFlexPayload = request.postDataJSON() as LineFlexNotificationPayload;
      },
      onSendOrderEmail: (request) => {
        emailCalls += 1;
        emailPayload = request.postDataJSON() as OrderEmailPayload;
      },
    });

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

    const orderRow = page.locator("#orders-list > div").filter({ hasText: "#ORD001" });
    await orderRow.getByRole("button", { name: "LINE通知" }).click();
    await expect.poll(() => lineFlexCalls).toBe(1);
    expect(lineFlexPayload?.orderId).toBe("ORD001");
    expect(lineFlexPayload?.to).toBe("customer-line-1");
    expect(String(lineFlexPayload?.flexMessage?.altText || "")).toContain(
      "[Script Coffee] 訂單 #ORD001 待處理",
    );

    await orderRow.getByRole("button", { name: "發送信件" }).click();
    await expect.poll(() => emailCalls).toBe(1);
    expect(emailPayload?.userId).toBe("admin-1");
    expect(emailPayload?.orderId).toBe("ORD001");
  });

  test("dashboard mobile tab strip keeps sidebar styling", async ({ page }) => {
    await installGlobalStubs(page);
    await installDashboardRoutes(page);

    await page.setViewportSize({ width: 375, height: 812 });
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

    await expect(page.locator("#sidebar")).toBeVisible();
    await expect(page.locator("#sidebar")).toHaveCSS(
      "background-color",
      "rgb(238, 232, 213)",
    );
    await expect(page.locator("#tab-orders")).toHaveCSS(
      "background-color",
      "rgb(253, 246, 227)",
    );
    await expect(page.locator("#tab-products")).toHaveCSS(
      "background-color",
      "rgba(0, 0, 0, 0)",
    );
  });

  test("dashboard users are touch-friendly on iPhone 13 mini", async ({ page }) => {
    await installDashboardRoutes(page);

    await page.setViewportSize({ width: 375, height: 812 });
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
    await page.locator("#tab-users").scrollIntoViewIfNeeded();
    await page.locator("#tab-users").click();

    const usersPanel = page.locator("#users-section");
    await expect(usersPanel).toBeVisible();
    await expect(usersPanel.locator(".users-card-list")).toBeVisible();
    await expect(usersPanel.locator(".users-table-wrap")).toBeHidden();

    const firstCard = usersPanel.locator(".users-card").first();
    await expect(firstCard).toContainText("測試會員");
    const cardBox = await firstCard.boundingBox();
    expect(cardBox?.width || 0).toBeLessThanOrEqual(355);
    expect(cardBox?.height || 0).toBeGreaterThanOrEqual(80);

    await firstCard.click();
    const noteInput = page.locator("#dashboard-user-admin-note");
    await expect(noteInput).toBeVisible();
    await expect(noteInput).toHaveValue("偏好週末取貨");
    const dialogBox = await page.locator(".swal2-popup").boundingBox();
    expect(dialogBox?.width || 0).toBeLessThanOrEqual(360);
  });

  test("dashboard tab icons use vector sizing and currentColor", async ({ page }) => {
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

    const activeTab = page.locator("#tab-orders");
    const inactiveTab = page.locator("#tab-products");
    const activeIcon = activeTab.locator("svg").first();
    const inactiveIcon = inactiveTab.locator("svg").first();

    await expect(activeIcon).toBeVisible();
    await expect(inactiveIcon).toBeVisible();
    await expect(activeIcon).toHaveCSS("width", "18px");
    await expect(inactiveIcon).toHaveCSS("width", "18px");

    const activeTabColor = await activeTab.evaluate((element) =>
      getComputedStyle(element).color
    );
    const activeIconColor = await activeIcon.evaluate((element) =>
      getComputedStyle(element).color
    );
    const inactiveTabColor = await inactiveTab.evaluate((element) =>
      getComputedStyle(element).color
    );
    const inactiveIconColor = await inactiveIcon.evaluate((element) =>
      getComputedStyle(element).color
    );

    expectColorsClose(activeIconColor, activeTabColor);
    expectColorsClose(inactiveIconColor, inactiveTabColor);
  });

  test("dashboard LINE login callback uses POST", async ({ page }) => {
    await installGlobalStubs(page);

    let loginRequest:
      | { method: string; url: string; body: SmokeApiPayload }
      | null = null;
    await installDashboardRoutes(page, {
      onAdminLineLogin: (request) => {
        loginRequest = {
          method: request.method(),
          url: request.url(),
          body: request.postDataJSON() as SmokeApiPayload,
        };
      },
    });

    await page.addInitScript(() => {
      localStorage.setItem("coffee_admin_state", "admin-state");
    });

    await page.goto("/dashboard.html?code=admin-code&state=admin-state");

    await expect.poll(() => loginRequest?.method).toBe("POST");
    expect(new URL(loginRequest!.url).searchParams.get("code")).toBeNull();
    expect(loginRequest!.body).toMatchObject({
      code: "admin-code",
      redirectUri: expect.stringContaining("/dashboard.html"),
    });
    await expect(page.locator("#admin-page")).toBeVisible();
  });
});
