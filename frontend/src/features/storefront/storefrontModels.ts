import {
  asJsonRecord,
  parseJsonArray,
  parseJsonRecord,
  type JsonRecord,
} from "../../lib/jsonUtils.ts";

interface StorefrontProductInput {
  id?: unknown;
  category?: unknown;
  name?: unknown;
  description?: unknown;
  roastLevel?: unknown;
  price?: unknown;
  specs?: unknown;
}

interface StorefrontCategoryInput {
  name?: unknown;
}

interface StorefrontProductSpecInput {
  key?: unknown;
  label?: unknown;
  price?: unknown;
  enabled?: unknown;
}

export interface StorefrontProductSpec {
  key: string;
  label: string;
  price: number;
}

export interface StorefrontProductViewModel {
  id: number;
  name: string;
  description: string;
  roastLevel: string;
  specs: StorefrontProductSpec[];
}

export interface StorefrontCategoryViewModel {
  name: string;
  products: StorefrontProductViewModel[];
}

export interface StorefrontPaymentConfig {
  cod: boolean;
  linepay: boolean;
  jkopay: boolean;
  transfer: boolean;
}

export interface StorefrontDeliveryOption extends JsonRecord {
  id: string;
  icon_url: string;
  label: string;
  name: string;
  description: string;
  enabled: boolean;
  payment: StorefrontPaymentConfig;
}

function asRecord(value: unknown): JsonRecord {
  return asJsonRecord(value);
}

export function parseEnabledProductSpecs(
  product: StorefrontProductInput = {},
): StorefrontProductSpec[] {
  const specs = parseJsonArray(product.specs)
    .map((spec) => asRecord(spec) as StorefrontProductSpecInput);

  const enabledSpecs = specs.filter((spec) => spec && spec.enabled !== false);
  if (enabledSpecs.length) {
    return enabledSpecs.map((spec) => ({
      key: String(spec.key || ""),
      label: String(spec.label || ""),
      price: Number(spec.price) || 0,
    }));
  }

  return [{
    key: "default",
    label: "預設",
    price: Number(product.price) || 0,
  }];
}

export function buildStorefrontProductsViewModel(
  products: StorefrontProductInput[] = [],
  categories: StorefrontCategoryInput[] = [],
): StorefrontCategoryViewModel[] {
  const grouped: Record<string, StorefrontProductViewModel[]> = {};

  products.forEach((product) => {
    const categoryName = String(product.category || "未分類");
    if (!grouped[categoryName]) grouped[categoryName] = [];
    grouped[categoryName].push({
      id: Number(product.id) || 0,
      name: String(product.name || ""),
      description: String(product.description || ""),
      roastLevel: String(product.roastLevel || ""),
      specs: parseEnabledProductSpecs(product),
    });
  });

  const categoryOrder = categories.map((category) => String(category?.name || ""));
  return Object.keys(grouped).sort((left, right) => {
    const leftIndex = categoryOrder.indexOf(left);
    const rightIndex = categoryOrder.indexOf(right);
    if (leftIndex === -1 && rightIndex === -1) {
      return left.localeCompare(right, "zh-Hant");
    }
    if (leftIndex === -1) return 1;
    if (rightIndex === -1) return -1;
    return leftIndex - rightIndex;
  }).map((name) => ({
    name,
    products: grouped[name],
  }));
}

function normalizeDeliveryPaymentConfig(
  payment: JsonRecord = {},
): StorefrontPaymentConfig {
  const hasJkoPay = Object.prototype.hasOwnProperty.call(payment, "jkopay");
  return {
    cod: Boolean(payment.cod),
    linepay: Boolean(payment.linepay),
    jkopay: hasJkoPay ? Boolean(payment.jkopay) : Boolean(payment.linepay),
    transfer: Boolean(payment.transfer),
  };
}

export function normalizeStorefrontDeliveryOption(
  option: JsonRecord = {},
): StorefrontDeliveryOption {
  const payment = asRecord(option.payment);
  const normalized = { ...option };
  delete normalized.icon;
  delete normalized.iconUrl;
  return {
    ...normalized,
    id: String(option.id || ""),
    icon_url: String(option.icon_url || option.iconUrl || ""),
    label: String(option.label || option.name || ""),
    name: String(option.name || option.label || ""),
    description: String(option.description || ""),
    enabled: option.enabled !== false,
    payment: normalizeDeliveryPaymentConfig(payment),
  };
}

export function normalizeStorefrontDeliveryConfig(
  settings: JsonRecord = {},
): StorefrontDeliveryOption[] {
  const configuredDeliveryOptions = parseJsonArray(settings.delivery_options_config);
  if (configuredDeliveryOptions.length) {
    return configuredDeliveryOptions.map((option) =>
      normalizeStorefrontDeliveryOption(asRecord(option))
    );
  }

  let paymentRoutingConfig = parseJsonRecord(
    settings.payment_routing_config,
  ) as Record<string, JsonRecord>;
  if (!Object.keys(paymentRoutingConfig).length) {
    const linePayEnabled = String(settings.linepay_enabled) === "true";
    const transferEnabled = String(settings.transfer_enabled) === "true";
    paymentRoutingConfig = {
      in_store: {
        cod: true,
        linepay: linePayEnabled,
        jkopay: linePayEnabled,
        transfer: transferEnabled,
      },
      delivery: {
        cod: true,
        linepay: linePayEnabled,
        jkopay: linePayEnabled,
        transfer: transferEnabled,
      },
      home_delivery: {
        cod: true,
        linepay: linePayEnabled,
        jkopay: linePayEnabled,
        transfer: transferEnabled,
      },
      seven_eleven: {
        cod: true,
        linepay: false,
        jkopay: false,
        transfer: false,
      },
      family_mart: {
        cod: true,
        linepay: false,
        jkopay: false,
        transfer: false,
      },
    };
  }

  return [
    {
      id: "in_store",
      name: "來店自取",
      description: "到店自取",
      payment: paymentRoutingConfig.in_store,
    },
    {
      id: "delivery",
      name: "配送到府 (限新竹)",
      description: "專人外送",
      payment: paymentRoutingConfig.delivery,
    },
    {
      id: "home_delivery",
      name: "全台宅配",
      description: "宅配到府",
      payment: paymentRoutingConfig.home_delivery,
    },
    {
      id: "seven_eleven",
      name: "7-11 取件",
      description: "超商門市",
      payment: paymentRoutingConfig.seven_eleven,
    },
    {
      id: "family_mart",
      name: "全家取件",
      description: "超商門市",
      payment: paymentRoutingConfig.family_mart,
    },
  ].map((option) => normalizeStorefrontDeliveryOption(option));
}
