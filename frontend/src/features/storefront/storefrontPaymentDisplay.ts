import { createApp, type App } from "vue";
import { formatDateTimeText } from "../../lib/dateTime.ts";
import type {
  CustomerPaymentDisplay,
  PaymentActionGuide,
  PaymentDisplayInput,
  PaymentDisplayOptions,
  PaymentMethod,
} from "../../types";
import {
  DEFAULT_PAYMENT_ACTION_GUIDE,
  PAYMENT_ACTION_GUIDES,
  PAYMENT_METHOD_TEXT,
  PAYMENT_STATUS_TEXT,
} from "./storefrontPaymentDisplayConfig.ts";
import StorefrontPaymentDialogSummary, {
  type StorefrontPaymentDialogBankAccount,
  type StorefrontPaymentDialogRow,
  type StorefrontPaymentDialogSummaryView,
} from "./StorefrontPaymentDialogSummary.vue";

export { PAYMENT_METHOD_TEXT, PAYMENT_STATUS_TEXT };
export { formatDateTimeText };

export interface PaymentDialogOptions {
  [key: string]: unknown;
  icon: "success" | "error" | "warning" | "info";
  title: string;
  html: HTMLElement;
  confirmButtonColor: string;
  confirmButtonText: string;
  showCancelButton?: boolean;
  cancelButtonText?: string;
  cancelButtonColor?: string;
  paymentLaunchUrl?: string;
  didOpen?: (popup: unknown) => void;
  willClose?: () => void;
}

interface PaymentDialogShellOptions {
  icon: PaymentDialogOptions["icon"];
  title: string;
  confirmButtonColor: string;
  confirmButtonText: string;
  showCancelButton?: boolean;
  cancelButtonText?: string;
  cancelButtonColor?: string;
  paymentLaunchUrl?: string;
}

function normalizePaymentLaunchUrl(url: unknown): string {
  const raw = String(url || "").trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch (_error) {
    return "";
  }
}

function getPaymentLaunchActionLabel(paymentMethod: string): string {
  if (paymentMethod === "linepay") return "前往 LINE Pay 付款";
  if (paymentMethod === "jkopay") return "前往街口付款";
  return "前往付款";
}

function normalizePaymentMethod(paymentMethod: unknown): PaymentMethod | string {
  const normalized = String(paymentMethod || "").trim();
  return normalized || "cod";
}

function normalizePaymentStatusForDisplay(
  paymentMethod: unknown,
  paymentStatus: unknown,
): string {
  const normalized = String(paymentStatus || "").trim();
  if (normalized) return normalized;
  return normalizePaymentMethod(paymentMethod) === "cod" ? "" : "pending";
}

function getPaymentActionGuide(
  paymentMethod: string,
  paymentStatus: string,
): PaymentActionGuide {
  const guides = PAYMENT_ACTION_GUIDES[paymentMethod];
  return guides?.[paymentStatus] || guides?.default || DEFAULT_PAYMENT_ACTION_GUIDE;
}

export function getPaymentToneClasses(tone: string): string {
  if (tone === "success") {
    return "border-green-200 bg-green-50 text-green-900";
  }
  if (tone === "info") {
    return "border-sky-200 bg-sky-50 text-sky-900";
  }
  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }
  if (tone === "danger") {
    return "border-rose-200 bg-rose-50 text-rose-900";
  }
  return "border-slate-200 bg-slate-50 text-slate-900";
}

function getOrderHistoryPaymentGuideDescription(params: {
  paymentMethod: string;
  paymentStatus: string;
  resumePaymentLabel: string;
}): string {
  const paymentMethod = params?.paymentMethod;
  const paymentStatus = params?.paymentStatus;
  const resumePaymentLabel = params?.resumePaymentLabel;
  if (
    !["linepay", "jkopay"].includes(paymentMethod) ||
    !["pending", "processing"].includes(paymentStatus)
  ) {
    return "";
  }

  const methodLabel = PAYMENT_METHOD_TEXT[paymentMethod] || paymentMethod;
  const readableMethodLabel = /^[A-Za-z]/.test(methodLabel)
    ? ` ${methodLabel}`
    : methodLabel;
  if (paymentStatus === "processing") {
    if (!resumePaymentLabel) {
      return "付款結果正在同步中，通常 1 到 2 分鐘內會更新；若停留過久請聯繫店家協助。";
    }
    return `付款結果正在同步中；若您尚未完成付款，也可以點下方「${resumePaymentLabel}」繼續。`;
  }
  if (!resumePaymentLabel) {
    return `這筆訂單尚未完成${readableMethodLabel}，付款連結尚未建立；請稍候重新整理或聯繫店家協助。`;
  }
  return `這筆訂單尚未完成${readableMethodLabel}，請點下方「${resumePaymentLabel}」繼續；付款後狀態會自動同步。`;
}

