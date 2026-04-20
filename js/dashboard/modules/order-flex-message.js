const statusColorMap = {
  pending: "#B58900",
  processing: "#268BD2",
  shipped: "#859900",
  completed: "#586E75",
  cancelled: "#DC322F",
};

export function createOrderFlexMessageBuilder(deps) {
  function resolveOrderLineUserId(order) {
    return String(order?.lineUserId || order?.line_user_id || "").trim();
  }

  function getSiteTitle() {
    return String(deps.getSiteTitle?.() || "").trim() || "Script Coffee";
  }

  function buildLineFlexMessage(order, newStatus) {
    const statusLabel = deps.orderStatusLabel[newStatus] || newStatus;
    const statusColor = statusColorMap[newStatus] || "#586E75";
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
      ? ` (${
        deps.orderPayStatusLabel[order.paymentStatus] || order.paymentStatus
      })`
      : "";
    const receiptInfo = deps.normalizeReceiptInfo(order.receiptInfo);
    const orderNote = String(order.note || "").trim();
    const customTrackingUrl = deps.normalizeTrackingUrl(order.trackingUrl || "");
    const hasTrackingLinkCta = Boolean(
      order.shippingProvider && customTrackingUrl,
    );

    const bodyContents = [
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
            text: `#${order.orderId || ""}`,
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
              text: order.shippingProvider,
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
              text: order.trackingNumber,
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

    const cancelReason = String(order.cancelReason || "").trim();
    if (newStatus === "cancelled" && cancelReason) {
      bodyContents.push({ type: "separator", margin: "md" });
      bodyContents.push({
        type: "box",
        layout: "horizontal",
        margin: "md",
        contents: [
          {
            type: "text",
            text: "取消原因",
            size: "sm",
            color: "#839496",
            flex: 3,
          },
          {
            type: "text",
            text: cancelReason,
            size: "sm",
            color: "#DC322F",
            flex: 5,
            wrap: true,
          },
        ],
      });
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

    const siteTitle = getSiteTitle();
    const footerContents = [];
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
      text: `更新時間：${new Date().toLocaleString("zh-TW")}`,
      size: "xxs",
      color: "#93A1A1",
      align: "center",
    });

    return {
      type: "flex",
      altText: `[${siteTitle}] 訂單 #${order.orderId || ""} ${statusLabel}`,
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

  return {
    buildLineFlexMessage,
    resolveOrderLineUserId,
  };
}
