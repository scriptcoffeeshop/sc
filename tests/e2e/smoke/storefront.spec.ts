import { expect, test } from "@playwright/test";
import {
  expectColorsClose,
  installGlobalStubs,
  installMainRoutes,
} from "../support/smoke-fixtures";
import { gotoStorefront, installStorefrontUser } from "../support/storefront-smoke";

interface SmokeApiPayload {
  [key: string]: unknown;
}

test.describe("smoke / storefront basics", () => {
  test("storefront note textarea stays empty and keeps legacy warm palette", async ({ page }) => {
    await installGlobalStubs(page);
    await installMainRoutes(page);

    await gotoStorefront(page);

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
      | { method: string; url: string; body: SmokeApiPayload }
      | null = null;
    await installMainRoutes(page, {
      onCustomerLineLogin: (request) => {
        loginRequest = {
          method: request.method(),
          url: request.url(),
          body: request.postDataJSON() as SmokeApiPayload,
        };
      },
    });

    await page.addInitScript(() => {
      localStorage.setItem("coffee_line_state", "customer-state");
    });

    await gotoStorefront(page, "/main.html?code=customer-code&state=customer-state");

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

    await gotoStorefront(page);

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

  test("storefront action icons use vector sizing and currentColor", async ({ page }) => {
    await installGlobalStubs(page);
    await installMainRoutes(page);
    await installStorefrontUser(page);

    await gotoStorefront(page);

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
});
