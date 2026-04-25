import type { Request as PlaywrightRequest } from "@playwright/test";
import type {
  FixtureDeliveryOption,
  FixtureFormField,
  FixturePaymentConfig,
  FixtureQuoteRequestItem,
  FixtureSettingsRecord,
} from "./smoke-domain-fixtures.ts";

export type MainRoutePaymentConfig = FixturePaymentConfig;
export type MainRouteDeliveryOption = FixtureDeliveryOption;
export type MainRouteFormField = FixtureFormField;
export type MainRouteSettings = FixtureSettingsRecord;

export type MainRouteOptions = {
  payment?: MainRoutePaymentConfig;
  deliveryOptions?: MainRouteDeliveryOption[];
  formFields?: MainRouteFormField[];
  settings?: MainRouteSettings;
  onCustomerLineLogin?: (request: PlaywrightRequest) => void;
};

export interface MainRouteNormalizedFormField {
  id: number;
  field_key: string;
  label: string;
  field_type: string;
  placeholder: string;
  options: string;
  required: boolean;
  enabled: boolean;
  delivery_visibility: string | null;
}

export interface MainRouteState {
  payment: Required<MainRoutePaymentConfig>;
  deliveryOptions: MainRouteDeliveryOption[];
  formFields: MainRouteNormalizedFormField[];
  settings: MainRouteSettings;
}

type QuoteRequestItem = FixtureQuoteRequestItem;

export function createMainRouteState(options: MainRouteOptions): MainRouteState {
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

  return {
    payment,
    deliveryOptions: options.deliveryOptions ?? [
      {
        id: "delivery",
        name: "配送到府",
        description: "新竹配送",
        enabled: true,
        payment,
      },
    ],
    formFields: Array.isArray(options.formFields)
      ? options.formFields.map((field, index) => ({
        id: Number(field.id) || index + 1,
        field_key: String(field.field_key || ""),
        label: String(field.label || ""),
        field_type: String(field.field_type || "text"),
        enabled: field.enabled !== false,
        required: Boolean(field.required),
        options: field.options || "",
        placeholder: field.placeholder || "",
        delivery_visibility: field.delivery_visibility ?? null,
      }))
      : [],
    settings: options.settings || {},
  };
}

export function buildMainInitDataPayload(state: MainRouteState) {
  return {
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
    formFields: state.formFields,
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
      delivery_options_config: JSON.stringify(state.deliveryOptions),
      payment_options_config: JSON.stringify({
        cod: { icon_url: "", name: "貨到付款", description: "到付" },
        linepay: {
          icon_url: "",
          name: "LINE Pay",
          description: "線上安全付款",
        },
        jkopay: {
          icon_url: "",
          name: "街口支付",
          description: "街口支付線上付款",
        },
        transfer: {
          icon_url: "",
          name: "線上轉帳",
          description: "ATM / 網銀",
        },
      }),
      ...state.settings,
    },
  };
}

export function buildQuotePayload(
  requestBody: { items?: QuoteRequestItem[]; deliveryMethod?: string },
  payment: Required<MainRoutePaymentConfig>,
) {
  const reqItems = Array.isArray(requestBody?.items) ? requestBody.items : [];
  const items = reqItems.map((item) => {
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
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const shippingFee = 0;
  const total = subtotal + shippingFee;

  return {
    success: true,
    quote: {
      deliveryMethod: requestBody?.deliveryMethod || "delivery",
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
