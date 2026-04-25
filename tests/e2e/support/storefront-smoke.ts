import type { Page } from "@playwright/test";

export async function gotoStorefront(page: Page, path = "/main.html") {
  await page.goto(path, { waitUntil: "domcontentloaded" });
}

export async function installStorefrontUser(page: Page) {
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
}
