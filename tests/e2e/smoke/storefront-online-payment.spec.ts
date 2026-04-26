import { expect, test } from "@playwright/test";
import {
  API_URL,
  fulfillJson,
  installGlobalStubs,
  installMainRoutes,
} from "../support/smoke-fixtures";
import {
  expectCartHasItems,
  getStorefrontSwalCall,
  gotoStorefrontReady,
  hasStorefrontSwalCall,
  installStorefrontSwalRecorder,
  installStorefrontUser,
} from "../support/storefront-smoke";

type SubmitOrderBody = {
  paymentMethod?: string;
};

test.describe("smoke / storefront online payments", () => {
  test("storefront submit order linepay redirect path works", async ({ page }) => {
    await installGlobalStubs(page);
    await installMainRoutes(page, {
      payment: { cod: true, linepay: true, transfer: false },
    });

    let submitOrderCalls = 0;
    let submitBody: SubmitOrderBody | null = null;
    await page.route(`${API_URL}?action=submitOrder**`, async (route) => {
      submitOrderCalls += 1;
      submitBody = route.request().postDataJSON() as SubmitOrderBody;
      await fulfillJson(route, {
        success: true,
        orderId: "SO-LINEPAY-1",
        total: 220,
        paymentUrl: "/main.html?linepay_redirect=1",
      });
    });

    await installStorefrontSwalRecorder(page);
    await installStorefrontUser(page);
    await gotoStorefrontReady(page);

    await page.locator('.delivery-option[data-id="delivery"]').click();
    await page.selectOption("#delivery-city", "新竹市");
    await page.selectOption("#delivery-district", "東區");
    await page.fill("#delivery-detail-address", "測試路 3 號");
    await page.locator("#products-container .spec-btn-add").first().click();
    await expectCartHasItems(page);

    await page.locator("#linepay-option").click();
    await expect(page.locator("#transfer-info-section")).toBeHidden();
    await page.check("#policy-agree");

    await page.locator('.bottom-bar button:has-text("購物車")').click();
    await page.locator("#cart-submit-btn").click();

    await expect.poll(() => submitOrderCalls).toBe(1);
    expect(submitBody).toBeTruthy();
    expect(submitBody?.paymentMethod).toBe("linepay");
    await expect(page).toHaveURL(/linepay_redirect=1/);

    const promptSummary = await getStorefrontSwalCall(page, "LINE Pay");

    expect(promptSummary?.title).toContain("LINE Pay");
    expect(promptSummary?.html).toContain(
      "請儘快完成 LINE Pay；若稍後付款，可到「我的訂單」重新打開付款連結。",
    );
    expect(promptSummary?.html).not.toContain("若您稍後再付款");
    expect(promptSummary?.html.match(/我的訂單/g)?.length ?? 0).toBe(1);
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

    await installStorefrontSwalRecorder(page, {
      confirmTitleIncludes: ["確認訂單"],
    });
    await installStorefrontUser(page);
    await gotoStorefrontReady(page);

    await page.locator('.delivery-option[data-id="delivery"]').click();
    await page.selectOption("#delivery-city", "新竹市");
    await page.selectOption("#delivery-district", "東區");
    await page.fill("#delivery-detail-address", "測試路 8 號");
    await page.locator("#products-container .spec-btn-add").first().click();
    await page.locator("#jkopay-option").click();
    await page.check("#policy-agree");

    await page.locator('.bottom-bar button:has-text("購物車")').click();
    await page.locator("#cart-submit-btn").click();

    await expect.poll(() => submitOrderCalls).toBe(1);

    await expect.poll(() => hasStorefrontSwalCall(page, "街口支付"))
      .toBe(true);

    const promptSummary = await getStorefrontSwalCall(page, "街口支付");

    expect(promptSummary?.title).toContain("街口支付");
    expect(promptSummary?.html).toContain("付款期限");
    expect(promptSummary?.html).toContain("待付款");
    expect(promptSummary?.html).toContain(
      "請儘快完成街口支付；若稍後付款，可到「我的訂單」重新打開付款連結。",
    );
    expect(promptSummary?.html).not.toContain("若您稍後再付款");
    expect(promptSummary?.html.match(/我的訂單/g)?.length ?? 0).toBe(1);
    expect(promptSummary?.html).toContain("SO-JKOPAY-1");
    await expect(page).not.toHaveURL(/jkopay_redirect=1/);
  });

  test("storefront my orders shows online pay resume links without jkopay refresh action", async ({ page }) => {
    await installGlobalStubs(page);
    await installMainRoutes(page, {
      payment: { cod: true, linepay: false, jkopay: true, transfer: false },
    });

    const ordersState = [
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

    await installStorefrontUser(page);
    await gotoStorefrontReady(page);
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
