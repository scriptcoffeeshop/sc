import { buildOrderDeliveryText } from "./order-delivery-display.ts";
import { asJsonRecord } from "./json.ts";
import {
  getFlexDeliveryMethodLabel,
  getFlexPaymentMethodLabel,
  getOrderPaymentStatusLabel,
  ORDER_STATUS_LABEL,
} from "./order-labels.ts";
import { normalizeTrackingUrl } from "./tracking.ts";

interface ReceiptInfo {
  buyer: string;
  taxId: string;
  address: string;
  needDateStamp: boolean;
}

type LineFlexContent = Record<string, unknown>;

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

const STATUS_COLOR_MAP: Record<string, string> = {
  pending: "#B58900",
  processing: "#268BD2",
  shipped: "#859900",
  completed: "#586E75",
  failed: "#DC322F",
  cancelled: "#DC322F",
};

function normalizeReceiptInfo(raw: unknown): ReceiptInfo | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = asJsonRecord(raw);
  const buyer = String(row.buyer || "").trim();
  const taxId = String(row.taxId || "").trim();
  const address = String(row.address || "").trim();
  const needDateStamp = Boolean(row.needDateStamp);
  if (taxId && !/^\d{8}$/.test(taxId)) return null;
  return { buyer, taxId, address, needDateStamp };
}

interface FlexInfoRowOptions {
  margin?: string;
  valueWeight?: string;
  valueColor?: string;
  valueWrap?: boolean;
}

function buildFlexSeparator(margin = "md"): LineFlexContent {
  return { type: "separator", margin };
}

function buildFlexInfoRow(
  label: string,
  text: string,
  options: FlexInfoRowOptions = {},
): LineFlexContent {
  const valueText: LineFlexContent = {
    type: "text",
    text,
    size: "sm",
    flex: 5,
  };
  if (options.valueWeight) valueText.weight = options.valueWeight;
  if (options.valueColor) valueText.color = options.valueColor;
  if (typeof options.valueWrap === "boolean") {
    valueText.wrap = options.valueWrap;
  }

  const row: LineFlexContent = {
    type: "box",
    layout: "horizontal",
    contents: [
      {
        type: "text",
        text: label,
        size: "sm",
        color: "#839496",
        flex: 3,
      },
      valueText,
    ],
  };
  if (options.margin) row.margin = options.margin;
  return row;
}

export function buildOrderStatusLineFlexMessage(
  order: OrderFlexPayload,
): LineFlexContent {
  const nextStatus = String(order.status || "pending");
  const statusLabel = ORDER_STATUS_LABEL[nextStatus] || nextStatus;
  const statusColor = STATUS_COLOR_MAP[nextStatus] || "#586E75";
  const deliveryLabel = getFlexDeliveryMethodLabel(order.deliveryMethod);
  const deliveryAddressText = buildOrderDeliveryText(order);
  const paymentLabel = getFlexPaymentMethodLabel(order.paymentMethod);
  const paymentStatusStr = order.paymentStatus
    ? ` (${getOrderPaymentStatusLabel(order.paymentStatus)})`
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

  const bodyContents: LineFlexContent[] = [
    buildFlexInfoRow("訂單編號", `#${orderId}`, {
      valueWeight: "bold",
      valueWrap: true,
    }),
    buildFlexSeparator(),
    ...(deliveryAddressText
      ? [
        buildFlexInfoRow("配送地址", deliveryAddressText, {
          margin: "md",
          valueWrap: true,
        }),
        buildFlexSeparator(),
      ]
      : []),
    buildFlexInfoRow("訂單狀態", statusLabel, {
      margin: "md",
      valueWeight: "bold",
      valueColor: statusColor,
    }),
    buildFlexSeparator(),
    buildFlexInfoRow("配送方式", deliveryLabel, {
      margin: "md",
      valueWrap: true,
    }),
    buildFlexSeparator(),
    buildFlexInfoRow("付款方式", `${paymentLabel}${paymentStatusStr}`, {
      margin: "md",
      valueWrap: true,
    }),
    buildFlexSeparator(),
    buildFlexInfoRow("訂單金額", `$${Number(order.total) || 0}`, {
      margin: "md",
      valueWeight: "bold",
      valueColor: "#DC322F",
    }),
  ];

  if (orderNote) {
    bodyContents.push(buildFlexSeparator());
    bodyContents.push(buildFlexInfoRow("訂單備註", orderNote, {
      margin: "md",
      valueWrap: true,
    }));
  }

  if (receiptInfo) {
    bodyContents.push(buildFlexSeparator());
    bodyContents.push(buildFlexInfoRow("收據需求", "需要索取", {
      margin: "md",
      valueWeight: "bold",
      valueColor: "#B58900",
    }));
    bodyContents.push(
      buildFlexInfoRow("統一編號", receiptInfo.taxId || "未填寫", {
        margin: "sm",
        valueWrap: true,
      }),
    );
    bodyContents.push(
      buildFlexInfoRow(
        "壓印日期",
        receiptInfo.needDateStamp ? "需要" : "不需要",
        {
          margin: "sm",
        },
      ),
    );
    if (receiptInfo.buyer) {
      bodyContents.push(buildFlexInfoRow("買受人", receiptInfo.buyer, {
        margin: "sm",
        valueWrap: true,
      }));
    }
    if (receiptInfo.address) {
      bodyContents.push(buildFlexInfoRow("收據地址", receiptInfo.address, {
        margin: "sm",
        valueWrap: true,
      }));
    }
  }

  if (order.trackingNumber || order.shippingProvider) {
    bodyContents.push(buildFlexSeparator());
    if (order.shippingProvider) {
      bodyContents.push(
        buildFlexInfoRow("物流商", String(order.shippingProvider || ""), {
          margin: "md",
          valueWrap: true,
        }),
      );
    }
    if (order.trackingNumber) {
      bodyContents.push(
        buildFlexInfoRow("物流單號", String(order.trackingNumber || ""), {
          margin: "sm",
          valueWeight: "bold",
          valueColor: "#268BD2",
          valueWrap: true,
        }),
      );
    }
  }

  if (order.items) {
    bodyContents.push(buildFlexSeparator());
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

  const footerContents: LineFlexContent[] = [];
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
