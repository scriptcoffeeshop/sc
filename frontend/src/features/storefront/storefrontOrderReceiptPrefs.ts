import { state } from "../../lib/appState.ts";
import { tryParseJsonRecord } from "../../lib/jsonUtils.ts";
import { emitStorefrontOrderFormStateUpdated } from "./storefrontOrderFormState.ts";
import {
  emitStorefrontReceiptFormStateUpdated,
  getStorefrontReceiptFormState,
} from "./storefrontReceiptFormState.ts";
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
  const receiptState = getStorefrontReceiptFormState();
  if (!receiptState.requested) return { receiptInfo: null, error: "" };

  const buyer = receiptState.buyer.trim();
  const taxId = receiptState.taxId.trim();
  const address = receiptState.address.trim();
  const needDateStamp = receiptState.needDateStamp;

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

function applyReceiptFormValues(receiptInfo: ReceiptInfo | null): void {
  if (!receiptInfo) {
    emitStorefrontReceiptFormStateUpdated({
      requested: false,
      buyer: "",
      taxId: "",
      address: "",
      needDateStamp: false,
    });
    return;
  }

  emitStorefrontReceiptFormStateUpdated({
    requested: true,
    buyer: receiptInfo.buyer,
    taxId: receiptInfo.taxId,
    address: receiptInfo.address,
    needDateStamp: receiptInfo.needDateStamp,
  });
}

export function applySavedOrderFormPrefs(): void {
  const u = state.currentUser;
  if (!u) return;

  const receiptInfo = parseStoredReceiptInfo(u["defaultReceiptInfo"]);
  applyReceiptFormValues(receiptInfo);

  const transferLast5 = String(u["defaultTransferAccountLast5"] || "").trim();
  emitStorefrontOrderFormStateUpdated({
    transferAccountLast5: /^\d{5}$/.test(transferLast5) ? transferLast5 : "",
  });

  const paymentMethod = String(u["defaultPaymentMethod"] || "").trim() as PaymentMethod;
  if (!["cod", "linepay", "jkopay", "transfer"].includes(paymentMethod)) return;

  if (!storefrontRuntime.availablePaymentMethods[paymentMethod]) return;
  if (storefrontRuntime.selectPayment) {
    storefrontRuntime.selectPayment(paymentMethod, { skipQuote: true });
  }
}

export function initReceiptRequestUi(): void {
  emitStorefrontReceiptFormStateUpdated(getStorefrontReceiptFormState());
}
