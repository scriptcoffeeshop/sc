import { assertEquals, assertExists } from "@std/assert";
import app from "../index.ts";
import { signJwt } from "../utils/auth.ts";
import type { JsonRecord } from "../utils/json.ts";
import { withMockedSupabaseTables } from "./test-support.ts";

function buildActionRequest(
  action: string,
  options: {
    method?: "GET" | "POST";
    body?: JsonRecord;
    headers?: HeadersInit;
  } = {},
): Request {
  const method = options.method || "GET";
  const headers = new Headers(options.headers);

  if (method === "GET") {
    return new Request(`https://example.com/?action=${action}`, {
      method,
      headers,
    });
  }

  headers.set("content-type", "application/json");
  return new Request("https://example.com/", {
    method,
    headers,
    body: JSON.stringify({
      action,
      ...(options.body || {}),
    }),
  });
}

Deno.test({
  name:
    "Settings Integration - updateSettings round-trips normalized delivery and payment configs",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    await withMockedSupabaseTables({
      coffee_users: [{
        line_user_id: "settings-roundtrip-admin",
        role: "ADMIN",
        status: "ACTIVE",
      }],
      coffee_settings: [],
    }, async (tables) => {
      const token = await signJwt({ userId: "settings-roundtrip-admin" });
      const deliveryOptions = JSON.stringify([
        {
          id: "delivery",
          label: "宅配",
          description: "黑貓配送",
          iconUrl: "https://scriptcoffee.com.tw/sc/icons/delivery-truck.png",
          enabled: true,
          fee: 100,
          free_threshold: 1200,
          payment: {
            cod: true,
            linepay: true,
            jkopay: true,
            transfer: true,
          },
        },
        {
          id: "seven_eleven",
          label: "7-11 取件",
          icon_url: "/icons/seven-eleven-store.png",
          enabled: false,
          fee: 0,
          free_threshold: 0,
          payment: {
            cod: true,
            linepay: false,
            jkopay: false,
            transfer: false,
          },
        },
      ]);
      const paymentOptions = JSON.stringify({
        linepay: {
          label: "LINE Pay",
          iconUrl: "https://scriptcoffee.com.tw/icons/payment-linepay.png",
          enabled: true,
        },
        jkopay: {
          label: "街口支付",
          icon_url: "/sc/icons/payment-jkopay.png",
          enabled: true,
        },
        transfer: {
          label: "線上轉帳",
          icon_url: "https://cdn.example.com/payment-bank.png",
          enabled: true,
        },
      });

      const updateResponse = await app.fetch(
        buildActionRequest("updateSettings", {
          method: "POST",
          headers: { authorization: `Bearer ${token}` },
          body: {
            settings: {
              linepay_sandbox: false,
              delivery_options_config: deliveryOptions,
              payment_options_config: paymentOptions,
              site_icon_url: "https://www.scriptcoffee.com.tw/icons/logo.png",
            },
          },
        }),
      );
      const updatePayload = await updateResponse.json();

      assertEquals(updateResponse.status, 200);
      assertEquals(updatePayload.success, true);

      const linePaySandboxRow = tables.coffee_settings.find((row) =>
        row.key === "linepay_sandbox"
      );
      const deliveryOptionsRow = tables.coffee_settings.find((row) =>
        row.key === "delivery_options_config"
      );
      const paymentOptionsRow = tables.coffee_settings.find((row) =>
        row.key === "payment_options_config"
      );
      const siteIconRow = tables.coffee_settings.find((row) =>
        row.key === "site_icon_url"
      );

      assertExists(linePaySandboxRow);
      assertExists(deliveryOptionsRow);
      assertExists(paymentOptionsRow);
      assertExists(siteIconRow);

      assertEquals(linePaySandboxRow.value, "false");
      assertEquals(siteIconRow.value, "icons/logo.png");
      assertEquals(JSON.parse(String(deliveryOptionsRow.value)), [
        {
          id: "delivery",
          label: "宅配",
          description: "黑貓配送",
          enabled: true,
          fee: 100,
          free_threshold: 1200,
          payment: {
            cod: true,
            linepay: true,
            jkopay: true,
            transfer: true,
          },
          icon_url: "icons/delivery-truck.png",
        },
        {
          id: "seven_eleven",
          label: "7-11 取件",
          enabled: false,
          fee: 0,
          free_threshold: 0,
          payment: {
            cod: true,
            linepay: false,
            jkopay: false,
            transfer: false,
          },
          icon_url: "icons/seven-eleven-store.png",
        },
      ]);
      assertEquals(JSON.parse(String(paymentOptionsRow.value)), {
        linepay: {
          label: "LINE Pay",
          enabled: true,
          icon_url: "icons/payment-linepay.png",
        },
        jkopay: {
          label: "街口支付",
          enabled: true,
          icon_url: "icons/payment-jkopay.png",
        },
        transfer: {
          label: "線上轉帳",
          enabled: true,
          icon_url: "https://cdn.example.com/payment-bank.png",
        },
      });

      const getResponse = await app.fetch(buildActionRequest("getSettings"));
      const getPayload = await getResponse.json();

      assertEquals(getResponse.status, 200);
      assertEquals(getPayload.success, true);
      assertEquals(getPayload.settings.linepay_sandbox, "false");
      assertEquals(getPayload.settings.site_icon_url, "icons/logo.png");
      assertEquals(
        JSON.parse(getPayload.settings.delivery_options_config),
        JSON.parse(String(deliveryOptionsRow.value)),
      );
      assertEquals(
        JSON.parse(getPayload.settings.payment_options_config),
        JSON.parse(String(paymentOptionsRow.value)),
      );
    });
  },
});

