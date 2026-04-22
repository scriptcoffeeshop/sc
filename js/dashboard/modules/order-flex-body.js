import {
  createFlexInfoRow,
  createFlexSectionTitle,
  createFlexSeparator,
  orderStatusColorMap,
} from "./order-flex-layout.js";

function appendOrderNoteSection(bodyContents, orderNote) {
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

function appendReceiptSection(bodyContents, receiptInfo) {
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

function appendTrackingSection(bodyContents, order) {
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

function appendCancelReasonSection(bodyContents, newStatus, cancelReason) {
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

function appendItemsSection(bodyContents, itemsText) {
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

export function buildOrderFlexBodyPayload({ deps, order, newStatus }) {
  const statusLabel = deps.orderStatusLabel[newStatus] || newStatus;
  const statusColor = orderStatusColorMap[newStatus] || "#586E75";
  const deliveryLabel = deps.orderMethodLabel[order.deliveryMethod] ||
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
  const paymentLabel =
    deps.orderPayMethodLabel[order.paymentMethod || "cod"] || "貨到付款";
  const paymentStatusStr = order.paymentStatus
    ? ` (${deps.orderPayStatusLabel[order.paymentStatus] || order.paymentStatus})`
    : "";
  const receiptInfo = deps.normalizeReceiptInfo(order.receiptInfo);
  const orderNote = String(order.note || "").trim();
  const cancelReason = String(order.cancelReason || "").trim();
  const customTrackingUrl = deps.normalizeTrackingUrl(order.trackingUrl || "");
  const hasTrackingLinkCta = Boolean(
    order.shippingProvider && customTrackingUrl,
  );

  const bodyContents = [
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

  appendOrderNoteSection(bodyContents, orderNote);
  appendReceiptSection(bodyContents, receiptInfo);
  appendTrackingSection(bodyContents, order);
  appendCancelReasonSection(bodyContents, newStatus, cancelReason);
  appendItemsSection(bodyContents, order.items);

  return {
    bodyContents,
    statusLabel,
    customTrackingUrl,
    hasTrackingLinkCta,
  };
}
