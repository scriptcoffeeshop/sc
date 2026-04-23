import { escapeHtml } from "../../../../js/utils.js";
import { SUBMIT_DELIVERY_METHOD_TEXT } from "./storefrontOrderDeliveryInfo.ts";
import { PAYMENT_METHOD_TEXT } from "./storefrontPaymentDisplay.ts";

function buildOrderConfirmHtml(params) {
  const deliveryCompanyText = params.deliveryMethod === "delivery"
    ? String(params.deliveryInfo.companyOrBuilding || "").trim()
    : "";
  const orderLinesHtml = params.orderLines
    .map((line) => escapeHtml(String(line)))
    .join("<br>");

  return `
        <div style="text-align:left;font-size:0.95rem;">
        <b>配送方式：</b>${SUBMIT_DELIVERY_METHOD_TEXT[params.deliveryMethod]}<br>
        <b>取貨地點：</b>${escapeHtml(params.addressText)}<br><br>
        ${
    deliveryCompanyText
      ? `<b>公司行號/社區大樓：</b>${escapeHtml(deliveryCompanyText)}<br><br>`
      : ""
  }
        <b>訂單內容：</b><br>${orderLinesHtml}<br><br>
        <b>總金額：</b>$${params.total}
        ${
    params.note
      ? `<br><br><b>訂單備註：</b><br>${escapeHtml(params.note)}`
      : ""
  }
        ${
    params.receiptInfo
      ? `<br><br><b>收據資訊：</b><br>
          統一編號：${escapeHtml(params.receiptInfo.taxId) || "未填寫"}<br>
          買受人：${escapeHtml(params.receiptInfo.buyer) || "未填寫"}<br>
          收據地址：${escapeHtml(params.receiptInfo.address) || "未填寫"}<br>
          壓印日期：${params.receiptInfo.needDateStamp ? "需要" : "不需要"}`
      : ""
  }
        <br><br><b>付款方式：</b>${
    PAYMENT_METHOD_TEXT[params.paymentMethod] || params.paymentMethod
  }
        ${
    params.paymentMethod === "transfer" && params.transferTargetAccountInfo
      ? `<br><span style="color:#2E7D32; font-size:0.85rem">└ 匯入：${
        escapeHtml(params.transferTargetAccountInfo)
      }</span>`
      : ""
  }
        </div>`;
}

export function confirmOrderSubmission(params) {
  return Swal.fire({
    title: "確認訂單",
    html: buildOrderConfirmHtml(params),
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "確認送出",
    cancelButtonText: "取消",
    confirmButtonColor: "#3C2415",
  });
}
