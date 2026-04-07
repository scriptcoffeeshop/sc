import { requireAdmin } from "../utils/auth.ts";
import { sendEmail } from "../utils/email.ts";
import { SMTP_USER } from "../utils/config.ts";
import { supabase } from "../utils/supabase.ts";
import { pushLineFlexMessage } from "../utils/line-messaging.ts";

export async function testEmail(data: Record<string, unknown>, req: Request) {
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
  data: Record<string, unknown>,
  req: Request,
) {
  await requireAdmin(req);

  const orderId = String(data.orderId || "").trim();
  if (!orderId) return { success: false, error: "缺少訂單編號" };

  const rawFlex = data.flexMessage;
  if (!rawFlex || typeof rawFlex !== "object" || Array.isArray(rawFlex)) {
    return { success: false, error: "Flex Message 格式錯誤" };
  }

  let to = String(data.to || "").trim();
  if (!to) {
    const { data: order, error } = await supabase.from("coffee_orders").select(
      "line_user_id",
    ).eq("id", orderId).maybeSingle();
    if (error) return { success: false, error: error.message };
    to = String(order?.line_user_id || "").trim();
  }

  if (!to) {
    return {
      success: false,
      error: "此訂單缺少 LINE 使用者 ID，無法發送訊息",
    };
  }

  const sendResult = await pushLineFlexMessage(
    to,
    rawFlex as Record<string, unknown>,
  );
  if (!sendResult.success) return sendResult;

  return {
    success: true,
    message: "LINE Flex 訊息已發送",
    orderId,
    to,
  };
}
