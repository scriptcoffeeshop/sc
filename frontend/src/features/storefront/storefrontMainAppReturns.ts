import { authFetch } from "../../lib/auth.ts";
import { API_URL } from "../../lib/appConfig.ts";
import { createLogger } from "../../lib/logger.ts";
import { showDialog, showError, showLoading } from "../../lib/swalDialogs.ts";
import { buildPaymentStatusDialogOptions } from "./storefrontPaymentDisplay.ts";

const logger = createLogger("storefront-payments");

type StorefrontMainAppReturnsDeps = {
  getErrorMessage: (error: unknown, fallback?: string) => string;
};

export function createStorefrontMainAppReturns(
  deps: StorefrontMainAppReturnsDeps,
) {
  async function handleLinePayCallback(
    lpAction: string,
    params: URLSearchParams,
  ) {
    const transactionId = params.get("transactionId") || "";
    const orderId = params.get("orderId") || "";
    const callbackSig = params.get("sig") || "";

    if (lpAction === "confirm" && transactionId && orderId) {
      showLoading("確認付款中...");
      try {
        const response = await fetch(
          `${API_URL}?action=linePayConfirm&transactionId=${transactionId}&orderId=${orderId}`,
        );
        const result = await response.json();
        if (result.success) {
          await showDialog({
            icon: "success",
            title: "付款成功！",
            text: `訂單編號：${orderId}`,
            confirmButtonColor: "#3C2415",
          });
          return;
        }
        showError("付款失敗", result.error || "請聯繫店家");
      } catch (error) {
        showError("錯誤", "付款確認失敗: " + deps.getErrorMessage(error));
      }
      return;
    }

    if (lpAction === "cancel") {
      if (orderId) {
        const cancelUrl = `${API_URL}?action=linePayCancel&orderId=${
          encodeURIComponent(orderId)
        }${
          callbackSig ? `&sig=${encodeURIComponent(callbackSig)}` : ""
        }`;
        try {
          const response = callbackSig
            ? await fetch(cancelUrl)
            : await authFetch(cancelUrl);
          if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            const message = String(result.error || "").trim();
            if (message) logger.warn("LINE Pay cancel notify returned error", { message });
          }
        } catch (error) {
          logger.warn("LINE Pay cancel notify failed", error);
        }
      }

      await showDialog({
        icon: "info",
        title: "付款已取消",
        text: "您已取消 LINE Pay 付款",
        confirmButtonColor: "#3C2415",
      });
    }
  }

  async function handleJkoPayReturn(orderId: string) {
    if (!orderId) return;
    showLoading("確認付款狀態中...");

    try {
      const response = await authFetch(
        `${API_URL}?action=jkoPayInquiry&orderId=${encodeURIComponent(orderId)}`,
      );
      const result = await response.json();
      if (result.success) {
        const dialogOptions = buildPaymentStatusDialogOptions({
          orderId,
          paymentMethod: "jkopay",
          paymentStatus: result.paymentStatus,
          paymentExpiresAt: result.paymentExpiresAt,
          paymentConfirmedAt: result.paymentConfirmedAt,
          paymentLastCheckedAt: result.paymentLastCheckedAt,
          paymentUrl: result.paymentUrl,
        });
        const dialogResult = await showDialog(dialogOptions);
        if (dialogResult.isConfirmed && dialogOptions.paymentLaunchUrl) {
          location.href = dialogOptions.paymentLaunchUrl;
        }
        return;
      }
    } catch (_error) {
      // fall through to processing state dialog below
    }

    await showDialog(
      buildPaymentStatusDialogOptions({
        orderId,
        paymentMethod: "jkopay",
        paymentStatus: "processing",
        paymentLastCheckedAt: new Date().toISOString(),
      }),
    );
  }

  return {
    handleJkoPayReturn,
    handleLinePayCallback,
  };
}
