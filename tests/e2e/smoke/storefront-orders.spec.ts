import { expect, test } from "@playwright/test";
import {
  API_URL,
  blockStorefrontBodyClickDelegation,
  fulfillJson,
  installGlobalStubs,
  installMainRoutes,
} from "../support/smoke-fixtures";
import { gotoStorefront, installStorefrontUser } from "../support/storefront-smoke";

test.describe("smoke / storefront orders and user controls", () => {
  test("storefront my orders can copy tracking number", async ({ page }) => {
    await installGlobalStubs(page);
    await installMainRoutes(page);
    await blockStorefrontBodyClickDelegation(page);

    await page.route(`${API_URL}?action=getMyOrders**`, async (route) => {
      await fulfillJson(route, {
        success: true,
        orders: [
          {
            orderId: "MY001",
            timestamp: "2026-03-02T00:00:00.000Z",
            deliveryMethod: "home_delivery",
            status: "shipped",
            lineName: "測試客戶",
            city: "新竹市",
            address: "測試路 1 號",
            items: "測試豆 x1",
            total: 220,
            paymentMethod: "cod",
            paymentStatus: "",
            shippingProvider: "黑貓宅急便",
            trackingNumber: "AB123456789",
          },
        ],
      });
    });
    await installStorefrontUser(page);

    await gotoStorefront(page);

    await expect.poll(() =>
      page.evaluate(() => (window as any).__blockedStorefrontBodyClickDelegation)
    ).toBe(0);
    await page.getByRole("button", { name: "我的訂單" }).click();
    await expect(page.locator("#my-orders-modal")).toBeVisible();

    const copyButton = page.locator(
      '#my-orders-list [data-copy-tracking-number="true"][data-tracking-number="AB123456789"]',
    );
    await expect(copyButton).toBeVisible();
    await copyButton.click();

    await expect.poll(() =>
      page.evaluate(() => (window as any).__clipboardWrites.length)
    ).toBe(1);
    await expect.poll(() =>
      page.evaluate(() => (window as any).__clipboardWrites[0])
    ).toBe("AB123456789");
  });

  test("storefront my orders hides宅配 tracking link before shipment", async ({ page }) => {
    await installGlobalStubs(page);
    await installMainRoutes(page);

    await page.route(`${API_URL}?action=getMyOrders**`, async (route) => {
      await fulfillJson(route, {
        success: true,
        orders: [
          {
            orderId: "HOME-PENDING-001",
            timestamp: "2026-04-23T00:00:00.000Z",
            deliveryMethod: "home_delivery",
            status: "pending",
            lineName: "測試客戶",
            city: "基隆市",
            address: "123",
            items: "測試豆 x1",
            total: 220,
            paymentMethod: "transfer",
            paymentStatus: "pending",
          },
        ],
      });
    });
    await installStorefrontUser(page);

    await gotoStorefront(page);
    await page.getByRole("button", { name: "我的訂單" }).click();

    await expect(page.locator("#my-orders-modal")).toBeVisible();
    await expect(page.locator("#my-orders-list")).toContainText("HOME-PENDING-001");
    await expect(
      page.locator('#my-orders-list a:has-text("物流追蹤頁面")'),
    ).toHaveCount(0);
  });

  test("storefront my orders renders API content as text", async ({ page }) => {
    await installGlobalStubs(page);
    await installMainRoutes(page);

    await page.route(`${API_URL}?action=getMyOrders**`, async (route) => {
      await fulfillJson(route, {
        success: true,
        orders: [
          {
            orderId: '<img src=x onerror="window.__ordersXss=true">',
            timestamp: "2026-03-02T00:00:00.000Z",
            deliveryMethod: "home_delivery",
            status: '<img src=x onerror="window.__ordersXss=true">',
            lineName: "測試客戶",
            city: '<img src=x onerror="window.__ordersXss=true">',
            address: '<script>window.__ordersXss=true</script>',
            items: '測試豆 x1\n<script>window.__ordersXss=true</script>',
            total: '<img src=x onerror="window.__ordersXss=true">',
            paymentMethod: "transfer",
            paymentStatus: '<img src=x onerror="window.__ordersXss=true">',
            shippingProvider: '<img src=x onerror="window.__ordersXss=true">',
            trackingNumber: 'TRK"><img src=x onerror="window.__ordersXss=true">',
            receiptInfo: {
              taxId: "12345678",
              buyer: '<img src=x onerror="window.__ordersXss=true">',
              address: '<script>window.__ordersXss=true</script>',
              needDateStamp: true,
            },
          },
        ],
      });
    });

    await page.addInitScript(() => {
      (window as any).__ordersXss = false;
    });
    await installStorefrontUser(page);

    await gotoStorefront(page);
    await page.getByRole("button", { name: "我的訂單" }).click();

    await expect(page.locator("#my-orders-modal")).toBeVisible();
    await expect(page.locator("#my-orders-list")).toContainText("<script>");
    await expect(page.locator("#my-orders-list img")).toHaveCount(0);
    await expect(page.locator("#my-orders-list script")).toHaveCount(0);
    await expect.poll(() =>
      page.evaluate(() => (window as any).__ordersXss)
    ).toBe(false);
  });

  test("storefront profile modal matches my orders corner radius", async ({ page }) => {
    await installGlobalStubs(page);
    await installMainRoutes(page);
    await installStorefrontUser(page);

    await gotoStorefront(page);

    await page.evaluate(() => {
      (window as any).Swal.fire = async (options: any) => {
        const existing = document.querySelector(".swal2-popup");
        existing?.remove();

        const popup = document.createElement("div");
        popup.className = `swal2-popup ${options?.customClass?.popup || ""}`.trim();
        popup.textContent = String(options?.title || "");
        document.body.appendChild(popup);

        return { isConfirmed: false };
      };
    });

    await page.getByRole("button", { name: "會員資料" }).click();
    await expect(page.locator(".swal2-popup")).toBeVisible();

    const ordersRadius = await page.locator("#my-orders-modal > div").evaluate(
      (element) => getComputedStyle(element).borderRadius,
    );
    const profileRadius = await page.locator(".swal2-popup").evaluate(
      (element) => getComputedStyle(element).borderRadius,
    );

    expect(profileRadius).toBe(ordersRadius);
  });

  test("storefront user controls work without body click delegation", async ({ page }) => {
    await installGlobalStubs(page);
    await installMainRoutes(page);
    await blockStorefrontBodyClickDelegation(page);

    await page.route(`${API_URL}?action=getMyOrders**`, async (route) => {
      await fulfillJson(route, {
        success: true,
        orders: [
          {
            orderId: "MY002",
            timestamp: "2026-03-02T00:00:00.000Z",
            deliveryMethod: "home_delivery",
            status: "processing",
            lineName: "測試客戶",
            city: "新竹市",
            address: "測試路 2 號",
            items: "測試豆 x2",
            total: 440,
            paymentMethod: "cod",
            paymentStatus: "",
          },
        ],
      });
    });

    await page.addInitScript(() => {
      const swalCalls: string[] = [];
      (window as any).__storefrontSwalCalls = swalCalls;
      (window as any).Swal.fire = async (options: any) => {
        swalCalls.push(String(options?.title || options || ""));
        return { isConfirmed: false, value: null };
      };
    });
    await installStorefrontUser(page);

    await gotoStorefront(page);

    await expect.poll(() =>
      page.evaluate(() => (window as any).__blockedStorefrontBodyClickDelegation)
    ).toBe(0);

    await page.getByRole("button", { name: "會員資料" }).click();
    await expect.poll(() =>
      page.evaluate(() => (window as any).__storefrontSwalCalls || [])
    ).toContain("會員資料");

    await page.getByRole("button", { name: "我的訂單" }).click();
    await expect(page.locator("#my-orders-modal")).toBeVisible();
    await page.getByRole("button", { name: "關閉我的訂單" }).click();
    await expect(page.locator("#my-orders-modal")).toBeHidden();

    await page.getByRole("button", { name: "登出" }).click();
    await expect(page.locator("#login-prompt")).toBeVisible();
    await expect(page.locator("#user-info")).toHaveCount(0);
  });
});
