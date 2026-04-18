const FLEX_HISTORY_KEY = "coffee_flex_message_history";
const FLEX_HISTORY_MAX = 50;

const statusColorMap = {
  pending: "#B58900",
  processing: "#268BD2",
  shipped: "#859900",
  completed: "#586E75",
  cancelled: "#DC322F",
};

export function createOrderNotificationsController(deps) {
  function getOrders() {
    return Array.isArray(deps.getOrders?.()) ? deps.getOrders() : [];
  }

  function resolveOrderLineUserId(order) {
    return String(order?.lineUserId || order?.line_user_id || "").trim();
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

    const siteTitleEl = document.getElementById("s-site-title");
    const siteTitle = siteTitleEl?.value || "Script Coffee";
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

  function saveFlexToHistory(flexMsg, orderId, statusLabel) {
    try {
      const history = JSON.parse(
        localStorage.getItem(FLEX_HISTORY_KEY) || "[]",
      );
      history.unshift({
        orderId,
        statusLabel,
        timestamp: new Date().toISOString(),
        flex: flexMsg,
      });
      if (history.length > FLEX_HISTORY_MAX) history.length = FLEX_HISTORY_MAX;
      localStorage.setItem(FLEX_HISTORY_KEY, JSON.stringify(history));
    } catch {
    }
  }

  async function sendFlexMessageToLine(order, flexMsg) {
    const orderId = String(order?.orderId || "").trim();
    const lineUserId = resolveOrderLineUserId(order);

    if (!orderId) {
      deps.Swal.fire("提醒", "找不到訂單編號，無法發送 LINE 通知", "warning");
      return false;
    }
    if (!lineUserId) {
      deps.Swal.fire("提醒", "此訂單缺少 LINE 使用者 ID，無法一鍵發送", "warning");
      return false;
    }

    try {
      const response = await deps.authFetch(
        `${deps.API_URL}?action=sendLineFlexMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            to: lineUserId,
            flexMessage: flexMsg,
          }),
        },
      );
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "LINE 訊息發送失敗");
      }
      deps.Toast.fire({ icon: "success", title: "LINE 訊息已發送" });
      return true;
    } catch (error) {
      deps.Swal.fire("發送失敗", error?.message || String(error), "error");
      return false;
    }
  }

  async function showFlexMessagePopup(flexMsg, order, statusLabel) {
    const orderId = String(order?.orderId || "");
    const lineUserId = resolveOrderLineUserId(order);
    const canSendLine = Boolean(lineUserId);
    const jsonStr = JSON.stringify(flexMsg, null, 2);
    const result = await deps.Swal.fire({
      title: "LINE Flex Message",
      html: `
      <div class="text-left text-sm mb-2">
        <span class="ui-text-subtle">訂單</span> <b class="ui-text-highlight">#${deps.esc(orderId)}</b>
        → <span class="font-bold ui-text-warning">${deps.esc(statusLabel)}</span>
      </div>
      ${
        canSendLine
          ? `<div class="text-left text-xs text-green-700 mb-2">可直接一鍵發送至 LINE（目標 ID：${
            deps.esc(lineUserId)
          }）</div>`
          : `<div class="text-left text-xs ui-text-warning mb-2">此訂單缺少 LINE 使用者 ID，僅可複製 JSON</div>`
      }
      <div style="position:relative;">
        <pre id="swal-flex-json" style="text-align:left; font-size:11px; max-height:300px; overflow:auto; background:#FFFDF7; border:1px solid #E2DCC8; border-radius:6px; padding:12px; white-space:pre-wrap; word-break:break-all;">${deps.esc(jsonStr)}</pre>
      </div>
      <p class="text-xs ui-text-muted mt-2">已自動暫存至歷史紀錄，可從訂單列表上方 📋 按鈕查看</p>
    `,
      showCancelButton: true,
      showConfirmButton: canSendLine,
      confirmButtonText: "🚀 一鍵發送 LINE",
      showDenyButton: true,
      denyButtonText: "📋 複製 JSON",
      cancelButtonText: "關閉",
      confirmButtonColor: "#859900",
      denyButtonColor: "#268BD2",
      width: 600,
      customClass: {
        popup: "flex-message-popup",
      },
    });
    if (result.isConfirmed) {
      await sendFlexMessageToLine(order, flexMsg);
      return;
    }
    if (result.isDenied) {
      try {
        await navigator.clipboard.writeText(jsonStr);
        deps.Toast.fire({ icon: "success", title: "Flex Message 已複製" });
      } catch {
        const pre = document.getElementById("swal-flex-json");
        if (pre) {
          const range = document.createRange();
          range.selectNodeContents(pre);
          window.getSelection()?.removeAllRanges();
          window.getSelection()?.addRange(range);
        }
        deps.Swal.fire("提醒", "自動複製失敗，請手動選取後 Ctrl+C 複製", "info");
      }
    }
  }

  async function previewOrderStatusNotification(order, newStatus) {
    const statusLabel = deps.orderStatusLabel[newStatus] || newStatus;
    const orderId = String(order?.orderId || "");
    const flexMsg = buildLineFlexMessage(order, newStatus);
    saveFlexToHistory(flexMsg, orderId, statusLabel);
    await showFlexMessagePopup(flexMsg, order, statusLabel);
  }

  function showFlexHistory() {
    const history = JSON.parse(
      localStorage.getItem(FLEX_HISTORY_KEY) || "[]",
    );
    if (!history.length) {
      deps.Swal.fire("LINE Flex 歷史", "目前沒有暫存的 Flex Message", "info");
      return;
    }

    const listHtml = history.map((item, idx) => {
      const time = new Date(item.timestamp).toLocaleString("zh-TW");
      return `<div class="flex items-center justify-between p-2 rounded mb-1" style="background:#FFFDF7; border:1px solid #E2DCC8;">
      <div class="text-sm">
        <span class="font-bold" style="color:var(--primary)">#${deps.esc(item.orderId)}</span>
        <span class="ml-2 text-xs px-1.5 py-0.5 rounded" style="background:#268BD2;color:#FFFDF7;">${deps.esc(item.statusLabel)}</span>
        <span class="text-xs ui-text-muted ml-2">${deps.esc(time)}</span>
      </div>
      <button data-flex-idx="${idx}" class="flex-history-copy-btn text-xs px-3 py-1 rounded" style="background:#268BD2; color:#FFFDF7; cursor:pointer;">複製</button>
    </div>`;
    }).join("");

    deps.Swal.fire({
      title: "📋 LINE Flex 歷史紀錄",
      html: `
      <div style="max-height:400px; overflow-y:auto; text-align:left;">
        ${listHtml}
      </div>
      <button id="flex-history-clear" class="text-xs ui-text-danger mt-3 hover:underline">清除所有歷史</button>
    `,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: "關閉",
      width: 600,
      didOpen: () => {
        const popup = deps.Swal.getPopup();
        if (!popup) return;
        popup.querySelectorAll(".flex-history-copy-btn").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const idx = Number(btn.dataset.flexIdx);
            const item = history[idx];
            if (!item) return;
            try {
              await navigator.clipboard.writeText(
                JSON.stringify(item.flex, null, 2),
              );
              deps.Toast.fire({ icon: "success", title: "已複製" });
            } catch {
              deps.Swal.fire("提醒", "複製失敗，請手動操作", "info");
            }
          });
        });
        const clearBtn = popup.querySelector("#flex-history-clear");
        if (clearBtn) {
          clearBtn.addEventListener("click", () => {
            localStorage.removeItem(FLEX_HISTORY_KEY);
            deps.Swal.fire("已清除", "所有 Flex Message 歷史已刪除", "success");
          });
        }
      },
    });
  }

  async function sendOrderFlexByOrderId(orderId) {
    const targetOrder = getOrders().find((order) => order.orderId === orderId);
    if (!targetOrder) {
      deps.Swal.fire("錯誤", "找不到訂單資料，請先重整列表", "error");
      return;
    }

    const nextStatus = targetOrder.status || "pending";
    await previewOrderStatusNotification(targetOrder, nextStatus);
  }

  async function sendOrderEmailByOrderId(orderId) {
    const targetOrder = getOrders().find((order) => order.orderId === orderId);
    if (!targetOrder) {
      deps.Swal.fire("錯誤", "找不到訂單資料，請先重整列表", "error");
      return;
    }
    const targetEmail = String(targetOrder.email || "").trim();
    if (!targetEmail) {
      deps.Swal.fire("提醒", "此訂單沒有 Email，無法發送信件", "warning");
      return;
    }

    const status = String(targetOrder.status || "pending");
    const statusLabel = deps.orderStatusLabel[status] || status;
    const emailTypeLabel = status === "shipped"
      ? "出貨通知"
      : status === "processing"
      ? "處理中通知"
      : status === "completed"
      ? "完成通知"
      : status === "cancelled"
      ? "取消通知"
      : "成立確認信";

    const confirm = await deps.Swal.fire({
      title: "確認發送信件",
      html: `訂單 <b>#${deps.esc(orderId)}</b><br>
      將寄送「<b>${deps.esc(emailTypeLabel)}</b>」到<br>
      <span class="ui-text-highlight">${deps.esc(targetEmail)}</span><br>
      <span class="text-xs ui-text-subtle">（目前狀態：${deps.esc(statusLabel)}）</span>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "發送信件",
      cancelButtonText: "取消",
      confirmButtonColor: "#268BD2",
    });
    if (!confirm.isConfirmed) return;

    try {
      const response = await deps.authFetch(`${deps.API_URL}?action=sendOrderEmail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: deps.getAuthUserId(),
          orderId,
        }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || "信件發送失敗");
      deps.Toast.fire({ icon: "success", title: result.message || "信件已發送" });
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  return {
    previewOrderStatusNotification,
    showFlexHistory,
    sendOrderFlexByOrderId,
    sendOrderEmailByOrderId,
  };
}
