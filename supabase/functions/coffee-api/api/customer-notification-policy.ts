export const PROCESSING_PAYMENT_CUSTOMER_NOTIFICATION_MESSAGE =
  "付款確認中的訂單不發送消費者通知";

export function shouldSkipCustomerNotificationForPaymentStatus(
  paymentStatus: unknown,
): boolean {
  return String(paymentStatus || "").trim().toLowerCase() === "processing";
}
