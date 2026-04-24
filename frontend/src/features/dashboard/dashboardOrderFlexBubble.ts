import type { FlexContent } from "./dashboardOrderFlexLayout.ts";

export function buildOrderFlexMessageBubble({
  siteTitle,
  orderId,
  statusLabel,
  bodyContents,
  customTrackingUrl,
  hasTrackingLinkCta,
}) {
  const footerContents: FlexContent[] = [];

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
