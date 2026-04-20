// ============================================
// orders.js — 訂單送出 & 我的訂單
// ============================================

import { API_URL } from "./config.js";
import { authFetch } from "./auth.js";
import { escapeHtml, isValidEmail, Toast } from "./utils.js";
import { state } from "./state.js";
import { cart, clearCart } from "./cart.js";
import { collectDynamicFields } from "./form-renderer.js";

function normalizeTrackingUrl(url) {
  const raw = String(url || "").trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

function getDefaultTrackingUrl(deliveryMethod) {
  if (deliveryMethod === "seven_eleven") {
    return "https://eservice.7-11.com.tw/e-tracking/search.aspx";
  }
  if (deliveryMethod === "family_mart") {
    return "https://fmec.famiport.com.tw/FP_Entrance/QueryBox";
  }
  if (deliveryMethod === "delivery" || deliveryMethod === "home_delivery") {
    return "https://postserv.post.gov.tw/pstmail/main_mail.html?targetTxn=EB500100";
  }
  return "";
}

const ORDER_STATUS_TEXT = {
  pending: "待處理",
  processing: "處理中",
  shipped: "已出貨",
  completed: "已完成",
  cancelled: "已取消",
};

const DELIVERY_METHOD_TEXT = {
  delivery: "宅配",
  home_delivery: "全台宅配",
  seven_eleven: "7-11 取件",
  family_mart: "全家取件",
  in_store: "來店取貨",
};

const PAYMENT_METHOD_TEXT = {
  cod: "貨到付款",
  linepay: "LINE Pay",
  jkopay: "街口支付",
  transfer: "線上轉帳",
};

const PAYMENT_STATUS_TEXT = {
  pending: "待付款",
  processing: "付款確認中",
  paid: "已付款",
  failed: "付款失敗",
  cancelled: "付款取消",
  expired: "付款逾期",
  refunded: "已退款",
};

function formatDateTimeText(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString("zh-TW");
}

function composeDeliveryAddress(address, companyOrBuilding) {
  const detailAddress = String(address || "").trim();
  const companyText = String(companyOrBuilding || "").trim();
  if (!detailAddress) return "";
  if (!companyText) return detailAddress;
  return `${detailAddress}（公司行號/社區大樓：${companyText}）`;
}

function normalizeReceiptInfo(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const buyer = String(raw.buyer || "").trim();
  const taxId = String(raw.taxId || "").trim();
  const address = String(raw.address || "").trim();
  const needDateStamp = Boolean(raw.needDateStamp);
  if (taxId && !/^\d{8}$/.test(taxId)) return null;
  return { buyer, taxId, address, needDateStamp };
}

function parseStoredReceiptInfo(raw) {
  if (!raw) return null;
  if (typeof raw === "string") {
    const str = raw.trim();
    if (!str) return null;
    try {
      return normalizeReceiptInfo(JSON.parse(str));
    } catch {
      return null;
    }
  }
  return normalizeReceiptInfo(raw);
}

function createMessageElement(message, className = "text-center text-gray-500 py-8") {
  const p = document.createElement("p");
  p.className = className;
  p.textContent = String(message || "");
  return p;
}

function createReceiptInfoElement(receiptInfo) {
  if (!receiptInfo) return null;
  const wrapper = document.createElement("div");
  wrapper.className = "text-sm text-amber-800 bg-amber-50 p-2 rounded mb-2";

  [
    ["統一編號：", receiptInfo.taxId || "未填寫"],
    ["收據買受人：", receiptInfo.buyer || "未填寫"],
    ["收據地址：", receiptInfo.address || "未填寫"],
    ["壓印日期：", receiptInfo.needDateStamp ? "需要" : "不需要"],
  ].forEach(([label, value]) => {
    const row = document.createElement("div");
    const labelEl = document.createElement("span");
    labelEl.className = "text-gray-500";
    labelEl.textContent = label;
    row.append(labelEl, String(value));
    wrapper.appendChild(row);
  });

  return wrapper;
}

function getPaymentBadgeClass(paymentStatus) {
  if (paymentStatus === "paid") return "bg-green-50 text-green-700";
  if (paymentStatus === "processing") return "bg-blue-50 text-blue-700";
  if (paymentStatus === "pending") return "bg-yellow-50 text-yellow-700";
  if (
    paymentStatus === "failed" || paymentStatus === "cancelled" ||
    paymentStatus === "expired"
  ) {
    return "bg-red-50 text-red-700";
  }
  if (paymentStatus === "refunded") return "bg-purple-50 text-purple-700";
  return "bg-gray-100 text-gray-600";
}

function createPaymentBadge(order, paymentStatus) {
  const paymentMethod = String(order.paymentMethod || "").trim();
  if (!paymentMethod || paymentMethod === "cod") return null;

  const badge = document.createElement("span");
  badge.className = `text-xs px-2 py-0.5 rounded-full ${
    getPaymentBadgeClass(paymentStatus)
  }`;
  badge.textContent = `${PAYMENT_METHOD_TEXT[paymentMethod] || paymentMethod} ${
    PAYMENT_STATUS_TEXT[paymentStatus] || paymentStatus
  }`;
  return badge;
}

function bindTrackingCopyButton(button) {
  button.addEventListener("click", () => {
    const trackingNumber = String(button.dataset.trackingNumber || "").trim();
    if (!trackingNumber) return;
    navigator.clipboard.writeText(trackingNumber)
      .then(() => Toast.fire({ icon: "success", title: "單號已複製" }))
      .catch(() => Swal.fire("錯誤", "複製失敗，請手動複製", "error"));
  });
}

function createShippingInfoElement(order, trackingUrl) {
  const provider = String(order.shippingProvider || "").trim();
  const trackingNumber = String(order.trackingNumber || "").trim();
  if (!provider && !trackingNumber && !trackingUrl) return null;

  const wrapper = document.createElement("div");
  wrapper.className = "text-xs text-gray-600 bg-blue-50 p-2 rounded mb-2";

  if (provider) {
    const providerEl = document.createElement("div");
    providerEl.textContent = `物流商：${provider}`;
    wrapper.appendChild(providerEl);
  }

  if (trackingNumber) {
    const trackingRow = document.createElement("div");
    trackingRow.className = "mt-1";
    trackingRow.append("物流單號：");

    const numberEl = document.createElement("span");
    numberEl.className = "font-mono";
    numberEl.textContent = trackingNumber;

    const copyButton = document.createElement("button");
    copyButton.type = "button";
    copyButton.dataset.copyTrackingNumber = "true";
    copyButton.dataset.trackingNumber = trackingNumber;
    copyButton.className =
      "ml-2 px-2 py-0.5 bg-white border border-blue-200 hover:bg-blue-100 rounded text-gray-700";
    copyButton.title = "複製單號";
    copyButton.textContent = "複製";
    bindTrackingCopyButton(copyButton);

    trackingRow.append(numberEl, copyButton);
    wrapper.appendChild(trackingRow);
  }

  if (trackingUrl) {
    const link = document.createElement("a");
    link.href = trackingUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "text-blue-600 hover:underline";
    link.textContent = "物流追蹤頁面";
    wrapper.appendChild(link);
  }

  return wrapper;
}

function appendPaymentMetaLine(parent, label, value, addTopMargin) {
  if (!value) return;
  const row = document.createElement("div");
  if (addTopMargin) row.className = "mt-1";
  row.textContent = `${label}${value}`;
  parent.appendChild(row);
}

function createPaymentMetaElement(order, paymentStatus) {
  const paymentMethod = String(order.paymentMethod || "").trim();
  if (!paymentMethod || paymentMethod === "cod") return null;

  const paymentExpiresAtText = formatDateTimeText(order.paymentExpiresAt);
  const paymentLastCheckedAtText = formatDateTimeText(order.paymentLastCheckedAt);
  const paymentProviderStatusCode = String(order.paymentProviderStatusCode || "")
    .trim();
  const showExpiresAt = paymentExpiresAtText &&
    (paymentStatus === "pending" || paymentStatus === "processing" ||
      paymentStatus === "expired");

  const wrapper = document.createElement("div");
  wrapper.className = "text-xs text-gray-600 bg-slate-50 p-2 rounded mb-2";
  appendPaymentMetaLine(wrapper, "付款期限：", showExpiresAt ? paymentExpiresAtText : "", false);
  appendPaymentMetaLine(
    wrapper,
    "最近同步：",
    paymentLastCheckedAtText,
    wrapper.childNodes.length > 0,
  );
  appendPaymentMetaLine(
    wrapper,
    "金流狀態碼：",
    paymentProviderStatusCode,
    wrapper.childNodes.length > 0,
  );

  return wrapper.childNodes.length > 0 ? wrapper : null;
}

function createOrderCard(order) {
  const paymentStatus = String(order.paymentStatus || "").trim();
  const receiptInfo = normalizeReceiptInfo(order.receiptInfo);
  const customTrackingUrl = normalizeTrackingUrl(order.trackingUrl || "");
  const defaultTrackingUrl = getDefaultTrackingUrl(order.deliveryMethod);
  const trackingUrl = customTrackingUrl || defaultTrackingUrl;

  const card = document.createElement("div");
  card.className = "border rounded-xl p-4 mb-3";
  card.style.borderColor = "#e5ddd5";

  const header = document.createElement("div");
  header.className = "flex justify-between items-center mb-2";

  const orderId = document.createElement("span");
  orderId.className = "text-sm font-bold";
  orderId.style.color = "var(--primary)";
  orderId.textContent = `#${String(order.orderId || "")}`;

  const status = document.createElement("span");
  status.className = "text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700";
  status.textContent = ORDER_STATUS_TEXT[order.status] ||
    String(order.status || "");
  header.append(orderId, status);

  const meta = document.createElement("div");
  meta.className = "text-xs text-gray-500 mb-2 flex flex-wrap gap-1 items-center";
  const methodText = DELIVERY_METHOD_TEXT[order.deliveryMethod] ||
    String(order.deliveryMethod || "");
  const locationText = order.storeName
    ? `・${String(order.storeName)}`
    : order.city
    ? `・${String(order.city)}${String(order.address || "")}`
    : "";
  meta.append(`${methodText} ${locationText}`);
  const payBadge = createPaymentBadge(order, paymentStatus);
  if (payBadge) meta.append(" ", payBadge);

  const shippingInfo = createShippingInfoElement(order, trackingUrl);
  const paymentMeta = createPaymentMetaElement(order, paymentStatus);

  const items = document.createElement("div");
  items.className = "text-sm text-gray-600 whitespace-pre-line bg-gray-50 p-3 rounded mb-2";
  items.textContent = String(order.items || "");

  const receipt = createReceiptInfoElement(receiptInfo);

  const total = document.createElement("div");
  total.className = "text-right font-bold";
  total.style.color = "var(--primary)";
  total.textContent = `$${String(order.total ?? 0)}`;

  card.append(header, meta);
  if (shippingInfo) card.appendChild(shippingInfo);
  if (paymentMeta) card.appendChild(paymentMeta);
  card.appendChild(items);
  if (receipt) card.appendChild(receipt);
  card.appendChild(total);
  return card;
}

function getReceiptFormValues() {
  const requestEl = document.getElementById("receipt-request");
  const requested = Boolean(requestEl?.checked);
  if (!requested) return { receiptInfo: null, error: "" };

  const buyer = String(document.getElementById("receipt-buyer")?.value || "")
    .trim();
  const taxId = String(document.getElementById("receipt-tax-id")?.value || "")
    .trim();
  const address = String(
    document.getElementById("receipt-address")?.value || "",
  ).trim();
  const needDateStamp = Boolean(
    document.getElementById("receipt-date-stamp")?.checked,
  );

  if (taxId && !/^\d{8}$/.test(taxId)) {
    return { receiptInfo: null, error: "統一編號需為 8 碼數字" };
  }

  return {
    receiptInfo: {
      buyer,
      taxId,
      address,
      needDateStamp,
    },
    error: "",
  };
}

function toggleReceiptFieldsByCheckbox() {
  const requestEl = document.getElementById("receipt-request");
  const fieldsEl = document.getElementById("receipt-fields");
  if (!fieldsEl) return;
  fieldsEl.classList.toggle("hidden", !requestEl?.checked);
}

function applyReceiptFormValues(receiptInfo) {
  const requestEl = document.getElementById("receipt-request");
  const buyerEl = document.getElementById("receipt-buyer");
  const taxIdEl = document.getElementById("receipt-tax-id");
  const addressEl = document.getElementById("receipt-address");
  const dateStampEl = document.getElementById("receipt-date-stamp");

  if (!receiptInfo) {
    if (requestEl) requestEl.checked = false;
    if (buyerEl) buyerEl.value = "";
    if (taxIdEl) taxIdEl.value = "";
    if (addressEl) addressEl.value = "";
    if (dateStampEl) dateStampEl.checked = false;
    toggleReceiptFieldsByCheckbox();
    return;
  }

  if (requestEl) requestEl.checked = true;
  if (buyerEl) buyerEl.value = receiptInfo.buyer || "";
  if (taxIdEl) taxIdEl.value = receiptInfo.taxId || "";
  if (addressEl) addressEl.value = receiptInfo.address || "";
  if (dateStampEl) dateStampEl.checked = Boolean(receiptInfo.needDateStamp);
  toggleReceiptFieldsByCheckbox();
}

export function applySavedOrderFormPrefs() {
  const u = state.currentUser;
  if (!u) return;

  const receiptInfo = parseStoredReceiptInfo(u.defaultReceiptInfo);
  applyReceiptFormValues(receiptInfo);

  const transferLast5El = document.getElementById("transfer-last5");
  const transferLast5 = String(u.defaultTransferAccountLast5 || "").trim();
  if (transferLast5El) {
    transferLast5El.value = /^\d{5}$/.test(transferLast5) ? transferLast5 : "";
  }

  const paymentMethod = String(u.defaultPaymentMethod || "").trim();
  if (!["cod", "linepay", "jkopay", "transfer"].includes(paymentMethod)) return;

  const paymentOptionEl = document.getElementById(`${paymentMethod}-option`);
  if (!paymentOptionEl || paymentOptionEl.classList.contains("hidden")) return;
  if (typeof window.selectPayment === "function") {
    window.selectPayment(paymentMethod, { skipQuote: true });
  }
}

export function initReceiptRequestUi() {
  const requestEl = document.getElementById("receipt-request");
  if (!requestEl) return;

  if (requestEl.dataset.boundReceiptUi !== "true") {
    requestEl.addEventListener("change", () => {
      toggleReceiptFieldsByCheckbox();
    });
    requestEl.dataset.boundReceiptUi = "true";
  }
  toggleReceiptFieldsByCheckbox();
}

/** 送出訂單 */
export async function submitOrder() {
  const u = state.currentUser;
  if (!u) {
    Swal.fire("請先登入", "使用 LINE 登入後再訂購", "warning");
    return;
  }

  // 政策同意驗證
  const policyCheckbox = document.getElementById("policy-agree");
  const policyHint = document.getElementById("policy-agree-hint");
  if (policyCheckbox && !policyCheckbox.checked) {
    if (policyHint) policyHint.classList.remove("hidden");
    policyCheckbox.focus();
    Swal.fire("提醒", "請先閱讀並勾選同意隱私權政策及退換貨政策", "warning");
    return;
  }
  if (policyHint) policyHint.classList.add("hidden");

  // 動態欄位驗證
  const fieldsResult = collectDynamicFields(state.formFields);
  if (!fieldsResult.valid) {
    Swal.fire("錯誤", fieldsResult.error, "error");
    return;
  }

  // 從動態欄位取值（相容舊的 phone / email）
  const phone = fieldsResult.data.phone || "";
  const email = fieldsResult.data.email || "";

  if (!state.selectedDelivery) {
    Swal.fire("錯誤", "請選擇配送方式", "error");
    return;
  }

  if (email && !isValidEmail(email)) {
    Swal.fire("錯誤", "請填寫正確的電子郵件", "error");
    return;
  }

  if (!email) {
    const emailField = state.formFields.find((f) => f.field_key === "email");
    if (emailField && emailField.enabled) {
      const proceed = await Swal.fire({
        title: "未填寫電子郵件",
        text:
          "您沒有填寫電子郵件，將無法接收到訂單成立與出貨通知信。確定要繼續送出訂單嗎？",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "繼續送出",
        cancelButtonText: "返回填寫",
        confirmButtonColor: "#3C2415",
      });
      if (!proceed.isConfirmed) return;
    }
  }

  if (!cart.length) {
    Swal.fire("錯誤", "購物車是空的，請先選擇商品", "error");
    return;
  }

  if (typeof window.refreshQuote === "function") {
    const quoteResult = await window.refreshQuote({ silent: true });
    if (!quoteResult?.success) {
      Swal.fire(
        "錯誤",
        quoteResult?.error || "無法計算訂單金額，請稍後再試",
        "error",
      );
      return;
    }
  }
  const quote = state.orderQuote;
  if (!quote || !Array.isArray(quote.orderLines)) {
    Swal.fire("錯誤", "無法取得最新報價，請稍後再試", "error");
    return;
  }
  const orderLines = quote.orderLines;
  const total = Number(quote.total) || 0;
  const deliveryMethod = quote.deliveryMethod || state.selectedDelivery;

  // 收集配送資訊
  let deliveryInfo = {};
  if (deliveryMethod === "delivery") {
    const city = document.getElementById("delivery-city").value;
    const district = document.getElementById("delivery-district").value;
    const addr = document.getElementById("delivery-detail-address").value
      .trim();
    const companyOrBuilding = String(
      document.getElementById("delivery-company")?.value || "",
    ).trim();
    if (!city) {
      Swal.fire("錯誤", "請選擇縣市", "error");
      return;
    }
    if (!addr) {
      Swal.fire("錯誤", "請填寫詳細地址", "error");
      return;
    }
    deliveryInfo = { city, district, address: addr, companyOrBuilding };
  } else if (deliveryMethod === "home_delivery") {
    // 全台宅配處理
    const cityObj = document.querySelector(".county");
    const distObj = document.querySelector(".district");
    const zipObj = document.querySelector(".zipcode");
    const city = cityObj ? cityObj.value : "";
    const district = distObj ? distObj.value : "";
    const zip = zipObj ? zipObj.value : "";
    const addr = document.getElementById("home-delivery-detail").value.trim();
    if (!city || !district) {
      Swal.fire("錯誤", "請選擇全台宅配的縣市及區域", "error");
      return;
    }
    if (!addr) {
      Swal.fire("錯誤", "請填寫全台宅配的詳細地址", "error");
      return;
    }
    deliveryInfo = {
      city,
      district: `${zip} ${district}`.trim(),
      address: addr,
    };
  } else if (deliveryMethod === "in_store") {
    deliveryInfo = {
      storeName: "來店自取",
      storeAddress: "新竹市東區建中路101號1樓",
    };
  } else {
    const sName = document.getElementById("store-name-input").value.trim();
    const sAddr = document.getElementById("store-address-input").value.trim();
    if (!sName) {
      Swal.fire("錯誤", "請填寫取貨門市名稱", "error");
      return;
    }
    deliveryInfo = {
      storeName: sName,
      storeAddress: sAddr,
      storeId: document.getElementById("store-id-input").value || "",
    };
  }

  const note = document.getElementById("order-note").value.trim();
  const receiptResult = getReceiptFormValues();
  if (receiptResult.error) {
    Swal.fire("錯誤", receiptResult.error, "error");
    return;
  }
  const receiptInfo = receiptResult.receiptInfo;

  // 付款方式驗證
  const paymentMethod = state.selectedPayment || "cod";
  let transferTargetAccountInfo = "";
  let transferAccountLast5 = "";
  if (
    quote.availablePaymentMethods &&
    !quote.availablePaymentMethods[paymentMethod]
  ) {
    Swal.fire("錯誤", "目前配送方式不支援此付款方式，請重新選擇", "error");
    return;
  }

  if (paymentMethod === "transfer") {
    if (!state.selectedBankAccountId) {
      Swal.fire("錯誤", "請選擇您要匯入的目標帳號", "error");
      return;
    }
    transferAccountLast5 =
      document.getElementById("transfer-last5")?.value?.trim() || "";
    if (
      !transferAccountLast5 ||
      transferAccountLast5.length !== 5 ||
      !/^\d{5}$/.test(transferAccountLast5)
    ) {
      Swal.fire("錯誤", "請輸入正確的匯款帳號末5碼", "error");
      return;
    }

    const b = state.bankAccounts.find((x) =>
      String(x.id) === String(state.selectedBankAccountId)
    );
    if (b) {
      transferTargetAccountInfo =
        `${b.bankName} (${b.bankCode}) ${b.accountNumber}`;
    }
  }

  // 組合自訂欄位（排除 phone / email，轉為 JSON）
  const customFieldsData = {};
  for (const [k, v] of Object.entries(fieldsResult.data)) {
    if (k !== "phone" && k !== "email") {
      customFieldsData[k] = v;
    }
  }
  const customFieldsJson = Object.keys(customFieldsData).length > 0
    ? JSON.stringify(customFieldsData)
    : "";

  // 配送方式文字
  const methodText = {
    delivery: "配送到府(限新竹)",
    home_delivery: "全台宅配",
    seven_eleven: "7-11 取件",
    family_mart: "全家取件",
    in_store: "來店取貨",
  };
  let addrText =
    (deliveryMethod === "delivery" || deliveryMethod === "home_delivery")
      ? `${deliveryInfo.city}${
        deliveryInfo.district || ""
      } ${deliveryInfo.address}`
      : deliveryMethod === "in_store"
      ? `來店自取 (${deliveryInfo.storeAddress})`
      : `${deliveryInfo.storeName} [店號：${deliveryInfo.storeId}]${
        deliveryInfo.storeAddress ? " (" + deliveryInfo.storeAddress + ")" : ""
      }`;
  const orderLinesHtml = orderLines.map((line) => escapeHtml(String(line)))
    .join("<br>");
  const deliveryCompanyText = deliveryMethod === "delivery"
    ? String(deliveryInfo.companyOrBuilding || "").trim()
    : "";

  const confirmHtml = `
        <div style="text-align:left;font-size:0.95rem;">
        <b>配送方式：</b>${methodText[deliveryMethod]}<br>
        <b>取貨地點：</b>${escapeHtml(addrText)}<br><br>
        ${
    deliveryCompanyText
      ? `<b>公司行號/社區大樓：</b>${escapeHtml(deliveryCompanyText)}<br><br>`
      : ""
  }
        <b>訂單內容：</b><br>${orderLinesHtml}<br><br>
        <b>總金額：</b>$${total}
        ${note ? `<br><br><b>訂單備註：</b><br>${escapeHtml(note)}` : ""}
        ${
    receiptInfo
      ? `<br><br><b>收據資訊：</b><br>
          統一編號：${escapeHtml(receiptInfo.taxId) || "未填寫"}<br>
          買受人：${escapeHtml(receiptInfo.buyer) || "未填寫"}<br>
          收據地址：${escapeHtml(receiptInfo.address) || "未填寫"}<br>
          壓印日期：${receiptInfo.needDateStamp ? "需要" : "不需要"}`
      : ""
  }
        <br><br><b>付款方式：</b>${
    {
      cod: "貨到付款",
      linepay: "LINE Pay",
      jkopay: "街口支付",
      transfer: "線上轉帳",
    }[paymentMethod]
  }
        ${
    paymentMethod === "transfer" && transferTargetAccountInfo
      ? `<br><span style="color:#2E7D32; font-size:0.85rem">└ 匯入：${
        escapeHtml(transferTargetAccountInfo)
      }</span>`
      : ""
  }
        </div>`;

  const confirmResult = await Swal.fire({
    title: "確認訂單",
    html: confirmHtml,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "確認送出",
    cancelButtonText: "取消",
    confirmButtonColor: "#3C2415",
  });
  if (!confirmResult.isConfirmed) return;

  Swal.fire({
    title: "送出中...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  const payloadItems = cart.map((c) => ({
    productId: c.productId,
    specKey: c.specKey,
    qty: c.qty,
  }));

  try {
    const submitDeliveryInfo = { ...deliveryInfo };
    if (deliveryMethod === "delivery") {
      submitDeliveryInfo.address = composeDeliveryAddress(
        deliveryInfo.address,
        deliveryInfo.companyOrBuilding,
      );
    }

    const res = await authFetch(`${API_URL}?action=submitOrder`, {
      method: "POST",
      body: JSON.stringify({
        lineName: u.displayName || u.display_name,
        phone,
        email,
        items: payloadItems,
        deliveryMethod,
        note,
        customFields: customFieldsJson,
        receiptInfo: receiptInfo || undefined,
        paymentMethod,
        transferTargetAccount: transferTargetAccountInfo,
        transferAccountLast5,
        idempotencyKey: crypto.randomUUID(),
        ...submitDeliveryInfo,
      }),
    });
    const result = await res.json();
    if (result.success) {
      const isDeliveryAddress = deliveryMethod === "delivery" ||
        deliveryMethod === "home_delivery";
      const isStorePickup = deliveryMethod === "seven_eleven" ||
        deliveryMethod === "family_mart" || deliveryMethod === "in_store";

      u.phone = phone || "";
      u.email = email || "";
      u.defaultCustomFields = customFieldsJson || "{}";
      u.defaultDeliveryMethod = deliveryMethod || "";
      u.defaultCity = isDeliveryAddress ? String(deliveryInfo.city || "") : "";
      u.defaultDistrict = isDeliveryAddress
        ? String(deliveryInfo.district || "")
        : "";
      u.defaultAddress = isDeliveryAddress
        ? String(deliveryInfo.address || "")
        : "";
      u.defaultStoreId = isStorePickup ? String(deliveryInfo.storeId || "") : "";
      u.defaultStoreName = isStorePickup
        ? String(deliveryInfo.storeName || "")
        : "";
      u.defaultStoreAddress = isStorePickup
        ? String(deliveryInfo.storeAddress || "")
        : "";
      u.defaultPaymentMethod = paymentMethod || "";
      u.defaultTransferAccountLast5 = paymentMethod === "transfer"
        ? transferAccountLast5
        : "";
      u.defaultReceiptInfo = receiptInfo ? JSON.stringify(receiptInfo) : "";
      localStorage.setItem("coffee_user", JSON.stringify(u));
      try {
        localStorage.setItem(
          "coffee_delivery_prefs",
          JSON.stringify({ method: deliveryMethod, ...deliveryInfo }),
        );
      } catch {}

      // 背景同步使用者資料到後端
      try {
        authFetch(`${API_URL}?action=updateUserProfile`, {
          method: "POST",
          body: JSON.stringify({
            phone: phone || "",
            email: email || "",
            defaultCustomFields: customFieldsJson || "{}",
            defaultDeliveryMethod: deliveryMethod || "",
            defaultCity: isDeliveryAddress ? String(deliveryInfo.city || "") : "",
            defaultDistrict: isDeliveryAddress
              ? String(deliveryInfo.district || "")
              : "",
            defaultAddress: isDeliveryAddress
              ? String(deliveryInfo.address || "")
              : "",
            defaultStoreId: isStorePickup
              ? String(deliveryInfo.storeId || "")
              : "",
            defaultStoreName: isStorePickup
              ? String(deliveryInfo.storeName || "")
              : "",
            defaultStoreAddress: isStorePickup
              ? String(deliveryInfo.storeAddress || "")
              : "",
            defaultPaymentMethod: paymentMethod || "",
            defaultTransferAccountLast5: paymentMethod === "transfer"
              ? transferAccountLast5
              : "",
            defaultReceiptInfo: receiptInfo || "",
          }),
        }).catch(() => {});
      } catch {}

      // 線上支付: 依付款方式顯示對應跳轉文案
      if (result.paymentUrl) {
        const providerLabel = paymentMethod === "jkopay"
          ? "街口支付"
          : paymentMethod === "linepay"
          ? "LINE Pay"
          : "線上付款";
        Swal.fire({
          icon: "info",
          title: `跳轉至 ${providerLabel}`,
          text: `即將跳轉至 ${providerLabel} 付款頁面...`,
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false,
        }).then(() => {
          window.location.href = result.paymentUrl;
        });
        return;
      }

      // 線上轉帳: 顯示匯款確認
      if (paymentMethod === "transfer") {
        const b = state.bankAccounts.find((x) =>
          String(x.id) === String(state.selectedBankAccountId)
        );
        const bankHtml = b
          ? `<div style="text-align:left;padding:8px;background:#f0f5fa;border-radius:8px;margin-bottom:8px;">
                        <b>${escapeHtml(b.bankName)} (${
            escapeHtml(b.bankCode)
          })</b><br>
                        <span style="font-size:1.1em;font-family:monospace;">${
            escapeHtml(b.accountNumber)
          }</span>
                        ${
            b.accountName
              ? '<br><span style="color:#666">戶名: ' +
                escapeHtml(b.accountName) + "</span>"
              : ""
          }
                    </div>`
          : "";

        Swal.fire({
          icon: "success",
          title: "訂單已成立",
          html: `<p>訂單編號：<b>${result.orderId}</b></p>
                           <p>請匯款 <b style="color:#e63946">$${result.total}</b> 至以下帳號：</p>
                           ${bankHtml}
                           <p style="color:#666;font-size:0.9em;">(您的匯款末5碼已記錄，將用於對帳)</p>`,
          confirmButtonColor: "#3C2415",
        }).then(() => {
          clearCart();
          document.getElementById("order-note").value = "";
          applySavedOrderFormPrefs();
        });
        return;
      }

      Swal.fire({
        icon: "success",
        title: "訂單已送出！",
        text: `訂單編號：${result.orderId}`,
        confirmButtonColor: "#3C2415",
      }).then(() => {
        clearCart();
        document.getElementById("order-note").value = "";
        applySavedOrderFormPrefs();
      });
    } else throw new Error(result.error || "訂單送出發生未知錯誤");
  } catch (e) {
    const msg = e.message || "訂單送出發生未知錯誤，請稍後再試";
    const displayMsg = msg === "Failed to fetch"
      ? "網路連線失敗，請檢查網路後再試"
      : msg;
    Swal.fire("送出失敗", displayMsg, "error");
  }
}

/** 顯示我的訂單 */
export async function showMyOrders() {
  const u = state.currentUser;
  if (!u) {
    Swal.fire("請先登入", "", "info");
    return;
  }
  document.getElementById("my-orders-modal").classList.remove("hidden");
  const list = document.getElementById("my-orders-list");
  if (!list) return;
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

    list.replaceChildren(...result.orders.map((order) => createOrderCard(order)));
  } catch (e) {
    list.replaceChildren(
      createMessageElement(
        e.message || "訂單載入失敗",
        "text-center text-red-500 py-8",
      ),
    );
  }
}
