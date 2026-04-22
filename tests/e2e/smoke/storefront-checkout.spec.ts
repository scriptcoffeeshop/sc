import { expect, test } from "@playwright/test";
import {
  API_URL,
  fulfillJson,
  installGlobalStubs,
  installMainRoutes,
} from "../support/smoke-fixtures";

test.describe("smoke / storefront checkout", () => {
  test("storefront submit order happy path works", async ({ page }) => {
    await installGlobalStubs(page);
    await installMainRoutes(page);

    let submitOrderCalls = 0;
    let submitBody: any = null;
    await page.route(`${API_URL}?action=submitOrder**`, async (route) => {
      submitOrderCalls += 1;
      submitBody = route.request().postDataJSON();
      await fulfillJson(route, {
        success: true,
        orderId: "SO001",
        total: 220,
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem(
        "coffee_user",
        JSON.stringify({
          userId: "user-1",
          displayName: "測試客戶",
          pictureUrl: "",
        }),
      );
      localStorage.setItem("coffee_jwt", "mock-token");
    });

    await page.goto("/main.html");

    let quoteResBody: any = null;
    page.on("response", async (res) => {
      if (res.url().includes("action=quoteOrder")) {
        try {
          quoteResBody = await res.json();
        } catch {
          // ignore parsing error for preflight
        }
      }
    });

    await expect(page.locator("#products-container")).toContainText("測試豆");

    await page.locator('.delivery-option[data-id="delivery"]').click();
    await page.selectOption("#delivery-city", "新竹市");
    await page.fill("#delivery-detail-address", "測試路 1 號");

    await page.locator("#products-container .spec-btn-add").first().click();
    await expect.poll(() =>
      page.evaluate(() => {
        try {
          const raw = localStorage.getItem("coffee_cart");
          const parsed = raw ? JSON.parse(raw) : [];
          return Array.isArray(parsed) ? parsed.length : 0;
        } catch {
          return 0;
        }
      })
    ).toBeGreaterThan(0);
    await page.check("#policy-agree");
    await page.locator('.bottom-bar button:has-text("購物車")').click();
    await expect(page.locator("#cart-drawer")).toBeVisible();

    await page.locator("#cart-submit-btn").click();

    await expect.poll(() => submitOrderCalls).toBe(1);
    expect(submitBody).toBeTruthy();
    expect(submitBody.deliveryMethod).toBe("delivery");
    expect(submitBody.city).toBe("新竹市");
    expect(submitBody.address).toBe("測試路 1 號");
    expect(Array.isArray(submitBody.items)).toBeTruthy();
    expect(submitBody.items.length).toBeGreaterThan(0);

    // 驗證 quoteOrder 回傳結構
    expect(quoteResBody).toBeTruthy();
    expect(quoteResBody.success).toBe(true);
    expect(quoteResBody.quote).toBeDefined();
    expect(quoteResBody.quote.deliveryMethod).toBe("delivery");
    expect(typeof quoteResBody.quote.total).toBe("number");
    expect(Array.isArray(quoteResBody.quote.items)).toBe(true);

    await expect(page.locator("#cart-items")).toContainText("購物車是空的");
  });

  test("storefront submit order transfer path works", async ({ page }) => {
    await installGlobalStubs(page);
    await installMainRoutes(page, {
      payment: { cod: true, linepay: false, transfer: true },
    });

    let submitOrderCalls = 0;
    let submitBody: any = null;
    await page.route(`${API_URL}?action=submitOrder**`, async (route) => {
      submitOrderCalls += 1;
      submitBody = route.request().postDataJSON();
      await fulfillJson(route, {
        success: true,
        orderId: "SO-TRANSFER-1",
        total: 220,
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem(
        "coffee_user",
        JSON.stringify({
          userId: "user-1",
          displayName: "測試客戶",
          pictureUrl: "",
        }),
      );
      localStorage.setItem("coffee_jwt", "mock-token");
    });

    await page.goto("/main.html");

    await page.locator('.delivery-option[data-id="delivery"]').click();
    await page.selectOption("#delivery-city", "新竹市");
    await page.fill("#delivery-detail-address", "測試路 2 號");

    await page.locator("#products-container .spec-btn-add").first().click();
    await expect.poll(() =>
      page.evaluate(() => {
        try {
          const raw = localStorage.getItem("coffee_cart");
          const parsed = raw ? JSON.parse(raw) : [];
          return Array.isArray(parsed) ? parsed.length : 0;
        } catch {
          return 0;
        }
      })
    ).toBeGreaterThan(0);
    await page.locator("#transfer-option").click();
    await expect(page.locator("#transfer-info-section")).toBeVisible();
    await page.locator(
      '#bank-accounts-list input[name="bank_account_selection"]',
    ).nth(1).click();
    await page.fill("#transfer-last5", "12345");
    await page.check("#policy-agree");

    await page.locator('.bottom-bar button:has-text("購物車")').click();
    await page.locator("#cart-submit-btn").click();

    await expect.poll(() => submitOrderCalls).toBe(1);
    expect(submitBody).toBeTruthy();
    expect(submitBody.paymentMethod).toBe("transfer");
    expect(submitBody.transferAccountLast5).toBe("12345");
    expect(String(submitBody.transferTargetAccount || "")).toContain(
      "444455556666",
    );
    await expect(page.locator("#cart-items")).toContainText("購物車是空的");
  });

  test("storefront submit order linepay redirect path works", async ({ page }) => {
    await installGlobalStubs(page);
    await installMainRoutes(page, {
      payment: { cod: true, linepay: true, transfer: false },
    });

    let submitOrderCalls = 0;
    let submitBody: any = null;
    await page.route(`${API_URL}?action=submitOrder**`, async (route) => {
      submitOrderCalls += 1;
      submitBody = route.request().postDataJSON();
      await fulfillJson(route, {
        success: true,
        orderId: "SO-LINEPAY-1",
        total: 220,
        paymentUrl: "/main.html?linepay_redirect=1",
      });
    });

    await page.addInitScript(() => {
      const swalCalls: Array<Record<string, unknown>> = [];
      const persistSwalCalls = () => {
        localStorage.setItem(
          "__storefrontSwalCalls",
          JSON.stringify(swalCalls),
        );
      };
      (window as any).__storefrontSwalCalls = swalCalls;
      (window as any).Swal.fire = async (input: any) => {
        const payload = typeof input === "string"
          ? { title: input }
          : input || {};
        swalCalls.push(payload);
        persistSwalCalls();
        return { isConfirmed: true };
      };
      localStorage.setItem(
        "coffee_user",
        JSON.stringify({
          userId: "user-1",
          displayName: "測試客戶",
          pictureUrl: "",
        }),
      );
      localStorage.setItem("coffee_jwt", "mock-token");
    });

    await page.goto("/main.html");

    await page.locator('.delivery-option[data-id="delivery"]').click();
    await page.selectOption("#delivery-city", "新竹市");
    await page.fill("#delivery-detail-address", "測試路 3 號");
    await page.locator("#products-container .spec-btn-add").first().click();
    await expect.poll(() =>
      page.evaluate(() => {
        try {
          const raw = localStorage.getItem("coffee_cart");
          const parsed = raw ? JSON.parse(raw) : [];
          return Array.isArray(parsed) ? parsed.length : 0;
        } catch {
          return 0;
        }
      })
    ).toBeGreaterThan(0);

    await page.locator("#linepay-option").click();
    await expect(page.locator("#transfer-info-section")).toBeHidden();
    await page.check("#policy-agree");

    await page.locator('.bottom-bar button:has-text("購物車")').click();
    await page.locator("#cart-submit-btn").click();

    await expect.poll(() => submitOrderCalls).toBe(1);
    expect(submitBody).toBeTruthy();
    expect(submitBody.paymentMethod).toBe("linepay");
    await expect(page).toHaveURL(/linepay_redirect=1/);

    const promptSummary = await page.evaluate(() => {
      const calls = JSON.parse(
        localStorage.getItem("__storefrontSwalCalls") || "[]",
      );
      const match = calls.find((item: any) =>
        String(item?.title || "").includes("LINE Pay")
      ) || {};
      return {
        title: String(match.title || ""),
        html: String(match.html || ""),
      };
    });

    expect(promptSummary.title).toContain("LINE Pay");
    expect(promptSummary.html).toContain(
      "請儘快完成 LINE Pay；若稍後付款，可到「我的訂單」重新打開付款連結。",
    );
    expect(promptSummary.html).not.toContain("若您稍後再付款");
    expect(promptSummary.html.match(/我的訂單/g)?.length ?? 0).toBe(1);
  });

  test("storefront submit order jkopay prompt shows deadline and next steps", async ({ page }) => {
    await installGlobalStubs(page);
    await installMainRoutes(page, {
      payment: { cod: true, linepay: false, jkopay: true, transfer: false },
    });

    let submitOrderCalls = 0;
    await page.route(`${API_URL}?action=submitOrder**`, async (route) => {
      submitOrderCalls += 1;
      await fulfillJson(route, {
        success: true,
        orderId: "SO-JKOPAY-1",
        total: 220,
        paymentUrl: "/main.html?jkopay_redirect=1",
        paymentExpiresAt: "2026-04-21T12:34:00.000Z",
      });
    });

    await page.addInitScript(() => {
      const swalCalls: Array<Record<string, unknown>> = [];
      (window as any).__storefrontSwalCalls = swalCalls;
      (window as any).Swal.fire = async (input: any) => {
        const payload = typeof input === "string" ? { title: input } : input || {};
        swalCalls.push(payload);
        if (String(payload.title || "").includes("確認訂單")) {
          return { isConfirmed: true };
        }
        return { isConfirmed: false };
      };

      localStorage.setItem(
        "coffee_user",
        JSON.stringify({
          userId: "user-1",
          displayName: "測試客戶",
          pictureUrl: "",
        }),
      );
      localStorage.setItem("coffee_jwt", "mock-token");
    });

    await page.goto("/main.html");

    await page.locator('.delivery-option[data-id="delivery"]').click();
    await page.selectOption("#delivery-city", "新竹市");
    await page.fill("#delivery-detail-address", "測試路 8 號");
    await page.locator("#products-container .spec-btn-add").first().click();
    await page.locator("#jkopay-option").click();
    await page.check("#policy-agree");

    await page.locator('.bottom-bar button:has-text("購物車")').click();
    await page.locator("#cart-submit-btn").click();

    await expect.poll(() => submitOrderCalls).toBe(1);

    await expect.poll(async () => {
      return await page.evaluate(() => {
        const calls = (window as any).__storefrontSwalCalls || [];
        return Boolean(calls.find((item: any) =>
          String(item?.title || "").includes("街口支付")
        ));
      });
    }).toBe(true);

    const promptSummary = await page.evaluate(() => {
      const calls = (window as any).__storefrontSwalCalls || [];
      const match = calls.find((item: any) =>
        String(item?.title || "").includes("街口支付")
      ) || {};
      return {
        title: String(match.title || ""),
        html: String(match.html || ""),
        text: String(match.text || ""),
      };
    });

    expect(promptSummary.title).toContain("街口支付");
    expect(promptSummary.html).toContain("付款期限");
    expect(promptSummary.html).toContain("待付款");
    expect(promptSummary.html).toContain(
      "請儘快完成街口支付；若稍後付款，可到「我的訂單」重新打開付款連結。",
    );
    expect(promptSummary.html).not.toContain("若您稍後再付款");
    expect(promptSummary.html.match(/我的訂單/g)?.length ?? 0).toBe(1);
    expect(promptSummary.html).toContain("SO-JKOPAY-1");
    await expect(page).not.toHaveURL(/jkopay_redirect=1/);
  });

  test("storefront my orders shows online pay resume links without jkopay refresh action", async ({ page }) => {
    await installGlobalStubs(page);
    await installMainRoutes(page, {
      payment: { cod: true, linepay: false, jkopay: true, transfer: false },
    });

    let ordersState = [
      {
        orderId: "LINEPAY-PENDING-1",
        timestamp: "2026-04-21T02:00:00.000Z",
        deliveryMethod: "delivery",
        status: "pending",
        city: "新竹市",
        address: "測試路 5 號",
        items: "LINE Pay 測試豆 x1",
        total: 220,
        paymentMethod: "linepay",
        paymentStatus: "pending",
        paymentUrl: "https://pay.example/linepay/LINEPAY-PENDING-1",
      },
      {
        orderId: "JKO-PENDING-1",
        timestamp: "2026-04-21T01:00:00.000Z",
        deliveryMethod: "delivery",
        status: "pending",
        city: "新竹市",
        address: "測試路 1 號",
        items: "街口測試豆 x1",
        total: 220,
        paymentMethod: "jkopay",
        paymentStatus: "pending",
        paymentExpiresAt: "2026-04-21T12:34:00.000Z",
        paymentLastCheckedAt: "2026-04-21T01:10:00.000Z",
        paymentUrl: "https://pay.example/jko/JKO-PENDING-1",
      },
      {
        orderId: "JKO-FAILED-1",
        timestamp: "2026-04-20T01:00:00.000Z",
        deliveryMethod: "delivery",
        status: "pending",
        city: "新竹市",
        address: "測試路 2 號",
        items: "街口測試豆 x1",
        total: 220,
        paymentMethod: "jkopay",
        paymentStatus: "failed",
      },
      {
        orderId: "JKO-CANCELLED-1",
        timestamp: "2026-04-19T01:00:00.000Z",
        deliveryMethod: "delivery",
        status: "pending",
        city: "新竹市",
        address: "測試路 3 號",
        items: "街口測試豆 x1",
        total: 220,
        paymentMethod: "jkopay",
        paymentStatus: "cancelled",
      },
      {
        orderId: "JKO-EXPIRED-1",
        timestamp: "2026-04-18T01:00:00.000Z",
        deliveryMethod: "delivery",
        status: "pending",
        city: "新竹市",
        address: "測試路 4 號",
        items: "街口測試豆 x1",
        total: 220,
        paymentMethod: "jkopay",
        paymentStatus: "expired",
        paymentExpiresAt: "2026-04-18T12:34:00.000Z",
      },
    ];

    await page.route(`${API_URL}?action=getMyOrders**`, async (route) => {
      await fulfillJson(route, {
        success: true,
        orders: ordersState,
      });
    });

    await page.addInitScript(() => {
      localStorage.setItem(
        "coffee_user",
        JSON.stringify({
          userId: "user-1",
          displayName: "測試客戶",
          pictureUrl: "",
        }),
      );
      localStorage.setItem("coffee_jwt", "mock-token");
    });

    await page.goto("/main.html");
    await page.getByRole("button", { name: "我的訂單" }).click();

    const ordersList = page.locator("#my-orders-list");
    await expect(ordersList).toContainText("付款方式：LINE Pay");
    await expect(ordersList).toContainText("LINE Pay 待付款");
    await expect(ordersList).toContainText(
      "這筆訂單尚未完成 LINE Pay，請點下方「前往 LINE Pay 付款」繼續；付款後狀態會自動同步。",
    );
    await expect(ordersList).not.toContainText(
      "請儘快完成 LINE Pay；若稍後付款，可到「我的訂單」重新打開付款連結。",
    );
    await expect(
      page.getByRole("link", { name: "前往 LINE Pay 付款" }),
    ).toHaveAttribute("href", "https://pay.example/linepay/LINEPAY-PENDING-1");
    await expect(ordersList).toContainText("付款方式：街口支付");
    await expect(ordersList).toContainText("付款期限");
    await expect(ordersList).toContainText(
      "這筆訂單尚未完成街口支付，請點下方「前往街口付款」繼續；付款後狀態會自動同步。",
    );
    await expect(ordersList).not.toContainText(
      "請儘快完成街口支付；若稍後付款，可到「我的訂單」重新打開付款連結。",
    );
    await expect(ordersList).toContainText("街口支付付款失敗");
    await expect(ordersList).toContainText("您已取消街口支付付款流程");
    await expect(ordersList).toContainText("付款期限已過");
    await expect(
      page.getByRole("link", { name: "前往街口付款" }),
    ).toHaveAttribute("href", "https://pay.example/jko/JKO-PENDING-1");
    await expect(
      page.getByRole("button", { name: "重新整理街口付款狀態" }),
    ).toHaveCount(0);
    await expect(page.getByRole("link", { name: "前往 LINE Pay 付款" }))
      .toHaveCount(1);
  });
});
