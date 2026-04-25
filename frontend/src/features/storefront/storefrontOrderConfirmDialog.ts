import { createApp, type App } from "vue";
import { SUBMIT_DELIVERY_METHOD_TEXT } from "./storefrontOrderDeliveryInfo.ts";
import { PAYMENT_METHOD_TEXT } from "./storefrontPaymentDisplay.ts";
import Swal from "../../lib/swal.ts";
import type { SwalDialogPromise } from "../../lib/swalDialogs.ts";
import type { StorefrontOrderConfirmParams } from "../../types";
import StorefrontOrderConfirmSummary, {
  type StorefrontOrderConfirmSummaryView,
} from "./StorefrontOrderConfirmSummary.vue";

function getLabel(map: Record<string, string>, key: string): string {
  return map[key] || key;
}

export function buildOrderConfirmSummaryView(
  params: StorefrontOrderConfirmParams,
): StorefrontOrderConfirmSummaryView {
  const deliveryCompanyText = params.deliveryMethod === "delivery"
    ? String(params.deliveryInfo.companyOrBuilding || "").trim()
    : "";

  return {
    deliveryLabel: getLabel(
      SUBMIT_DELIVERY_METHOD_TEXT,
      String(params.deliveryMethod || ""),
    ),
    addressText: String(params.addressText || ""),
    companyOrBuilding: deliveryCompanyText,
    orderLines: params.orderLines.map((line) => String(line)),
    totalText: `$${params.total}`,
    note: String(params.note || ""),
    receiptRows: params.receiptInfo
      ? [
        {
          label: "統一編號",
          value: String(params.receiptInfo.taxId || "") || "未填寫",
        },
        {
          label: "買受人",
          value: String(params.receiptInfo.buyer || "") || "未填寫",
        },
        {
          label: "收據地址",
          value: String(params.receiptInfo.address || "") || "未填寫",
        },
        {
          label: "壓印日期",
          value: params.receiptInfo.needDateStamp ? "需要" : "不需要",
        },
      ]
      : [],
    paymentLabel: getLabel(
      PAYMENT_METHOD_TEXT,
      String(params.paymentMethod || ""),
    ),
    transferTargetAccountInfo: params.paymentMethod === "transfer"
      ? String(params.transferTargetAccountInfo || "")
      : "",
  };
}

export function confirmOrderSubmission(
  params: StorefrontOrderConfirmParams,
): SwalDialogPromise {
  const root = document.createElement("div");
  const summary = buildOrderConfirmSummaryView(params);
  let confirmSummaryApp: App<Element> | null = null;

  return Swal.fire({
    title: "確認訂單",
    html: root,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "確認送出",
    cancelButtonText: "取消",
    confirmButtonColor: "#3C2415",
    didOpen: (popup: unknown) => {
      if (
        !root.isConnected &&
        popup &&
        typeof (popup as { appendChild?: unknown }).appendChild === "function"
      ) {
        (popup as { appendChild: (node: Node) => void }).appendChild(root);
      }
      confirmSummaryApp = createApp(StorefrontOrderConfirmSummary, {
        summary,
      });
      confirmSummaryApp.mount(root);
    },
    willClose: () => {
      confirmSummaryApp?.unmount();
      confirmSummaryApp = null;
    },
  });
}