export function getPaymentBadgeClass(paymentStatus: string): string {
  if (paymentStatus === "paid") return "bg-green-50 text-green-700";
  if (paymentStatus === "processing") return "bg-blue-50 text-blue-700";
  if (paymentStatus === "pending") return "bg-yellow-50 text-yellow-700";
  if (
    paymentStatus === "failed" || paymentStatus === "cancelled" ||
    paymentStatus === "expired"
  ) {
    return "bg-red-50 text-red-700";
  }
  if (paymentStatus === "refunded") return "bg-purple-50 text-purple-700";
  return "bg-gray-100 text-gray-600";
}

export function getCustomerPaymentDisplay(
  order: PaymentDisplayInput = {},
  options: PaymentDisplayOptions = {},
): CustomerPaymentDisplay {
  const paymentMethod = normalizePaymentMethod(order?.paymentMethod);
  const paymentStatus = normalizePaymentStatusForDisplay(
    paymentMethod,
    order?.paymentStatus,
  );
  const guide = getPaymentActionGuide(paymentMethod, paymentStatus);
  const paymentExpiresAtText = formatDateTimeText(order?.paymentExpiresAt);
  const paymentConfirmedAtText = formatDateTimeText(order?.paymentConfirmedAt);
  const paymentLastCheckedAtText = formatDateTimeText(order?.paymentLastCheckedAt);
  const paymentUrl = normalizePaymentLaunchUrl(order?.paymentUrl);
  const showPaymentDeadline = Boolean(paymentExpiresAtText) &&
    ["pending", "processing", "expired"].includes(paymentStatus);
  const canResumePayment = ["linepay", "jkopay"].includes(paymentMethod) &&
    ["pending", "processing"].includes(paymentStatus) &&
    Boolean(paymentUrl);
  const resumePaymentLabel = canResumePayment
    ? getPaymentLaunchActionLabel(paymentMethod)
    : "";
  const orderHistoryGuideDescription = options?.context === "orderHistory"
    ? getOrderHistoryPaymentGuideDescription({
      paymentMethod,
      paymentStatus,
      resumePaymentLabel,
    })
    : "";

  return {
    paymentMethod,
    paymentStatus,
    methodLabel: PAYMENT_METHOD_TEXT[paymentMethod] || paymentMethod,
    statusLabel: paymentStatus
      ? PAYMENT_STATUS_TEXT[paymentStatus] || paymentStatus
      : "",
    paymentExpiresAtText,
    paymentConfirmedAtText,
    paymentLastCheckedAtText,
    showPaymentDeadline,
    badgeClass: getPaymentBadgeClass(paymentStatus),
    showBadge: paymentMethod !== "cod",
    tone: guide.tone,
    guideTitle: guide.title,
    guideDescription: orderHistoryGuideDescription || guide.description,
    actionLabel: guide.actionLabel || "",
    actionType: guide.actionType || "",
    paymentUrl,
    canResumePayment,
    resumePaymentLabel,
  };
}

function createPaymentDialogOptions(
  options: PaymentDialogShellOptions,
  summary: StorefrontPaymentDialogSummaryView,
): PaymentDialogOptions {
  const root = document.createElement("div");
  let paymentDialogApp: App<Element> | null = null;

  const dialogOptions: PaymentDialogOptions = {
    ...options,
    html: root,
    didOpen: (popup: unknown) => {
      if (
        !root.isConnected &&
        popup &&
        typeof (popup as { appendChild?: unknown }).appendChild === "function"
      ) {
        (popup as { appendChild: (node: Node) => void }).appendChild(root);
      }
      paymentDialogApp = createApp(StorefrontPaymentDialogSummary, {
        summary,
      });
      paymentDialogApp.mount(root);
    },
    willClose: () => {
      paymentDialogApp?.unmount();
      paymentDialogApp = null;
    },
  };
  return dialogOptions;
}

function createPaymentRow(
  label: string,
  value: unknown,
  options: { strong?: boolean; tone?: StorefrontPaymentDialogRow["tone"] } = {},
): StorefrontPaymentDialogRow {
  const row: StorefrontPaymentDialogRow = {
    label,
    value: String(value || ""),
  };
  if (options.strong !== undefined) row.strong = options.strong;
  if (options.tone !== undefined) row.tone = options.tone;
  return row;
}

