import { expect, type Page, test } from "@playwright/test";
import {
  API_URL,
  fulfillJson,
  installGlobalStubs,
  SUPABASE_REST_PREFIX,
} from "./support/smoke-fixtures";

type DashboardDownloadRecord = {
  download: string;
  href: string;
  text: string;
};

type FeatureSwalResult = {
  isConfirmed?: boolean;
  value?: unknown;
};

interface FeatureJsonRecord {
  [key: string]: unknown;
}

type FeatureSwal = {
  close: () => void;
  fire: () => Promise<FeatureSwalResult>;
  mixin: () => { fire: () => Promise<Record<string, never>> };
  showLoading: () => void;
};

type FeatureWindow = Window & typeof globalThis & {
  __dashboardDownloads?: DashboardDownloadRecord[];
  Swal: FeatureSwal;
};

async function installStorefrontFeatureRoutes(page: Page) {
  await page.route(
    `${SUPABASE_REST_PREFIX}**`,
    async (route) => route.abort(),
  );

  await page.route(`${API_URL}**`, async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return fulfillJson(route, {});

    const action = new URL(request.url()).searchParams.get("action");
    if (action === "getInitData") {
      return fulfillJson(route, {
        success: true,
        products: [{
          id: 101,
          category: "測試分類",
          name: "測試豆",
          description: "feature e2e",
          price: 220,
          roastLevel: "中焙",
          specs: JSON.stringify([
            { key: "quarter", label: "1/4磅", price: 220, enabled: true },
          ]),
          enabled: true,
        }],
        categories: [{ id: 1, name: "測試分類" }],
        formFields: [],
        bankAccounts: [],
        promotions: [],
        settings: {
          is_open: "true",
          delivery_options_config: JSON.stringify([
            {
              id: "family_mart",
              name: "全家取貨",
              description: "全家門市取貨",
              enabled: true,
              payment: { cod: true, linepay: false, transfer: false },
            },
          ]),
          payment_options_config: JSON.stringify({
            cod: { icon_url: "", name: "貨到付款", description: "到付" },
          }),
        },
      });
    }
    if (action === "createStoreMapSession") {
      expect(request.method()).toBe("POST");
      const payload = new URLSearchParams(request.postData() || "");
      expect(payload.get("deliveryMethod")).toBe("family_mart");
      expect(payload.get("clientUrl") || "").toContain("/main.html");
      return fulfillJson(route, {
        success: true,
        mapUrl: "/mock-ecpay-map.html",
        params: { MerchantID: "123456", LogisticsType: "CVS" },
      });
    }
    return fulfillJson(route, { success: true });
  });
}

type DashboardFeatureRouteOptions = {
  onAddToBlacklist?: (payload: FeatureJsonRecord) => void;
  onUpdateOrderStatus?: (payload: FeatureJsonRecord) => void;
  orders?: Array<FeatureJsonRecord>;
  users?: Array<FeatureJsonRecord>;
  blacklist?: Array<FeatureJsonRecord>;
};

