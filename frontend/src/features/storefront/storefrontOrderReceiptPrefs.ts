import { state } from "../../lib/appState.ts";
import { tryParseJsonRecord } from "../../lib/jsonUtils.ts";
import {
  getFormControlValue,
  getInputChecked,
  setInputChecked,
  setInputValue,
} from "./storefrontDeliveryDom.ts";
import { emitStorefrontOrderFormStateUpdated } from "./storefrontOrderFormState.ts";
import { storefrontRuntime } from "./storefrontRuntime.ts";
import type { PaymentMethod, ReceiptInfo } from "../../types";

function normalizeReceiptInfo(raw: unknown): ReceiptInfo | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Partial<ReceiptInfo>;
  const buyer = String(row.buyer || "").trim();
  const taxId = String(row.taxId || "").trim();
  const address = String(row.address || "").trim();
  const needDateStamp = Boolean(row.needDateStamp);
  if (taxId && !/^\d{8}$/.test(taxId)) return null;
  return { buyer, taxId, address, needDateStamp };
}

function parseStoredReceiptInfo(raw: unknown): ReceiptInfo | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    const str = raw.trim();
    if (!str) return null;
    return normalizeReceiptInfo(tryParseJsonRecord(str));
  }
  return normalizeReceiptInfo(raw);
}

export function getReceiptFormValues(): { receiptInfo: ReceiptInfo | null; error: string } {
  const requested = getInputChecked("receipt-request");
  if (!requested) return { receiptInfo: null, error: "" };

  const buyer = getFormControlValue("receipt-buyer").trim();
  const taxId = getFormControlValue("receipt-tax-id").trim();
  const address = getFormControlValue("receipt-address").trim();
  const needDateStamp = getInputChecked("receipt-date-stamp");

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

function dispatchReceiptRequestUpdated(requested: boolean): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("coffee:receipt-request-updated", {
      detail: { requested },
    }),
  );
}

function applyReceiptFormValues(receiptInfo: ReceiptInfo | null): void {
  if (!receiptInfo) {
    setInputChecked("receipt-request", false);
    setInputValue("receipt-buyer", "");
    setInputValue("receipt-tax-id", "");
    setInputValue("receipt-address", "");
    setInputChecked("receipt-date-stamp", false);
    dispatchReceiptRequestUpdated(false);
    return;
  }

  setInputChecked("receipt-request", true);
  setInputValue("receipt-buyer", receiptInfo.buyer);
  setInputValue("receipt-tax-id", receiptInfo.taxId);
  setInputValue("receipt-address", receiptInfo.address);
  setInputChecked("receipt-date-stamp", receiptInfo.needDateStamp);
  dispatchReceiptRequestUpdated(true);
}

export function applySavedOrderFormPrefs(): void {
  const u = state.currentUser;
  if (!u) return;

  const receiptInfo = parseStoredReceiptInfo(u.defaultReceiptInfo);
  applyReceiptFormValues(receiptInfo);

  const transferLast5 = String(u.defaultTransferAccountLast5 || "").trim();
  emitStorefrontOrderFormStateUpdated({
    transferAccountLast5: /^\d{5}$/.test(transferLast5) ? transferLast5 : "",
  });

  const paymentMethod = String(u.defaultPaymentMethod || "").trim() as PaymentMethod;
  if (!["cod", "linepay", "jkopay", "transfer"].includes(paymentMethod)) return;

  if (!storefrontRuntime.availablePaymentMethods[paymentMethod]) return;
  if (storefrontRuntime.selectPayment) {
    storefrontRuntime.selectPayment(paymentMethod, { skipQuote: true });
  }
}

export function initReceiptRequestUi(): void {
  dispatchReceiptRequestUpdated(getInputChecked("receipt-request"));
}
