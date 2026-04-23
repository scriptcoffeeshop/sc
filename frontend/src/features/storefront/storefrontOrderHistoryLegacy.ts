import { createApp } from "vue";
import { API_URL } from "../../lib/appConfig.ts";
import { authFetch } from "../../lib/auth.ts";
import { Toast } from "../../lib/sharedUtils.ts";
import { state } from "../../lib/appState.ts";
import StorefrontOrderHistoryCard from "./StorefrontOrderHistoryCard.vue";
import { buildOrderHistoryItem } from "./useStorefrontOrderHistory.ts";
import {
  formatDateTimeText,
  getCustomerPaymentDisplay,
} from "./storefrontPaymentDisplay.ts";

let mountedOrderHistoryApps = [];

function createMessageElement(message, className = "text-center text-gray-500 py-8") {
  const p = document.createElement("p");
  p.className = className;
  p.textContent = String(message || "");
  return p;
}

function clearMountedOrderHistoryApps() {
  mountedOrderHistoryApps.forEach((app) => app.unmount());
  mountedOrderHistoryApps = [];
}

async function copyTrackingNumber(trackingNumber) {
  const normalizedTrackingNumber = String(trackingNumber || "").trim();
  if (!normalizedTrackingNumber) return;
  try {
    await navigator.clipboard.writeText(normalizedTrackingNumber);
    Toast.fire({ icon: "success", title: "單號已複製" });
  } catch {
    await Swal.fire("錯誤", "複製失敗，請手動複製", "error");
  }
}

function appendOrderHistoryCard(list, order) {
  const mountPoint = document.createElement("div");
  list.appendChild(mountPoint);

  const app = createApp(StorefrontOrderHistoryCard, {
    order: buildOrderHistoryItem(order, {
      getCustomerPaymentDisplay,
      formatDateTimeText,
    }),
    onCopyTrackingNumber: copyTrackingNumber,
  });
  app.mount(mountPoint);
  mountedOrderHistoryApps.push(app);
}

/** 顯示我的訂單：legacy export fallback，正常流程已由 Vue modal/card 接手。 */
export async function showMyOrders() {
  const u = state.currentUser;
  if (!u) {
    Swal.fire("請先登入", "", "info");
    return;
  }

  document.getElementById("my-orders-modal")?.classList.remove("hidden");
  const list = document.getElementById("my-orders-list");
  if (!list) return;

  clearMountedOrderHistoryApps();
  list.replaceChildren(createMessageElement("載入中..."));

  try {
    const res = await authFetch(
      `${API_URL}?action=getMyOrders&_=${Date.now()}`,
    );
    const result = await res.json();
    if (!result.success || !result.orders?.length) {
      list.replaceChildren(createMessageElement("尚無訂單"));
      return;
    }

    clearMountedOrderHistoryApps();
    list.replaceChildren();
    result.orders.forEach((order) => appendOrderHistoryCard(list, order));
  } catch (e) {
    clearMountedOrderHistoryApps();
    list.replaceChildren(
      createMessageElement(
        e.message || "訂單載入失敗",
        "text-center text-red-500 py-8",
      ),
    );
  }
}
