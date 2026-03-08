import { expect, test } from "@playwright/test";

test("check pm-category DOM", async ({ page }) => {
  // Login as admin
  await page.goto("http://127.0.0.1:4173/dashboard.html");
  await page.evaluate(() => {
    localStorage.setItem(
      "coffee_admin",
      JSON.stringify({ userId: "test", displayName: "Admin" }),
    );
    localStorage.setItem("coffee_jwt", "test_token");
  });

  // mock the API requests
  let categoriesCalled = false;
  await page.route("**/coffee-api*", async (route) => {
    const action = new URL(route.request().url()).searchParams.get("action");
    if (action === "getCategories") {
      categoriesCalled = true;
      await route.fulfill({
        json: {
          success: true,
          categories: [{ id: 1, name: "單品豆" }, { id: 2, name: "配方豆" }],
        },
      });
    } else if (action === "getProductsAdmin") {
      await route.fulfill({
        json: {
          success: true,
          products: [{
            id: 1,
            name: "VOID 配方豆",
            category: "配方豆",
            specs: "[]",
            order_index: 0,
            enabled: true,
          }],
        },
      });
    } else {
      await route.fulfill({ json: { success: true, settings: [] } });
    }
  });

  await page.reload();

  await page.click("#tab-products");

  // wait for categories list to render (it means categories API is done)
  await page.waitForSelector("#categories-list div");

  // dump global categories array
  const globalCats = await page.evaluate(() => (window as any).categories);
  console.log("Global categories count:", globalCats?.length);
  console.log("Global categories JSON:", JSON.stringify(globalCats));

  // wait for products list to finish rendering
  await page.click("#tab-products");
  await page.waitForSelector('button[data-action="edit-product"]');

  // click edit on the first product
  await page.click('button[data-action="edit-product"]');

  // wait for modal
  await page.waitForSelector("#product-modal:not(.hidden)");

  // query select html
  const selectHTML = await page.$eval("#pm-category", (el) => el.outerHTML);
  console.log("PM-CATEGORY HTML:", selectHTML);
});
