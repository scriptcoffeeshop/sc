import { API_URL } from "../../../../js/config.js";
import { authFetch } from "../../../../js/auth.js";
import { escapeHtml, isValidEmail } from "../../../../js/utils.js";
import { state } from "../../../../js/state.js";
import { cart, clearCart } from "./storefrontCartStore.ts";
import { collectDynamicFields } from "./storefrontFormRenderer.ts";
import {
  buildSubmitDeliveryInfo,
  collectSubmitDeliveryInfo,
  getDeliveryAddressText,
} from "./storefrontOrderDeliveryInfo.ts";
import { confirmOrderSubmission } from "./storefrontOrderConfirmDialog.ts";
import {
  applySavedOrderFormPrefs,
  getReceiptFormValues,
} from "./storefrontOrderReceiptPrefs.ts";
import { buildPaymentLaunchDialogOptions } from "./storefrontPaymentDisplay.ts";

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

  const deliveryResult = collectSubmitDeliveryInfo(deliveryMethod);
  if (deliveryResult.error) {
    Swal.fire("錯誤", deliveryResult.error, "error");
    return;
  }
  const deliveryInfo = deliveryResult.deliveryInfo;

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

  const addrText = getDeliveryAddressText(deliveryMethod, deliveryInfo);
  const confirmResult = await confirmOrderSubmission({
    deliveryMethod,
    deliveryInfo,
    addressText: addrText,
    orderLines,
    total,
    note,
    receiptInfo,
    paymentMethod,
    transferTargetAccountInfo,
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
    const submitDeliveryInfo = buildSubmitDeliveryInfo(
      deliveryMethod,
      deliveryInfo,
    );

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

      const resetOrderDraft = () => {
        clearCart();
        const noteEl = document.getElementById("order-note");
        if (noteEl) noteEl.value = "";
        applySavedOrderFormPrefs();
      };

      // 線上支付: 依付款方式顯示對應跳轉文案
      if (result.paymentUrl) {
        resetOrderDraft();
        if (paymentMethod === "jkopay" || paymentMethod === "linepay") {
          Swal.fire(
            buildPaymentLaunchDialogOptions({
              orderId: result.orderId,
              paymentMethod,
              total: result.total,
              paymentExpiresAt: result.paymentExpiresAt,
            }),
          ).then((dialogResult) => {
            if (dialogResult.isConfirmed) {
              window.location.href = result.paymentUrl;
            }
          });
          return;
        }

        const providerLabel = paymentMethod === "linepay"
          ? "LINE Pay"
          : "線上付款";
        Swal.fire({
          icon: "info",
          title: `跳轉至${providerLabel}`,
          text: `訂單已建立，將前往 ${providerLabel} 完成付款。`,
          confirmButtonText: `前往${providerLabel}`,
          cancelButtonText: "稍後付款",
          showCancelButton: true,
          confirmButtonColor: "#3C2415",
          cancelButtonColor: "#94a3b8",
        }).then((dialogResult) => {
          if (dialogResult.isConfirmed) {
            window.location.href = result.paymentUrl;
          }
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
          resetOrderDraft();
        });
        return;
      }

      Swal.fire({
        icon: "success",
        title: "訂單已送出！",
        text: `訂單編號：${result.orderId}`,
        confirmButtonColor: "#3C2415",
      }).then(() => {
        resetOrderDraft();
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
