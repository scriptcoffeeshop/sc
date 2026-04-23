export function parseEnabledProductSpecs(product: any = {}) {
  let specs = [];
  try {
    specs = Array.isArray(product.specs)
      ? product.specs
      : JSON.parse(String(product.specs || "[]"));
  } catch {
    specs = [];
  }

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
  products: any[] = [],
  categories: any[] = [],
) {
  const grouped: Record<string, any[]> = {};

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

function parseJsonArray(value) {
  const raw = String(value || "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value) {
  const raw = String(value || "").trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function normalizeDeliveryPaymentConfig(payment: any = {}) {
  const hasJkoPay = Object.prototype.hasOwnProperty.call(payment, "jkopay");
  return {
    cod: Boolean(payment.cod),
    linepay: Boolean(payment.linepay),
    jkopay: hasJkoPay ? Boolean(payment.jkopay) : Boolean(payment.linepay),
    transfer: Boolean(payment.transfer),
  };
}

export function normalizeStorefrontDeliveryOption(option: any = {}) {
  return {
    ...option,
    id: String(option.id || ""),
    icon: String(option.icon || ""),
    icon_url: String(option.icon_url || option.iconUrl || ""),
    label: String(option.label || option.name || ""),
    name: String(option.name || option.label || ""),
    description: String(option.description || ""),
    enabled: option.enabled !== false,
    payment: normalizeDeliveryPaymentConfig(option.payment || {}),
  };
}

export function normalizeStorefrontDeliveryConfig(settings: any = {}) {
  const configuredDeliveryOptions = parseJsonArray(settings.delivery_options_config);
  if (configuredDeliveryOptions.length) {
    return configuredDeliveryOptions.map((option) =>
      normalizeStorefrontDeliveryOption(option)
    );
  }

  let paymentRoutingConfig = parseJsonObject(settings.payment_routing_config);
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
