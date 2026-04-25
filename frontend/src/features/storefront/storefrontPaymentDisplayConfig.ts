import type { PaymentActionGuide } from "../../types";

type PaymentGuideByStatus = {
  default: PaymentActionGuide;
  [paymentStatus: string]: PaymentActionGuide;
};

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

export const DEFAULT_PAYMENT_ACTION_GUIDE: PaymentActionGuide = {
  tone: "neutral",
  title: "付款方式",
  description: "此訂單採取貨或到貨付款，請於取件或收貨時再付款。",
};

export const PAYMENT_ACTION_GUIDES: Record<string, PaymentGuideByStatus> = {
  jkopay: {
    paid: {
      tone: "success",
      title: "街口支付已完成",
      description: "付款已完成，店家會依訂單狀態安排備貨與出貨。",
    },
    processing: {
      tone: "info",
      title: "街口付款確認中",
      description:
        "您已返回商店，系統正在同步街口付款結果，通常 1 到 2 分鐘內會更新。",
    },
    failed: {
      tone: "danger",
      title: "街口支付付款失敗",
      description:
        "街口支付未完成扣款。若您已看到扣款畫面，請先保留截圖並聯繫店家協助確認。",
    },
    cancelled: {
      tone: "danger",
      title: "街口支付已取消",
      description: "您已取消街口支付付款流程；若仍需此商品，請重新下單。",
    },
    expired: {
      tone: "warning",
      title: "街口支付已逾期",
      description: "付款期限已過，此筆街口支付已失效；若仍需此商品，請重新下單。",
    },
    refunded: {
      tone: "success",
      title: "街口支付已退款",
      description: "此筆街口付款已退款完成，若款項未入帳請再聯繫店家確認。",
    },
    default: {
      tone: "warning",
      title: "街口支付待付款",
      description:
        "請儘快完成街口支付；若稍後付款，可到「我的訂單」重新打開付款連結。",
    },
  },
  linepay: {
    paid: {
      tone: "success",
      title: "LINE Pay 已完成",
      description: "付款已完成，店家會依訂單狀態安排備貨與出貨。",
    },
    processing: {
      tone: "info",
      title: "LINE Pay 確認中",
      description: "系統正在同步 LINE Pay 付款結果，請稍候再回來查看。",
    },
    failed: {
      tone: "danger",
      title: "LINE Pay 付款失敗",
      description: "LINE Pay 未完成付款，若仍需商品請重新下單。",
    },
    cancelled: {
      tone: "danger",
      title: "LINE Pay 已取消",
      description: "您已取消 LINE Pay 付款流程；若仍需此商品，請重新下單。",
    },
    expired: {
      tone: "warning",
      title: "LINE Pay 已逾期",
      description: "付款期限已過，此筆 LINE Pay 付款已失效；若仍需此商品，請重新下單。",
    },
    default: {
      tone: "warning",
      title: "LINE Pay 待付款",
      description:
        "請儘快完成 LINE Pay；若稍後付款，可到「我的訂單」重新打開付款連結。",
    },
  },
  transfer: {
    paid: {
      tone: "success",
      title: "匯款已確認",
      description: "店家已完成對帳，後續會依訂單狀態安排處理。",
    },
    failed: {
      tone: "danger",
      title: "匯款對帳失敗",
      description: "目前尚未完成匯款對帳，請確認帳號末 5 碼是否正確並聯繫店家。",
    },
    default: {
      tone: "info",
      title: "等待店家核帳",
      description: "我們已收到您的匯款資訊，店家核帳後會將付款狀態更新為已付款。",
    },
  },
};
