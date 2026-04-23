import {
  expect,
  type Page,
  type Request as PlaywrightRequest,
  type Route,
} from "@playwright/test";

export const API_URL =
  "https://avnvsjyyeofivgmrchte.supabase.co/functions/v1/coffee-api";
export const SUPABASE_REST_PREFIX =
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

export function expectColorsClose(received: string, expected: string, tolerance = 1) {
  const receivedChannels = parseRgbChannels(received);
  const expectedChannels = parseRgbChannels(expected);

  receivedChannels.forEach((channel, index) => {
    expect(Math.abs(channel - expectedChannels[index])).toBeLessThanOrEqual(
      tolerance,
    );
  });
}

export async function fulfillJson(route: Route, payload: unknown, status = 200) {
  await route.fulfill({
    status,
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
}

export async function installGlobalStubs(page: Page) {
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

export async function blockStorefrontBodyClickDelegation(page: Page) {
  await page.addInitScript(() => {
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    (window as any).__blockedStorefrontBodyClickDelegation = 0;
    EventTarget.prototype.addEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ) {
      if (this === document.body && type === "click") {
        (window as any).__blockedStorefrontBodyClickDelegation += 1;
        return;
      }
      return originalAddEventListener.call(this, type, listener, options);
    };
  });
}

export type MainRouteOptions = {
  payment?: {
    cod: boolean;
    linepay: boolean;
    jkopay?: boolean;
    transfer: boolean;
  };
  deliveryOptions?: Array<{
    id: string;
    icon?: string;
    name: string;
    description: string;
    enabled: boolean;
    payment: {
      cod: boolean;
      linepay: boolean;
      jkopay?: boolean;
      transfer: boolean;
    };
  }>;
  formFields?: Array<{
    id?: number;
    field_key: string;
    label: string;
    field_type: string;
    placeholder?: string;
    options?: string;
    required?: boolean;
    enabled?: boolean;
    delivery_visibility?: string | null;
  }>;
  onCustomerLineLogin?: (request: PlaywrightRequest) => void;
};

export async function installMainRoutes(page: Page, options: MainRouteOptions = {}) {
  const paymentSource = options.payment ??
    { cod: true, linepay: false, transfer: true };
  const payment = {
    cod: Boolean(paymentSource.cod),
    linepay: Boolean(paymentSource.linepay),
    jkopay: paymentSource.jkopay === undefined
      ? Boolean(paymentSource.linepay)
      : Boolean(paymentSource.jkopay),
    transfer: Boolean(paymentSource.transfer),
  };
  const deliveryOptions = options.deliveryOptions ?? [
    {
      id: "delivery",
      icon: "🛵",
      name: "配送到府",
      description: "新竹配送",
      enabled: true,
      payment,
    },
  ];
  const formFields = Array.isArray(options.formFields)
    ? options.formFields.map((field, index) => ({
      id: Number(field.id) || index + 1,
      enabled: field.enabled !== false,
      required: Boolean(field.required),
      options: field.options || "",
      placeholder: field.placeholder || "",
      delivery_visibility: field.delivery_visibility ?? null,
      ...field,
    }))
    : [];
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
        formFields,
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
          delivery_options_config: JSON.stringify(deliveryOptions),
          payment_options_config: JSON.stringify({
            cod: { icon: "💵", name: "貨到付款", description: "到付" },
            linepay: {
              icon: "💚",
              name: "LINE Pay",
              description: "線上安全付款",
            },
            jkopay: {
              icon: "🟧",
              name: "街口支付",
              description: "街口支付線上付款",
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

export type DashboardRouteOptions = {
  onAdminLineLogin?: (request: PlaywrightRequest) => void;
  onUpdateSettings?: (request: PlaywrightRequest) => void;
  onUploadAsset?: (request: PlaywrightRequest) => void;
  onSendLineFlexMessage?: (request: PlaywrightRequest) => void;
  onSendOrderEmail?: (request: PlaywrightRequest) => void;
  uploadAssetUrl?: string;
  categories?: Array<{
    id: number;
    name: string;
  }>;
  products?: Array<{
    id: number;
    category: string;
    name: string;
    description?: string;
    price?: number;
    roastLevel?: string;
    specs?: string;
    enabled?: boolean;
  }>;
  promotions?: Array<{
    id: number;
    name: string;
    type: string;
    targetProductIds?: number[];
    targetItems?: Array<{ productId: number; specKey?: string }>;
    minQuantity: number;
    discountType: string;
    discountValue: number;
    enabled?: boolean;
    startTime?: string | null;
    endTime?: string | null;
    sortOrder?: number;
  }>;
  orders?: Array<Record<string, any>>;
  users?: Array<{
    userId: string;
    displayName: string;
    pictureUrl?: string;
    email?: string;
    phone?: string;
    defaultDeliveryMethod?: string;
    defaultCity?: string;
    defaultDistrict?: string;
    defaultAddress?: string;
    defaultStoreName?: string;
    defaultStoreId?: string;
    lastLogin?: string;
    role?: string;
    status?: string;
  }>;
  blacklist?: Array<{
    lineUserId: string;
    displayName: string;
    blockedAt?: string;
    reason?: string;
  }>;
  formFields?: Array<{
    id: number;
    field_key: string;
    label: string;
    field_type: string;
    placeholder?: string;
    options?: string;
    required?: boolean;
    enabled?: boolean;
    delivery_visibility?: string | null;
  }>;
  bankAccounts?: Array<{
    id: number;
    bankCode: string;
    bankName: string;
    accountNumber: string;
    accountName?: string;
  }>;
};

export async function installDashboardRoutes(
  page: Page,
  options: DashboardRouteOptions = {},
) {
  let categoriesState = Array.isArray(options.categories)
    ? options.categories.map((category) => ({ ...category }))
    : [{ id: 1, name: "測試分類" }];
  let productsState = Array.isArray(options.products)
    ? options.products.map((product) => ({ ...product }))
    : [
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
    ];
  let promotionsState = Array.isArray(options.promotions)
    ? options.promotions.map((promotion) => ({ ...promotion }))
    : [
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
    ];
  let ordersState = Array.isArray(options.orders)
    ? options.orders.map((order) => ({ ...order }))
    : [
      {
        orderId: "ORD001",
        timestamp: "2026-03-02T00:00:00.000Z",
        deliveryMethod: "in_store",
        status: "pending",
        lineUserId: "customer-line-1",
        lineName: "測試客戶",
        phone: "0900000000",
        email: "customer@example.com",
        items: "後台測試商品 x1",
        total: 180,
        paymentMethod: "cod",
        paymentStatus: "",
      },
    ];
  let usersState = Array.isArray(options.users)
    ? options.users.map((user) => ({ ...user }))
    : [
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
    ];
  let blacklistState = Array.isArray(options.blacklist)
    ? options.blacklist.map((entry) => ({ ...entry }))
    : [
      {
        lineUserId: "admin-002",
        displayName: "管理測試員",
        blockedAt: "2026-04-20T08:00:00.000Z",
        reason: "惡意測試",
      },
    ];
  let bankAccountsState = Array.isArray(options.bankAccounts)
    ? options.bankAccounts.map((account) => ({ ...account }))
    : [];
  let formFieldsState = Array.isArray(options.formFields)
    ? options.formFields.map((field) => ({ ...field }))
    : [{
      id: 401,
      field_key: "receipt_type",
      label: "收據類型",
      field_type: "select",
      placeholder: "請選擇",
      options: JSON.stringify(["二聯式", "三聯式"]),
      required: true,
      enabled: true,
      delivery_visibility: JSON.stringify({ delivery: true }),
    }];

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
        categories: categoriesState,
      });
      return;
    }

    if (action === "getProducts") {
      await fulfillJson(route, {
        success: true,
        products: productsState,
      });
      return;
    }

    if (action === "getPromotions") {
      await fulfillJson(route, {
        success: true,
        promotions: promotionsState,
      });
      return;
    }

    if (action === "getFormFieldsAdmin") {
      await fulfillJson(route, {
        success: true,
        fields: formFieldsState,
      });
      return;
    }

    if (action === "getUsers") {
      const search = String(url.searchParams.get("search") || "").trim().toLowerCase();
      const filteredUsers = search
        ? usersState.filter((user) =>
          [user.displayName, user.phone, user.email].some((value) =>
            String(value || "").toLowerCase().includes(search)
          )
        )
        : usersState;
      await fulfillJson(route, {
        success: true,
        users: filteredUsers,
      });
      return;
    }

    if (action === "getBlacklist") {
      await fulfillJson(route, {
        success: true,
        blacklist: blacklistState,
      });
      return;
    }

    if (action === "getOrders") {
      await fulfillJson(route, {
        success: true,
        orders: ordersState,
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
        accounts: bankAccountsState,
      });
      return;
    }

    if (action === "updateSettings") {
      options.onUpdateSettings?.(request);
      await fulfillJson(route, { success: true });
      return;
    }

    if (action === "addCategory") {
      const body = request.postDataJSON() as any;
      categoriesState.push({
        id: Date.now(),
        name: String(body?.name || ""),
      });
      await fulfillJson(route, { success: true });
      return;
    }

    if (action === "updateCategory") {
      const body = request.postDataJSON() as any;
      categoriesState = categoriesState.map((category) =>
        Number(category.id) === Number(body?.id)
          ? { ...category, name: String(body?.name || category.name) }
          : category
      );
      await fulfillJson(route, { success: true });
      return;
    }

    if (action === "deleteCategory") {
      const body = request.postDataJSON() as any;
      categoriesState = categoriesState.filter((category) =>
        Number(category.id) !== Number(body?.id)
      );
      await fulfillJson(route, { success: true });
      return;
    }

    if (action === "deleteOrder") {
      const body = request.postDataJSON() as any;
      ordersState = ordersState.filter((order) =>
        String(order.orderId) !== String(body?.orderId || "")
      );
      await fulfillJson(route, { success: true });
      return;
    }

    if (action === "updateOrderStatus") {
      const body = request.postDataJSON() as any;
      ordersState = ordersState.map((order) =>
        String(order.orderId) === String(body?.orderId || "")
          ? {
            ...order,
            status: body?.status !== undefined ? String(body.status) : order.status,
            paymentStatus: body?.paymentStatus !== undefined
              ? String(body.paymentStatus)
              : order.paymentStatus,
            trackingNumber: body?.trackingNumber !== undefined
              ? String(body.trackingNumber)
              : order.trackingNumber,
            shippingProvider: body?.shippingProvider !== undefined
              ? String(body.shippingProvider)
              : order.shippingProvider,
            trackingUrl: body?.trackingUrl !== undefined
              ? String(body.trackingUrl)
              : order.trackingUrl,
            cancelReason: body?.cancelReason !== undefined
              ? String(body.cancelReason)
              : order.cancelReason,
          }
          : order
      );
      await fulfillJson(route, { success: true });
      return;
    }

    if (action === "sendLineFlexMessage") {
      options.onSendLineFlexMessage?.(request);
      await fulfillJson(route, { success: true });
      return;
    }

    if (action === "sendOrderEmail") {
      options.onSendOrderEmail?.(request);
      await fulfillJson(route, {
        success: true,
        message: "信件已發送",
      });
      return;
    }

    if (action === "batchUpdateOrderStatus") {
      const body = request.postDataJSON() as any;
      const targetIds = new Set(
        Array.isArray(body?.orderIds) ? body.orderIds.map((value: any) => String(value)) : [],
      );
      ordersState = ordersState.map((order) =>
        targetIds.has(String(order.orderId))
          ? {
            ...order,
            status: body?.status !== undefined ? String(body.status) : order.status,
            paymentStatus: body?.paymentStatus !== undefined
              ? String(body.paymentStatus)
              : order.paymentStatus,
            trackingNumber: body?.trackingNumber !== undefined
              ? String(body.trackingNumber)
              : order.trackingNumber,
            shippingProvider: body?.shippingProvider !== undefined
              ? String(body.shippingProvider)
              : order.shippingProvider,
            trackingUrl: body?.trackingUrl !== undefined
              ? String(body.trackingUrl)
              : order.trackingUrl,
          }
          : order
      );
      await fulfillJson(route, { success: true, message: "批次更新完成" });
      return;
    }

    if (action === "batchDeleteOrders") {
      const body = request.postDataJSON() as any;
      const targetIds = new Set(
        Array.isArray(body?.orderIds) ? body.orderIds.map((value: any) => String(value)) : [],
      );
      ordersState = ordersState.filter((order) => !targetIds.has(String(order.orderId)));
      await fulfillJson(route, { success: true, message: "批次刪除完成" });
      return;
    }

    if (action === "linePayRefund" || action === "jkoPayRefund") {
      const body = request.postDataJSON() as any;
      ordersState = ordersState.map((order) =>
        String(order.orderId) === String(body?.orderId || "")
          ? { ...order, paymentStatus: "refunded" }
          : order
      );
      await fulfillJson(route, { success: true });
      return;
    }

    if (action === "addProduct") {
      const body = request.postDataJSON() as any;
      productsState.push({
        id: Date.now(),
        category: String(body?.category || ""),
        name: String(body?.name || ""),
        description: String(body?.description || ""),
        price: Number(body?.price) || 0,
        roastLevel: String(body?.roastLevel || ""),
        specs: String(body?.specs || "[]"),
        enabled: Boolean(body?.enabled),
      });
      await fulfillJson(route, { success: true });
      return;
    }

    if (action === "updateProduct") {
      const body = request.postDataJSON() as any;
      productsState = productsState.map((product) =>
        Number(product.id) === Number(body?.id)
          ? {
            ...product,
            category: body?.category !== undefined
              ? String(body.category)
              : product.category,
            name: body?.name !== undefined ? String(body.name) : product.name,
            description: body?.description !== undefined
              ? String(body.description)
              : product.description,
            price: body?.price !== undefined ? Number(body.price) || 0 : product.price,
            roastLevel: body?.roastLevel !== undefined
              ? String(body.roastLevel)
              : product.roastLevel,
            specs: body?.specs !== undefined ? String(body.specs) : product.specs,
            enabled: body?.enabled !== undefined
              ? Boolean(body.enabled)
              : product.enabled,
          }
          : product
      );
      await fulfillJson(route, { success: true });
      return;
    }

    if (action === "deleteProduct") {
      const body = request.postDataJSON() as any;
      productsState = productsState.filter((product) =>
        Number(product.id) !== Number(body?.id)
      );
      await fulfillJson(route, { success: true });
      return;
    }

    if (action === "addPromotion") {
      const body = request.postDataJSON() as any;
      promotionsState.push({
        id: Date.now(),
        name: String(body?.name || ""),
        type: String(body?.type || "bundle"),
        targetProductIds: [],
        targetItems: Array.isArray(body?.targetItems) ? body.targetItems : [],
        minQuantity: Number(body?.minQuantity) || 1,
        discountType: String(body?.discountType || "percent"),
        discountValue: Number(body?.discountValue) || 0,
        enabled: Boolean(body?.enabled),
        startTime: null,
        endTime: null,
        sortOrder: promotionsState.length,
      });
      await fulfillJson(route, { success: true });
      return;
    }

    if (action === "updatePromotion") {
      const body = request.postDataJSON() as any;
      promotionsState = promotionsState.map((promotion) =>
        Number(promotion.id) === Number(body?.id)
          ? {
            ...promotion,
            name: body?.name !== undefined ? String(body.name) : promotion.name,
            type: body?.type !== undefined ? String(body.type) : promotion.type,
            targetItems: Array.isArray(body?.targetItems)
              ? body.targetItems.map((item: any) => ({
                productId: Number(item?.productId) || 0,
                specKey: String(item?.specKey || ""),
              }))
              : promotion.targetItems,
            targetProductIds: Array.isArray(body?.targetProductIds)
              ? body.targetProductIds.map((value: any) => Number(value) || 0)
              : promotion.targetProductIds,
            minQuantity: body?.minQuantity !== undefined
              ? Number(body.minQuantity) || 1
              : promotion.minQuantity,
            discountType: body?.discountType !== undefined
              ? String(body.discountType)
              : promotion.discountType,
            discountValue: body?.discountValue !== undefined
              ? Number(body.discountValue) || 0
              : promotion.discountValue,
            enabled: body?.enabled !== undefined
              ? Boolean(body.enabled)
              : promotion.enabled,
          }
          : promotion
      );
      await fulfillJson(route, { success: true });
      return;
    }

    if (action === "deletePromotion") {
      const body = request.postDataJSON() as any;
      promotionsState = promotionsState.filter((promotion) =>
        Number(promotion.id) !== Number(body?.id)
      );
      await fulfillJson(route, { success: true });
      return;
    }

    if (action === "updateUserRole") {
      const body = request.postDataJSON() as any;
      usersState = usersState.map((user) =>
        user.userId === String(body?.targetUserId || "")
          ? { ...user, role: String(body?.newRole || user.role || "USER") }
          : user
      );
      await fulfillJson(route, { success: true });
      return;
    }

    if (action === "addToBlacklist") {
      const body = request.postDataJSON() as any;
      const targetUserId = String(body?.targetUserId || "");
      const reason = String(body?.reason || "");
      usersState = usersState.map((user) =>
        user.userId === targetUserId
          ? { ...user, status: "BLACKLISTED" }
          : user
      );
      const existingEntry = blacklistState.find((entry) => entry.lineUserId === targetUserId);
      if (existingEntry) {
        blacklistState = blacklistState.map((entry) =>
          entry.lineUserId === targetUserId
            ? {
              ...entry,
              reason,
              blockedAt: "2026-04-21T01:00:00.000Z",
            }
            : entry
        );
      } else {
        const targetUser = usersState.find((user) => user.userId === targetUserId);
        blacklistState.push({
          lineUserId: targetUserId,
          displayName: String(targetUser?.displayName || ""),
          blockedAt: "2026-04-21T01:00:00.000Z",
          reason,
        });
      }
      await fulfillJson(route, { success: true });
      return;
    }

    if (action === "removeFromBlacklist") {
      const body = request.postDataJSON() as any;
      const targetUserId = String(body?.targetUserId || "");
      usersState = usersState.map((user) =>
        user.userId === targetUserId
          ? { ...user, status: "ACTIVE" }
          : user
      );
      blacklistState = blacklistState.filter((entry) => entry.lineUserId !== targetUserId);
      await fulfillJson(route, { success: true });
      return;
    }

    if (action === "addFormField") {
      const body = request.postDataJSON() as any;
      formFieldsState.push({
        id: Date.now(),
        field_key: String(body?.fieldKey || ""),
        label: String(body?.label || ""),
        field_type: String(body?.fieldType || "text"),
        placeholder: String(body?.placeholder || ""),
        options: String(body?.options || ""),
        required: Boolean(body?.required),
        enabled: true,
        delivery_visibility: body?.deliveryVisibility || null,
      });
      await fulfillJson(route, { success: true });
      return;
    }

    if (action === "updateFormField") {
      const body = request.postDataJSON() as any;
      formFieldsState = formFieldsState.map((field) =>
        Number(field.id) === Number(body?.id)
          ? {
            ...field,
            label: body?.label !== undefined ? String(body.label) : field.label,
            field_type: body?.fieldType !== undefined
              ? String(body.fieldType)
              : field.field_type,
            placeholder: body?.placeholder !== undefined
              ? String(body.placeholder)
              : field.placeholder,
            options: body?.options !== undefined
              ? String(body.options)
              : field.options,
            required: body?.required !== undefined
              ? Boolean(body.required)
              : field.required,
            enabled: body?.enabled !== undefined
              ? Boolean(body.enabled)
              : field.enabled,
            delivery_visibility: body?.deliveryVisibility !== undefined
              ? body.deliveryVisibility
              : field.delivery_visibility,
          }
          : field
      );
      await fulfillJson(route, { success: true });
      return;
    }

    if (action === "deleteFormField") {
      const body = request.postDataJSON() as any;
      formFieldsState = formFieldsState.filter((field) =>
        Number(field.id) !== Number(body?.id)
      );
      await fulfillJson(route, { success: true });
      return;
    }

    if (action === "uploadAsset") {
      options.onUploadAsset?.(request);
      await fulfillJson(route, {
        success: true,
        url: options.uploadAssetUrl || "icons/uploaded-brand.png",
      });
      return;
    }

    if (action === "addBankAccount") {
      const body = request.postDataJSON() as any;
      bankAccountsState.push({
        id: Date.now(),
        bankCode: String(body?.bankCode || ""),
        bankName: String(body?.bankName || ""),
        accountNumber: String(body?.accountNumber || ""),
        accountName: String(body?.accountName || ""),
      });
      await fulfillJson(route, { success: true });
      return;
    }

    if (action === "deleteBankAccount") {
      const body = request.postDataJSON() as any;
      bankAccountsState = bankAccountsState.filter((account) =>
        Number(account.id) !== Number(body?.id)
      );
      await fulfillJson(route, { success: true });
      return;
    }

    if (action === "updateBankAccount") {
      const body = request.postDataJSON() as any;
      bankAccountsState = bankAccountsState.map((account) =>
        Number(account.id) === Number(body?.id)
          ? {
            ...account,
            bankCode: String(body?.bankCode || account.bankCode),
            bankName: String(body?.bankName || account.bankName),
            accountNumber: String(body?.accountNumber || account.accountNumber),
            accountName: String(body?.accountName || account.accountName || ""),
          }
          : account
      );
      await fulfillJson(route, { success: true });
      return;
    }

    if (action === "reorderBankAccounts") {
      const body = request.postDataJSON() as any;
      const ids = Array.isArray(body?.ids) ? body.ids.map(Number) : [];
      const orderMap = new Map(ids.map((id: number, index: number) => [id, index]));
      bankAccountsState = [...bankAccountsState].sort((left, right) =>
        (orderMap.get(Number(left.id)) ?? Number.MAX_SAFE_INTEGER) -
        (orderMap.get(Number(right.id)) ?? Number.MAX_SAFE_INTEGER)
      );
      await fulfillJson(route, { success: true });
      return;
    }

    await fulfillJson(route, { success: true });
  });
}
