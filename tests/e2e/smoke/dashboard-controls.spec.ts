import { expect, test } from "@playwright/test";
import {
  getClipboardWrites,
  installDashboardRoutes,
  installGlobalStubs,
} from "../support/smoke-fixtures";
import {
  gotoDashboard,
  installDashboardControlsHarness,
} from "../support/dashboard-smoke";

test.describe("smoke / dashboard controls", () => {
  test("dashboard form fields controls work without document event delegation", async ({ page }) => {
    await installGlobalStubs(page);
    await installDashboardRoutes(page);

    await installDashboardControlsHarness(page, {
      swalResponses: [
        {
          title: "新增欄位",
          response: {
            value: {
              fieldKey: "tax_id",
              label: "統一編號",
              fieldType: "text",
              placeholder: "請輸入統一編號",
              options: "",
              required: false,
              deliveryVisibility: null,
            },
          },
        },
        { title: "確認刪除", response: { isConfirmed: true } },
      ],
    });

    await gotoDashboard(page);
    await page.locator("#tab-formfields").click();

    const rows = page.locator("#formfields-sortable [data-field-id]");
    await expect(rows).toHaveCount(1);

    await page.getByRole("button", { name: "+ 新增欄位" }).click();
    await expect(rows).toHaveCount(2);
    await expect(rows.filter({ hasText: "統一編號" })).toHaveCount(1);

    const receiptRow = rows.filter({ hasText: "收據類型" });
    await receiptRow.getByRole("button", { name: "停用" }).click();
    await expect(receiptRow).toHaveClass(/is-disabled/);

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

    await installDashboardControlsHarness(page, {
      swalResponses: [
        { title: "確認變更訂單狀態", response: { isConfirmed: true } },
        { title: "確認收款", response: { isConfirmed: true } },
        { title: "LINE Pay 退款", response: { isConfirmed: true } },
        { title: "刪除訂單？", response: { isConfirmed: true } },
      ],
    });

    await gotoDashboard(page);

    const selectedCount = page.locator("#orders-selected-count");
    const selectAllCheckbox = page.locator("#orders-select-all");
    await expect(page.locator("#orders-list")).toContainText("#ORD001");
    await expect(page.locator("#orders-list")).toContainText("#ORD002");
    await expect(page.locator("#orders-list")).toContainText("#ORD003");

    await selectAllCheckbox.check();
    await expect(selectedCount).toHaveText("已選 3 筆");

    const order1 = page.locator("#orders-list > .order-card").filter({ hasText: "#ORD001" });
    await order1.locator("select").selectOption("processing");
    await order1.getByRole("button", { name: "確認" }).click();
    await expect(order1).toContainText("處理中");

    const order2 = page.locator("#orders-list > .order-card").filter({ hasText: "#ORD002" });
    await order2.getByRole("button", { name: "複製" }).click();
    await expect.poll(async () => {
      const writes = await getClipboardWrites(page);
      return writes[writes.length - 1] || null;
    }).toBe("TRK-002");
    await order2.getByRole("button", { name: "確認已收款" }).click();
    await expect(order2).toContainText("已付款");

    const order3 = page.locator("#orders-list > .order-card").filter({ hasText: "#ORD003" });
    await order3.getByRole("button", { name: /退款/ }).click();
    await expect(order3).toContainText("已退款");

    await order1.getByRole("button", { name: "刪除" }).click();
    await expect(page.locator("#orders-list")).not.toContainText("#ORD001");
  });

  test("dashboard products controls work without document event delegation", async ({ page }) => {
    await installGlobalStubs(page);
    await installDashboardRoutes(page);

    await installDashboardControlsHarness(page, {
      swalResponses: [
        { title: "刪除商品？", response: { isConfirmed: true } },
      ],
    });

    await gotoDashboard(page);
    await page.locator("#tab-products").click();

    const rows = page.locator("#products-main-table .product-card[data-id]");
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

    await installDashboardControlsHarness(page, {
      swalResponses: [
        { title: "修改分類", response: { value: "精品分類" } },
        { title: "刪除分類？", response: { isConfirmed: true } },
      ],
    });

    await gotoDashboard(page);
    await page.locator("#tab-categories").click();

    const rows = page.locator("#categories-list [data-id]");
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

    await installDashboardControlsHarness(page, {
      blockedEvents: ["click", "change", "keyup"],
      swalResponses: [
        { title: "設為 管理員？", response: { isConfirmed: true } },
        { title: "封鎖用戶", response: { value: "惡意棄單" } },
        { title: "解除封鎖？", response: { isConfirmed: true } },
      ],
    });

    await gotoDashboard(page);
    await page.locator("#tab-users").click();

    const usersTable = page.locator("#users-table");
    await expect(usersTable).toContainText("測試會員");
    await expect(usersTable).toContainText("管理測試員");

    await page.locator("#user-search").fill("測試會員");
    await page.locator("#user-search").press("Enter");
    await expect(usersTable).toContainText("測試會員");
    await expect(usersTable).not.toContainText("管理測試員");

    const userRow = usersTable.locator(".users-card").filter({ hasText: "測試會員" });
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
      .locator(".dashboard-item-card")
      .filter({ hasText: "測試會員" })
      .getByRole("button", { name: "解除封鎖" })
      .click();
    await expect(blacklistTable).not.toContainText("測試會員");
  });

  test("dashboard promotions controls work without document event delegation", async ({ page }) => {
    await installGlobalStubs(page);
    await installDashboardRoutes(page);

    await installDashboardControlsHarness(page, {
      swalResponses: [
        { title: "刪除活動？", response: { isConfirmed: true } },
      ],
    });

    await gotoDashboard(page);
    await page.locator("#tab-promotions").click();

    const rows = page.locator("#promotions-table .promotion-card[data-id]");
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
});
