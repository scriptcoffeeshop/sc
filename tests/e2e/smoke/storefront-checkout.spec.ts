import { expect, test } from "@playwright/test";
import {
  API_URL,
  fulfillJson,
  installGlobalStubs,
  installMainRoutes,
} from "../support/smoke-fixtures";
import {
  expectCartHasItems,
  gotoStorefrontReady,
  installStorefrontUser,
} from "../support/storefront-smoke";

type SubmitOrderBody = {
  address?: string;
  city?: string;
  companyOrBuilding?: string;
  deliveryMethod?: string;
  district?: string;
  items?: unknown[];
  paymentMethod?: string;
  transferAccountLast5?: string;
  transferTargetAccount?: string;
};

type QuoteResponseBody = {
  success?: boolean;
  quote?: {
    deliveryMethod?: string;
    items?: unknown[];
    total?: unknown;
  };
};

test.describe("smoke / storefront checkout", () => {
  test("storefront submit order happy path works", async ({ page }) => {
    await installGlobalStubs(page);
    await installMainRoutes(page);

    let submitOrderCalls = 0;
    let submitBody: SubmitOrderBody | null = null;
    await page.route(`${API_URL}?action=submitOrder**`, async (route) => {
      submitOrderCalls += 1;
      submitBody = route.request().postDataJSON() as SubmitOrderBody;
      await fulfillJson(route, {
        success: true,
        orderId: "SO001",
        total: 220,
      });
    });

    await installStorefrontUser(page);
    await gotoStorefrontReady(page);

    let quoteResBody: QuoteResponseBody | null = null;
    page.on("response", async (res) => {
      if (res.url().includes("action=quoteOrder")) {
        try {
          quoteResBody = await res.json() as QuoteResponseBody;
        } catch (_error) {
          // ignore parsing error for preflight
        }
      }
    });

    await expect(page.locator("#products-container")).toContainText("測試豆");

    await page.locator('.delivery-option[data-id="delivery"]').click();
    await page.selectOption("#delivery-city", "新竹市");
    await page.selectOption("#delivery-district", "東區");
    await page.fill("#delivery-detail-address", "測試路 1 號");
    await expect(page.locator("#delivery-company-or-building")).toBeVisible();
    await page.fill("#delivery-company-or-building", "幸福社區 A 棟");

    await page.locator("#products-container .spec-btn-add").first().click();
    await expectCartHasItems(page);
    await page.check("#policy-agree");
    await page.locator('.bottom-bar button:has-text("購物車")').click();
    await expect(page.locator("#cart-drawer")).toBeVisible();

    await page.locator("#cart-submit-btn").click();

    await expect.poll(() => submitOrderCalls).toBe(1);
    expect(submitBody).toBeTruthy();
    expect(submitBody?.deliveryMethod).toBe("delivery");
    expect(submitBody?.city).toBe("新竹市");
    expect(submitBody?.district).toBe("東區");
    expect(submitBody?.address).toBe(
      "測試路 1 號（公司行號/社區大樓：幸福社區 A 棟）",
    );
    expect(submitBody?.companyOrBuilding).toBe("幸福社區 A 棟");
    expect(Array.isArray(submitBody?.items)).toBeTruthy();
    expect(submitBody?.items?.length ?? 0).toBeGreaterThan(0);

    expect(quoteResBody).toBeTruthy();
    expect(quoteResBody?.success).toBe(true);
    expect(quoteResBody?.quote).toBeDefined();
    expect(quoteResBody?.quote?.deliveryMethod).toBe("delivery");
    expect(typeof quoteResBody?.quote?.total).toBe("number");
    expect(Array.isArray(quoteResBody?.quote?.items)).toBe(true);

    await expect(page.locator("#cart-items")).toContainText("購物車是空的");
  });

  test("storefront submit order transfer path works", async ({ page }) => {
    await installGlobalStubs(page);
    await installMainRoutes(page, {
      payment: { cod: true, linepay: false, transfer: true },
    });

    let submitOrderCalls = 0;
    let submitBody: SubmitOrderBody | null = null;
    await page.route(`${API_URL}?action=submitOrder**`, async (route) => {
      submitOrderCalls += 1;
      submitBody = route.request().postDataJSON() as SubmitOrderBody;
      await fulfillJson(route, {
        success: true,
        orderId: "SO-TRANSFER-1",
        total: 220,
      });
    });

    await installStorefrontUser(page);
    await gotoStorefrontReady(page);

    await page.locator('.delivery-option[data-id="delivery"]').click();
    await page.selectOption("#delivery-city", "新竹市");
    await page.selectOption("#delivery-district", "東區");
    await page.fill("#delivery-detail-address", "測試路 2 號");

    await page.locator("#products-container .spec-btn-add").first().click();
    await expectCartHasItems(page);
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
    expect(submitBody?.paymentMethod).toBe("transfer");
    expect(submitBody?.transferAccountLast5).toBe("12345");
    expect(String(submitBody?.transferTargetAccount || "")).toContain(
      "444455556666",
    );
    await expect(page.locator("#cart-items")).toContainText("購物車是空的");
  });
});
