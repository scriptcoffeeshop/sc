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
  onUpdateSettings?: (request: PlaywrightRequest) => void;
  onUploadAsset?: (request: PlaywrightRequest) => void;
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

async function installDashboardRoutes(
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
    await page.getByRole("button", { name: "我的訂單" }).click();
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
    ).toBeGreaterThan(0);

    await page.getByRole("button", { name: "會員資料" }).click();
    await expect.poll(() =>
      page.evaluate(() => (window as any).__storefrontSwalCalls || [])
    ).toContain("會員資料");

    await page.getByRole("button", { name: "我的訂單" }).click();
    await expect(page.locator("#my-orders-modal")).toBeVisible();
    await page.locator("#my-orders-modal").evaluate((element) => {
      element.classList.add("hidden");
    });

    await page.getByRole("button", { name: "登出" }).click();
    await expect(page.locator("#login-prompt")).toBeVisible();
    await expect(page.locator("#user-info")).toHaveClass(/hidden/);
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
      const originalAddEventListener = Document.prototype.addEventListener;
      Document.prototype.addEventListener = function patchedAddEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
      ) {
        if (this === document && (type === "click" || type === "change")) {
          return;
        }
        return originalAddEventListener.call(this, type, listener, options);
      };
    });

    await page.goto("/dashboard.html");
    await page.locator("#tab-settings").click();

    const deliveryRows = page.locator("#delivery-routing-table .delivery-option-row");
    await expect(deliveryRows).toHaveCount(1);

    await page.getByRole("button", { name: "+ 新增取貨方式" }).click();
    await expect(deliveryRows).toHaveCount(2);
    await expect(deliveryRows.nth(1).locator(".do-name")).toHaveValue("新物流方式");

    await deliveryRows.nth(1).getByRole("button", { name: "刪除" }).click();
    await expect(deliveryRows).toHaveCount(1);
  });

  test("dashboard settings save sends branding and section title state", async ({ page }) => {
    let updatePayload: any = null;

    await installGlobalStubs(page);
    await installDashboardRoutes(page, {
      onUpdateSettings: (request) => {
        updatePayload = request.postDataJSON();
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
      const originalAddEventListener = Document.prototype.addEventListener;
      Document.prototype.addEventListener = function patchedAddEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
      ) {
        if (this === document && (type === "click" || type === "change")) {
          return;
        }
        return originalAddEventListener.call(this, type, listener, options);
      };
    });

    await page.goto("/dashboard.html");
    await page.locator("#tab-settings").click();

    await page.locator("#s-site-title").fill("新的品牌名稱");
    await page.locator("#s-site-subtitle").fill("新的副標題");
    await page.locator("#s-ann-enabled").check();
    await page.locator("#s-announcement").fill("今日暫停部分配送");
    await page.locator('input[name="s-open"][value="false"]').check();
    await page.locator("#s-products-title").fill("精品豆專區");
    await page.locator("#s-products-color").fill("#cb4b16");
    await page.locator("#s-linepay-sandbox").uncheck();
    await page.getByRole("button", { name: "儲存設定" }).click();

    await expect.poll(() => updatePayload?.settings?.site_title).toBe("新的品牌名稱");
    expect(updatePayload?.settings?.site_subtitle).toBe("新的副標題");
    expect(updatePayload?.settings?.announcement_enabled).toBe("true");
    expect(updatePayload?.settings?.announcement).toBe("今日暫停部分配送");
    expect(updatePayload?.settings?.is_open).toBe("false");
    expect(updatePayload?.settings?.products_section_title).toBe("精品豆專區");
    expect(updatePayload?.settings?.products_section_color).toBe("#cb4b16");
    expect(updatePayload?.settings?.linepay_sandbox).toBe("false");
  });

  test("dashboard settings bank accounts work without imperative innerHTML renderer", async ({ page }) => {
    await installGlobalStubs(page);
    await installDashboardRoutes(page, {
      bankAccounts: [{
        id: 1,
        bankCode: "013",
        bankName: "國泰世華",
        accountNumber: "111122223333",
        accountName: "Script Coffee",
      }],
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
            if (this instanceof HTMLElement && this.id === "bank-accounts-admin-list") {
              throw new Error("legacy bank accounts renderer blocked");
            }
            return originalInnerHTML.set.call(this, value);
          },
        });
      }

      const originalAddEventListener = Document.prototype.addEventListener;
      Document.prototype.addEventListener = function patchedAddEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
      ) {
        if (this === document && (type === "click" || type === "change")) {
          return;
        }
        return originalAddEventListener.call(this, type, listener, options);
      };

      const baseFire = (window as any).Swal.fire;
      (window as any).Swal.fire = async (input: any) => {
        const title = typeof input === "string" ? input : input?.title;
        if (title === "新增匯款帳號") {
          return {
            value: {
              bankCode: "812",
              bankName: "台新銀行",
              accountNumber: "9876543210",
              accountName: "新帳戶",
            },
          };
        }
        if (title === "刪除帳號？") {
          return { isConfirmed: true };
        }
        return await baseFire(input);
      };
    });

    await page.goto("/dashboard.html");
    await page.locator("#tab-settings").click();

    await expect(page.locator("[data-bank-account-row]")).toHaveCount(1);
    await expect(page.locator("[data-bank-account-row]").first()).toContainText("國泰世華");

    await page.getByRole("button", { name: "+ 新增匯款帳號" }).click();
    await expect(page.locator("[data-bank-account-row]")).toHaveCount(2);
    await expect(page.locator("[data-bank-account-row]").nth(1)).toContainText("台新銀行");

    await page
      .locator("[data-bank-account-row]")
      .filter({ hasText: "國泰世華" })
      .getByRole("button", { name: "刪除" })
      .click();
    await expect(page.locator("[data-bank-account-row]")).toHaveCount(1);
    await expect(page.locator("[data-bank-account-row]").first()).toContainText("台新銀行");
  });

  test("dashboard form fields controls work without document event delegation", async ({ page }) => {
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

      const originalAddEventListener = Document.prototype.addEventListener;
      Document.prototype.addEventListener = function patchedAddEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
      ) {
        if (this === document && (type === "click" || type === "change")) {
          return;
        }
        return originalAddEventListener.call(this, type, listener, options);
      };

      const baseFire = (window as any).Swal.fire;
      (window as any).Swal.fire = async (input: any) => {
        const title = typeof input === "string" ? input : input?.title;
        if (title === "新增欄位") {
          return {
            value: {
              fieldKey: "tax_id",
              label: "統一編號",
              fieldType: "text",
              placeholder: "請輸入統一編號",
              options: "",
              required: false,
              deliveryVisibility: null,
            },
          };
        }
        if (title === "確認刪除") {
          return { isConfirmed: true };
        }
        return await baseFire(input);
      };
    });

    await page.goto("/dashboard.html");
    await page.locator("#tab-formfields").click();

    const rows = page.locator("#formfields-sortable > div");
    await expect(rows).toHaveCount(1);

    await page.getByRole("button", { name: "+ 新增欄位" }).click();
    await expect(rows).toHaveCount(2);
    await expect(rows.filter({ hasText: "統一編號" })).toHaveCount(1);

    const receiptRow = rows.filter({ hasText: "收據類型" });
    await receiptRow.getByRole("button", { name: "開" }).click();
    await expect(receiptRow).toHaveClass(/opacity-50/);

    await rows.filter({ hasText: "統一編號" }).getByRole("button", { name: "刪除" }).click();
    await expect(rows).toHaveCount(1);
  });

  test("dashboard orders controls work without document event delegation", async ({ page }) => {
    await installGlobalStubs(page);
    await installDashboardRoutes(page, {
      orders: [
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
        {
          orderId: "ORD002",
          timestamp: "2026-03-03T00:00:00.000Z",
          deliveryMethod: "delivery",
          status: "pending",
          lineUserId: "customer-line-2",
          lineName: "轉帳客戶",
          phone: "0911000000",
          email: "transfer@example.com",
          city: "新竹市",
          district: "東區",
          address: "測試路 2 號",
          items: "後台測試商品 x2",
          total: 360,
          paymentMethod: "transfer",
          paymentStatus: "pending",
          transferAccountLast5: "12345",
          paymentId: "acc-001",
          trackingNumber: "TRK-002",
          shippingProvider: "黑貓宅急便",
          trackingUrl: "https://example.com/tracking/TRK-002",
        },
        {
          orderId: "ORD003",
          timestamp: "2026-03-04T00:00:00.000Z",
          deliveryMethod: "home_delivery",
          status: "processing",
          lineUserId: "customer-line-3",
          lineName: "LINE Pay 客戶",
          phone: "0922000000",
          email: "linepay@example.com",
          city: "台北市",
          district: "中山區",
          address: "測試路 3 號",
          items: "後台測試商品 x3",
          total: 540,
          paymentMethod: "linepay",
          paymentStatus: "paid",
        },
      ],
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

      const originalAddEventListener = Document.prototype.addEventListener;
      Document.prototype.addEventListener = function patchedAddEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
      ) {
        if (this === document && (type === "click" || type === "change")) {
          return;
        }
        return originalAddEventListener.call(this, type, listener, options);
      };

      const baseFire = (window as any).Swal.fire;
      (window as any).Swal.fire = async (input: any) => {
        const title = typeof input === "string" ? input : input?.title;
        if (title === "確認變更訂單狀態") {
          return { isConfirmed: true };
        }
        if (title === "確認收款") {
          return { isConfirmed: true };
        }
        if (title === "LINE Pay 退款") {
          return { isConfirmed: true };
        }
        if (title === "刪除訂單？") {
          return { isConfirmed: true };
        }
        return await baseFire(input);
      };
    });

    await page.goto("/dashboard.html");

    const selectedCount = page.locator("#orders-selected-count");
    const selectAllCheckbox = page.locator("#orders-select-all");
    await expect(page.locator("#orders-list")).toContainText("#ORD001");
    await expect(page.locator("#orders-list")).toContainText("#ORD002");
    await expect(page.locator("#orders-list")).toContainText("#ORD003");

    await selectAllCheckbox.check();
    await expect(selectedCount).toHaveText("已選 3 筆");

    const order1 = page.locator("#orders-list > div").filter({ hasText: "#ORD001" });
    await order1.locator("select").selectOption("processing");
    await order1.getByRole("button", { name: "確認" }).click();
    await expect(order1).toContainText("處理中");

    const order2 = page.locator("#orders-list > div").filter({ hasText: "#ORD002" });
    await order2.getByRole("button", { name: "複製" }).click();
    await expect.poll(() =>
      page.evaluate(() => {
        const writes = (window as any).__clipboardWrites || [];
        return writes[writes.length - 1] || null;
      })
    ).toBe("TRK-002");
    await order2.getByRole("button", { name: "確認已收款" }).click();
    await expect(order2).toContainText("已付款");

    const order3 = page.locator("#orders-list > div").filter({ hasText: "#ORD003" });
    await order3.getByRole("button", { name: /退款/ }).click();
    await expect(order3).toContainText("已退款");

    await order1.getByRole("button", { name: "刪除" }).click();
    await expect(page.locator("#orders-list")).not.toContainText("#ORD001");
  });

  test("dashboard products controls work without document event delegation", async ({ page }) => {
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

      const originalAddEventListener = Document.prototype.addEventListener;
      Document.prototype.addEventListener = function patchedAddEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
      ) {
        if (this === document && (type === "click" || type === "change")) {
          return;
        }
        return originalAddEventListener.call(this, type, listener, options);
      };

      const baseFire = (window as any).Swal.fire;
      (window as any).Swal.fire = async (input: any) => {
        const title = typeof input === "string" ? input : input?.title;
        if (title === "刪除商品？") {
          return { isConfirmed: true };
        }
        return await baseFire(input);
      };
    });

    await page.goto("/dashboard.html");
    await page.locator("#tab-products").click();

    const rows = page.locator("#products-main-table tbody.sortable-tbody tr[data-id]");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("後台測試商品");

    await page.getByRole("button", { name: "+ 新增商品" }).click();
    await expect(page.locator("#product-modal")).toBeVisible();
    await page.locator("#pm-category").selectOption("測試分類");
    await page.locator("#pm-name").fill("新品豆");
    await page.locator("#pm-desc").fill("花香調");
    await page.locator("#pm-roast").fill("淺焙");
    await page.locator(".spec-price").nth(0).fill("220");
    await page.locator(".spec-price").nth(1).fill("420");
    await page.locator(".spec-price").nth(2).fill("60");
    await page.getByRole("button", { name: "儲存" }).click();

    await expect(rows).toHaveCount(2);
    await expect(page.locator("#products-main-table")).toContainText("新品豆");

    await rows.filter({ hasText: "新品豆" }).getByRole("button", { name: "編輯" }).click();
    await page.locator("#pm-name").fill("新版豆");
    await page.getByRole("button", { name: "儲存" }).click();

    const updatedRow = rows.filter({ hasText: "新版豆" });
    await expect(updatedRow).toHaveCount(1);
    await updatedRow.getByRole("button", { name: "啟用" }).click();
    await expect(updatedRow.getByRole("button", { name: "未啟用" })).toBeVisible();

    await updatedRow.getByRole("button", { name: "刪除" }).click();
    await expect(rows).toHaveCount(1);
    await expect(page.locator("#products-main-table")).not.toContainText("新版豆");
  });

  test("dashboard categories controls work without document event delegation", async ({ page }) => {
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

      const originalAddEventListener = Document.prototype.addEventListener;
      Document.prototype.addEventListener = function patchedAddEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
      ) {
        if (this === document && (type === "click" || type === "change")) {
          return;
        }
        return originalAddEventListener.call(this, type, listener, options);
      };

      const baseFire = (window as any).Swal.fire;
      (window as any).Swal.fire = async (input: any) => {
        const title = typeof input === "string" ? input : input?.title;
        if (title === "修改分類") {
          return { value: "精品分類" };
        }
        if (title === "刪除分類？") {
          return { isConfirmed: true };
        }
        return await baseFire(input);
      };
    });

    await page.goto("/dashboard.html");
    await page.locator("#tab-categories").click();

    const rows = page.locator("#categories-list > div[data-id]");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("測試分類");

    await page.locator("#new-cat-name").fill("新品分類");
    await page.getByRole("button", { name: "新增" }).click();
    await expect(rows).toHaveCount(2);
    await expect(page.locator("#categories-list")).toContainText("新品分類");

    await rows.filter({ hasText: "測試分類" }).getByRole("button", { name: "編輯" }).click();
    await expect(page.locator("#categories-list")).toContainText("精品分類");

    await rows.filter({ hasText: "精品分類" }).getByRole("button", { name: "刪除" }).click();
    await expect(rows).toHaveCount(1);
    await expect(page.locator("#categories-list")).not.toContainText("精品分類");
  });

  test("dashboard users and blacklist controls work without document event delegation", async ({ page }) => {
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

      const originalAddEventListener = Document.prototype.addEventListener;
      Document.prototype.addEventListener = function patchedAddEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
      ) {
        if (
          this === document &&
          (type === "click" || type === "change" || type === "keyup")
        ) {
          return;
        }
        return originalAddEventListener.call(this, type, listener, options);
      };

      const baseFire = (window as any).Swal.fire;
      (window as any).Swal.fire = async (input: any) => {
        const title = typeof input === "string" ? input : input?.title;
        if (title === "設為 管理員？") {
          return { isConfirmed: true };
        }
        if (title === "封鎖用戶") {
          return { value: "惡意棄單" };
        }
        if (title === "解除封鎖？") {
          return { isConfirmed: true };
        }
        return await baseFire(input);
      };
    });

    await page.goto("/dashboard.html");
    await page.locator("#tab-users").click();

    const usersTable = page.locator("#users-table");
    await expect(usersTable).toContainText("測試會員");
    await expect(usersTable).toContainText("管理測試員");

    await page.locator("#user-search").fill("測試會員");
    await page.locator("#user-search").press("Enter");
    await expect(usersTable).toContainText("測試會員");
    await expect(usersTable).not.toContainText("管理測試員");

    const userRow = usersTable.locator("tr").filter({ hasText: "測試會員" });
    await userRow.getByRole("button", { name: "設為管理員" }).click();
    await expect(userRow).toContainText("管理員");
    await expect(userRow.getByRole("button", { name: "移除管理員" })).toBeVisible();

    await userRow.getByRole("button", { name: "封鎖" }).click();
    await expect(userRow).toContainText("黑名單");
    await expect(userRow.getByRole("button", { name: "解除封鎖" })).toBeVisible();

    await page.locator("#tab-blacklist").click();
    const blacklistTable = page.locator("#blacklist-table");
    await expect(blacklistTable).toContainText("測試會員");
    await expect(blacklistTable).toContainText("惡意棄單");

    await blacklistTable
      .locator("tr")
      .filter({ hasText: "測試會員" })
      .getByRole("button", { name: "解除封鎖" })
      .click();
    await expect(blacklistTable).not.toContainText("測試會員");
  });

  test("dashboard promotions controls work without document event delegation", async ({ page }) => {
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

      const originalAddEventListener = Document.prototype.addEventListener;
      Document.prototype.addEventListener = function patchedAddEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
      ) {
        if (this === document && (type === "click" || type === "change")) {
          return;
        }
        return originalAddEventListener.call(this, type, listener, options);
      };

      const baseFire = (window as any).Swal.fire;
      (window as any).Swal.fire = async (input: any) => {
        const title = typeof input === "string" ? input : input?.title;
        if (title === "刪除活動？") {
          return { isConfirmed: true };
        }
        return await baseFire(input);
      };
    });

    await page.goto("/dashboard.html");
    await page.locator("#tab-promotions").click();

    const rows = page.locator("#promotions-table tr[data-id]");
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText("任選 2 件 9 折");

    await page.getByRole("button", { name: "+ 新增活動" }).click();
    await expect(page.locator("#promotion-modal")).toBeVisible();
    await page.locator("#prm-name").fill("新品活動");
    await page.locator(".promo-product-cb").first().check();
    await page.locator("#prm-discount-value").fill("88");
    await page.getByRole("button", { name: "儲存" }).click();

    await expect(rows).toHaveCount(2);
    await expect(page.locator("#promotions-table")).toContainText("新品活動");

    await rows.filter({ hasText: "新品活動" }).getByRole("button", { name: "編輯" }).click();
    await page.locator("#prm-name").fill("新版活動");
    await page.getByRole("button", { name: "儲存" }).click();

    const updatedRow = rows.filter({ hasText: "新版活動" });
    await expect(updatedRow).toHaveCount(1);
    await updatedRow.getByRole("button", { name: "啟用" }).click();
    await expect(updatedRow.getByRole("button", { name: "未啟用" })).toBeVisible();

    await updatedRow.getByRole("button", { name: "刪除" }).click();
    await expect(rows).toHaveCount(1);
    await expect(page.locator("#promotions-table")).not.toContainText("新版活動");
  });

  test("dashboard settings icon controls work without document event delegation", async ({ page }) => {
    await installGlobalStubs(page);
    await installDashboardRoutes(page, {
      uploadAssetUrl: "icons/uploaded-brand.png",
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

      const originalAddEventListener = Document.prototype.addEventListener;
      Document.prototype.addEventListener = function patchedAddEventListener(
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
      ) {
        if (
          this === document &&
          (type === "click" || type === "change")
        ) {
          return;
        }
        return originalAddEventListener.call(this, type, listener, options);
      };
    });

    await page.goto("/dashboard.html");
    await page.locator("#tab-settings").click();

    await page.locator("#s-site-icon-upload").setInputFiles({
      name: "brand.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+y3c8AAAAASUVORK5CYII=",
        "base64",
      ),
    });

    await expect(page.locator("#s-site-icon-url")).toHaveValue(
      "icons/uploaded-brand.png",
    );

    await page.locator("#tab-icon-library").click();
    await page.locator("#icon-library-target").selectOption("delivery");
    await page
      .locator("#icon-library-grid > div")
      .filter({ hasText: "icons/delivery-truck.png" })
      .getByRole("button", { name: "快速套用" })
      .click();

    await page.locator("#tab-settings").click();
    await expect(page.locator("#s-delivery-icon-url")).toHaveValue(
      "icons/delivery-truck.png",
    );
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

  test("dashboard no longer exposes legacy window globals", async ({ page }) => {
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
    await expect(page.locator("#admin-page")).toBeVisible();

    const globals = await page.evaluate(() => ({
      loginWithLine: typeof (window as any).loginWithLine,
      logout: typeof (window as any).logout,
      showTab: typeof (window as any).showTab,
      linePayRefundOrder: typeof (window as any).linePayRefundOrder,
      showPromotionModal: typeof (window as any).showPromotionModal,
    }));

    expect(globals).toEqual({
      loginWithLine: "undefined",
      logout: "undefined",
      showTab: "undefined",
      linePayRefundOrder: "undefined",
      showPromotionModal: "undefined",
    });
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
    await page
      .locator("#products-main-table tbody.sortable-tbody tr")
      .filter({ hasText: "後台測試商品" })
      .getByRole("button", { name: "編輯" })
      .click();
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
    await page
      .locator("#promotions-table tr")
      .filter({ hasText: "任選 2 件 9 折" })
      .getByRole("button", { name: "編輯" })
      .click();
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
    await expect(page.getByRole("button", { name: "設為管理員" }).first()).toBeVisible();
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
