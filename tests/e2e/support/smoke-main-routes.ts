import {
  type Page,
  type Request as PlaywrightRequest,
} from "@playwright/test";
import { API_URL, fulfillJson, SUPABASE_REST_PREFIX } from "./smoke-shared.ts";

export type MainRouteOptions = {
  payment?: {
    cod: boolean;
    linepay: boolean;
    jkopay?: boolean;
    transfer: boolean;
  };
  deliveryOptions?: Array<{
    id: string;
    icon?: string;
    name: string;
    description: string;
    enabled: boolean;
    payment: {
      cod: boolean;
      linepay: boolean;
      jkopay?: boolean;
      transfer: boolean;
    };
  }>;
  formFields?: Array<{
    id?: number;
    field_key: string;
    label: string;
    field_type: string;
    placeholder?: string;
    options?: string;
    required?: boolean;
    enabled?: boolean;
    delivery_visibility?: string | null;
  }>;
  onCustomerLineLogin?: (request: PlaywrightRequest) => void;
};

export async function installMainRoutes(
  page: Page,
  options: MainRouteOptions = {},
) {
  const paymentSource = options.payment ??
    { cod: true, linepay: false, transfer: true };
  const payment = {
    cod: Boolean(paymentSource.cod),
    linepay: Boolean(paymentSource.linepay),
    jkopay: paymentSource.jkopay === undefined
      ? Boolean(paymentSource.linepay)
      : Boolean(paymentSource.jkopay),
    transfer: Boolean(paymentSource.transfer),
  };
  const deliveryOptions = options.deliveryOptions ?? [
    {
      id: "delivery",
      icon: "🛵",
      name: "配送到府",
      description: "新竹配送",
      enabled: true,
      payment,
    },
  ];
  const formFields = Array.isArray(options.formFields)
    ? options.formFields.map((field, index) => ({
      id: Number(field.id) || index + 1,
      enabled: field.enabled !== false,
      required: Boolean(field.required),
      options: field.options || "",
      placeholder: field.placeholder || "",
      delivery_visibility: field.delivery_visibility ?? null,
      ...field,
    }))
    : [];

  await page.route(`${SUPABASE_REST_PREFIX}**`, async (route) => {
    await route.abort();
  });

  await page.route(`${API_URL}**`, async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await fulfillJson(route, {});
      return;
    }

    const url = new URL(request.url());
    const action = url.searchParams.get("action");

    if (action === "getInitData") {
      await fulfillJson(route, {
        success: true,
        products: [
          {
            id: 101,
            category: "測試分類",
            name: "測試豆",
            description: "E2E smoke",
            price: 220,
            roastLevel: "中焙",
            specs: JSON.stringify([
              { key: "quarter", label: "1/4磅", price: 220, enabled: true },
            ]),
            enabled: true,
          },
        ],
        categories: [{ id: 1, name: "測試分類" }],
        formFields,
        bankAccounts: [
          {
            id: "ba-1",
            bankCode: "013",
            bankName: "國泰世華",
            accountNumber: "111122223333",
            accountName: "A戶",
          },
          {
            id: "ba-2",
            bankCode: "011",
            bankName: "台北富邦",
            accountNumber: "444455556666",
            accountName: "B戶",
          },
        ],
        promotions: [],
        settings: {
          is_open: "true",
          delivery_options_config: JSON.stringify(deliveryOptions),
          payment_options_config: JSON.stringify({
            cod: { icon: "💵", name: "貨到付款", description: "到付" },
            linepay: {
              icon: "💚",
              name: "LINE Pay",
              description: "線上安全付款",
            },
            jkopay: {
              icon: "🟧",
              name: "街口支付",
              description: "街口支付線上付款",
            },
            transfer: {
              icon: "🏦",
              name: "線上轉帳",
              description: "ATM / 網銀",
            },
          }),
        },
      });
      return;
    }

    if (action === "quoteOrder") {
      const body = request.postDataJSON() as any;
      const reqItems = Array.isArray(body?.items) ? body.items : [];
      const items = reqItems.map((item: any) => {
        const qty = Math.max(1, Number(item?.qty) || 1);
        const unitPrice = 220;
        return {
          productId: Number(item?.productId) || 101,
          productName: "測試豆",
          specKey: String(item?.specKey || "quarter"),
          specLabel: "1/4磅",
          qty,
          unitPrice,
          lineTotal: qty * unitPrice,
        };
      });
      const subtotal = items.reduce(
        (sum: number, item: any) => sum + item.lineTotal,
        0,
      );
      const shippingFee = 0;
      const total = subtotal + shippingFee;
      await fulfillJson(route, {
        success: true,
        quote: {
          deliveryMethod: body?.deliveryMethod || "delivery",
          availablePaymentMethods: payment,
          items,
          appliedPromos: [],
          discountedItemKeys: [],
          subtotal,
          totalDiscount: 0,
          afterDiscount: subtotal,
          shippingFee,
          total,
          orderLines: [
            ...items.map((item: any) =>
              `${item.productName} (${item.specLabel}) x ${item.qty} (${item.lineTotal}元)`
            ),
            `🚚 運費: $${shippingFee}`,
          ],
          ordersText: [
            ...items.map((item: any) =>
              `${item.productName} (${item.specLabel}) x ${item.qty} (${item.lineTotal}元)`
            ),
            `🚚 運費: $${shippingFee}`,
          ].join("\\n"),
        },
      });
      return;
    }

    if (action === "customerLineLogin") {
      options.onCustomerLineLogin?.(request);
      await fulfillJson(route, {
        success: true,
        user: {
          userId: "customer-line-1",
          displayName: "LINE 測試客戶",
          pictureUrl: "",
        },
        token: "mock-customer-token",
      });
      return;
    }

    await fulfillJson(route, { success: true });
  });
}
