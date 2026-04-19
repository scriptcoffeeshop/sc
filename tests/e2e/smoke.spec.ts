import {
  expect,
  type Page,
  type Request as PlaywrightRequest,
  type Route,
  test,
} from "@playwright/test";

const API_URL =
  "https://avnvsjyyeofivgmrchte.supabase.co/functions/v1/coffee-api";
const SUPABASE_REST_PREFIX =
  "https://avnvsjyyeofivgmrchte.supabase.co/rest/v1/";

function jsonHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "*",
    "content-type": "application/json",
  };
}

async function fulfillJson(route: Route, payload: unknown, status = 200) {
  await route.fulfill({
    status,
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
}

async function installGlobalStubs(page: Page) {
  // Strip SRI integrity/crossorigin attributes so Playwright route-intercepted
  // CDN scripts are not rejected by the browser's hash verification.
  await page.route("**/*.html", async (route) => {
    const response = await route.fetch();
    let body = await response.text();
    body = body.replace(/\s+integrity="[^"]*"/g, "");
    body = body.replace(/\s+crossorigin="[^"]*"/g, "");
    await route.fulfill({
      response,
      body,
      headers: { ...response.headers(), "content-type": "text/html" },
    });
  });

  // 攔截 SweetAlert2 CDN，避免真實腳本覆蓋 mock
  await page.route(
    "**/sweetalert2**",
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/javascript",
        body: "/* swal blocked */",
      }),
  );

  await page.addInitScript(() => {
    const noop = () => {};
    const clipboardWrites: string[] = [];
    (window as any).Swal = {
      fire: async () => ({ isConfirmed: true }),
      close: noop,
      showLoading: noop,
      mixin: () => ({ fire: async () => ({}) }),
    };
    (window as any).__clipboardWrites = clipboardWrites;
    const clipboardMock = {
      writeText: async (text: string) => {
        clipboardWrites.push(String(text));
      },
    };
    try {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: clipboardMock,
      });
    } catch {
      (navigator as any).clipboard = clipboardMock;
    }
  });
}

type MainRouteOptions = {
  payment?: {
    cod: boolean;
    linepay: boolean;
    transfer: boolean;
  };
  onCustomerLineLogin?: (request: PlaywrightRequest) => void;
};

async function installMainRoutes(page: Page, options: MainRouteOptions = {}) {
  const payment = options.payment ??
    { cod: true, linepay: false, transfer: true };
  await page.route(`${SUPABASE_REST_PREFIX}**`, async (route) => {
    // Force storefront fallback path (getInitData) for deterministic smoke checks.
    await route.abort();
  });

  await page.route(`${API_URL}**`, async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await fulfillJson(route, {});
      return;
    }

    const url = new URL(request.url());
    const action = url.searchParams.get("action");

    if (action === "getInitData") {
      await fulfillJson(route, {
        success: true,
        products: [
          {
            id: 101,
            category: "測試分類",
            name: "測試豆",
            description: "E2E smoke",
            price: 220,
            roastLevel: "中焙",
            specs: JSON.stringify([
              { key: "quarter", label: "1/4磅", price: 220, enabled: true },
            ]),
            enabled: true,
          },
        ],
        categories: [{ id: 1, name: "測試分類" }],
        formFields: [],
        bankAccounts: [
          {
            id: "ba-1",
            bankCode: "013",
            bankName: "國泰世華",
            accountNumber: "111122223333",
            accountName: "A戶",
          },
          {
            id: "ba-2",
            bankCode: "011",
            bankName: "台北富邦",
            accountNumber: "444455556666",
            accountName: "B戶",
          },
        ],
        promotions: [],
        settings: {
          is_open: "true",
          delivery_options_config: JSON.stringify([
            {
              id: "delivery",
              icon: "🛵",
              name: "配送到府",
              description: "新竹配送",
              enabled: true,
              payment,
            },
          ]),
          payment_options_config: JSON.stringify({
            cod: { icon: "💵", name: "貨到付款", description: "到付" },
            linepay: {
              icon: "💚",
              name: "LINE Pay",
              description: "線上安全付款",
            },
            transfer: {
              icon: "🏦",
              name: "線上轉帳",
              description: "ATM / 網銀",
            },
          }),
        },
      });
      return;
    }

    if (action === "quoteOrder") {
      const body = request.postDataJSON() as any;
      const reqItems = Array.isArray(body?.items) ? body.items : [];
      const items = reqItems.map((item: any) => {
        const qty = Math.max(1, Number(item?.qty) || 1);
        const unitPrice = 220;
        return {
          productId: Number(item?.productId) || 101,
          productName: "測試豆",
          specKey: String(item?.specKey || "quarter"),
          specLabel: "1/4磅",
          qty,
          unitPrice,
          lineTotal: qty * unitPrice,
        };
      });
      const subtotal = items.reduce(
        (sum: number, item: any) => sum + item.lineTotal,
        0,
      );
      const shippingFee = 0;
      const total = subtotal + shippingFee;
      await fulfillJson(route, {
        success: true,
        quote: {
          deliveryMethod: body?.deliveryMethod || "delivery",
          availablePaymentMethods: payment,
          items,
          appliedPromos: [],
          discountedItemKeys: [],
          subtotal,
          totalDiscount: 0,
          afterDiscount: subtotal,
          shippingFee,
          total,
          orderLines: [
            ...items.map((item: any) =>
              `${item.productName} (${item.specLabel}) x ${item.qty} (${item.lineTotal}元)`
            ),
            `🚚 運費: $${shippingFee}`,
          ],
          ordersText: [
            ...items.map((item: any) =>
              `${item.productName} (${item.specLabel}) x ${item.qty} (${item.lineTotal}元)`
            ),
            `🚚 運費: $${shippingFee}`,
          ].join("\\n"),
        },
      });
      return;
    }

    if (action === "customerLineLogin") {
      options.onCustomerLineLogin?.(request);
      await fulfillJson(route, {
        success: true,
        user: {
          userId: "customer-line-1",
          displayName: "LINE 測試客戶",
          pictureUrl: "",
        },
        token: "mock-customer-token",
      });
      return;
    }

    await fulfillJson(route, { success: true });
  });
}

