import { supabase } from "../utils/supabase.ts";
import { requireAdmin } from "../utils/auth.ts";

export async function getPromotions() {
  const { data, error } = await supabase.from("coffee_promotions").select("*")
    .order("sort_order", { ascending: true });
  if (error) return { success: false, error: error.message };
  const promotions = (data || []).map((r: Record<string, unknown>) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    targetProductIds:
      (typeof r.target_product_ids === "string"
        ? JSON.parse(r.target_product_ids)
        : r.target_product_ids) || [],
    targetItems:
      (typeof r.target_items === "string"
        ? JSON.parse(r.target_items)
        : r.target_items) || [],
    minQuantity: Number(r.min_quantity) || 1,
    discountType: r.discount_type,
    discountValue: Number(r.discount_value) || 0,
    enabled: r.enabled !== false,
    startTime: r.start_time,
    endTime: r.end_time,
    sortOrder: Number(r.sort_order) || 0,
  }));
  return { success: true, promotions };
}

export async function addPromotion(
  data: Record<string, unknown>,
  req: Request,
) {
  await requireAdmin(req);
  const { data: ins, error } = await supabase.from("coffee_promotions").insert({
    name: data.name,
    type: data.type || "bundle",
    target_product_ids: data.targetProductIds || [],
    target_items: data.targetItems || [],
    min_quantity: data.minQuantity || 1,
    discount_type: data.discountType,
    discount_value: data.discountValue,
    enabled: data.enabled !== false,
    start_time: data.startTime || null,
    end_time: data.endTime || null,
  }).select("id").single();
  if (error) return { success: false, error: error.message };
  return { success: true, message: "活動已新增", id: ins.id };
}

export async function updatePromotion(
  data: Record<string, unknown>,
  req: Request,
) {
  await requireAdmin(req);
  const { error } = await supabase.from("coffee_promotions").update({
    name: data.name,
    type: data.type || "bundle",
    target_product_ids: data.targetProductIds || [],
    target_items: data.targetItems || [],
    min_quantity: data.minQuantity || 1,
    discount_type: data.discountType,
    discount_value: data.discountValue,
    enabled: data.enabled !== false,
    start_time: data.startTime || null,
    end_time: data.endTime || null,
  }).eq("id", data.id);
  if (error) return { success: false, error: error.message };
  return { success: true, message: "活動已更新" };
}

export async function deletePromotion(
  data: Record<string, unknown>,
  req: Request,
) {
  await requireAdmin(req);
  const { error } = await supabase.from("coffee_promotions").delete().eq(
    "id",
    data.id,
  );
  if (error) return { success: false, error: error.message };
  return { success: true, message: "活動已刪除" };
}

export async function reorderPromotionsBulk(
  data: Record<string, unknown>,
  req: Request,
) {
  await requireAdmin(req);
  const ids = data.ids as number[];
  if (!Array.isArray(ids)) return { success: false, error: "資料格式錯誤" };

  const itemsToUpdate = ids.map((id, index) => ({
    id,
    sort_order: index * 10,
  }));
  const { error: rpcError } = await supabase.rpc("batch_update_sort", {
    table_name: "coffee_promotions",
    items: itemsToUpdate,
  });
  if (rpcError) return { success: false, error: rpcError.message };
  return { success: true, message: "批量排序已更新" };
}
