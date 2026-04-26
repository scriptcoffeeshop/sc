import { supabase } from "../utils/supabase.ts";
import { extractAuth } from "../utils/auth.ts";
import { normalizeEmail } from "../utils/email-validation.ts";
import type { JsonRecord } from "../utils/json.ts";

export async function getUserProfile(
  _data: JsonRecord,
  req: Request,
) {
  const auth = await extractAuth(req);
  if (!auth?.userId) return { success: false, error: "請先登入" };

  const { data: user, error } = await supabase.from("coffee_users")
    .select("*")
    .eq("line_user_id", auth.userId)
    .single();

  if (error || !user) {
    return { success: false, error: "找不到使用者資料" };
  }

  return {
    success: true,
    profile: {
      userId: user.line_user_id,
      displayName: user.display_name,
      pictureUrl: user.picture_url,
      phone: user.phone || "",
      email: user.email || "",
      defaultDeliveryMethod: user.default_delivery_method || "",
      defaultCity: user.default_city || "",
      defaultDistrict: user.default_district || "",
      defaultAddress: user.default_address || "",
      defaultStoreId: user.default_store_id || "",
      defaultStoreName: user.default_store_name || "",
      defaultStoreAddress: user.default_store_address || "",
      defaultCustomFields: user.default_custom_fields || "{}",
      defaultPaymentMethod: user.default_payment_method || "",
      defaultTransferAccountLast5: user.default_transfer_account_last5 || "",
      defaultReceiptInfo: user.default_receipt_info || "",
    },
  };
}

export async function updateUserProfile(
  data: JsonRecord,
  req: Request,
) {
  const auth = await extractAuth(req);
  if (!auth?.userId) return { success: false, error: "請先登入" };

  const updates: JsonRecord = {};

  if (data.phone !== undefined) updates.phone = String(data.phone);
  if (data.email !== undefined) updates.email = normalizeEmail(data.email);
  if (data.defaultCity !== undefined) {
    updates.default_city = String(data.defaultCity);
  }
  if (data.defaultDistrict !== undefined) {
    updates.default_district = String(data.defaultDistrict);
  }
  if (data.defaultAddress !== undefined) {
    updates.default_address = String(data.defaultAddress);
  }
  if (data.defaultDeliveryMethod !== undefined) {
    updates.default_delivery_method = String(data.defaultDeliveryMethod);
  }
  if (data.defaultStoreId !== undefined) {
    updates.default_store_id = String(data.defaultStoreId);
  }
  if (data.defaultStoreName !== undefined) {
    updates.default_store_name = String(data.defaultStoreName);
  }
  if (data.defaultStoreAddress !== undefined) {
    updates.default_store_address = String(data.defaultStoreAddress);
  }
  if (data.defaultCustomFields !== undefined) {
    updates.default_custom_fields = typeof data.defaultCustomFields === "string"
      ? data.defaultCustomFields
      : JSON.stringify(data.defaultCustomFields);
  }
  if (data.defaultPaymentMethod !== undefined) {
    updates.default_payment_method = String(data.defaultPaymentMethod);
  }
  if (data.defaultTransferAccountLast5 !== undefined) {
    updates.default_transfer_account_last5 = String(
      data.defaultTransferAccountLast5,
    );
  }
  if (data.defaultReceiptInfo !== undefined) {
    updates.default_receipt_info = typeof data.defaultReceiptInfo === "string"
      ? data.defaultReceiptInfo
      : JSON.stringify(data.defaultReceiptInfo);
  }

  if (Object.keys(updates).length === 0) {
    return { success: false, error: "沒有提供要更新的欄位" };
  }

  const { error } = await supabase.from("coffee_users")
    .update(updates)
    .eq("line_user_id", auth.userId);

  if (error) return { success: false, error: error.message };

  // 回傳更新後的資料
  return getUserProfile(data, req);
}