type DashboardRouteOptions = {
  onAdminLineLogin?: (request: PlaywrightRequest) => void;
};

async function installDashboardRoutes(
  page: Page,
  options: DashboardRouteOptions = {},
) {
  await page.route(`${API_URL}**`, async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await fulfillJson(route, {});
      return;
    }

    const url = new URL(request.url());
    const action = url.searchParams.get("action");

    if (action === "lineLogin") {
      options.onAdminLineLogin?.(request);
      await fulfillJson(route, {
        success: true,
        isAdmin: true,
        user: {
          userId: "admin-line-1",
          displayName: "LINE 測試管理員",
          pictureUrl: "",
        },
        token: "mock-admin-token",
      });
      return;
    }

    if (action === "getCategories") {
      await fulfillJson(route, {
        success: true,
        categories: [{ id: 1, name: "測試分類" }],
      });
      return;
    }

    if (action === "getProducts") {
      await fulfillJson(route, {
        success: true,
        products: [
          {
            id: 201,
            category: "測試分類",
            name: "後台測試商品",
            description: "admin smoke",
            price: 180,
            roastLevel: "中焙",
            specs: JSON.stringify([{
              key: "single",
              label: "單包",
              price: 180,
              enabled: true,
            }]),
            enabled: true,
          },
        ],
      });
      return;
    }

    if (action === "getOrders") {
      await fulfillJson(route, {
        success: true,
        orders: [
          {
            orderId: "ORD001",
            timestamp: "2026-03-02T00:00:00.000Z",
            deliveryMethod: "in_store",
            status: "pending",
            lineName: "測試客戶",
            phone: "0900000000",
            email: "",
            items: "後台測試商品 x1",
            total: 180,
            paymentMethod: "cod",
            paymentStatus: "",
          },
        ],
      });
      return;
    }

    await fulfillJson(route, { success: true });
  });
}

