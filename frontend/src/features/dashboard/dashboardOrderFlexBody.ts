import {
  createFlexInfoRow,
  createFlexSectionTitle,
  createFlexSeparator,
  type FlexContent,
  orderStatusColorMap,
} from "./dashboardOrderFlexLayout.ts";
import type { DashboardOrderRecord } from "./dashboardOrderTypes";
import type {
  DashboardOrderFlexBodyPayload,
  DashboardOrderNotificationDeps,
} from "./dashboardOrderNotificationTypes";
import { getDefaultTrackingUrl } from "../../lib/trackingUrls.ts";
import type { ReceiptInfo } from "../../types";

type BuildOrderFlexBodyPayloadArgs = {
  deps: DashboardOrderNotificationDeps;
  order: DashboardOrderRecord;
  newStatus: string;
};

function appendOrderNoteSection(bodyContents: FlexContent[], orderNote: string) {
  if (!orderNote) return;
  bodyContents.push(createFlexSeparator("md"));
  bodyContents.push(
    createFlexInfoRow({
      label: "訂單備註",
      text: orderNote,
      margin: "md",
      wrap: true,
    }),
  );
}

function appendCustomerContactSection(
  bodyContents: FlexContent[],
  order: DashboardOrderRecord,
) {
  const lineName = String(order.lineName || "").trim();
  const phone = String(order.phone || "").trim();
  const email = String(order.email || "").trim();
  if (!lineName && !phone && !email) return;

  bodyContents.push(createFlexSeparator("md"));
  if (lineName) {
    bodyContents.push(
      createFlexInfoRow({
        label: "顧客",
        text: lineName,
        margin: "md",
        wrap: true,
      }),
    );
  }
  if (phone) {
    bodyContents.push(
      createFlexInfoRow({
        label: "電話",
        text: phone,
        margin: lineName ? "sm" : "md",
        wrap: true,
      }),
    );
  }
  if (email) {
    bodyContents.push(
      createFlexInfoRow({
        label: "Email",
        text: email,
        margin: lineName || phone ? "sm" : "md",
        wrap: true,
      }),
    );
  }
}

function appendReceiptSection(
  bodyContents: FlexContent[],
  receiptInfo: ReceiptInfo | null,
) {
  if (!receiptInfo) return;

  bodyContents.push(createFlexSeparator("md"));
  bodyContents.push(
    createFlexInfoRow({
      label: "收據需求",
      text: "需要索取",
      margin: "md",
      valueWeight: "bold",
      valueColor: "#B58900",
    }),
  );
  bodyContents.push(
    createFlexInfoRow({
      label: "統一編號",
      text: receiptInfo.taxId || "未填寫",
      margin: "sm",
      wrap: true,
    }),
  );
  bodyContents.push(
    createFlexInfoRow({
      label: "壓印日期",
      text: receiptInfo.needDateStamp ? "需要" : "不需要",
      margin: "sm",
    }),
  );

  if (receiptInfo.buyer) {
    bodyContents.push(
      createFlexInfoRow({
        label: "買受人",
        text: receiptInfo.buyer,
        margin: "sm",
        wrap: true,
      }),
    );
  }

  if (receiptInfo.address) {
    bodyContents.push(
      createFlexInfoRow({
        label: "收據地址",
        text: receiptInfo.address,
        margin: "sm",
        wrap: true,
      }),
    );
  }
}

function appendTrackingSection(
  bodyContents: FlexContent[],
  order: DashboardOrderRecord,
) {
  if (!order.trackingNumber && !order.shippingProvider) return;

  bodyContents.push(createFlexSeparator("md"));

  if (order.shippingProvider) {
    bodyContents.push(
      createFlexInfoRow({
        label: "物流商",
        text: order.shippingProvider,
        margin: "md",
        wrap: true,
      }),
    );
  }

  if (order.trackingNumber) {
    bodyContents.push(
      createFlexInfoRow({
        label: "物流單號",
        text: order.trackingNumber,
        margin: "sm",
        valueWeight: "bold",
        valueColor: "#268BD2",
        wrap: true,
      }),
    );
  }
}

function appendCancelReasonSection(
  bodyContents: FlexContent[],
  newStatus: string,
  cancelReason: string,
) {
  if (!["cancelled", "failed"].includes(newStatus) || !cancelReason) return;
  const reasonLabel = newStatus === "failed" ? "失敗原因" : "取消原因";

  bodyContents.push(createFlexSeparator("md"));
  bodyContents.push(
    createFlexInfoRow({
      label: reasonLabel,
      text: cancelReason,
      margin: "md",
      valueColor: "#DC322F",
      wrap: true,
    }),
  );
}

