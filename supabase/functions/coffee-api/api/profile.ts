import { supabase } from "../utils/supabase.ts";
import { extractAuth } from "../utils/auth.ts";

export async function getUserProfile(
  _data: Record<string, unknown>,
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
    },
  };
}

export async function updateUserProfile(
  data: Record<string, unknown>,
  req: Request,
) {
  const auth = await extractAuth(req);
  if (!auth?.userId) return { success: false, error: "請先登入" };

  const updates: Record<string, unknown> = {};

  if (data.phone !== undefined) updates.phone = String(data.phone);
  if (data.email !== undefined) updates.email = String(data.email);
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
