import type { ReceiptInfo } from "../../types";
import { formatDateTimeText } from "../../lib/dateTime.ts";
export { normalizeTrackingUrl } from "../../lib/trackingUrls.ts";

export const orderStatusLabel: Record<string, string> = {
  pending: "待處理",
  processing: "處理中",
  shipped: "已出貨",
  completed: "已完成",
  failed: "已失敗",
  cancelled: "已取消",
};

export const orderMethodLabel: Record<string, string> = {
  delivery: "配送到府",
  home_delivery: "全台宅配",
  seven_eleven: "7-11",
  family_mart: "全家",
  in_store: "來店取貨",
};

export const orderPayMethodLabel: Record<string, string> = {
  cod: "貨到付款",
  linepay: "LINE Pay",
  jkopay: "街口支付",
  transfer: "轉帳",
};

export const orderPayStatusLabel: Record<string, string> = {
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
  "failed",
  "cancelled",
];

export function normalizeReceiptInfo(raw: unknown): ReceiptInfo | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Partial<ReceiptInfo>;
  const buyer = String(row.buyer || "").trim();
  const taxId = String(row.taxId || "").trim();
  const address = String(row.address || "").trim();
  const needDateStamp = Boolean(row.needDateStamp);
  if (taxId && !/^\d{8}$/.test(taxId)) return null;
  return { buyer, taxId, address, needDateStamp };
}

export function formatOrderDateTimeText(value: unknown): string {
  return formatDateTimeText(value);
}
