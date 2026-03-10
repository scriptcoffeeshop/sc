import { expect, type Page, type Route, test } from "@playwright/test";

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
    (window as any).Swal = {
      fire: async () => ({ isConfirmed: true }),
      close: noop,
      showLoading: noop,
      mixin: () => ({ fire: async () => ({}) }),
    };
  });
}

test.describe("Features E2E", () => {
  test("ECPay map integration triggers correctly payload", async ({ page }) => {
    await installGlobalStubs(page);

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
          products: [],
          categories: [],
          settings: {
            is_open: "true",
            delivery_options_config: JSON.stringify([
              {
                id: "family_mart",
                name: "全家取貨",
                enabled: true,
                payment: { cod: true },
              },
            ]),
          },
        });
      }
      if (action === "createStoreMapSession") {
        return fulfillJson(route, {
          success: true,
          mapUrl: "/mock-ecpay-map.html",
          params: { MerchantID: "123456", LogisticsType: "CVS" },
        });
      }
      return fulfillJson(route, { success: true });
    });

    await page.route("**/mock-ecpay-map.html", (route) => {
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html>ECPAY MAP OK</html>",
      });
    });

    await page.goto("/main.html");

    // Click delivery
    await page.locator(
      '[data-action="select-delivery"][data-method="family_mart"]',
    ).click();

    // Click map
    let mapUrls: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("mock-ecpay-map.html")) {
        mapUrls.push(request.url());
      }
    });

    // Because openStoreMap is a form submission it might navigate away
    // we use Promise.all to wait for navigation
    await Promise.all([
      page.waitForNavigation({ url: /mock-ecpay-map/ }),
      page.locator('[data-action="open-store-map"]').click(),
    ]);

    expect(page.url()).toContain("mock-ecpay-map.html");
  });

  test("Admin export orders triggers download", async ({ page }) => {
    page.on("console", (msg) => console.log("BROWSER CONSOLE:", msg.text()));
    await installGlobalStubs(page);
    await page.route(`${API_URL}**`, async (route) => {
      const request = route.request();
      if (request.method() === "OPTIONS") return fulfillJson(route, {});
      const action = new URL(request.url()).searchParams.get("action");
      if (action === "getOrders") {
        return fulfillJson(route, {
          success: true,
          orders: [{
            orderId: "ORD-EXPORT-1",
            total: 100,
            timestamp: "2026-03-09T00:00:00.000Z",
            deliveryMethod: "delivery",
            status: "pending",
            paymentMethod: "cod",
            paymentStatus: "pending",
          }],
          pagination: { totalCount: 1, totalPages: 1, page: 1, pageSize: 50 },
        });
      }
      if (action === "getProducts") {
        return fulfillJson(route, { success: true, products: [] });
      }
      if (action === "getCategories") {
        return fulfillJson(route, { success: true, categories: [] });
      }
      if (action === "getSettings") {
        return fulfillJson(route, { success: true, settings: {} });
      }
      // Mock the blob export API
      if (action === "exportOrdersCSV") {
        return route.fulfill({
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="export.csv"',
          },
          body: "\ufefforderId,total\nORD-EXPORT-1,100",
        });
      }
      return fulfillJson(route, { success: true });
    });

    await page.addInitScript(() => {
      localStorage.setItem(
        "coffee_admin",
        JSON.stringify({ userId: "admin-1", role: "SUPER_ADMIN" }),
      );
      localStorage.setItem("coffee_jwt", "mock");
    });

    await page.goto("/dashboard.html");

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator('[data-action="export-orders-csv"]').click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/^orders-filtered-.*\.csv$/);
  });

  test("Admin can add user to blacklist", async ({ page }) => {
    page.on("console", (msg) => console.log("BROWSER CONSOLE:", msg.text()));
    await installGlobalStubs(page);

    let blacklistPayload: any = null;
    await page.route(`${API_URL}**`, async (route) => {
      const request = route.request();
      if (request.method() === "OPTIONS") return fulfillJson(route, {});
      const action = new URL(request.url()).searchParams.get("action");
      if (action === "getUsers") {
        return fulfillJson(route, {
          success: true,
          users: [{
            userId: "U123",
            displayName: "BadUser",
            status: "ACTIVE",
            lastLogin: "2026-03-09T00:00:00.000Z",
          }],
          pagination: { totalCount: 1, totalPages: 1, page: 1, pageSize: 50 },
          roles: { "U123": "USER" },
        });
      }
      if (action === "addToBlacklist") {
        blacklistPayload = request.postDataJSON();
        return fulfillJson(route, { success: true });
      }
      if (action === "getProducts") {
        return fulfillJson(route, { success: true, products: [] });
      }
      if (action === "getCategories") {
        return fulfillJson(route, { success: true, categories: [] });
      }
      if (action === "getSettings") {
        return fulfillJson(route, { success: true, settings: {} });
      }
      if (action === "getOrders") {
        return fulfillJson(route, {
          success: true,
          orders: [],
          pagination: { totalCount: 0, totalPages: 1, page: 1, pageSize: 50 },
        });
      }
      return fulfillJson(route, { success: true, blacklist: [] });
    });

    await page.addInitScript(() => {
      localStorage.setItem(
        "coffee_admin",
        JSON.stringify({ userId: "admin-1", role: "SUPER_ADMIN" }),
      );
      localStorage.setItem("coffee_jwt", "mock");
      // Pre-mock sweetalert — must keep close/showLoading/mixin or showAdmin() hangs
      const noop = () => {};
      (window as any).Swal = {
        fire: async () => ({ isConfirmed: true, value: "Violation rule" }),
        close: noop,
        showLoading: noop,
        mixin: () => ({ fire: async () => ({}) }),
      };
    });

    await page.goto("/dashboard.html");
    await page.locator("#tab-users").click();
    await page.waitForTimeout(300); // UI render

    const blacklistBtn = page.locator(
      '[data-action="toggle-user-blacklist"][data-user-id="U123"]',
    );
    await expect(blacklistBtn).toBeVisible();
    await blacklistBtn.click();

    await expect.poll(() => blacklistPayload).toBeTruthy();
    expect(blacklistPayload.targetUserId).toBe("U123");
    expect(blacklistPayload.reason).toBe("Violation rule");
  });

  test("Admin status change triggers API update correctly", async ({ page }) => {
    await installGlobalStubs(page);

    let updatePayload: any = null;
    await page.route(`${API_URL}**`, async (route) => {
      const request = route.request();
      if (request.method() === "OPTIONS") return fulfillJson(route, {});
      const action = new URL(request.url()).searchParams.get("action");
      if (action === "getOrders") {
        return fulfillJson(route, {
          success: true,
          orders: [{ orderId: "ORD2", status: "processing", lineName: "C1" }],
        });
      }
      if (action === "updateOrderStatus") {
        updatePayload = request.postDataJSON();
        return fulfillJson(route, { success: true });
      }
      return fulfillJson(route, { success: true });
    });

    await page.addInitScript(() => {
      localStorage.setItem(
        "coffee_admin",
        JSON.stringify({ userId: "1", role: "SUPER_ADMIN" }),
      );
      localStorage.setItem("coffee_jwt", "mock");
    });

    await page.goto("/dashboard.html");
    await page.waitForTimeout(300); // wait list

    const select = page.locator(
      'select[data-action="change-order-status"][data-order-id="ORD2"]',
    );
    await select.selectOption("shipped");

    await expect.poll(() => updatePayload).toBeTruthy();
    expect(updatePayload.orderId).toBe("ORD2");
    expect(updatePayload.status).toBe("shipped");
  });
});
