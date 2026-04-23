interface ReceiptInfo {
  buyer: string;
  taxId: string;
  address: string;
  needDateStamp: boolean;
}

export interface OrderFlexPayload {
  orderId: string;
  siteTitle: string;
  status: string;
  deliveryMethod: string;
  city?: string;
  district?: string;
  address?: string;
  storeName?: string;
  storeAddress?: string;
  paymentMethod: string;
  paymentStatus: string;
  total: number;
  items: string;
  note?: string;
  receiptInfo?: unknown;
  shippingProvider?: string;
  trackingUrl?: string;
  trackingNumber?: string;
}

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "待處理",
  processing: "處理中",
  shipped: "已出貨",
  completed: "已完成",
  failed: "已失敗",
  cancelled: "已取消",
};

const ORDER_METHOD_LABEL: Record<string, string> = {
  delivery: "配送到府",
  home_delivery: "全台宅配",
  seven_eleven: "7-11",
  family_mart: "全家",
  in_store: "來店取貨",
};

const ORDER_PAY_METHOD_LABEL: Record<string, string> = {
  cod: "貨到付款",
  linepay: "LINE Pay",
  jkopay: "街口支付",
  transfer: "轉帳",
};

const ORDER_PAY_STATUS_LABEL: Record<string, string> = {
  pending: "待付款",
  processing: "付款確認中",
  paid: "已付款",
  failed: "付款失敗",
  cancelled: "付款取消",
  expired: "付款逾期",
  refunded: "已退款",
};

const STATUS_COLOR_MAP: Record<string, string> = {
  pending: "#B58900",
  processing: "#268BD2",
  shipped: "#859900",
  completed: "#586E75",
  failed: "#DC322F",
  cancelled: "#DC322F",
};

function normalizeTrackingUrl(url: unknown): string {
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

function normalizeReceiptInfo(raw: unknown): ReceiptInfo | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const buyer = String(row.buyer || "").trim();
  const taxId = String(row.taxId || "").trim();
  const address = String(row.address || "").trim();
  const needDateStamp = Boolean(row.needDateStamp);
  if (taxId && !/^\d{8}$/.test(taxId)) return null;
  return { buyer, taxId, address, needDateStamp };
}