async function installDashboardFeatureRoutes(
  page: Page,
  options: DashboardFeatureRouteOptions = {},
) {
  const ordersState = Array.isArray(options.orders)
    ? options.orders.map((order) => ({ ...order }))
    : [];
  const usersState = Array.isArray(options.users)
    ? options.users.map((user) => ({ ...user }))
    : [];
  let blacklistState = Array.isArray(options.blacklist)
    ? options.blacklist.map((entry) => ({ ...entry }))
    : [];

  await page.route(`${API_URL}**`, async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return fulfillJson(route, {});

    const action = new URL(request.url()).searchParams.get("action");
    if (action === "getOrders") {
      return fulfillJson(route, { success: true, orders: ordersState });
    }
    if (action === "getUsers") {
      return fulfillJson(route, { success: true, users: usersState });
    }
    if (action === "getBlacklist") {
      return fulfillJson(route, { success: true, blacklist: blacklistState });
    }
    if (action === "getProducts") {
      return fulfillJson(route, { success: true, products: [] });
    }
    if (action === "getCategories") {
      return fulfillJson(route, { success: true, categories: [] });
    }
    if (action === "getPromotions") {
      return fulfillJson(route, { success: true, promotions: [] });
    }
    if (action === "getFormFieldsAdmin") {
      return fulfillJson(route, { success: true, fields: [] });
    }
    if (action === "getBankAccounts") {
      return fulfillJson(route, { success: true, accounts: [] });
    }
    if (action === "getSettings") {
      return fulfillJson(route, {
        success: true,
        settings: {
          site_title: "Script Coffee",
          site_subtitle: "咖啡豆｜耳掛",
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
          delivery_options_config: JSON.stringify([]),
          payment_options_config: JSON.stringify({
            cod: { icon_url: "", name: "貨到/取貨付款", description: "到付" },
            linepay: { icon_url: "", name: "LINE Pay", description: "線上安全付款" },
            jkopay: { icon_url: "", name: "街口支付", description: "街口支付線上付款" },
            transfer: { icon_url: "", name: "線上轉帳", description: "ATM / 網銀匯款" },
          }),
        },
      });
    }
    if (action === "addToBlacklist") {
      const payload = request.postDataJSON() as FeatureJsonRecord;
      options.onAddToBlacklist?.(payload);
      const targetUserId = String(payload.targetUserId || "");
      const targetUser = usersState.find((user) =>
        String(user.userId || "") === targetUserId
      );
      blacklistState = [
        ...blacklistState.filter((entry) =>
          String(entry.lineUserId || "") !== targetUserId
        ),
        {
          lineUserId: targetUserId,
          displayName: String(targetUser?.displayName || ""),
          blockedAt: "2026-04-21T01:00:00.000Z",
          reason: String(payload.reason || ""),
        },
      ];
      return fulfillJson(route, { success: true });
    }
    if (action === "updateOrderStatus") {
      const payload = request.postDataJSON() as FeatureJsonRecord;
      options.onUpdateOrderStatus?.(payload);
      return fulfillJson(route, { success: true });
    }
    return fulfillJson(route, { success: true });
  });
}

async function seedAdminSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "coffee_admin",
      JSON.stringify({ userId: "admin-1", role: "SUPER_ADMIN" }),
    );
    localStorage.setItem("coffee_jwt", "mock-token");
  });
}

async function installDashboardDownloadRecorder(page: Page) {
  await page.addInitScript(() => {
    const testWindow = window as FeatureWindow;
    const blobStore = new Map<string, Blob>();
    const downloads: DashboardDownloadRecord[] = [];

    testWindow.__dashboardDownloads = downloads;
    URL.createObjectURL = ((blob: Blob) => {
      const href = `blob:mock-${downloads.length + blobStore.size + 1}`;
      blobStore.set(href, blob);
      return href;
    }) as typeof URL.createObjectURL;
    URL.revokeObjectURL = ((href: string) => {
      blobStore.delete(href);
    }) as typeof URL.revokeObjectURL;
    HTMLAnchorElement.prototype.click = function () {
      const record = {
        href: this.href,
        download: this.download,
        text: "",
      };
      downloads.push(record);
      const blob = blobStore.get(this.href);
      if (blob) {
        void blob.text().then((text) => {
          record.text = text;
        });
      }
    };
  });
}

async function getDashboardDownloads(page: Page) {
  return await page.evaluate(() => {
    const testWindow = window as Partial<FeatureWindow>;
    const downloads = testWindow.__dashboardDownloads;
    return Array.isArray(downloads)
      ? downloads.map((record) => ({
        download: String(record.download || ""),
        href: String(record.href || ""),
        text: String(record.text || ""),
      }))
      : [];
  });
}

async function installFeatureSwalResponse(
  page: Page,
  response: FeatureSwalResult,
) {
  await page.addInitScript((swalResponse) => {
    const noop = () => {};
    const testWindow = window as FeatureWindow;
    testWindow.Swal = {
      fire: async () => swalResponse,
      close: noop,
      showLoading: noop,
      mixin: () => ({ fire: async () => ({}) }),
    };
  }, response);
}