function appendItemsSection(bodyContents: FlexContent[], itemsText: unknown) {
  if (!itemsText) return;

  bodyContents.push(createFlexSeparator("md"));
  bodyContents.push(createFlexSectionTitle("📦 訂單明細"));
  bodyContents.push({
    type: "text",
    text: String(itemsText),
    size: "xs",
    color: "#586E75",
    wrap: true,
    margin: "sm",
  });
}

export function buildOrderFlexBodyPayload({
  deps,
  order,
  newStatus,
}: BuildOrderFlexBodyPayloadArgs): DashboardOrderFlexBodyPayload {
  const statusLabel = deps.orderStatusLabel[newStatus] || newStatus;
  const statusColor = orderStatusColorMap[newStatus] || "#586E75";
  const deliveryMethod = String(order.deliveryMethod || "");
  const paymentMethod = String(order.paymentMethod || "cod");
  const paymentStatus = String(order.paymentStatus || "");
  const deliveryLabel = deps.orderMethodLabel[deliveryMethod] ||
    deliveryMethod || "";
  const isAddressDelivery = deliveryMethod === "delivery" ||
    deliveryMethod === "home_delivery";
  const deliveryAddressText = isAddressDelivery
    ? `${String(order.city || "")}${String(order.district || "")} ${
      String(order.address || "")
    }`.trim()
    : `${String(order.storeName || "")}${
      String(order.storeAddress || "").trim()
        ? ` (${String(order.storeAddress || "").trim()})`
        : ""
    }`.trim();
  const paymentLabel =
    deps.orderPayMethodLabel[paymentMethod] || "貨到付款";
  const paymentStatusStr = paymentStatus
    ? ` (${deps.orderPayStatusLabel[paymentStatus] || paymentStatus})`
    : "";
  const receiptInfo = deps.normalizeReceiptInfo(order.receiptInfo);
  const orderNote = String(order.note || "").trim();
  const cancelReason = String(order.cancelReason || "").trim();
  const trackingNumber = String(order.trackingNumber || "").trim();
  const customTrackingUrl = deps.normalizeTrackingUrl(order.trackingUrl || "");
  const defaultTrackingUrl = trackingNumber
    ? getDefaultTrackingUrl(deliveryMethod)
    : "";
  const trackingLinkUrl = customTrackingUrl || defaultTrackingUrl;
  const hasTrackingLinkCta = Boolean(trackingLinkUrl);

  const bodyContents: FlexContent[] = [
    createFlexInfoRow({
      label: "訂單編號",
      text: `#${order.orderId || ""}`,
      valueWeight: "bold",
      wrap: true,
    }),
    createFlexSeparator("md"),
  ];

  if (deliveryAddressText) {
    bodyContents.push(
      createFlexInfoRow({
        label: "配送地址",
        text: deliveryAddressText,
        margin: "md",
        wrap: true,
      }),
    );
    bodyContents.push(createFlexSeparator("md"));
  }

  bodyContents.push(
    createFlexInfoRow({
      label: "訂單狀態",
      text: statusLabel,
      margin: "md",
      valueWeight: "bold",
      valueColor: statusColor,
    }),
  );
  bodyContents.push(createFlexSeparator("md"));
  bodyContents.push(
    createFlexInfoRow({
      label: "配送方式",
      text: deliveryLabel,
      margin: "md",
      wrap: true,
    }),
  );
  bodyContents.push(createFlexSeparator("md"));
  bodyContents.push(
    createFlexInfoRow({
      label: "付款方式",
      text: `${paymentLabel}${paymentStatusStr}`,
      margin: "md",
      wrap: true,
    }),
  );
  bodyContents.push(createFlexSeparator("md"));
  bodyContents.push(
    createFlexInfoRow({
      label: "訂單金額",
      text: `$${Number(order.total) || 0}`,
      margin: "md",
      valueWeight: "bold",
      valueColor: "#DC322F",
    }),
  );

  appendCustomerContactSection(bodyContents, order);
  appendOrderNoteSection(bodyContents, orderNote);
  appendReceiptSection(bodyContents, receiptInfo);
  appendTrackingSection(bodyContents, order);
  appendCancelReasonSection(bodyContents, newStatus, cancelReason);
  appendItemsSection(bodyContents, order.items);

  return {
    bodyContents,
    statusLabel,
    trackingLinkUrl,
    hasTrackingLinkCta,
  };
}
