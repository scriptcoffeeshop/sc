import { API_URL } from "../../lib/appConfig.ts";
import { authFetch } from "../../lib/auth.ts";
import { escapeHtml, isValidEmail } from "../../lib/sharedUtils.ts";
import { state } from "../../lib/appState.ts";
import { cart, clearCart } from "./storefrontCartStore.ts";
import { collectDynamicFields } from "./storefrontFormRenderer.ts";
import Swal from "../../lib/swal.ts";
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
import { storefrontRuntime } from "./storefrontRuntime.ts";
import {
  confirmWarning,
  showError,
  showLoading,
  showWarning,
} from "../../lib/swalDialogs.ts";
import type {
  PaymentMethod,
  ReceiptInfo,
  SessionUser,
  SubmitDeliveryInfo,
} from "../../types";

function persistOrderDraftPreference(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_error) {
    return false;
  }
  return true;
}

function syncUserProfileInBackground(payload: Record<string, unknown>) {
  try {
    void authFetch(`${API_URL}?action=updateUserProfile`, {
      method: "POST",
      body: JSON.stringify(payload),
    }).catch(() => undefined);
  } catch (_error) {
    return false;
  }
  return true;
}

interface SubmittedOrderPreferenceInput {
  phone: string;
  email: string;
  customFieldsJson: string;
  deliveryMethod: string;
  deliveryInfo: SubmitDeliveryInfo;
  paymentMethod: PaymentMethod | string;
  transferAccountLast5: string;
  receiptInfo: ReceiptInfo | null;
}

function isDeliveryAddressMethod(deliveryMethod: string): boolean {
  return deliveryMethod === "delivery" || deliveryMethod === "home_delivery";
}

function isStorePickupMethod(deliveryMethod: string): boolean {
  return deliveryMethod === "seven_eleven" ||
    deliveryMethod === "family_mart" ||
    deliveryMethod === "in_store";
}

function buildSubmittedOrderPreferencePayload(
  input: SubmittedOrderPreferenceInput,
  options: { serializeReceiptInfo: boolean },
): Record<string, unknown> {
  const deliveryInfo = input.deliveryInfo;
  const isDeliveryAddress = isDeliveryAddressMethod(input.deliveryMethod);
  const isStorePickup = isStorePickupMethod(input.deliveryMethod);

  return {
    phone: input.phone || "",
    email: input.email || "",
    defaultCustomFields: input.customFieldsJson || "{}",
    defaultDeliveryMethod: input.deliveryMethod || "",
    defaultCity: isDeliveryAddress ? String(deliveryInfo.city || "") : "",
    defaultDistrict: isDeliveryAddress
      ? String(deliveryInfo.district || "")
      : "",
    defaultAddress: isDeliveryAddress ? String(deliveryInfo.address || "") : "",
    defaultStoreId: isStorePickup ? String(deliveryInfo.storeId || "") : "",
    defaultStoreName: isStorePickup ? String(deliveryInfo.storeName || "") : "",
    defaultStoreAddress: isStorePickup
      ? String(deliveryInfo.storeAddress || "")
      : "",
    defaultPaymentMethod: input.paymentMethod || "",
    defaultTransferAccountLast5: input.paymentMethod === "transfer"
      ? input.transferAccountLast5
      : "",
    defaultReceiptInfo: input.receiptInfo
      ? options.serializeReceiptInfo
        ? JSON.stringify(input.receiptInfo)
        : input.receiptInfo
      : "",
  };
}

function persistSubmittedOrderPreferences(
  user: SessionUser,
  input: SubmittedOrderPreferenceInput,
) {
  Object.assign(
    user,
    buildSubmittedOrderPreferencePayload(input, { serializeReceiptInfo: true }),
  );
  localStorage.setItem("coffee_user", JSON.stringify(user));
  persistOrderDraftPreference("coffee_delivery_prefs", {
    method: input.deliveryMethod,
    ...input.deliveryInfo,
  });
  syncUserProfileInBackground(
    buildSubmittedOrderPreferencePayload(input, { serializeReceiptInfo: false }),
  );
}

function resetOrderDraft() {
  clearCart();
  const noteEl = document.getElementById(
    "order-note",
  ) as HTMLTextAreaElement | null;
  if (noteEl) noteEl.value = "";
  applySavedOrderFormPrefs();
}

function setPolicyAgreeHintVisible(visible: boolean) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("coffee:policy-agree-hint-updated", {
      detail: { visible },
    }),
  );
}

