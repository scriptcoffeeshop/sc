import {
  normalizeReceiptInfo,
  orderMethodLabel,
  orderPayMethodLabel,
  orderPayStatusLabel,
  orderStatusLabel,
} from "./orderShared.ts";
import { buildOrderAddressInfo } from "./dashboardOrdersView.ts";

type DashboardOrderRecord = Record<string, any>;

function csvEscape(value: unknown) {
  const str = String(value ?? "").replace(/\r?\n/g, " | ");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildOrdersCsv(orderList: DashboardOrderRecord[]) {
  const header = [
    "訂單編號",
    "建立時間",
    "顧客",
    "電話",
    "Email",
    "配送方式",
    "訂單狀態",
    "付款方式",
    "付款狀態",
    "付款期限",
    "付款確認時間",
    "付款同步時間",
    "金流狀態碼",
    "金額",
    "物流商",
    "物流單號",
    "追蹤網址",
    "地址或門市",
    "訂單內容",
    "備註",
    "是否索取收據",
    "收據統一編號",
    "收據買受人",
    "收據地址",
    "收據壓印日期",
  ];
  const rows = orderList.map((order) => {
    const receiptInfo = normalizeReceiptInfo(order.receiptInfo);
    const addressInfo = buildOrderAddressInfo(order);
    return [
      order.orderId || "",
      order.timestamp || "",
      order.lineName || "",
      order.phone || "",
      order.email || "",
      orderMethodLabel[order.deliveryMethod] || order.deliveryMethod || "",
      orderStatusLabel[order.status] || order.status || "",
      orderPayMethodLabel[order.paymentMethod || "cod"] ||
      order.paymentMethod ||
      "",
      orderPayStatusLabel[order.paymentStatus || ""] ||
      order.paymentStatus ||
      "",
      order.paymentExpiresAt || "",
      order.paymentConfirmedAt || "",
      order.paymentLastCheckedAt || "",
      order.paymentProviderStatusCode || "",
      Number(order.total) || 0,
      order.shippingProvider || "",
      order.trackingNumber || "",
      order.trackingUrl || "",
      addressInfo,
      order.items || "",
      order.note || "",
      receiptInfo ? "是" : "否",
      receiptInfo?.taxId || "",
      receiptInfo?.buyer || "",
      receiptInfo?.address || "",
      receiptInfo ? (receiptInfo.needDateStamp ? "需要" : "不需要") : "",
    ];
  });
  return [header, ...rows].map((cols) => cols.map(csvEscape).join(",")).join(
    "\r\n",
  );
}

export function triggerCsvDownload(fileName: string, csvText: string) {
  const blob = new Blob(["\uFEFF" + csvText], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function getCsvTimestamp() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${y}${m}${d}-${h}${min}`;
}
