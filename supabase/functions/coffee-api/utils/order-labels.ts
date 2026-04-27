export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "待處理",
  processing: "處理中",
  shipped: "已出貨",
  delivered: "已配達",
  completed: "已完成",
  failed: "已失敗",
  cancelled: "已取消",
};

const EMAIL_DELIVERY_METHOD_LABEL: Record<string, string> = {
  delivery: "配送到府",
  home_delivery: "全台宅配",
  seven_eleven: "7-11 取貨/取貨付款",
  family_mart: "全家取貨/取貨付款",
  in_store: "來店自取",
};

const FLEX_DELIVERY_METHOD_LABEL: Record<string, string> = {
  delivery: "配送到府",
  home_delivery: "全台宅配",
  seven_eleven: "7-11",
  family_mart: "全家",
  in_store: "來店取貨",
};

const EMAIL_PAYMENT_METHOD_LABEL: Record<string, string> = {
  cod: "貨到付款",
  linepay: "LINE Pay",
  jkopay: "街口支付",
  transfer: "銀行轉帳",
};

const FLEX_PAYMENT_METHOD_LABEL: Record<string, string> = {
  cod: "貨到付款",
  linepay: "LINE Pay",
  jkopay: "街口支付",
  transfer: "轉帳",
};

export const ORDER_PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "待付款",
  processing: "付款確認中",
  paid: "已付款",
  failed: "付款失敗",
  cancelled: "付款取消",
  expired: "付款逾期",
  refunded: "已退款",
};

export function getEmailDeliveryMethodLabel(
  method: unknown,
  fallback = "一般配送",
): string {
  const key = String(method || "");
  return EMAIL_DELIVERY_METHOD_LABEL[key] || fallback;
}

export function getEmailPaymentMethodLabel(method: unknown): string {
  const key = String(method || "");
  return EMAIL_PAYMENT_METHOD_LABEL[key] || key;
}

export function getFlexDeliveryMethodLabel(method: unknown): string {
  const key = String(method || "");
  return FLEX_DELIVERY_METHOD_LABEL[key] || key;
}

export function getFlexPaymentMethodLabel(method: unknown): string {
  const key = String(method || "cod");
  return FLEX_PAYMENT_METHOD_LABEL[key] || "貨到付款";
}

export function getOrderPaymentStatusLabel(status: unknown): string {
  const key = String(status || "");
  return ORDER_PAYMENT_STATUS_LABEL[key] || key;
}