/** 送出訂單 */
export async function submitOrder(): Promise<void> {
  const u = state.currentUser;
  if (!u) {
    showWarning("請先登入", "使用 LINE 登入後再訂購");
    return;
  }

  // 政策同意驗證
  const policyCheckbox = document.getElementById(
    "policy-agree",
  ) as HTMLInputElement | null;
  if (policyCheckbox && !policyCheckbox.checked) {
    setPolicyAgreeHintVisible(true);
    policyCheckbox.focus();
    showWarning("提醒", "請先閱讀並勾選同意隱私權政策及退換貨政策");
    return;
  }
  setPolicyAgreeHintVisible(false);

  // 動態欄位驗證
  const fieldsResult = collectDynamicFields(state.formFields);
  if (!fieldsResult.valid) {
    showError("錯誤", fieldsResult.error);
    return;
  }

  // 從動態欄位取值（相容舊的 phone / email）
  const dynamicFieldData = fieldsResult.data as Record<string, unknown>;
  const phone = String(dynamicFieldData.phone || "");
  const email = String(dynamicFieldData.email || "");

  if (!state.selectedDelivery) {
    showError("錯誤", "請選擇配送方式");
    return;
  }

  if (email && !isValidEmail(email)) {
    showError("錯誤", "請填寫正確的電子郵件");
    return;
  }

  if (!email) {
    const emailField = state.formFields.find((f) => f.field_key === "email");
    if (emailField && emailField.enabled) {
      const proceed = await confirmWarning({
        title: "未填寫電子郵件",
        text:
          "您沒有填寫電子郵件，將無法接收到訂單成立與出貨通知信。確定要繼續送出訂單嗎？",
        confirmButtonText: "繼續送出",
        cancelButtonText: "返回填寫",
        confirmButtonColor: "#3C2415",
      });
      if (!proceed.isConfirmed) return;
    }
  }

  if (!cart.length) {
    showError("錯誤", "購物車是空的，請先選擇商品");
    return;
  }

  if (storefrontRuntime.refreshQuote) {
    const quoteResult = await storefrontRuntime.refreshQuote({ silent: true });
    if (!quoteResult?.success) {
      showError(
        "錯誤",
        quoteResult?.error || "無法計算訂單金額，請稍後再試",
      );
      return;
    }
  }
  const quote = state.orderQuote;
  if (!quote || !Array.isArray(quote.orderLines)) {
    showError("錯誤", "無法取得最新報價，請稍後再試");
    return;
  }
  const orderLines = quote.orderLines;
  const total = Number(quote.total) || 0;
  const deliveryMethod = quote.deliveryMethod || state.selectedDelivery;

  const deliveryResult = collectSubmitDeliveryInfo(deliveryMethod);
  if (deliveryResult.error) {
    showError("錯誤", deliveryResult.error);
    return;
  }
  const deliveryInfo = deliveryResult.deliveryInfo as SubmitDeliveryInfo;

  const note = String(
    (document.getElementById("order-note") as HTMLTextAreaElement | null)
      ?.value || "",
  ).trim();
  const receiptResult = getReceiptFormValues();
  if (receiptResult.error) {
    showError("錯誤", receiptResult.error);
    return;
  }
  const receiptInfo = receiptResult.receiptInfo;

  // 付款方式驗證
  const paymentMethod = String(state.selectedPayment || "cod") as PaymentMethod;
  let transferTargetAccountInfo = "";
  let transferAccountLast5 = "";
  if (
    quote.availablePaymentMethods &&
    !quote.availablePaymentMethods[paymentMethod]
  ) {
    showError("錯誤", "目前配送方式不支援此付款方式，請重新選擇");
    return;
  }

  if (paymentMethod === "transfer") {
    if (!state.selectedBankAccountId) {
      showError("錯誤", "請選擇您要匯入的目標帳號");
      return;
    }
    transferAccountLast5 =
      (document.getElementById("transfer-last5") as HTMLInputElement | null)
        ?.value?.trim() || "";
    if (
      !transferAccountLast5 ||
      transferAccountLast5.length !== 5 ||
      !/^\d{5}$/.test(transferAccountLast5)
    ) {
      showError("錯誤", "請輸入正確的匯款帳號末5碼");
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
  const customFieldsData: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(dynamicFieldData)) {
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

  showLoading("送出中...");

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
      persistSubmittedOrderPreferences(u, {
        phone,
        email,
        customFieldsJson,
        deliveryMethod,
        deliveryInfo,
        paymentMethod,
        transferAccountLast5,
        receiptInfo,
      });

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
              location.href = result.paymentUrl;
            }
          });
          return;
        }

        const providerLabel = "線上付款";
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
            location.href = result.paymentUrl;
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
  } catch (e: unknown) {
    const msg = e instanceof Error
      ? e.message
      : "訂單送出發生未知錯誤，請稍後再試";
    const displayMsg = msg === "Failed to fetch"
      ? "網路連線失敗，請檢查網路後再試"
      : msg;
    showError("送出失敗", displayMsg);
  }
}
