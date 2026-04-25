import { expect, test } from "@playwright/test";
import {
  installDashboardRoutes,
  installGlobalStubs,
} from "../support/smoke-fixtures";

type DashboardSettingsUpdatePayload = {
  settings?: Record<string, string>;
};

test.describe("smoke / dashboard settings", () => {
  test("dashboard checkout settings keeps delivery routing rows visible", async ({ page }) => {
    await installGlobalStubs(page);
    await installDashboardRoutes(page);
    await page.setViewportSize({ width: 390, height: 844 });

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
    await page.locator("#tab-checkout-settings").click();

    const deliveryRows = page.locator("#delivery-routing-table .delivery-option-row");
    await expect(deliveryRows).toHaveCount(1);
    await expect(deliveryRows.first().locator(".do-name")).toHaveValue("配送到府");
    await expect(page.getByText(["備援", "字元"].join(""))).toHaveCount(0);
    await expect(page.locator("#po-linepay-icon")).toHaveCount(0);
    await expect(deliveryRows.first().locator(".do-desc")).toHaveJSProperty(
      "tagName",
      "TEXTAREA",
    );
    await expect.poll(async () => {
      const fileBox = await deliveryRows.first().locator(".icon-upload-file")
        .boundingBox();
      const uploadBox = await deliveryRows.first().locator(".icon-upload-action")
        .boundingBox();
      return Boolean(fileBox && uploadBox && uploadBox.y > fileBox.y);
    }).toBe(true);
    await expect.poll(() =>
      page.locator("#delivery-routing-table").evaluate((element) =>
        element.scrollWidth <= element.clientWidth + 2
      )
    ).toBe(true);
    const paymentCards = page.locator("#payment-options-table .payment-option-card");
    await expect(paymentCards).toHaveCount(4);
    await expect(page.locator("#payment-options-table")).toContainText("linepay");
    await expect.poll(async () => {
      const linePayCard = paymentCards.filter({ hasText: "linepay" }).first();
      const fileBox = await linePayCard.locator(".icon-upload-file").boundingBox();
      const uploadBox = await linePayCard.locator(".icon-upload-action").boundingBox();
      return Boolean(fileBox && uploadBox && uploadBox.y > fileBox.y);
    }).toBe(true);
    await expect.poll(() =>
      page.locator("#payment-options-table").evaluate((element) =>
        element.scrollWidth <= element.clientWidth + 2
      )
    ).toBe(true);
  });

  test("dashboard checkout settings can add and remove delivery routing rows", async ({ page }) => {
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
    await page.locator("#tab-checkout-settings").click();

    const deliveryRows = page.locator("#delivery-routing-table .delivery-option-row");
    await expect(deliveryRows).toHaveCount(1);

    await page.getByRole("button", { name: "+ 新增取貨方式" }).click();
    await expect(deliveryRows).toHaveCount(2);
    await expect(deliveryRows.nth(1).locator(".do-name")).toHaveValue("新物流方式");

    await deliveryRows.nth(1).getByRole("button", { name: "刪除" }).click();
    await expect(deliveryRows).toHaveCount(1);
  });

  test("dashboard settings save sends branding and section title state", async ({ page }) => {
    let updatePayload: DashboardSettingsUpdatePayload | null = null;

    await installGlobalStubs(page);
    await installDashboardRoutes(page, {
      onUpdateSettings: (request) => {
        updatePayload = request.postDataJSON() as DashboardSettingsUpdatePayload;
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
    await page.getByRole("button", { name: "儲存設定" }).click();

    await expect.poll(() => updatePayload?.settings?.site_title).toBe("新的品牌名稱");
    expect(updatePayload?.settings?.site_subtitle).toBe("新的副標題");
    expect(updatePayload?.settings?.announcement_enabled).toBe("true");
    expect(updatePayload?.settings?.announcement).toBe("今日暫停部分配送");
    expect(updatePayload?.settings?.is_open).toBe("false");
    expect(updatePayload?.settings?.products_section_title).toBe("精品豆專區");
    expect(updatePayload?.settings?.products_section_color).toBe("#cb4b16");
  });

  test("dashboard section title settings are scannable cards", async ({ page }) => {
    await installGlobalStubs(page);
    await installDashboardRoutes(page);
    await page.setViewportSize({ width: 390, height: 844 });

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

    const settingsCard = page.locator("#section-title-settings-card");
    await expect(settingsCard.locator(".section-title-card")).toHaveCount(3);
    await expect(settingsCard.locator(".section-title-preview").first())
      .toContainText("咖啡豆選購");
    await expect.poll(async () => {
      const firstCard = settingsCard.locator(".section-title-card").first();
      const fileBox = await firstCard.locator(".icon-upload-file").boundingBox();
      const uploadBox = await firstCard.locator(".icon-upload-action").boundingBox();
      return Boolean(fileBox && uploadBox && uploadBox.y > fileBox.y);
    }).toBe(true);
    await expect.poll(() =>
      settingsCard.evaluate((element) => element.scrollWidth <= element.clientWidth + 2)
    ).toBe(true);
  });

  test("dashboard checkout settings save sends routing and payment option state", async ({ page }) => {
    let updatePayload: DashboardSettingsUpdatePayload | null = null;

    await installGlobalStubs(page);
    await installDashboardRoutes(page, {
      onUpdateSettings: (request) => {
        updatePayload = request.postDataJSON() as DashboardSettingsUpdatePayload;
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
    });

    await page.goto("/dashboard.html");
    await page.locator("#tab-checkout-settings").click();

    const firstDeliveryRow = page.locator("#delivery-routing-table .delivery-option-row")
      .first();
    await expect(firstDeliveryRow.locator(".do-name")).toHaveValue("配送到府");
    await firstDeliveryRow.locator(".do-name").fill("新的取貨名稱");
    await firstDeliveryRow.locator(".do-desc").fill("第一行說明\n第二行提醒");
    await expect(firstDeliveryRow.locator(".do-name")).toHaveValue("新的取貨名稱");
    await page.locator("#po-linepay-name").fill("LINE Pay 快速付款");
    await page.locator("#s-linepay-sandbox").uncheck();
    await page.locator("#checkout-settings-section").getByRole("button", {
      name: "儲存設定",
    }).click();

    await expect.poll(() => updatePayload?.settings?.delivery_options_config)
      .toBeTruthy();
    const deliveryConfig = JSON.parse(
      updatePayload?.settings?.delivery_options_config || "[]",
    );
    const paymentConfig = JSON.parse(
      updatePayload?.settings?.payment_options_config || "{}",
    );
    expect(deliveryConfig[0]?.name).toBe("新的取貨名稱");
    expect(deliveryConfig[0]?.description).toBe("第一行說明\n第二行提醒");
    expect(deliveryConfig[0]).not.toHaveProperty("icon");
    expect(paymentConfig.linepay?.name).toBe("LINE Pay 快速付款");
    expect(paymentConfig.linepay).not.toHaveProperty("icon");
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
});
