import { state } from "../../lib/appState.ts";
import { storefrontRuntime } from "./storefrontRuntime.ts";
import type { PaymentMethod, ReceiptInfo } from "../../types";

function getInputValue(id: string): string {
  return String((document.getElementById(id) as HTMLInputElement | null)?.value || "");
}

function getInputChecked(id: string): boolean {
  return Boolean((document.getElementById(id) as HTMLInputElement | null)?.checked);
}

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
    try {
      return normalizeReceiptInfo(JSON.parse(str));
    } catch {
      return null;
    }
  }
  return normalizeReceiptInfo(raw);
}

export function getReceiptFormValues(): { receiptInfo: ReceiptInfo | null; error: string } {
  const requested = getInputChecked("receipt-request");
  if (!requested) return { receiptInfo: null, error: "" };

  const buyer = getInputValue("receipt-buyer").trim();
  const taxId = getInputValue("receipt-tax-id").trim();
  const address = getInputValue("receipt-address").trim();
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

function toggleReceiptFieldsByCheckbox(): void {
  const requestEl = document.getElementById("receipt-request") as HTMLInputElement | null;
  const fieldsEl = document.getElementById("receipt-fields");
  if (!fieldsEl) return;
  fieldsEl.classList.toggle("hidden", !requestEl?.checked);
}

function applyReceiptFormValues(receiptInfo: ReceiptInfo | null): void {
  const requestEl = document.getElementById("receipt-request") as HTMLInputElement | null;
  const buyerEl = document.getElementById("receipt-buyer") as HTMLInputElement | null;
  const taxIdEl = document.getElementById("receipt-tax-id") as HTMLInputElement | null;
  const addressEl = document.getElementById("receipt-address") as HTMLInputElement | null;
  const dateStampEl = document.getElementById("receipt-date-stamp") as HTMLInputElement | null;

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

export function applySavedOrderFormPrefs(): void {
  const u = state.currentUser;
  if (!u) return;

  const receiptInfo = parseStoredReceiptInfo(u.defaultReceiptInfo);
  applyReceiptFormValues(receiptInfo);

  const transferLast5El = document.getElementById("transfer-last5") as HTMLInputElement | null;
  const transferLast5 = String(u.defaultTransferAccountLast5 || "").trim();
  if (transferLast5El) {
    transferLast5El.value = /^\d{5}$/.test(transferLast5) ? transferLast5 : "";
  }

  const paymentMethod = String(u.defaultPaymentMethod || "").trim() as PaymentMethod;
  if (!["cod", "linepay", "jkopay", "transfer"].includes(paymentMethod)) return;

  const paymentOptionEl = document.getElementById(`${paymentMethod}-option`);
  if (!paymentOptionEl || paymentOptionEl.classList.contains("hidden")) return;
  if (storefrontRuntime.selectPayment) {
    storefrontRuntime.selectPayment(paymentMethod, { skipQuote: true });
  }
}

export function initReceiptRequestUi(): void {
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