export function buildOrderStatusLineFlexMessage(
  order: OrderFlexPayload,
): Record<string, unknown> {
  const nextStatus = String(order.status || "pending");
  const statusLabel = ORDER_STATUS_LABEL[nextStatus] || nextStatus;
  const statusColor = STATUS_COLOR_MAP[nextStatus] || "#586E75";
  const deliveryLabel = ORDER_METHOD_LABEL[order.deliveryMethod] ||
    order.deliveryMethod || "";
  const isAddressDelivery = order.deliveryMethod === "delivery" ||
    order.deliveryMethod === "home_delivery";
  const deliveryAddressText = isAddressDelivery
    ? `${String(order.city || "")}${String(order.district || "")} ${
      String(order.address || "")
    }`.trim()
    : `${String(order.storeName || "")}${
      String(order.storeAddress || "").trim()
        ? ` (${String(order.storeAddress || "").trim()})`
        : ""
    }`.trim();
  const paymentLabel = ORDER_PAY_METHOD_LABEL[order.paymentMethod || "cod"] ||
    "貨到付款";
  const paymentStatusStr = order.paymentStatus
    ? ` (${ORDER_PAY_STATUS_LABEL[order.paymentStatus] || order.paymentStatus})`
    : "";
  const receiptInfo = normalizeReceiptInfo(order.receiptInfo);
  const customTrackingUrl = normalizeTrackingUrl(order.trackingUrl || "");
  const hasTrackingLinkCta = Boolean(
    order.shippingProvider && customTrackingUrl,
  );
  const orderNote = String(order.note || "").trim();
  const orderId = String(order.orderId || "").trim();
  const siteTitle = String(order.siteTitle || "Script Coffee").trim() ||
    "Script Coffee";

  const bodyContents: Record<string, unknown>[] = [
    {
      type: "box",
      layout: "horizontal",
      contents: [
        {
          type: "text",
          text: "訂單編號",
          size: "sm",
          color: "#839496",
          flex: 3,
        },
        {
          type: "text",
          text: `#${orderId}`,
          size: "sm",
          weight: "bold",
          flex: 5,
          wrap: true,
        },
      ],
    },
    { type: "separator", margin: "md" },
    ...(deliveryAddressText
      ? [{
        type: "box",
        layout: "horizontal",
        margin: "md",
        contents: [
          {
            type: "text",
            text: "配送地址",
            size: "sm",
            color: "#839496",
            flex: 3,
          },
          {
            type: "text",
            text: deliveryAddressText,
            size: "sm",
            flex: 5,
            wrap: true,
          },
        ],
      }, { type: "separator", margin: "md" }]
      : []),
    {
      type: "box",
      layout: "horizontal",
      margin: "md",
      contents: [
        {
          type: "text",
          text: "訂單狀態",
          size: "sm",
          color: "#839496",
          flex: 3,
        },
        {
          type: "text",
          text: statusLabel,
          size: "sm",
          weight: "bold",
          color: statusColor,
          flex: 5,
        },
      ],
    },
    { type: "separator", margin: "md" },
    {
      type: "box",
      layout: "horizontal",
      margin: "md",
      contents: [
        {
          type: "text",
          text: "配送方式",
          size: "sm",
          color: "#839496",
          flex: 3,
        },
        {
          type: "text",
          text: deliveryLabel,
          size: "sm",
          flex: 5,
          wrap: true,
        },
      ],
    },
    { type: "separator", margin: "md" },
    {
      type: "box",
      layout: "horizontal",
      margin: "md",
      contents: [
        {
          type: "text",
          text: "付款方式",
          size: "sm",
          color: "#839496",
          flex: 3,
        },
        {
          type: "text",
          text: `${paymentLabel}${paymentStatusStr}`,
          size: "sm",
          flex: 5,
          wrap: true,
        },
      ],
    },
    { type: "separator", margin: "md" },
    {
      type: "box",
      layout: "horizontal",
      margin: "md",
      contents: [
        {
          type: "text",
          text: "訂單金額",
          size: "sm",
          color: "#839496",
          flex: 3,
        },
        {
          type: "text",
          text: `$${Number(order.total) || 0}`,
          size: "sm",
          weight: "bold",
          color: "#DC322F",
          flex: 5,
        },
      ],
    },
  ];

  if (orderNote) {
    bodyContents.push({ type: "separator", margin: "md" });
    bodyContents.push({
      type: "box",
      layout: "horizontal",
      margin: "md",
      contents: [
        {
          type: "text",
          text: "訂單備註",
          size: "sm",
          color: "#839496",
          flex: 3,
        },
        {
          type: "text",
          text: orderNote,
          size: "sm",
          flex: 5,
          wrap: true,
        },
      ],
    });
  }

  if (receiptInfo) {
    bodyContents.push({ type: "separator", margin: "md" });
    bodyContents.push({
      type: "box",
      layout: "horizontal",
      margin: "md",
      contents: [
        {
          type: "text",
          text: "收據需求",
          size: "sm",
          color: "#839496",
          flex: 3,
        },
        {
          type: "text",
          text: "需要索取",
          size: "sm",
          weight: "bold",
          color: "#B58900",
          flex: 5,
        },
      ],
    });
    bodyContents.push({
      type: "box",
      layout: "horizontal",
      margin: "sm",
      contents: [
        {
          type: "text",
          text: "統一編號",
          size: "sm",
          color: "#839496",
          flex: 3,
        },
        {
          type: "text",
          text: receiptInfo.taxId || "未填寫",
          size: "sm",
          flex: 5,
          wrap: true,
        },
      ],
    });
    bodyContents.push({
      type: "box",
      layout: "horizontal",
      margin: "sm",
      contents: [
        {
          type: "text",
          text: "壓印日期",
          size: "sm",
          color: "#839496",
          flex: 3,
        },
        {
          type: "text",
          text: receiptInfo.needDateStamp ? "需要" : "不需要",
          size: "sm",
          flex: 5,
        },
      ],
    });
    if (receiptInfo.buyer) {
      bodyContents.push({
        type: "box",
        layout: "horizontal",
        margin: "sm",
        contents: [
          {
            type: "text",
            text: "買受人",
            size: "sm",
            color: "#839496",
            flex: 3,
          },
          {
            type: "text",
            text: receiptInfo.buyer,
            size: "sm",
            flex: 5,
            wrap: true,
          },
        ],
      });
    }
    if (receiptInfo.address) {
      bodyContents.push({
        type: "box",
        layout: "horizontal",
        margin: "sm",
        contents: [
          {
            type: "text",
            text: "收據地址",
            size: "sm",
            color: "#839496",
            flex: 3,
          },
          {
            type: "text",
            text: receiptInfo.address,
            size: "sm",
            flex: 5,
            wrap: true,
          },
        ],
      });
    }
  }

  if (order.trackingNumber || order.shippingProvider) {
    bodyContents.push({ type: "separator", margin: "md" });
    if (order.shippingProvider) {
      bodyContents.push({
        type: "box",
        layout: "horizontal",
        margin: "md",
        contents: [
          {
            type: "text",
            text: "物流商",
            size: "sm",
            color: "#839496",
            flex: 3,
          },
          {
            type: "text",
            text: String(order.shippingProvider || ""),
            size: "sm",
            flex: 5,
            wrap: true,
          },
        ],
      });
    }
    if (order.trackingNumber) {
      bodyContents.push({
        type: "box",
        layout: "horizontal",
        margin: "sm",
        contents: [
          {
            type: "text",
            text: "物流單號",
            size: "sm",
            color: "#839496",
            flex: 3,
          },
          {
            type: "text",
            text: String(order.trackingNumber || ""),
            size: "sm",
            weight: "bold",
            color: "#268BD2",
            flex: 5,
            wrap: true,
          },
        ],
      });
    }
  }

  if (order.items) {
    bodyContents.push({ type: "separator", margin: "md" });
    bodyContents.push({
      type: "text",
      text: "📦 訂單明細",
      size: "sm",
      weight: "bold",
      color: "#073642",
      margin: "md",
    });
    bodyContents.push({
      type: "text",
      text: String(order.items || ""),
      size: "xs",
      color: "#586E75",
      wrap: true,
      margin: "sm",
    });
  }

  const footerContents: Record<string, unknown>[] = [];
  if (hasTrackingLinkCta) {
    footerContents.push({
      type: "button",
      style: "primary",
      color: "#859900",
      height: "sm",
      action: {
        type: "uri",
        label: "追蹤貨態",
        uri: customTrackingUrl,
      },
    });
    footerContents.push({
      type: "separator",
      margin: "md",
    });
  }
  footerContents.push({
    type: "text",
    text: `更新時間：${
      new Date().toLocaleString("zh-TW", {
        timeZone: "Asia/Taipei",
      })
    }`,
    size: "xxs",
    color: "#93A1A1",
    align: "center",
  });

  return {
    type: "flex",
    altText: `[${siteTitle}] 訂單 #${orderId} ${statusLabel}`,
    contents: {
      type: "bubble",
      size: "mega",
      header: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        backgroundColor: "#EEE8D5",
        contents: [
          {
            type: "text",
            text: `📋 ${siteTitle} - 訂單通知`,
            weight: "bold",
            size: "md",
            color: "#073642",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "16px",
        contents: bodyContents,
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "12px",
        contents: footerContents,
      },
    },
  };
}