test.describe("Features E2E", () => {
  test("ECPay map integration triggers correctly payload", async ({ page }) => {
    await installGlobalStubs(page);
    await installStorefrontFeatureRoutes(page);

    await page.route("**/mock-ecpay-map.html", (route) => {
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html>ECPAY MAP OK</html>",
      });
    });

    await page.goto("/main.html");

    const deliveryOption = page.locator('.delivery-option[data-id="family_mart"]');
    await expect(deliveryOption).toBeVisible();
    await deliveryOption.click();

    const storeSelectButton = page.locator(".store-select-btn");
    await expect(storeSelectButton).toBeVisible();
    await Promise.all([
      page.waitForNavigation({ url: /mock-ecpay-map/ }),
      storeSelectButton.click(),
    ]);

    expect(page.url()).toContain("mock-ecpay-map.html");
    await expect(page.locator("body")).toContainText("ECPAY MAP OK");
  });

  test("Admin export orders triggers download", async ({ page }) => {
    await installGlobalStubs(page);
    await installDashboardFeatureRoutes(page, {
      orders: [{
        orderId: "ORD-EXPORT-1",
        total: 100,
        timestamp: "2026-03-09T00:00:00.000Z",
        deliveryMethod: "delivery",
        city: "新竹市",
        district: "東區",
        address: "測試路 1 號",
        status: "pending",
        paymentMethod: "cod",
        paymentStatus: "pending",
        lineName: "匯出測試客戶",
      }],
    });
    await installDashboardDownloadRecorder(page);
    await seedAdminSession(page);

    await page.goto("/dashboard.html");

    await page.getByRole("button", { name: "匯出篩選 CSV" }).click();

    await expect.poll(async () => (await getDashboardDownloads(page)).length)
      .toBe(1);
    await expect.poll(async () =>
      (await getDashboardDownloads(page))[0]?.text || ""
    ).toContain("ORD-EXPORT-1");
    const [download] = await getDashboardDownloads(page);
    expect(download?.download).toMatch(/^orders-filtered-.*\.csv$/);
  });

  test("Admin can add user to blacklist", async ({ page }) => {
    await installGlobalStubs(page);

    let blacklistPayload: FeatureJsonRecord | null = null;
    await installDashboardFeatureRoutes(page, {
      users: [{
        userId: "U123",
        displayName: "BadUser",
        status: "ACTIVE",
        email: "bad@example.com",
        phone: "0912000111",
        lastLogin: "2026-03-09T00:00:00.000Z",
        role: "USER",
      }],
      onAddToBlacklist: (payload) => {
        blacklistPayload = payload;
      },
    });

    await installFeatureSwalResponse(page, {
      isConfirmed: true,
      value: "Violation rule",
    });
    await seedAdminSession(page);

    await page.goto("/dashboard.html");
    await page.locator("#tab-users").click();

    const userRow = page.locator("#users-table .users-card").filter({ hasText: "BadUser" });
    const blacklistBtn = userRow.getByRole("button", { name: "封鎖" });
    await expect(blacklistBtn).toBeVisible();
    await blacklistBtn.click();

    await expect.poll(() => blacklistPayload).toBeTruthy();
    expect(blacklistPayload?.targetUserId).toBe("U123");
    expect(blacklistPayload?.reason).toBe("Violation rule");
  });

  test("Admin status change triggers API update correctly", async ({ page }) => {
    await installGlobalStubs(page);

    let updatePayload: FeatureJsonRecord | null = null;
    await installDashboardFeatureRoutes(page, {
      orders: [{
        orderId: "ORD2",
        timestamp: "2026-03-09T00:00:00.000Z",
        deliveryMethod: "in_store",
        status: "processing",
        lineName: "C1",
        phone: "0912000222",
        email: "c1@example.com",
        items: "測試豆 x1",
        total: 180,
        paymentMethod: "cod",
        paymentStatus: "",
      }],
      onUpdateOrderStatus: (payload) => {
        updatePayload = payload;
      },
    });
    await seedAdminSession(page);

    await page.goto("/dashboard.html");
    const orderCard = page.locator("#orders-list > .order-card").filter({ hasText: "ORD2" });
    const select = orderCard.locator("select");
    await select.selectOption("shipped");
    await orderCard.getByRole("button", { name: "確認" }).click();

    await expect.poll(() => updatePayload).toBeTruthy();
    expect(updatePayload?.orderId).toBe("ORD2");
    expect(updatePayload?.status).toBe("shipped");
  });
});
