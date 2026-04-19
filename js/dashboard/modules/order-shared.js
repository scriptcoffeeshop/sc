export const orderStatusLabel = {
  pending: "待處理",
  processing: "處理中",
  shipped: "已出貨",
  completed: "已完成",
  cancelled: "已取消",
};

export const orderMethodLabel = {
  delivery: "配送到府",
  home_delivery: "全台宅配",
  seven_eleven: "7-11",
  family_mart: "全家",
  in_store: "來店取貨",
};

export const orderPayMethodLabel = {
  cod: "貨到付款",
  linepay: "LINE Pay",
  jkopay: "街口支付",
  transfer: "轉帳",
};

export const orderPayStatusLabel = {
  pending: "待付款",
  processing: "付款確認中",
  paid: "已付款",
  failed: "付款失敗",
  cancelled: "付款取消",
  expired: "付款逾期",
  refunded: "已退款",
};

export const orderStatusOptions = [
  "pending",
  "processing",
  "shipped",
  "completed",
  "cancelled",
];

export function normalizeReceiptInfo(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const buyer = String(raw.buyer || "").trim();
  const taxId = String(raw.taxId || "").trim();
  const address = String(raw.address || "").trim();
  const needDateStamp = Boolean(raw.needDateStamp);
  if (taxId && !/^\d{8}$/.test(taxId)) return null;
  return { buyer, taxId, address, needDateStamp };
}

export function formatOrderDateTimeText(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString("zh-TW");
}

export function normalizeTrackingUrl(url) {
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