export function buildPaymentStatusDialogOptions(
  params: PaymentDisplayInput = {},
): PaymentDialogOptions {
  const display = getCustomerPaymentDisplay(params);
  const rows = [
    createPaymentRow("訂單編號", String(params?.orderId || "") || "未提供"),
    createPaymentRow("付款方式", display.methodLabel),
  ];
  if (display.statusLabel) {
    rows.push(createPaymentRow("付款狀態", display.statusLabel));
  }
  if (display.showPaymentDeadline) {
    rows.push(createPaymentRow("付款期限", display.paymentExpiresAtText));
  }
  if (display.paymentConfirmedAtText) {
    rows.push(createPaymentRow("付款完成", display.paymentConfirmedAtText));
  }
  if (display.paymentLastCheckedAtText) {
    rows.push(createPaymentRow("最近同步", display.paymentLastCheckedAtText));
  }

  const icon = display.paymentStatus === "paid" || display.paymentStatus === "refunded"
    ? "success"
    : display.paymentStatus === "failed"
    ? "error"
    : display.paymentStatus === "expired"
    ? "warning"
    : "info";

  const summary: StorefrontPaymentDialogSummaryView = {
    rows,
    guideDescription: display.guideDescription,
    bankAccount: null,
    footerText: "",
  };

  const dialogOptions = createPaymentDialogOptions(
    {
      icon,
      title: display.guideTitle,
      confirmButtonColor: "#3C2415",
      confirmButtonText: display.canResumePayment
        ? display.resumePaymentLabel
        : "我知道了",
    },
    summary,
  );

  if (display.canResumePayment) {
    dialogOptions.showCancelButton = true;
    dialogOptions.cancelButtonText = "關閉";
    dialogOptions.cancelButtonColor = "#94a3b8";
    dialogOptions.paymentLaunchUrl = display.paymentUrl;
  }

  return dialogOptions;
}

export function buildPaymentLaunchDialogOptions(
  params: PaymentDisplayInput = {},
): PaymentDialogOptions {
  const displayInput: PaymentDisplayInput = {
    paymentStatus: "pending",
  };
  if (params?.paymentMethod !== undefined) {
    displayInput.paymentMethod = params.paymentMethod;
  }
  if (params?.paymentExpiresAt !== undefined) {
    displayInput.paymentExpiresAt = params.paymentExpiresAt;
  }
  const display = getCustomerPaymentDisplay(displayInput);
  const total = Number(params?.total || 0);
  const rows = [
    createPaymentRow("訂單編號", String(params?.orderId || "") || "未提供"),
    createPaymentRow("付款方式", display.methodLabel),
    createPaymentRow("付款狀態", display.statusLabel || "待付款"),
    createPaymentRow("訂單金額", `$${total}`, { strong: true }),
  ];
  if (display.showPaymentDeadline) {
    rows.push(createPaymentRow("付款期限", display.paymentExpiresAtText));
  }

  return createPaymentDialogOptions(
    {
      icon: "info",
      title: `前往${display.methodLabel}`,
      confirmButtonText: `前往${display.methodLabel}`,
      cancelButtonText: "稍後付款",
      showCancelButton: true,
      confirmButtonColor: "#3C2415",
      cancelButtonColor: "#94a3b8",
    },
    {
      rows,
      guideDescription: display.guideDescription,
      bankAccount: null,
      footerText: "",
    },
  );
}

export function buildTransferOrderSuccessDialogOptions(params: {
  orderId?: unknown;
  total?: unknown;
  bankAccount?: {
    bankName?: unknown;
    bankCode?: unknown;
    accountNumber?: unknown;
    accountName?: unknown;
  } | null;
}): PaymentDialogOptions {
  const bankAccount = params.bankAccount;
  const bankAccountView: StorefrontPaymentDialogBankAccount | null = bankAccount
    ? {
      bankName: String(bankAccount.bankName || ""),
      bankCode: String(bankAccount.bankCode || ""),
      accountNumber: String(bankAccount.accountNumber || ""),
      accountName: String(bankAccount.accountName || ""),
    }
    : null;

  return createPaymentDialogOptions(
    {
      icon: "success",
      title: "訂單已成立",
      confirmButtonColor: "#3C2415",
      confirmButtonText: "我知道了",
    },
    {
      rows: [
        createPaymentRow("訂單編號", String(params.orderId || ""), {
          strong: true,
        }),
        createPaymentRow("匯款金額", `$${Number(params.total || 0)}`, {
          strong: true,
          tone: "danger",
        }),
      ],
      guideDescription: "請匯款至以下帳號：",
      bankAccount: bankAccountView,
      footerText: "(您的匯款末5碼已記錄，將用於對帳)",
    },
  );
}
