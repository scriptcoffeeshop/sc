import { state } from "../../../../js/state.js";
import { storefrontRuntime } from "./storefrontRuntime.ts";

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

export function getReceiptFormValues() {
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
  if (storefrontRuntime.selectPayment) {
    storefrontRuntime.selectPayment(paymentMethod, { skipQuote: true });
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
