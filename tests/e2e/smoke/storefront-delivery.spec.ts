import { expect, test } from "@playwright/test";
import {
  API_URL,
  blockStorefrontBodyClickDelegation,
  fulfillJson,
  installGlobalStubs,
  installMainRoutes,
} from "../support/smoke-fixtures";
import { gotoStorefront, installStorefrontUser } from "../support/storefront-smoke";

test.describe("smoke / storefront delivery and payment", () => {
  test("storefront delivery option descriptions preserve backend line breaks", async ({ page }) => {
    await installGlobalStubs(page);
    await installMainRoutes(page, {
      deliveryOptions: [
        {
          id: "home_delivery",
          name: "全台宅配",
          description: "宅配到府\n折扣後滿$550免運",
          enabled: true,
          payment: { cod: true, linepay: false, transfer: true },
        },
      ],
    });

    await gotoStorefront(page);

    const description = page.locator(
      '.delivery-option[data-id="home_delivery"] .delivery-option-description',
    );
    await expect(description).toContainText("宅配到府\n折扣後滿$550免運");
    await expect(description).toHaveCSS("white-space", "pre-line");
  });

  test("storefront delivery actions are module-scoped instead of global", async ({ page }) => {
    await installGlobalStubs(page);
    await installMainRoutes(page);

    await gotoStorefront(page);

    await expect.poll(() =>
      page.evaluate(() => ({
        renderDeliveryOptions: typeof (window as any).renderDeliveryOptions,
        selectDelivery: typeof (window as any).selectDelivery,
      }))
    ).toEqual({
      renderDeliveryOptions: "undefined",
      selectDelivery: "undefined",
    });
    await expect(page.locator('.delivery-option[data-id="delivery"]')).toBeVisible();
  });

  test("storefront dynamic fields follow delivery visibility without legacy renderer", async ({ page }) => {
    await installGlobalStubs(page);
    await installMainRoutes(page, {
      deliveryOptions: [
        {
          id: "delivery",
          name: "配送到府",
          description: "新竹配送",
          enabled: true,
          payment: { cod: true, linepay: false, transfer: true },
        },
        {
          id: "seven_eleven",
          name: "7-11 取件",
          description: "超商門市",
          enabled: true,
          payment: { cod: true, linepay: false, transfer: false },
        },
      ],
      formFields: [
        {
          field_key: "door_note",
          label: "宅配備註",
          field_type: "text",
          enabled: true,
          delivery_visibility: JSON.stringify({ seven_eleven: false }),
        },
        {
          field_key: "store_note",
          label: "超商備註",
          field_type: "text",
          enabled: true,
          delivery_visibility: JSON.stringify({ delivery: false }),
        },
      ],
    });

    await gotoStorefront(page);

    await expect(page.locator("#dynamic-fields-container")).toContainText("宅配備註");
    await expect(page.locator("#dynamic-fields-container")).not.toContainText("超商備註");

    await page.locator('.delivery-option[data-id="seven_eleven"]').click();

    await expect(page.locator("#dynamic-fields-container")).toContainText("超商備註");
    await expect(page.locator("#dynamic-fields-container")).not.toContainText("宅配備註");
  });

  test("storefront payment controls work without body click delegation", async ({ page }) => {
    await installGlobalStubs(page);
    await installMainRoutes(page, {
      settings: {
        announcement_enabled: "true",
        announcement: "測試公告",
      },
      deliveryOptions: [
        {
          id: "delivery",
          name: "配送到府",
          description: "新竹配送",
          enabled: true,
          payment: { cod: true, linepay: false, transfer: true },
        },
        {
          id: "seven_eleven",
          name: "7-11 取件",
          description: "超商門市",
          enabled: true,
          payment: { cod: true, linepay: false, transfer: false },
        },
      ],
    });
    await blockStorefrontBodyClickDelegation(page);

    await gotoStorefront(page);

    await expect.poll(() =>
      page.evaluate(() => (window as any).__blockedStorefrontBodyClickDelegation)
    ).toBe(0);

    await expect(page.locator("#products-container")).toContainText("測試豆");
    await page.locator('.delivery-option[data-id="seven_eleven"]').click();
    await expect(page.locator("#store-pickup-section")).toBeVisible();
    await page.locator('.delivery-option[data-id="delivery"]').click();
    await expect(page.locator("#delivery-address-section")).toBeVisible();

    await expect(page.locator("#announcement-banner")).toContainText("測試公告");
    await page.getByRole("button", { name: "關閉公告" }).click();
    await expect(page.locator("#announcement-banner")).toHaveCount(0);

    await page.selectOption("#delivery-city", "新竹市");
    await expect(page.locator("#delivery-district option")).toHaveCount(4);

    await page.locator("#transfer-option").click();
    await expect(page.locator("#transfer-info-section")).toBeVisible();

    const accountCards = page.locator(
      '#bank-accounts-list [data-bank-card="true"]',
    );
    const accountRadios = page.locator(
      '#bank-accounts-list input[name="bank_account_selection"]',
    );
    await expect(accountCards).toHaveCount(2);
    await expect(accountRadios).toHaveCount(2);
    await expect(accountCards.nth(0)).toHaveClass(/ring-2/);
    await expect(accountRadios.nth(0)).toBeChecked();

    await accountRadios.nth(1).click();
    await expect(accountCards.nth(1)).toHaveClass(/ring-2/);
    await expect(accountCards.nth(0)).not.toHaveClass(/ring-2/);
    await expect(accountRadios.nth(1)).toBeChecked();

    await page.locator(
      '#bank-accounts-list [data-copy-account="true"]',
    ).nth(1).click();
    await expect(accountCards.nth(1)).toHaveClass(/ring-2/);
    await expect(accountRadios.nth(1)).toBeChecked();

    await page.locator("#cod-option").click();
    await expect(page.locator("#transfer-info-section")).toBeHidden();
    await page.locator("#transfer-option").click();
    await expect(page.locator("#transfer-info-section")).toBeVisible();
    await expect(accountCards.nth(1)).toHaveClass(/ring-2/);
    await expect(accountRadios.nth(1)).toBeChecked();
  });

  test("storefront legacy containers avoid imperative innerHTML renderers", async ({ page }) => {
    await installGlobalStubs(page);
    await installMainRoutes(page, {
      formFields: [
        {
          field_key: "company_note",
          label: "公司備註",
          field_type: "text",
          placeholder: "請輸入備註",
          required: false,
          enabled: true,
        },
      ],
    });
    await installStorefrontUser(page);

    await page.addInitScript(() => {
      const originalInnerHTML = Object.getOwnPropertyDescriptor(
        Element.prototype,
        "innerHTML",
      );
      if (originalInnerHTML?.set) {
        Object.defineProperty(Element.prototype, "innerHTML", {
          configurable: true,
          get() {
            return originalInnerHTML.get?.call(this) ?? "";
          },
          set(value) {
            const blockedIds = new Set([
              "delivery-options-list",
              "bank-accounts-list",
              "products-container",
              "dynamic-fields-container",
              "cart-items",
              "total-price",
              "cart-discount-details",
              "cart-shipping-notice",
            ]);
            if (
              this instanceof HTMLElement &&
              blockedIds.has(this.id)
            ) {
              throw new Error(`legacy renderer blocked: ${this.id}`);
            }
            return originalInnerHTML.set.call(this, value);
          },
        });
      }
    });

    await gotoStorefront(page);

    await expect(page.locator("#products-container")).toContainText("測試豆");
    await expect(page.locator("#dynamic-fields-container")).toContainText("公司備註");
    await expect(page.locator('.delivery-option[data-id="delivery"]')).toBeVisible();
    await page.locator("#transfer-option").click();
    await expect(page.locator('#bank-accounts-list [data-bank-card="true"]')).toHaveCount(2);
    await page.locator('#bank-accounts-list input[name="bank_account_selection"]').nth(1).click();
    await expect(page.locator('#bank-accounts-list [data-bank-card="true"]').nth(1)).toHaveClass(/ring-2/);
    await page.locator("#products-container .spec-btn-add").first().click();
    await page.locator('.bottom-bar button:has-text("購物車")').click();
    await expect(page.locator("#cart-items")).toContainText("測試豆");
    await expect(page.locator("#total-price")).toContainText("總金額");
  });

  test("storefront store search selection works without body click delegation", async ({ page }) => {
    await installGlobalStubs(page);
    await installMainRoutes(page, {
      deliveryOptions: [
        {
          id: "delivery",
          name: "配送到府",
          description: "新竹配送",
          enabled: true,
          payment: { cod: true, linepay: false, transfer: true },
        },
        {
          id: "seven_eleven",
          name: "7-11 取件",
          description: "超商門市",
          enabled: true,
          payment: { cod: true, linepay: false, transfer: false },
        },
      ],
    });
    await blockStorefrontBodyClickDelegation(page);

    let pcscMapRequest: { method: string; clientUrl: string } | null = null;
    await page.route(`${API_URL}?action=createPcscMapSession**`, async (route) => {
      const request = route.request();
      const body = new URLSearchParams(request.postData() || "");
      pcscMapRequest = {
        method: request.method(),
        clientUrl: body.get("clientUrl") || "",
      };
      await fulfillJson(route, {
        success: false,
        error: "地圖維護中",
      });
    });

    await page.route(`${API_URL}?action=getStoreList**`, async (route) => {
      await fulfillJson(route, {
        success: true,
        stores: [
          {
            id: "711001",
            name: "竹科門市",
            address: "新竹市東區測試路 1 號",
          },
        ],
      });
    });

    await page.addInitScript(() => {
      (window as any).Swal.close = () => {
        document.querySelector(".swal2-popup")?.remove();
      };
      (window as any).Swal.fire = async (options: any = {}) => {
        if (options?.title === "無法開啟 7-11 門市地圖") {
          return { isConfirmed: true };
        }
        if (options?.title === "搜尋門市") {
          document.querySelector(".swal2-popup")?.remove();
          const popup = document.createElement("div");
          popup.className = "swal2-popup";
          popup.innerHTML = String(options?.html || "");
          document.body.appendChild(popup);
          options?.didOpen?.(popup);
          return { isConfirmed: false };
        }
        options?.didOpen?.();
        return { isConfirmed: false };
      };
    });

    await gotoStorefront(page);

    await expect.poll(() =>
      page.evaluate(() => (window as any).__blockedStorefrontBodyClickDelegation)
    ).toBe(0);

    await page.locator('.delivery-option[data-id="seven_eleven"]').click();
    await expect(page.locator("#store-pickup-section")).toBeVisible();

    await page.getByRole("button", { name: "選擇門市" }).click();
    await page.locator("#store-search-input").fill("竹科");
    await page.locator('.store-result-item[data-store-result="true"]').click();

    expect(pcscMapRequest?.method).toBe("POST");
    expect(pcscMapRequest?.clientUrl).toContain("/main.html");
    await expect(page.locator("#store-selected-info")).toBeVisible();
    await expect(page.locator("#selected-store-name")).toHaveText("竹科門市");
    await expect(page.locator("#selected-store-id")).toContainText("711001");
  });
});
