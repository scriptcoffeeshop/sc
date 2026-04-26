import type { Request as PlaywrightRequest } from "@playwright/test";
import smokeFixtures from "../../fixtures/smoke-fixtures.json";
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
const mainFixtures = smokeFixtures.main;

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
    deliveryOptions: options.deliveryOptions ??
      mainFixtures.deliveryOptions.map((option) => ({ ...option, payment })),
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
    products: mainFixtures.products,
    categories: mainFixtures.categories,
    formFields: state.formFields,
    bankAccounts: mainFixtures.bankAccounts,
    promotions: [],
    settings: {
      is_open: "true",
      delivery_options_config: JSON.stringify(state.deliveryOptions),
      payment_options_config: JSON.stringify(mainFixtures.paymentOptions),
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
