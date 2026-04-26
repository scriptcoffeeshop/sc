import { API_URL, LINE_REDIRECT } from "../../lib/appConfig.ts";
import { authFetch, loginWithLine } from "../../lib/auth.ts";
import { isValidEmail } from "../../lib/sharedUtils.ts";
import { tryParseJsonRecord, type JsonRecord } from "../../lib/jsonUtils.ts";
import { state } from "../../lib/appState.ts";
import { cart, clearCart } from "./storefrontCartStore.ts";
import { collectDynamicFields } from "./storefrontDynamicFieldSubmission.ts";
import { getStorefrontDynamicFieldValues } from "./storefrontDynamicFieldValues.ts";
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
import {
  emitStorefrontOrderFormStateUpdated,
  getStorefrontOrderFormState,
} from "./storefrontOrderFormState.ts";
import { emitStorefrontEvent, STOREFRONT_EVENTS } from "./storefrontEventBus.ts";
import {
  buildPaymentLaunchDialogOptions,
  buildTransferOrderSuccessDialogOptions,
} from "./storefrontPaymentDisplay.ts";
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

const ORDER_IDEMPOTENCY_STORAGE_KEY = "coffee_order_idempotency";

let isSubmitOrderInFlight = false;

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as JsonRecord;
  return `{${Object.keys(record).sort().map((key) =>
    `${JSON.stringify(key)}:${stableJson(record[key])}`
  ).join(",")}}`;
}

function readStoredIdempotencyKey(signature: string) {
  const stored = tryParseJsonRecord(
    localStorage.getItem(ORDER_IDEMPOTENCY_STORAGE_KEY),
  );
  if (
    String(stored?.["signature"] || "") === signature &&
    typeof stored?.["key"] === "string"
  ) return stored["key"];
  return "";
}

function getOrderIdempotencyKey(signature: string) {
  const existing = readStoredIdempotencyKey(signature);
  if (existing) return existing;
  const key = crypto.randomUUID();
  try {
    localStorage.setItem(
      ORDER_IDEMPOTENCY_STORAGE_KEY,
      JSON.stringify({ signature, key, createdAt: Date.now() }),
    );
  } catch (_error) {
    return key;
  }
  return key;
}

function clearOrderIdempotencyKey(signature: string) {
  const stored = tryParseJsonRecord(
    localStorage.getItem(ORDER_IDEMPOTENCY_STORAGE_KEY),
  );
  if (!stored || String(stored["signature"] || "") === signature) {
    localStorage.removeItem(ORDER_IDEMPOTENCY_STORAGE_KEY);
  }
}

function persistOrderDraftPreference(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_error) {
    return false;
  }
  return true;
}

interface UserProfilePreferencePayload {
  displayName: string;
  phone: string;
  email: string;
  defaultCustomFields: string;
  defaultDeliveryMethod: string;
  defaultCity: string;
  defaultDistrict: string;
  defaultAddress: string;
  defaultStoreId: string;
  defaultStoreName: string;
  defaultStoreAddress: string;
  defaultPaymentMethod: PaymentMethod | string;
  defaultTransferAccountLast5: string;
  defaultReceiptInfo: ReceiptInfo | string;
}

function syncUserProfileInBackground(payload: UserProfilePreferencePayload) {
  try {
    void authFetch(`${API_URL}?action=updateUserProfile`, {
      method: "POST",
      body: JSON.stringify(payload),
    }).catch((): undefined => undefined);
  } catch (_error) {
    return false;
  }
  return true;
}

interface SubmittedOrderPreferenceInput {
  displayName: string;
  phone: string;
  email: string;
  customFieldsJson: string;
  deliveryMethod: string;
  deliveryInfo: SubmitDeliveryInfo;
  paymentMethod: PaymentMethod | string;
  transferAccountLast5: string;
  receiptInfo: ReceiptInfo | null;
}

type ContactFieldKind = "name" | "phone" | "email";