test.describe("smoke", () => {
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

  test("storefront path works with event delegation", async ({ page }) => {
    await installGlobalStubs(page);
    await installMainRoutes(page);

    await page.goto("/main.html");

    await expect(page.locator("#products-container")).toContainText("測試豆");
    await page.locator(
      '[data-action="select-delivery"][data-method="delivery"]',
    ).click();
    await expect(page.locator("#delivery-address-section")).toBeVisible();

    await page.selectOption("#delivery-city", "新竹市");
    await expect(page.locator("#delivery-district option")).toHaveCount(4);

    await page.locator('[data-action="select-payment"][data-method="transfer"]')
      .click();
    await expect(page.locator("#transfer-info-section")).toBeVisible();

    const accountCards = page.locator(
      '#bank-accounts-list [data-action="select-bank-account"]',
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
      '#bank-accounts-list [data-action="copy-transfer-account"]',
    ).nth(1).click();
    await expect(accountCards.nth(1)).toHaveClass(/ring-2/);
    await expect(accountRadios.nth(1)).toBeChecked();

    // 切換付款方式再切回轉帳，帳號選取需保留（避免藍框/選取狀態回歸）
    await page.locator('[data-action="select-payment"][data-method="cod"]')
      .click();
    await expect(page.locator("#transfer-info-section")).toBeHidden();
    await page.locator('[data-action="select-payment"][data-method="transfer"]')
      .click();
    await expect(page.locator("#transfer-info-section")).toBeVisible();
    await expect(accountCards.nth(1)).toHaveClass(/ring-2/);
    await expect(accountRadios.nth(1)).toBeChecked();
  });

  test("storefront my orders can copy tracking number", async ({ page }) => {
    await installGlobalStubs(page);
    await installMainRoutes(page);

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
    await page.locator('[data-action="show-my-orders"]').click();
    await expect(page.locator("#my-orders-modal")).toBeVisible();

    const copyButton = page.locator(
      '#my-orders-list [data-action="copy-tracking-number"][data-tracking-number="AB123456789"]',
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

    await page.locator('[data-action="show-profile"]').click();
    await expect(page.locator(".swal2-popup")).toBeVisible();

    const ordersRadius = await page.locator("#my-orders-modal > div").evaluate(
      (element) => getComputedStyle(element).borderRadius,
    );
    const profileRadius = await page.locator(".swal2-popup").evaluate(
      (element) => getComputedStyle(element).borderRadius,
    );

    expect(profileRadius).toBe(ordersRadius);
  });

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

    await page.locator(
      '[data-action="select-delivery"][data-method="delivery"]',
    ).click();
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

    await page.locator(
      '[data-action="select-delivery"][data-method="delivery"]',
    ).click();
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
    await page.locator('[data-action="select-payment"][data-method="transfer"]')
      .click();
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

    await page.locator(
      '[data-action="select-delivery"][data-method="delivery"]',
    ).click();
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

    await page.locator('[data-action="select-payment"][data-method="linepay"]')
      .click();
    await expect(page.locator("#transfer-info-section")).toBeHidden();
    await page.check("#policy-agree");

    await page.locator('.bottom-bar button:has-text("購物車")').click();
    await page.locator("#cart-submit-btn").click();

    await expect.poll(() => submitOrderCalls).toBe(1);
    expect(submitBody).toBeTruthy();
    expect(submitBody.paymentMethod).toBe("linepay");
    await expect(page).toHaveURL(/linepay_redirect=1/);
  });

  test("dashboard path works with event delegation", async ({ page }) => {
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

    const statusSelect = page.locator(
      'select[data-action="change-order-status"][data-order-id="ORD001"]',
    );
    await statusSelect.click();
    await page.waitForTimeout(250);
    expect(updateStatusCalls).toBe(0);

    await statusSelect.evaluate((el) => {
      el.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.waitForTimeout(250);
    expect(updateStatusCalls).toBe(0);

    await statusSelect.selectOption("processing");
    await page.locator('button[data-action="confirm-order-status"][data-order-id="ORD001"]').click();
    await expect.poll(() => updateStatusCalls).toBeGreaterThan(0);

    await page.locator("#tab-products").click();
    await page.locator('button[data-action="edit-product"]').first().click();
    await expect(page.locator("#product-modal")).toBeVisible();
    await expect(page.locator("#pm-title")).toHaveText("編輯商品");
  });

  test("dashboard LINE login callback uses POST", async ({ page }) => {
    await installGlobalStubs(page);

    let loginRequest:
      | { method: string; url: string; body: Record<string, unknown> }
      | null = null;
    await installDashboardRoutes(page, {
      onAdminLineLogin: (request) => {
        loginRequest = {
          method: request.method(),
          url: request.url(),
          body: request.postDataJSON() as Record<string, unknown>,
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
    await page.locator('button[data-action="edit-product"]').first().click();
    await expect(page.locator("#product-modal")).toBeVisible();
    await expect(page.locator("#pm-title")).toHaveText("編輯商品");
    await expect.poll(() =>
      page.evaluate(() => (window as any).__blockedDashboardProductsEventCount)
    ).toBe(0);
  });
});
