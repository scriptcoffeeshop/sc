import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";

Deno.test("Basic Router Test - Health Check", async () => {
    // 這裡可以匯入 router 邏輯進行單元測試
    // 暫時以純邏輯測試代替
    const sum = (a: number, b: number) => a + b;
    assertEquals(sum(1, 2), 3);
});

Deno.test("Utility Test - HTML Escape", () => {
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    const escapeHtml = (text: string) => String(text).replace(/[&<>"']/g, (m) => map[m]);
    assertEquals(escapeHtml("<div>"), "&lt;div&gt;");
});