const CONTACT_FIELD_KEYS: Record<ContactFieldKind, Set<string>> = {
  name: new Set([
    "name",
    "nickname",
    "nickName",
    "lineName",
    "line_name",
    "displayName",
    "display_name",
    "customerName",
    "customer_name",
    "contactName",
    "contact_name",
    "fullName",
    "full_name",
  ].map(normalizeContactKey)),
  phone: new Set([
    "phone",
    "tel",
    "telephone",
    "mobile",
    "mobilePhone",
    "mobile_phone",
    "phoneNumber",
    "phone_number",
    "customerPhone",
    "customer_phone",
    "contactPhone",
    "contact_phone",
  ].map(normalizeContactKey)),
  email: new Set([
    "email",
    "e-mail",
    "mail",
    "customerEmail",
    "customer_email",
    "contactEmail",
    "contact_email",
  ].map(normalizeContactKey)),
};

const CONTACT_LABEL_PATTERNS: Record<ContactFieldKind, RegExp[]> = {
  name: [/姓名/, /名字/, /暱稱/, /稱呼/, /訂購人/, /聯絡人/, /顧客名稱/, /顧客姓名/],
  phone: [/電話/, /手機/, /聯絡方式/, /連絡方式/],
  email: [/email/i, /e-mail/i, /mail/i, /信箱/, /電子郵件/],
};

function normalizeContactKey(value: unknown): string {
  return String(value || "").trim().replace(/[\s_-]+/g, "").toLowerCase();
}

function isContactFieldKind(
  field: { field_key?: unknown; label?: unknown },
  kind: ContactFieldKind,
): boolean {
  const normalizedKey = normalizeContactKey(field.field_key);
  if (CONTACT_FIELD_KEYS[kind].has(normalizedKey)) return true;
  const label = String(field.label || "").trim();
  return CONTACT_LABEL_PATTERNS[kind].some((pattern) => pattern.test(label));
}

function findContactFieldValue(
  fields: Array<{ field_key?: unknown; label?: unknown }>,
  values: Record<string, string>,
  kind: ContactFieldKind,
): string {
  for (const field of fields) {
    if (!isContactFieldKind(field, kind)) continue;
    const key = String(field.field_key || "");
    const value = String(values[key] || "").trim();
    if (value) return value;
  }
  return "";
}

function isStandardContactField(
  field: { field_key?: unknown; label?: unknown },
): boolean {
  return isContactFieldKind(field, "name") ||
    isContactFieldKind(field, "phone") ||
    isContactFieldKind(field, "email");
}

