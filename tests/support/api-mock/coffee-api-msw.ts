import { http, HttpResponse } from "msw";
import smokeFixtures from "../../fixtures/smoke-fixtures.json";

interface QuoteRequestItem {
  productId?: number | string;
  specKey?: string;
  qty?: number | string;
}

function buildInitDataPayload() {
  const defaultPayment = {
    cod: true,
    linepay: false,
    jkopay: false,
    transfer: true,
  };
  const deliveryOptions = smokeFixtures.main.deliveryOptions.map((option) => ({
    ...option,
    payment: defaultPayment,
  }));
  return {
    success: true,
    products: smokeFixtures.main.products,
    categories: smokeFixtures.main.categories,
    formFields: [],
    bankAccounts: smokeFixtures.main.bankAccounts,
    promotions: [],
    settings: {
      is_open: "true",
      delivery_options_config: JSON.stringify(deliveryOptions),
      payment_options_config: JSON.stringify(smokeFixtures.main.paymentOptions),
    },
  };
}

function buildQuotePayload(requestBody: {
  items?: QuoteRequestItem[];
  deliveryMethod?: string;
}) {
  const reqItems = Array.isArray(requestBody.items) ? requestBody.items : [];
  const items = reqItems.map((item) => {
    const qty = Math.max(1, Number(item.qty) || 1);
    const unitPrice = 220;
    return {
      productId: Number(item.productId) || 101,
      productName: "測試豆",
      specKey: String(item.specKey || "quarter"),
      specLabel: "1/4磅",
      qty,
      unitPrice,
      lineTotal: qty * unitPrice,
    };
  });
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const shippingFee = 0;
  return {
    success: true,
    quote: {
      deliveryMethod: requestBody.deliveryMethod || "delivery",
      availablePaymentMethods: {
        cod: true,
        linepay: false,
        jkopay: false,
        transfer: true,
      },
      items,
      appliedPromos: [],
      discountedItemKeys: [],
      subtotal,
      totalDiscount: 0,
      afterDiscount: subtotal,
      shippingFee,
      total: subtotal + shippingFee,
      orderLines: [
        ...items.map((item) =>
          `${item.productName} (${item.specLabel}) x ${item.qty} (${item.lineTotal}元)`
        ),
        `🚚 運費: $${shippingFee}`,
      ],
      ordersText: [
        ...items.map((item) =>
          `${item.productName} (${item.specLabel}) x ${item.qty} (${item.lineTotal}元)`
        ),
        `🚚 運費: $${shippingFee}`,
      ].join("\\n"),
    },
  };
}

async function parseRequestBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body)
      ? body as Record<string, unknown>
      : {};
  } catch (_error) {
    return {};
  }
}

export function createCoffeeApiMswHandlers(apiUrl = "*/coffee-api") {
  return [
    http.all(apiUrl, async ({ request }) => {
      const url = new URL(request.url);
      const action = url.searchParams.get("action") || "";
      if (request.method === "OPTIONS") {
        return HttpResponse.json({});
      }

      if (action === "getInitData") {
        return HttpResponse.json(buildInitDataPayload());
      }

      if (action === "quoteOrder") {
        return HttpResponse.json(buildQuotePayload(await parseRequestBody(request)));
      }

      if (action === "customerLineLogin") {
        return HttpResponse.json({
          success: true,
          user: {
            userId: "customer-line-1",
            displayName: "LINE 測試客戶",
            pictureUrl: "",
          },
          token: "mock-customer-token",
        });
      }

      return HttpResponse.json({ success: true });
    }),
  ];
}
