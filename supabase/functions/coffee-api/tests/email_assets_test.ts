import { assertEquals } from "@std/assert";
import { FRONTEND_URL } from "../utils/config.ts";
import { resolveEmailLogoUrl } from "../utils/email-assets.ts";

Deno.test("Email assets - resolve logo URL", () => {
  assertEquals(
    resolveEmailLogoUrl("https://cdn.example.com/logo.png"),
    "https://cdn.example.com/logo.png",
  );
  assertEquals(
    resolveEmailLogoUrl("/icons/custom.png"),
    `${String(FRONTEND_URL).replace(/\/+$/, "")}/icons/custom.png`,
  );
  assertEquals(
    resolveEmailLogoUrl(""),
    `${String(FRONTEND_URL).replace(/\/+$/, "")}/icons/logo.png`,
  );
});
