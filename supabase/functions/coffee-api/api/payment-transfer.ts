import { requireAuth } from "../utils/auth.ts";
import { supabase } from "../utils/supabase.ts";
import type { JsonRecord } from "../utils/json.ts";

export async function updateTransferInfo(
  data: JsonRecord,
  req: Request,
) {
  const auth = await requireAuth(req);
  const orderId = String(data.orderId || "");
  const last5 = String(data.last5 || "").trim();
  if (!orderId) return { success: false, error: "缺少訂單編號" };
  if (!last5 || last5.length !== 5 || !/^\d{5}$/.test(last5)) {
    return { success: false, error: "請輸入正確的5位數字帳號末碼" };
  }

  const { data: order } = await supabase.from("coffee_orders").select(
    "line_user_id, payment_method",
  ).eq("id", orderId).maybeSingle();
  if (!order) return { success: false, error: "找不到訂單" };
  if (order.line_user_id !== auth.userId) {
    return { success: false, error: "無權操作此訂單" };
  }
  if (order.payment_method !== "transfer") {
    return { success: false, error: "此訂單非線上轉帳付款" };
  }

  const { error } = await supabase.from("coffee_orders").update({
    transfer_account_last5: last5,
  }).eq("id", orderId);
  if (error) return { success: false, error: error.message };
  return { success: true, message: "匯款資訊已更新" };
}
