import {
  PROCESSING_PAYMENT_CUSTOMER_NOTIFICATION_MESSAGE,
  shouldSkipCustomerNotificationForPaymentStatus,
} from "./customer-notification-policy.ts";
import { requireAdmin } from "../utils/auth.ts";
import { sendEmail } from "../utils/email.ts";
import { SMTP_USER } from "../utils/config.ts";
import { asJsonRecord } from "../utils/json.ts";
import type { JsonRecord } from "../utils/json.ts";
import { supabase } from "../utils/supabase.ts";
import { pushLineFlexMessage } from "../utils/line-messaging.ts";

export async function testEmail(data: JsonRecord, req: Request) {
  await requireAdmin(req);
  const to = String(data.to || SMTP_USER);
  if (!to || to === "undefined") {
    return {
      success: false,
      error: "No recipient provided or SMTP_USER is not set",
    };
  }
  const res = await sendEmail(
    to,
    "測試信件 Test Email",
    "<h1>Hello</h1><p>這是來自 Supabase Edge Function 的測試信件</p>",
  );
  return res;
}

export async function sendLineFlexMessage(
  data: JsonRecord,
  req: Request,
) {
  await requireAdmin(req);

  const orderId = String(data.orderId || "").trim();
  if (!orderId) return { success: false, error: "缺少訂單編號" };

  const rawFlex = data.flexMessage;
  if (!rawFlex || typeof rawFlex !== "object" || Array.isArray(rawFlex)) {
    return { success: false, error: "Flex Message 格式錯誤" };
  }

  const { data: order, error } = await supabase.from("coffee_orders").select(
    "line_user_id, payment_status",
  ).eq("id", orderId).maybeSingle();
  if (error) return { success: false, error: error.message };
  if (!order) return { success: false, error: "找不到訂單" };

  let to = String(data.to || "").trim();
  if (!to) {
    to = String(order?.line_user_id || "").trim();
  }

  if (!to) {
    return {
      success: false,
      error: "此訂單缺少 LINE 使用者 ID，無法發送訊息",
    };
  }
  const orderLineUserId = String(order.line_user_id || "").trim();
  if (
    shouldSkipCustomerNotificationForPaymentStatus(order.payment_status) &&
    orderLineUserId && to === orderLineUserId
  ) {
    return {
      success: false,
      error: `${PROCESSING_PAYMENT_CUSTOMER_NOTIFICATION_MESSAGE}（LINE Flex）`,
    };
  }

  const sendResult = await pushLineFlexMessage(
    to,
    asJsonRecord(rawFlex),
  );
  if (!sendResult.success) return sendResult;

  return {
    success: true,
    message: "LINE Flex 訊息已發送",
    orderId,
    to,
  };
}
