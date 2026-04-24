import { expect, test } from "@playwright/test";
import {
  API_URL,
  blockStorefrontBodyClickDelegation,
  expectColorsClose,
  fulfillJson,
  installGlobalStubs,
  installMainRoutes,
} from "../support/smoke-fixtures";

test.describe("smoke / storefront", () => {
  test("storefront note textarea stays empty and keeps legacy warm palette", async ({ page }) => {
    await installGlobalStubs(page);
    await installMainRoutes(page);

    await page.goto("/main.html");

    await expect(page.locator("#login-section")).toHaveCSS(
      "background-color",
      "rgb(240, 250, 240)",
    );
    await expect(page.locator("#notes-section-title")).toHaveCSS(
      "color",
      "rgb(60, 36, 21)",
    );
    await expect(page.locator("#order-note")).toHaveValue("");
    await expect(page.locator("#order-note")).toHaveCSS(
      "border-top-color",
      "rgb(229, 221, 213)",
    );
  });

  test("storefront LINE login callback uses POST", async ({ page }) => {
    await installGlobalStubs(page);

    let loginRequest:
      | { method: string; url: string; body: Record<string, unknown> }
      | null = null;
    await installMainRoutes(page, {
      onCustomerLineLogin: (request) => {
        loginRequest = {
          method: request.method(),
          url: request.url(),
          body: request.postDataJSON() as Record<string, unknown>,
        };
      },
    });

    await page.addInitScript(() => {
      localStorage.setItem("coffee_line_state", "customer-state");
    });

    await page.goto("/main.html?code=customer-code&state=customer-state");

    await expect.poll(() => loginRequest?.method).toBe("POST");
    expect(new URL(loginRequest!.url).searchParams.get("code")).toBeNull();
    expect(loginRequest!.body).toMatchObject({
      code: "customer-code",
      redirectUri: expect.stringContaining("/main.html"),
    });
    await expect.poll(() =>
      page.evaluate(() => localStorage.getItem("coffee_jwt"))
    ).toBe("mock-customer-token");
  });

  test("storefront desktop login prompt keeps stacked content-card proportion", async ({ page }) => {
    await installGlobalStubs(page);
    await installMainRoutes(page);
    await page.setViewportSize({ width: 1728, height: 960 });

    await page.goto("/main.html");

    const metrics = await page.evaluate(() => {
      const loginSection = document.getElementById("login-section");
      const prompt = document.getElementById("login-prompt");
      const mainCard = document.querySelector(".ui-card");
      if (!loginSection || !prompt || !mainCard) return null;
      const loginRect = loginSection.getBoundingClientRect();
      const cardRect = mainCard.getBoundingClientRect();
      const promptStyles = getComputedStyle(prompt);
      return {
        widthDelta: Math.abs(loginRect.width - cardRect.width),
        promptDisplay: promptStyles.display,
        promptFlexDirection: promptStyles.flexDirection,
        promptAlignItems: promptStyles.alignItems,
      };
    });

    expect(metrics).toBeTruthy();
    expect(metrics?.widthDelta ?? 999).toBeLessThan(48);
    expect(metrics?.promptDisplay).toBe("flex");
    expect(metrics?.promptFlexDirection).toBe("column");
    expect(metrics?.promptAlignItems).toBe("center");
  });

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

    await page.goto("/main.html");

    const description = page.locator(
      '.delivery-option[data-id="home_delivery"] .delivery-option-description',
    );
    await expect(description).toContainText("宅配到府\n折扣後滿$550免運");
    await expect(description).toHaveCSS("white-space", "pre-line");
  });

  test("storefront delivery actions are module-scoped instead of global", async ({ page }) => {
    await installGlobalStubs(page);
    await installMainRoutes(page);

    await page.goto("/main.html");

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

  test("storefront action icons use vector sizing and currentColor", async ({ page }) => {
    await installGlobalStubs(page);
    await installMainRoutes(page);

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

    const ordersButton = page.getByRole("button", { name: "我的訂單" });
    const profileButton = page.getByRole("button", { name: "會員資料" });
    const cartButton = page.locator('.bottom-bar > div:last-child > div button[type="button"]').first();

    const ordersIcon = ordersButton.locator("svg").first();
    const profileIcon = profileButton.locator("svg").first();
    const cartIcon = cartButton.locator("svg").first();

    await expect(ordersIcon).toBeVisible();
    await expect(profileIcon).toBeVisible();
    await expect(cartIcon).toBeVisible();

    await expect(ordersIcon).toHaveCSS("width", "20px");
    await expect(profileIcon).toHaveCSS("width", "20px");
    await expect(cartIcon).toHaveCSS("width", "20px");

    const ordersButtonColor = await ordersButton.evaluate((element) =>
      getComputedStyle(element).color
    );
    const ordersIconColor = await ordersIcon.evaluate((element) =>
      getComputedStyle(element).color
    );
    const cartButtonColor = await cartButton.evaluate((element) =>
      getComputedStyle(element).color
    );
    const cartIconColor = await cartIcon.evaluate((element) =>
      getComputedStyle(element).color
    );

    expectColorsClose(ordersIconColor, ordersButtonColor);
    expectColorsClose(cartIconColor, cartButtonColor);
  });

  test("storefront payment controls work without body click delegation", async ({ page }) => {
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

    await page.goto("/main.html");

    await expect.poll(() =>
      page.evaluate(() => (window as any).__blockedStorefrontBodyClickDelegation)
    ).toBe(0);

    await expect(page.locator("#products-container")).toContainText("測試豆");
    await page.locator('.delivery-option[data-id="seven_eleven"]').click();
    await expect(page.locator("#store-pickup-section")).toBeVisible();
    await page.locator('.delivery-option[data-id="delivery"]').click();
    await expect(page.locator("#delivery-address-section")).toBeVisible();

    await page.evaluate(() => {
      const banner = document.getElementById("announcement-banner");
      const text = document.getElementById("announcement-text");
      if (text) text.textContent = "測試公告";
      banner?.classList.remove("hidden");
    });
    await page.getByRole("button", { name: "關閉公告" }).click();
    await expect(page.locator("#announcement-banner")).toHaveClass(/hidden/);

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

    // 直接點 radio 應同步切換藍框與選取狀態
    await accountRadios.nth(1).click();
    await expect(accountCards.nth(1)).toHaveClass(/ring-2/);
    await expect(accountCards.nth(0)).not.toHaveClass(/ring-2/);
    await expect(accountRadios.nth(1)).toBeChecked();

    // 複製按鈕不可改變目前選取
    await page.locator(
      '#bank-accounts-list [data-copy-account="true"]',
    ).nth(1).click();
    await expect(accountCards.nth(1)).toHaveClass(/ring-2/);
    await expect(accountRadios.nth(1)).toBeChecked();

    // 切換付款方式再切回轉帳，帳號選取需保留（避免藍框/選取狀態回歸）
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

    await page.goto("/main.html");

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
    await expect(page.locator("#user-info")).toHaveClass(/hidden/);
  });
});
