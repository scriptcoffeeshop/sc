import { getDefaultIconUrl, normalizeIconPath } from "../../lib/icons.ts";

type SettingsRecord = Record<string, unknown>;

export interface DashboardPaymentRouting {
  cod: boolean;
  linepay: boolean;
  jkopay: boolean;
  transfer: boolean;
}

export interface DashboardDeliveryOption extends SettingsRecord {
  id: string;
  icon: string;
  icon_url: string;
  name: string;
  description: string;
  enabled: boolean;
  label?: string;
  fee?: number;
  free_threshold?: number;
  payment?: DashboardPaymentRouting;
}

export interface DashboardPaymentOption extends SettingsRecord {
  icon: string;
  icon_url: string;
  name: string;
  description: string;
}

function asRecord(value: unknown): SettingsRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as SettingsRecord
    : {};
}

export const DEFAULT_DELIVERY_OPTIONS: Record<string, DashboardDeliveryOption> = {
  in_store: {
    id: "in_store",
    icon: "",
    icon_url: getDefaultIconUrl("in_store"),
    name: "來店自取",
    description: "到店自取",
    enabled: true,
  },
  delivery: {
    id: "delivery",
    icon: "",
    icon_url: getDefaultIconUrl("delivery_method"),
    name: "配送到府 (限新竹)",
    description: "專人外送",
    enabled: true,
  },
  home_delivery: {
    id: "home_delivery",
    icon: "",
    icon_url: getDefaultIconUrl("home_delivery"),
    name: "全台宅配",
    description: "宅配到府",
    enabled: true,
  },
  seven_eleven: {
    id: "seven_eleven",
    icon: "",
    icon_url: getDefaultIconUrl("seven_eleven"),
    name: "7-11 取件",
    description: "超商門市",
    enabled: true,
  },
  family_mart: {
    id: "family_mart",
    icon: "",
    icon_url: getDefaultIconUrl("family_mart"),
    name: "全家取件",
    description: "超商門市",
    enabled: true,
  },
};

export const DEFAULT_PAYMENT_OPTIONS: Record<string, DashboardPaymentOption> = {
  cod: {
    icon: "",
    icon_url: getDefaultIconUrl("cod"),
    name: "取件 / 到付",
    description: "取貨時付現或宅配到付",
  },
  linepay: {
    icon: "",
    icon_url: getDefaultIconUrl("linepay"),
    name: "LINE Pay",
    description: "線上安全付款",
  },
  jkopay: {
    icon: "",
    icon_url: getDefaultIconUrl("jkopay"),
    name: "街口支付",
    description: "街口支付線上付款",
  },
  transfer: {
    icon: "",
    icon_url: getDefaultIconUrl("transfer"),
    name: "線上轉帳",
    description: "ATM / 網銀匯款",
  },
};

export function normalizeDeliveryOption(
  item: SettingsRecord = {},
): DashboardDeliveryOption {
  const id = String(item.id || "").trim();
  const defaults = DEFAULT_DELIVERY_OPTIONS[id] || {
    id: id || `custom_${Date.now()}`,
    icon: "",
    icon_url: getDefaultIconUrl("delivery"),
    name: "新物流方式",
    description: "設定敘述",
    enabled: true,
  };
  const payment = asRecord(item.payment);

  const hasJkoPayInConfig = Object.prototype.hasOwnProperty.call(
    payment,
    "jkopay",
  );
  const inferredJkoPay = hasJkoPayInConfig
    ? !!payment.jkopay
    : !!payment.linepay;

  return {
    ...defaults,
    ...item,
    id: id || defaults.id,
    icon: String(item.icon ?? defaults.icon ?? ""),
    icon_url: normalizeIconPath(
      String(item.icon_url ?? item.iconUrl ?? defaults.icon_url ?? ""),
    ),
    name: String(item.name ?? defaults.name ?? ""),
    description: String(item.description ?? defaults.description ?? ""),
    enabled: item.enabled !== false,
    fee: Number.isFinite(Number(item.fee)) ? Number(item.fee) : 0,
    free_threshold: Number.isFinite(Number(item.free_threshold))
      ? Number(item.free_threshold)
      : 0,
    payment: {
      cod: payment.cod !== false,
      linepay: !!payment.linepay,
      jkopay: inferredJkoPay,
      transfer: !!payment.transfer,
    },
  };
}

export function normalizePaymentOption(
  method: string,
  option: SettingsRecord = {},
): DashboardPaymentOption {
  const defaults = DEFAULT_PAYMENT_OPTIONS[method] || DEFAULT_PAYMENT_OPTIONS.cod;
  return {
    ...defaults,
    ...option,
    icon: String(option.icon ?? defaults.icon ?? ""),
    icon_url: normalizeIconPath(
      String(option.icon_url ?? option.iconUrl ?? defaults.icon_url ?? ""),
    ),
    name: String(option.name ?? defaults.name ?? ""),
    description: String(option.description ?? defaults.description ?? ""),
  };
}

export function sectionIconSettingKey(section: unknown): string {
  const normalized = String(section || "").trim();
  if (!normalized) return "";
  return `${normalized}_section_icon_url`;
}
