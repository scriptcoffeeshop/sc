import { escapeHtml } from "../../lib/sharedUtils.ts";
import type {
  CustomerPaymentDisplay,
  PaymentActionGuide,
  PaymentDisplayInput,
  PaymentDisplayOptions,
  PaymentMethod,
} from "../../types";

export const PAYMENT_METHOD_TEXT: Record<string, string> = {
  cod: "貨到付款",
  linepay: "LINE Pay",
  jkopay: "街口支付",
  transfer: "線上轉帳",
};

export const PAYMENT_STATUS_TEXT: Record<string, string> = {
  pending: "待付款",
  processing: "付款確認中",
  paid: "已付款",
  failed: "付款失敗",
  cancelled: "付款取消",
  expired: "付款逾期",
  refunded: "已退款",
};

export interface PaymentDialogOptions extends Record<string, unknown> {
  icon: "success" | "error" | "warning" | "info";
  title: string;
  html: string;
  confirmButtonColor: string;
  confirmButtonText: string;
  showCancelButton?: boolean;
  cancelButtonText?: string;
  cancelButtonColor?: string;
  paymentLaunchUrl?: string;
}

export function formatDateTimeText(value: unknown): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString("zh-TW");
}

function normalizePaymentLaunchUrl(url: unknown): string {
  const raw = String(url || "").trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch {
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
  if (paymentMethod === "jkopay") {
    if (paymentStatus === "paid") {
      return {
        tone: "success",
        title: "街口支付已完成",
        description: "付款已完成，店家會依訂單狀態安排備貨與出貨。",
      };
    }
    if (paymentStatus === "processing") {
      return {
        tone: "info",
        title: "街口付款確認中",
        description:
          "您已返回商店，系統正在同步街口付款結果，通常 1 到 2 分鐘內會更新。",
      };
    }
    if (paymentStatus === "failed") {
      return {
        tone: "danger",
        title: "街口支付付款失敗",
        description:
          "街口支付未完成扣款。若您已看到扣款畫面，請先保留截圖並聯繫店家協助確認。",
      };
    }
    if (paymentStatus === "cancelled") {
      return {
        tone: "danger",
        title: "街口支付已取消",
        description: "您已取消街口支付付款流程；若仍需此商品，請重新下單。",
      };
    }
    if (paymentStatus === "expired") {
      return {
        tone: "warning",
        title: "街口支付已逾期",
        description: "付款期限已過，此筆街口支付已失效；若仍需此商品，請重新下單。",
      };
    }
    if (paymentStatus === "refunded") {
      return {
        tone: "success",
        title: "街口支付已退款",
        description: "此筆街口付款已退款完成，若款項未入帳請再聯繫店家確認。",
      };
    }
    return {
      tone: "warning",
      title: "街口支付待付款",
      description:
        "請儘快完成街口支付；若稍後付款，可到「我的訂單」重新打開付款連結。",
    };
  }

  if (paymentMethod === "linepay") {
    if (paymentStatus === "paid") {
      return {
        tone: "success",
        title: "LINE Pay 已完成",
        description: "付款已完成，店家會依訂單狀態安排備貨與出貨。",
      };
    }
    if (paymentStatus === "processing") {
      return {
        tone: "info",
        title: "LINE Pay 確認中",
        description: "系統正在同步 LINE Pay 付款結果，請稍候再回來查看。",
      };
    }
    if (paymentStatus === "failed") {
      return {
        tone: "danger",
        title: "LINE Pay 付款失敗",
        description: "LINE Pay 未完成付款，若仍需商品請重新下單。",
      };
    }
    if (paymentStatus === "cancelled") {
      return {
        tone: "danger",
        title: "LINE Pay 已取消",
        description: "您已取消 LINE Pay 付款流程；若仍需此商品，請重新下單。",
      };
    }
    if (paymentStatus === "expired") {
      return {
        tone: "warning",
        title: "LINE Pay 已逾期",
        description: "付款期限已過，此筆 LINE Pay 付款已失效；若仍需此商品，請重新下單。",
      };
    }
    return {
      tone: "warning",
      title: "LINE Pay 待付款",
      description:
        "請儘快完成 LINE Pay；若稍後付款，可到「我的訂單」重新打開付款連結。",
    };
  }

  if (paymentMethod === "transfer") {
    if (paymentStatus === "paid") {
      return {
        tone: "success",
        title: "匯款已確認",
        description: "店家已完成對帳，後續會依訂單狀態安排處理。",
      };
    }
    if (paymentStatus === "failed") {
      return {
        tone: "danger",
        title: "匯款對帳失敗",
        description: "目前尚未完成匯款對帳，請確認帳號末 5 碼是否正確並聯繫店家。",
      };
    }
    return {
      tone: "info",
      title: "等待店家核帳",
      description: "我們已收到您的匯款資訊，店家核帳後會將付款狀態更新為已付款。",
    };
  }

  return {
    tone: "neutral",
    title: "付款方式",
    description: "此訂單採取貨或到貨付款，請於取件或收貨時再付款。",
  };
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

export function buildPaymentStatusDialogOptions(
  params: PaymentDisplayInput = {},
): PaymentDialogOptions {
  const display = getCustomerPaymentDisplay(params);
  const orderId = escapeHtml(String(params?.orderId || ""));
  const detailLines = [
    `<p style="margin:0 0 8px 0;"><strong>訂單編號：</strong>${orderId || "未提供"}</p>`,
    `<p style="margin:0 0 8px 0;"><strong>付款方式：</strong>${escapeHtml(display.methodLabel)}</p>`,
  ];
  if (display.statusLabel) {
    detailLines.push(
      `<p style="margin:0 0 8px 0;"><strong>付款狀態：</strong>${escapeHtml(display.statusLabel)}</p>`,
    );
  }
  if (display.showPaymentDeadline) {
    detailLines.push(
      `<p style="margin:0 0 8px 0;"><strong>付款期限：</strong>${escapeHtml(display.paymentExpiresAtText)}</p>`,
    );
  }
  if (display.paymentConfirmedAtText) {
    detailLines.push(
      `<p style="margin:0 0 8px 0;"><strong>付款完成：</strong>${escapeHtml(display.paymentConfirmedAtText)}</p>`,
    );
  }
  if (display.paymentLastCheckedAtText) {
    detailLines.push(
      `<p style="margin:0 0 8px 0;"><strong>最近同步：</strong>${escapeHtml(display.paymentLastCheckedAtText)}</p>`,
    );
  }
  detailLines.push(
    `<p style="margin:12px 0 0 0; color:#475569;">${escapeHtml(display.guideDescription)}</p>`,
  );

  const icon = display.paymentStatus === "paid" || display.paymentStatus === "refunded"
    ? "success"
    : display.paymentStatus === "failed"
    ? "error"
    : display.paymentStatus === "expired"
    ? "warning"
    : "info";

  const dialogOptions: PaymentDialogOptions = {
    icon,
    title: display.guideTitle,
    html: `<div style="text-align:left; font-size:0.95rem; line-height:1.65;">${detailLines.join("")}</div>`,
    confirmButtonColor: "#3C2415",
    confirmButtonText: display.canResumePayment
      ? display.resumePaymentLabel
      : "我知道了",
  };

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
  const display = getCustomerPaymentDisplay({
    paymentMethod: params?.paymentMethod,
    paymentStatus: "pending",
    paymentExpiresAt: params?.paymentExpiresAt,
  });
  const orderId = escapeHtml(String(params?.orderId || ""));
  const total = Number(params?.total || 0);
  const detailLines = [
    `<p style="margin:0 0 8px 0;"><strong>訂單編號：</strong>${orderId || "未提供"}</p>`,
    `<p style="margin:0 0 8px 0;"><strong>付款方式：</strong>${escapeHtml(display.methodLabel)}</p>`,
    `<p style="margin:0 0 8px 0;"><strong>付款狀態：</strong>${escapeHtml(display.statusLabel || "待付款")}</p>`,
    `<p style="margin:0 0 8px 0;"><strong>訂單金額：</strong>$${total}</p>`,
  ];
  if (display.showPaymentDeadline) {
    detailLines.push(
      `<p style="margin:0 0 8px 0;"><strong>付款期限：</strong>${escapeHtml(display.paymentExpiresAtText)}</p>`,
    );
  }
  detailLines.push(
    `<p style="margin:12px 0 0 0; color:#475569;">${escapeHtml(display.guideDescription)}</p>`,
  );

  return {
    icon: "info",
    title: `前往${display.methodLabel}`,
    html: `<div style="text-align:left; font-size:0.95rem; line-height:1.65;">${detailLines.join("")}</div>`,
    confirmButtonText: `前往${display.methodLabel}`,
    cancelButtonText: "稍後付款",
    showCancelButton: true,
    confirmButtonColor: "#3C2415",
    cancelButtonColor: "#94a3b8",
  };
}
