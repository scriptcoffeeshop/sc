const FLEX_HISTORY_KEY = "coffee_flex_message_history";
const FLEX_HISTORY_MAX = 50;

function readFlexHistory() {
  try {
    const history = JSON.parse(
      globalThis.localStorage?.getItem(FLEX_HISTORY_KEY) || "[]",
    );
    return Array.isArray(history) ? history : [];
  } catch {
    return [];
  }
}

function writeFlexHistory(history) {
  try {
    globalThis.localStorage?.setItem(FLEX_HISTORY_KEY, JSON.stringify(history));
  } catch {
  }
}

export function createOrderFlexController(deps) {
  function getOrders() {
    return Array.isArray(deps.getOrders?.()) ? deps.getOrders() : [];
  }

  function saveFlexToHistory(flexMsg, orderId, statusLabel) {
    const history = readFlexHistory();
    history.unshift({
      orderId,
      statusLabel,
      timestamp: new Date().toISOString(),
      flex: flexMsg,
    });
    if (history.length > FLEX_HISTORY_MAX) history.length = FLEX_HISTORY_MAX;
    writeFlexHistory(history);
  }

  async function sendFlexMessageToLine(order, flexMsg) {
    const orderId = String(order?.orderId || "").trim();
    const lineUserId = deps.resolveOrderLineUserId(order);

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
    const lineUserId = deps.resolveOrderLineUserId(order);
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
    const flexMsg = deps.buildLineFlexMessage(order, newStatus);
    saveFlexToHistory(flexMsg, orderId, statusLabel);
    await showFlexMessagePopup(flexMsg, order, statusLabel);
  }

  function showFlexHistory() {
    const history = readFlexHistory();
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
            globalThis.localStorage?.removeItem(FLEX_HISTORY_KEY);
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

  return {
    previewOrderStatusNotification,
    showFlexHistory,
    sendOrderFlexByOrderId,
  };
}
