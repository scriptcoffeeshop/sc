// ============================================
// orders.js — 訂單送出 & 我的訂單
// ============================================

import { API_URL } from "./config.js";
import { authFetch } from "./auth.js";
import { escapeHtml, isValidEmail } from "./utils.js";
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

function normalizeReceiptInfo(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const buyer = String(raw.buyer || "").trim();
  const taxId = String(raw.taxId || "").trim();
  const address = String(raw.address || "").trim();
  const needDateStamp = Boolean(raw.needDateStamp);
  if (!/^\d{8}$/.test(taxId)) return null;
  return { buyer, taxId, address, needDateStamp };
}

function buildReceiptInfoHtml(receiptInfo) {
  if (!receiptInfo) return "";
  return `<div class="text-sm text-amber-800 bg-amber-50 p-2 rounded mb-2">
            <div><span class="text-gray-500">收據買受人：</span>${
    escapeHtml(receiptInfo.buyer) || "未填寫"
  }</div>
            <div><span class="text-gray-500">統一編號：</span>${escapeHtml(receiptInfo.taxId)}</div>
            <div><span class="text-gray-500">收據地址：</span>${
    escapeHtml(receiptInfo.address) || "未填寫"
  }</div>
            <div><span class="text-gray-500">壓印日期：</span>${
    receiptInfo.needDateStamp ? "需要" : "不需要"
  }</div>
          </div>`;
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

  if (!/^\d{8}$/.test(taxId)) {
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

function resetReceiptForm() {
  const requestEl = document.getElementById("receipt-request");
  const buyerEl = document.getElementById("receipt-buyer");
  const taxIdEl = document.getElementById("receipt-tax-id");
  const addressEl = document.getElementById("receipt-address");
  const dateStampEl = document.getElementById("receipt-date-stamp");
  if (requestEl) requestEl.checked = false;
  if (buyerEl) buyerEl.value = "";
  if (taxIdEl) taxIdEl.value = "";
  if (addressEl) addressEl.value = "";
  if (dateStampEl) dateStampEl.checked = false;
  toggleReceiptFieldsByCheckbox();
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
    if (!city) {
      Swal.fire("錯誤", "請選擇縣市", "error");
      return;
    }
    if (!addr) {
      Swal.fire("錯誤", "請填寫詳細地址", "error");
      return;
    }
    deliveryInfo = { city, district, address: addr };
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
    const last5 = document.getElementById("transfer-last5")?.value?.trim() ||
      "";
    if (!last5 || last5.length !== 5 || !/^\d{5}$/.test(last5)) {
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

  const confirmHtml = `
        <div style="text-align:left;font-size:0.95rem;">
        <b>配送方式：</b>${methodText[deliveryMethod]}<br>
        <b>取貨地點：</b>${escapeHtml(addrText)}<br><br>
        <b>訂單內容：</b><br>${orderLinesHtml}<br><br>
        <b>總金額：</b>$${total}
        ${note ? `<br><br><b>訂單備註：</b><br>${escapeHtml(note)}` : ""}
        ${
    receiptInfo
          ? `<br><br><b>收據資訊：</b><br>
          買受人：${escapeHtml(receiptInfo.buyer) || "未填寫"}<br>
          統一編號：${escapeHtml(receiptInfo.taxId)}<br>
          收據地址：${escapeHtml(receiptInfo.address) || "未填寫"}<br>
          壓印日期：${receiptInfo.needDateStamp ? "需要" : "不需要"}`
      : ""
  }
        <br><br><b>付款方式：</b>${
    {
      cod: "貨到付款",
      linepay: "LINE Pay",
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
        transferAccountLast5: paymentMethod === "transfer"
          ? (document.getElementById("transfer-last5")?.value?.trim() || "")
          : "",
        idempotencyKey: crypto.randomUUID(),
        ...deliveryInfo,
      }),
    });
    const result = await res.json();
    if (result.success) {
      if (email) u.email = email;
      if (phone) u.phone = phone;
      // 將自訂欄位存入 defaultCustomFields
      if (customFieldsJson) {
        u.defaultCustomFields = customFieldsJson;
      }
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
            ...deliveryInfo,
          }),
        }).catch(() => {});
      } catch {}

      // LINE Pay: 跳轉到付款頁面
      if (result.paymentUrl) {
        Swal.fire({
          icon: "info",
          title: "跳轉至 LINE Pay",
          text: "即將跳轉至 LINE Pay 付款頁面...",
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
          resetReceiptForm();
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
        resetReceiptForm();
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
  list.innerHTML = '<p class="text-center text-gray-500 py-8">載入中...</p>';
  try {
    const res = await authFetch(
      `${API_URL}?action=getMyOrders&_=${Date.now()}`,
    );
    const result = await res.json();
    if (!result.success || !result.orders?.length) {
      list.innerHTML = '<p class="text-center text-gray-500 py-8">尚無訂單</p>';
      return;
    }

    const statusMap = {
      pending: "待處理",
      processing: "處理中",
      shipped: "已出貨",
      completed: "已完成",
      cancelled: "已取消",
    };
    const methodMap = {
      delivery: "宅配",
      home_delivery: "全台宅配",
      seven_eleven: "7-11 取件",
      family_mart: "全家取件",
      in_store: "來店取貨",
    };
    const payMethodMap = {
      cod: "貨到付款",
      linepay: "LINE Pay",
      transfer: "線上轉帳",
    };
    const payStatusMap = {
      pending: "待付款",
      paid: "已付款",
      failed: "付款失敗",
      cancelled: "已取消",
      refunded: "已退款",
    };

    list.innerHTML = result.orders.map((o) => {
      const receiptInfo = normalizeReceiptInfo(o.receiptInfo);
      const customTrackingUrl = normalizeTrackingUrl(o.trackingUrl || "");
      const defaultTrackingUrl = getDefaultTrackingUrl(o.deliveryMethod);
      const trackingUrl = customTrackingUrl || defaultTrackingUrl;
      const shippingInfoHtml = (o.shippingProvider || o.trackingNumber ||
          trackingUrl)
        ? `<div class="text-xs text-gray-600 bg-blue-50 p-2 rounded mb-2">
                ${
          o.shippingProvider
            ? `<div>物流商：${escapeHtml(o.shippingProvider)}</div>`
            : ""
        }
                ${
          o.trackingNumber
            ? `<div class="mt-1">物流單號：<span class="font-mono">${
              escapeHtml(o.trackingNumber)
            }</span>
                    <button type="button" data-action="copy-tracking-number" data-tracking-number="${
              escapeHtml(o.trackingNumber)
            }" class="ml-2 px-2 py-0.5 bg-white border border-blue-200 hover:bg-blue-100 rounded text-gray-700" title="複製單號">複製</button>
                  </div>`
            : ""
        }
                ${
          trackingUrl
            ? `<a href="${
              escapeHtml(trackingUrl)
            }" target="_blank" class="text-blue-600 hover:underline">物流追蹤頁面</a>`
            : ""
        }
            </div>`
        : "";
      const payBadge = o.paymentMethod && o.paymentMethod !== "cod"
        ? `<span class="text-xs px-2 py-0.5 rounded-full ${
          o.paymentStatus === "paid"
            ? "bg-green-50 text-green-700"
            : o.paymentStatus === "pending"
            ? "bg-yellow-50 text-yellow-700"
            : "bg-gray-100 text-gray-600"
        }">${payMethodMap[o.paymentMethod] || ""} ${
          payStatusMap[o.paymentStatus] || ""
        }</span>`
        : "";
      const receiptHtml = buildReceiptInfoHtml(receiptInfo);
      return `
            <div class="border rounded-xl p-4 mb-3" style="border-color:#e5ddd5;">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-sm font-bold" style="color:var(--primary)">#${o.orderId}</span>
                    <span class="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700">${
        statusMap[o.status] || o.status
      }</span>
                </div>
                <div class="text-xs text-gray-500 mb-2 flex flex-wrap gap-1 items-center">
                    ${methodMap[o.deliveryMethod] || o.deliveryMethod} ${
        o.storeName
          ? "・" + o.storeName
          : o.city
          ? "・" + o.city + (o.address || "")
          : ""
      }
                    ${payBadge}
                </div>
                ${shippingInfoHtml}
                <div class="text-sm text-gray-600 whitespace-pre-line bg-gray-50 p-3 rounded mb-2">${
        escapeHtml(o.items)
      }</div>
                ${receiptHtml}
                <div class="text-right font-bold" style="color:var(--primary)">$${o.total}</div>
            </div>
        `;
    }).join("");
  } catch (e) {
    list.innerHTML =
      `<p class="text-center text-red-500 py-8">${e.message}</p>`;
  }
}