Deno.test({
  name:
    "Settings Integration - updateSettings upserts composite keys and public getSettings stays consistent",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    await withMockedSupabaseTables({
      coffee_users: [{
        line_user_id: "settings-upsert-admin",
        role: "ADMIN",
        status: "ACTIVE",
      }],
      coffee_settings: [
        { key: "linepay_sandbox", value: "true" },
        {
          key: "delivery_options_config",
          value: JSON.stringify([{
            id: "delivery",
            label: "舊宅配",
            enabled: true,
          }]),
        },
        {
          key: "payment_options_config",
          value: JSON.stringify({
            linepay: { label: "舊 LINE Pay", enabled: false },
          }),
        },
        { key: "smtp_user", value: "private@example.com" },
      ],
    }, async (tables) => {
      const token = await signJwt({ userId: "settings-upsert-admin" });

      const updateResponse = await app.fetch(
        buildActionRequest("updateSettings", {
          method: "POST",
          headers: { authorization: `Bearer ${token}` },
          body: {
            settings: {
              linepay_sandbox: true,
              delivery_options_config: JSON.stringify([{
                id: "delivery",
                label: "新宅配",
                icon_url: "icons/delivery-truck.png",
                enabled: true,
              }]),
              payment_options_config: JSON.stringify({
                linepay: {
                  label: "新 LINE Pay",
                  icon_url: "icons/payment-linepay.png",
                  enabled: true,
                },
              }),
            },
          },
        }),
      );
      const updatePayload = await updateResponse.json();

      assertEquals(updateResponse.status, 200);
      assertEquals(updatePayload.success, true);

      assertEquals(
        tables.coffee_settings.filter((row) => row.key === "linepay_sandbox")
          .length,
        1,
      );
      assertEquals(
        tables.coffee_settings.filter((row) =>
          row.key === "delivery_options_config"
        ).length,
        1,
      );
      assertEquals(
        tables.coffee_settings.filter((row) =>
          row.key === "payment_options_config"
        ).length,
        1,
      );

      const publicGetResponse = await app.fetch(
        buildActionRequest("getSettings"),
      );
      const publicGetPayload = await publicGetResponse.json();

      assertEquals(publicGetResponse.status, 200);
      assertEquals(publicGetPayload.success, true);
      assertEquals(publicGetPayload.settings.linepay_sandbox, "true");
      assertEquals(
        JSON.parse(publicGetPayload.settings.delivery_options_config),
        [{
          id: "delivery",
          label: "新宅配",
          icon_url: "icons/delivery-truck.png",
          enabled: true,
        }],
      );
      assertEquals(
        JSON.parse(publicGetPayload.settings.payment_options_config),
        {
          linepay: {
            label: "新 LINE Pay",
            icon_url: "icons/payment-linepay.png",
            enabled: true,
          },
        },
      );
      assertEquals("smtp_user" in publicGetPayload.settings, false);
    });
  },
});
