import { expect, test } from "@playwright/test";

const API_URL =
    "https://avnvsjyyeofivgmrchte.supabase.co/functions/v1/coffee-api";

test.describe("Integration Tests against real Edge Function", () => {
    // 預設跳過，避免 CI 對外部環境產生強依賴，可手動執行確認 API 存活
    test.skip("getInitData should return expected schema", async ({ request }) => {
        const response = await request.post(`${API_URL}?action=getInitData`, {
            data: {},
            headers: { "Content-Type": "application/json" },
        });

        expect(response.ok()).toBeTruthy();
        const result = await response.json();

        expect(result.success).toBe(true);
        expect(Array.isArray(result.products)).toBe(true);
        expect(Array.isArray(result.categories)).toBe(true);
        expect(result.settings).toBeDefined();
        expect(typeof result.settings).toBe("object");

        // 隨機檢查一條資料的必要欄位
        if (result.products.length > 0) {
            const p = result.products[0];
            expect(p).toHaveProperty("id");
            expect(p).toHaveProperty("name");
            expect(p).toHaveProperty("price");
        }
    });
});
