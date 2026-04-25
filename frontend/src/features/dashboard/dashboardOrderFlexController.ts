import { createApp, type App } from "vue";
import { formatDateTimeText } from "../../lib/dateTime.ts";
import { tryParseJsonArray } from "../../lib/jsonUtils.ts";
import { createLogger } from "../../lib/logger.ts";
import { getDashboardErrorMessage } from "./dashboardErrors.ts";
import type { DashboardOrderRecord } from "./dashboardOrderTypes";
import type {
  DashboardLineFlexMessage,
  DashboardOrderFlexControllerDeps,
} from "./dashboardOrderNotificationTypes";
import DashboardFlexMessagePreview from "./DashboardFlexMessagePreview.vue";
import DashboardFlexHistoryList, {
  type DashboardFlexHistoryViewItem,
} from "./DashboardFlexHistoryList.vue";

const FLEX_HISTORY_KEY = "coffee_flex_message_history";
const FLEX_HISTORY_MAX = 50;
const logger = createLogger("dashboard-flex");

type FlexHistoryItem = {
  orderId: string;
  statusLabel: string;
  timestamp: string;
  flex: DashboardLineFlexMessage;
};

function isFlexHistoryItem(value: unknown): value is FlexHistoryItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<FlexHistoryItem>;
  return Boolean(item.orderId && item.statusLabel && item.timestamp && item.flex);
}

function readFlexHistory(): FlexHistoryItem[] {
  const rawHistory = globalThis.localStorage?.getItem(FLEX_HISTORY_KEY);
  if (!rawHistory) return [];
  const history = tryParseJsonArray(rawHistory);
  if (!history) {
    logger.warn("無法解析 LINE Flex 歷史紀錄");
    return [];
  }
  return history.filter(isFlexHistoryItem);
}

function writeFlexHistory(history: FlexHistoryItem[]) {
  if (!globalThis.localStorage) return;
  try {
    globalThis.localStorage.setItem(FLEX_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    logger.warn("無法寫入 LINE Flex 歷史紀錄", error);
  }
}

export function createOrderFlexController(deps: DashboardOrderFlexControllerDeps) {
  function getOrders() {
    return Array.isArray(deps.getOrders?.()) ? deps.getOrders() : [];
  }

  function saveFlexToHistory(
    flexMsg: DashboardLineFlexMessage,
    orderId: string,
    statusLabel: string,
  ) {
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

  async function sendFlexMessageToLine(
    order: DashboardOrderRecord,
    flexMsg: DashboardLineFlexMessage,
  ) {
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
        throw new Error(String(result.error || "LINE 訊息發送失敗"));
      }
      deps.Toast.fire({ icon: "success", title: "LINE 訊息已發送" });
      return true;
    } catch (error) {
      deps.Swal.fire(
        "發送失敗",
        getDashboardErrorMessage(error, "LINE 訊息發送失敗"),
        "error",
      );
      return false;
    }
  }

  async function showFlexMessagePopup(
    flexMsg: DashboardLineFlexMessage,
    order: DashboardOrderRecord,
    statusLabel: string,
  ) {
    const orderId = String(order?.orderId || "");
    const lineUserId = deps.resolveOrderLineUserId(order);
    const canSendLine = Boolean(lineUserId);
    const jsonStr = JSON.stringify(flexMsg, null, 2);
    const root = document.createElement("div");
    let previewApp: App<Element> | null = null;
    const result = await deps.Swal.fire({
      title: "LINE Flex Message",
      html: root,
      showCancelButton: true,
      showConfirmButton: canSendLine,
      confirmButtonText: "一鍵發送 LINE",
      showDenyButton: true,
      denyButtonText: "複製 JSON",
      cancelButtonText: "關閉",
      confirmButtonColor: "#859900",
      denyButtonColor: "#268BD2",
      width: 600,
      customClass: {
        popup: "flex-message-popup",
      },
      didOpen: (popup: unknown) => {
        if (
          !root.isConnected &&
          popup &&
          typeof (popup as { appendChild?: unknown }).appendChild === "function"
        ) {
          (popup as { appendChild: (node: Node) => void }).appendChild(root);
        }
        previewApp = createApp(DashboardFlexMessagePreview, {
          orderId,
          statusLabel,
          lineUserId,
          canSendLine,
          flexJson: jsonStr,
        });
        previewApp.mount(root);
      },
      willClose: () => {
        previewApp?.unmount();
        previewApp = null;
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
      } catch (error) {
        logger.warn("無法自動複製 Flex Message", error);
        deps.Swal.fire("提醒", "自動複製失敗，請手動選取後 Ctrl+C 複製", "info");
      }
    }
  }

  async function previewOrderStatusNotification(
    order: DashboardOrderRecord,
    newStatus: string,
  ) {
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

    const historyView: DashboardFlexHistoryViewItem[] = history.map((item, index) => ({
      index,
      orderId: item.orderId,
      statusLabel: item.statusLabel,
      timestamp: item.timestamp,
      timeText: formatDateTimeText(item.timestamp),
      flexJson: JSON.stringify(item.flex, null, 2),
    }));
    const root = document.createElement("div");
    let historyApp: App<Element> | null = null;

    deps.Swal.fire({
      title: "LINE Flex 歷史紀錄",
      html: root,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: "關閉",
      width: 600,
      didOpen: (popup: unknown) => {
        if (
          !root.isConnected &&
          popup &&
          typeof (popup as { appendChild?: unknown }).appendChild === "function"
        ) {
          (popup as { appendChild: (node: Node) => void }).appendChild(root);
        }
        historyApp = createApp(DashboardFlexHistoryList, {
          items: historyView,
          copyItem: async (index: number) => {
            const item = historyView[index];
            if (!item) return;
            try {
              await navigator.clipboard.writeText(item.flexJson);
              deps.Toast.fire({ icon: "success", title: "已複製" });
            } catch (error) {
              logger.warn("無法複製 Flex Message 歷史紀錄", error);
              deps.Swal.fire("提醒", "複製失敗，請手動操作", "info");
            }
          },
          clearHistory: () => {
            globalThis.localStorage?.removeItem(FLEX_HISTORY_KEY);
            deps.Swal.fire("已清除", "所有 Flex Message 歷史已刪除", "success");
          },
        });
        historyApp.mount(root);
      },
      willClose: () => {
        historyApp?.unmount();
        historyApp = null;
      },
    });
  }

  async function sendOrderFlexByOrderId(orderId: string) {
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
