import { API_URL } from "./config.js?v=47";

const statusLabel = {
  pending: "待處理",
  processing: "處理中",
  shipped: "已出貨",
  completed: "已完成",
  cancelled: "已取消",
};

const statusDesc = {
  pending: "訂單已成立，等待店家確認",
  processing: "訂單已開始處理",
  shipped: "商品已出貨，可查看物流進度",
  completed: "訂單已完成",
  cancelled: "訂單已取消",
};

const deliveryLabel = {
  delivery: "配送到府",
  home_delivery: "全台宅配",
  seven_eleven: "7-11 取件",
  family_mart: "全家取件",
  in_store: "來店取貨",
};

const paymentMethodLabel = {
  cod: "貨到/取貨付款",
  linepay: "LINE Pay",
  transfer: "轉帳",
};

const paymentStatusLabel = {
  pending: "待付款",
  paid: "已付款",
  failed: "付款失敗",
  cancelled: "付款取消",
  refunded: "已退款",
};

const timelineSteps = ["pending", "processing", "shipped", "completed"];

function getEl(id) {
  return document.getElementById(id);
}

function normalizeOrderId(orderId) {
  return String(orderId || "").trim().toUpperCase();
}

function normalizePhoneSuffix(phoneSuffix) {
  return String(phoneSuffix || "").replace(/\D/g, "");
}

function formatDateTime(dateString) {
  const dt = new Date(dateString);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString("zh-TW");
}

function buildAddress(order) {
  if (order.deliveryMethod === "delivery" || order.deliveryMethod === "home_delivery") {
    return `${order.city || ""}${order.district || ""} ${order.address || ""}`.trim() || "-";
  }
  if (order.deliveryMethod === "in_store") {
    return "來店取貨";
  }
  return `${order.storeName || ""}${order.storeAddress ? ` (${order.storeAddress})` : ""}`.trim() || "-";
}

function renderTimeline(status) {
  const timelineEl = getEl("result-timeline");
  if (!timelineEl) return;

  if (status === "cancelled") {
    timelineEl.innerHTML = `
      <div class="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
        訂單狀態為「已取消」。若有疑問請聯繫客服。
      </div>
    `;
    return;
  }

  const activeIndex = timelineSteps.indexOf(status);
  timelineEl.innerHTML = timelineSteps.map((step, idx) => {
    const reached = activeIndex >= idx;
    const circleClass = reached
      ? "bg-green-600 text-white border-green-600"
      : "bg-white text-gray-400 border-gray-300";
    const textClass = reached ? "text-gray-800" : "text-gray-400";
    return `
      <div class="flex items-start gap-3">
        <div class="w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${circleClass}">
          ${idx + 1}
        </div>
        <div class="flex-1">
          <p class="font-medium ${textClass}">${statusLabel[step] || step}</p>
          <p class="text-xs ${textClass}">${statusDesc[step] || ""}</p>
        </div>
      </div>
    `;
  }).join("");
}

function renderOrder(order) {
  getEl("result-order-id").textContent = order.orderId || "-";
  getEl("result-created-at").textContent = formatDateTime(order.createdAt);
  getEl("result-line-name").textContent = order.lineName || "-";
  getEl("result-phone").textContent = order.phoneMasked || "-";
  getEl("result-delivery").textContent =
    deliveryLabel[order.deliveryMethod] || order.deliveryMethod || "-";

  const payMethod = paymentMethodLabel[order.paymentMethod] || order.paymentMethod || "-";
  const payStatus = paymentStatusLabel[order.paymentStatus] || order.paymentStatus || "未設定";
  getEl("result-payment").textContent = `${payMethod} / ${payStatus}`;

  getEl("result-address").textContent = buildAddress(order);
  getEl("result-status").textContent = `${statusLabel[order.status] || order.status}｜${statusDesc[order.status] || ""}`;

  const trackingWrap = getEl("result-tracking");
  const trackingNumberEl = getEl("result-tracking-number");
  const trackingLinkEl = getEl("result-tracking-link");
  if (order.trackingNumber) {
    trackingWrap.classList.remove("hidden");
    trackingNumberEl.textContent = order.trackingNumber;
    if (order.trackingUrl) {
      trackingLinkEl.classList.remove("hidden");
      trackingLinkEl.href = order.trackingUrl;
    } else {
      trackingLinkEl.classList.add("hidden");
      trackingLinkEl.removeAttribute("href");
    }
  } else {
    trackingWrap.classList.add("hidden");
    trackingNumberEl.textContent = "";
    trackingLinkEl.classList.add("hidden");
    trackingLinkEl.removeAttribute("href");
  }

  renderTimeline(order.status);
  getEl("track-result").classList.remove("hidden");
}

function showError(message) {
  const errorEl = getEl("track-error");
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
  getEl("track-result").classList.add("hidden");
}

function clearError() {
  const errorEl = getEl("track-error");
  errorEl.textContent = "";
  errorEl.classList.add("hidden");
}

async function queryOrder(orderId, phoneSuffix) {
  const res = await fetch(`${API_URL}?action=trackOrder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId, phoneSuffix }),
  });
  return await res.json();
}

async function handleTrackSubmit(event) {
  event.preventDefault();

  const orderId = normalizeOrderId(getEl("track-order-id").value);
  const phoneSuffix = normalizePhoneSuffix(getEl("track-phone-suffix").value);

  getEl("track-order-id").value = orderId;
  getEl("track-phone-suffix").value = phoneSuffix;

  if (!orderId) {
    showError("請輸入訂單編號");
    return;
  }
  if (phoneSuffix.length < 4) {
    showError("請輸入手機末 4 碼以上");
    return;
  }

  clearError();
  const submitBtn = getEl("track-submit");
  submitBtn.disabled = true;
  submitBtn.textContent = "查詢中...";

  try {
    const result = await queryOrder(orderId, phoneSuffix);
    if (!result.success || !result.order) {
      showError(result.error || "查詢失敗，請稍後再試");
      return;
    }
    renderOrder(result.order);
  } catch (_err) {
    showError("查詢失敗，請稍後再試");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "查詢訂單";
  }
}

function initFromUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const orderId = normalizeOrderId(params.get("orderId") || "");
  const phoneSuffix = normalizePhoneSuffix(params.get("phone") || "");

  if (orderId) getEl("track-order-id").value = orderId;
  if (phoneSuffix) getEl("track-phone-suffix").value = phoneSuffix;
  if (orderId && phoneSuffix.length >= 4) {
    getEl("track-form").dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = getEl("track-form");
  form.addEventListener("submit", handleTrackSubmit);
  initFromUrlParams();
});
