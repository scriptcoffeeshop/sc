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

function parseRgbChannels(color: string) {
  const match = String(color).match(
    /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/i,
  );
  if (!match) {
    throw new Error(`Unsupported color format: ${color}`);
  }
  return match.slice(1, 4).map((value) => Number.parseInt(value, 10));
}

function expectColorsClose(received: string, expected: string, tolerance = 1) {
  const receivedChannels = parseRgbChannels(received);
  const expectedChannels = parseRgbChannels(expected);

  receivedChannels.forEach((channel, index) => {
    expect(Math.abs(channel - expectedChannels[index])).toBeLessThanOrEqual(
      tolerance,
    );
  });
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

    if (action === "getPromotions") {
      await fulfillJson(route, {
        success: true,
        promotions: [
          {
            id: 301,
            name: "任選 2 件 9 折",
            type: "bundle",
            targetProductIds: [],
            targetItems: [{ productId: 201, specKey: "single" }],
            minQuantity: 2,
            discountType: "percent",
            discountValue: 90,
            enabled: true,
            startTime: null,
            endTime: null,
            sortOrder: 0,
          },
        ],
      });
      return;
    }

    if (action === "getFormFieldsAdmin") {
      await fulfillJson(route, {
        success: true,
        fields: [
          {
            id: 401,
            field_key: "receipt_type",
            label: "收據類型",
            field_type: "select",
            placeholder: "請選擇",
            options: JSON.stringify(["二聯式", "三聯式"]),
            required: true,
            enabled: true,
            delivery_visibility: JSON.stringify({ delivery: true }),
          },
        ],
      });
      return;
    }

    if (action === "getUsers") {
      await fulfillJson(route, {
        success: true,
        users: [
          {
            userId: "user-001",
            displayName: "測試會員",
            pictureUrl: "",
            email: "user@example.com",
            phone: "0912000000",
            defaultDeliveryMethod: "delivery",
            defaultCity: "新竹市",
            defaultDistrict: "東區",
            defaultAddress: "測試路 1 號",
            lastLogin: "2026-04-20T10:00:00.000Z",
            role: "USER",
            status: "ACTIVE",
          },
          {
            userId: "admin-002",
            displayName: "管理測試員",
            pictureUrl: "",
            email: "admin@example.com",
            phone: "",
            defaultDeliveryMethod: "in_store",
            defaultStoreName: "",
            defaultStoreId: "",
            lastLogin: "2026-04-19T09:30:00.000Z",
            role: "ADMIN",
            status: "BLACKLISTED",
          },
        ],
      });
      return;
    }

    if (action === "getBlacklist") {
      await fulfillJson(route, {
        success: true,
        blacklist: [
          {
            lineUserId: "admin-002",
            displayName: "管理測試員",
            blockedAt: "2026-04-20T08:00:00.000Z",
            reason: "惡意測試",
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

    if (action === "getSettings") {
      await fulfillJson(route, {
        success: true,
        settings: {
          site_title: "Script Coffee",
          site_subtitle: "咖啡豆｜耳掛",
          site_icon_emoji: "☕",
          site_icon_url: "",
          announcement_enabled: "false",
          announcement: "",
          order_confirmation_auto_email_enabled: "true",
          is_open: "true",
          products_section_title: "咖啡豆選購",
          products_section_color: "#268BD2",
          products_section_size: "text-lg",
          products_section_bold: "true",
          delivery_section_title: "配送方式",
          delivery_section_color: "#268BD2",
          delivery_section_size: "text-lg",
          delivery_section_bold: "true",
          notes_section_title: "訂單備註",
          notes_section_color: "#268BD2",
          notes_section_size: "text-base",
          notes_section_bold: "true",
          linepay_sandbox: "true",
          delivery_options_config: JSON.stringify([
            {
              id: "delivery",
              icon: "",
              icon_url: "/icons/delivery_method.png",
              name: "配送到府",
              description: "新竹配送",
              enabled: true,
              fee: 60,
              free_threshold: 999,
              payment: {
                cod: true,
                linepay: true,
                jkopay: true,
                transfer: true,
              },
            },
          ]),
          payment_options_config: JSON.stringify({
            cod: { icon: "", icon_url: "", name: "貨到/取貨付款", description: "到付" },
            linepay: { icon: "", icon_url: "", name: "LINE Pay", description: "線上安全付款" },
            jkopay: { icon: "", icon_url: "", name: "街口支付", description: "街口支付線上付款" },
            transfer: { icon: "", icon_url: "", name: "線上轉帳", description: "ATM / 網銀匯款" },
          }),
        },
      });
      return;
    }

    if (action === "getBankAccounts") {
      await fulfillJson(route, {
        success: true,
        accounts: [],
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

    const ordersButton = page.locator('[data-action="show-my-orders"]');
    const profileButton = page.locator('[data-action="show-profile"]');
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

  test("dashboard settings keeps delivery routing rows visible", async ({ page }) => {
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
    await page.locator("#tab-settings").click();

    const deliveryRows = page.locator("#delivery-routing-table .delivery-option-row");
    await expect(deliveryRows).toHaveCount(1);
    await expect(deliveryRows.first().locator(".do-name")).toHaveValue("配送到府");
    await expect(page.locator("#s-icon-url-display")).toContainText("未設定");
  });

  test("dashboard settings can add and remove delivery routing rows", async ({ page }) => {
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
    await page.locator("#tab-settings").click();

    const deliveryRows = page.locator("#delivery-routing-table .delivery-option-row");
    await expect(deliveryRows).toHaveCount(1);

    await page.locator('[data-action="add-delivery-option-admin"]').click();
    await expect(deliveryRows).toHaveCount(2);
    await expect(deliveryRows.nth(1).locator(".do-name")).toHaveValue("新物流方式");

    await deliveryRows.nth(1).locator('[data-action="remove-delivery-option-row"]').click();
    await expect(deliveryRows).toHaveCount(1);
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
    await page.locator('button[data-action="edit-promotion"]').first().click();
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
    await expect(page.locator('button[data-action="toggle-user-role"]').first()).toBeVisible();
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