export function resolveOrderContactFields(args: {
  fields: Array<{ field_key?: unknown; label?: unknown }>;
  values: Record<string, string>;
  user: SessionUser;
}) {
  const fields = args.fields || [];
  const values = args.values || {};
  const user = args.user;
  const displayName = findContactFieldValue(fields, values, "name") ||
    String(user.displayName || user["display_name"] || "").trim();
  const phone = findContactFieldValue(fields, values, "phone") ||
    String(user.phone || "").trim();
  const email = findContactFieldValue(fields, values, "email") ||
    String(user.email || "").trim();

  return {
    displayName,
    phone,
    email,
  };
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
): UserProfilePreferencePayload {
  const deliveryInfo = input.deliveryInfo;
  const isDeliveryAddress = isDeliveryAddressMethod(input.deliveryMethod);
  const isStorePickup = isStorePickupMethod(input.deliveryMethod);

  return {
    displayName: input.displayName || "",
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
  emitStorefrontOrderFormStateUpdated({ orderNote: "" });
  applySavedOrderFormPrefs();
}

function setPolicyAgreeHintVisible(visible: boolean) {
  emitStorefrontEvent(STOREFRONT_EVENTS.policyAgreeHintUpdated, { visible });
}

/** 送出訂單 */
export async function submitOrder(): Promise<void> {
  if (isSubmitOrderInFlight) {
    showWarning("訂單送出中", "請稍候，不需要重複點選送出。");
    return;
  }
  const u = state.currentUser;
  if (!u) {
    await loginWithLine(LINE_REDIRECT.main, "coffee_line_state");
    return;
  }

  // 政策同意驗證
  const orderForm = getStorefrontOrderFormState();
  if (!orderForm.policyAgreed) {
    setPolicyAgreeHintVisible(true);
    showWarning("提醒", "請先閱讀並勾選同意隱私權政策及退換貨政策");
    return;
  }
  setPolicyAgreeHintVisible(false);

  // 動態欄位驗證
  const fieldsResult = collectDynamicFields(
    state.formFields,
    getStorefrontDynamicFieldValues(),
  );
  if (!fieldsResult.valid) {
    showError("錯誤", fieldsResult.error);
    return;
  }

  // 從動態欄位取值（相容舊的 phone / email）
  const dynamicFieldData = fieldsResult.data;
  const contactFields = resolveOrderContactFields({
    fields: state.formFields,
    values: dynamicFieldData,
    user: u,
  });
  const displayName = contactFields.displayName;
  const phone = contactFields.phone;
  const email = contactFields.email;

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
  if (deliveryResult.error || !deliveryResult.deliveryInfo) {
    showError("錯誤", deliveryResult.error || "請確認配送資訊");
    return;
  }
  const deliveryInfo = deliveryResult.deliveryInfo;

  const note = orderForm.orderNote.trim();
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
    transferAccountLast5 = orderForm.transferAccountLast5.trim();
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

  // 組合自訂欄位（排除標準聯絡欄位，轉為 JSON）
  const customFieldsData: Record<string, string> = {};
  for (const field of state.formFields) {
    const fieldKey = String(field.field_key || "");
    if (!fieldKey || isStandardContactField(field)) continue;
    const value = String(dynamicFieldData[fieldKey] || "").trim();
    if (value) customFieldsData[fieldKey] = value;
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

  isSubmitOrderInFlight = true;
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
    const orderDraftSignature = stableJson({
      lineName: displayName,
      phone,
      email,
      items: payloadItems,
      deliveryMethod,
      note,
      customFields: customFieldsJson,
      receiptInfo: receiptInfo || null,
      paymentMethod,
      transferTargetAccount: transferTargetAccountInfo,
      transferAccountLast5,
      submitDeliveryInfo,
    });
    const idempotencyKey = getOrderIdempotencyKey(orderDraftSignature);

    const res = await authFetch(`${API_URL}?action=submitOrder`, {
      method: "POST",
      body: JSON.stringify({
        lineName: displayName,
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
        idempotencyKey,
        ...submitDeliveryInfo,
      }),
    });
    const result = await res.json();
    if (result.success) {
      clearOrderIdempotencyKey(orderDraftSignature);
      persistSubmittedOrderPreferences(u, {
        displayName,
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
        Swal.fire(buildTransferOrderSuccessDialogOptions({
          orderId: result.orderId,
          total: result.total,
          bankAccount: b || null,
        })).then(() => {
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
    } else if (result.code === "duplicate_order") {
      showWarning(
        "可能已送出",
        result.error || "請先到我的訂單查看是否已成立。",
      );
    } else if (result.code === "order_rate_limited") {
      showWarning(
        "請稍後再下單",
        result.error || "請間隔 3 分鐘以上再送出下一筆訂單。",
      );
    } else throw new Error(result.error || "訂單送出發生未知錯誤");
  } catch (e: unknown) {
    const msg = e instanceof Error
      ? e.message
      : "訂單送出發生未知錯誤，請稍後再試";
    const displayMsg = msg === "Failed to fetch"
      ? "網路連線失敗，請檢查網路後再試"
      : msg;
    showError("送出失敗", displayMsg);
  } finally {
    isSubmitOrderInFlight = false;
  }
}
