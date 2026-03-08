import { supabase } from "../utils/supabase.ts";
import { requireAdmin } from "../utils/auth.ts";

export async function getCategories() {
  const { data, error } = await supabase.from("coffee_categories").select("*")
    .order("sort_order", { ascending: true }).order("id", { ascending: true });
  if (error) return { success: false, error: error.message };
  return {
    success: true,
    categories: (data || []).map((r: Record<string, unknown>) => ({
      id: r.id,
      name: r.name,
    })),
  };
}

export async function addCategory(data: Record<string, unknown>, req: Request) {
  await requireAdmin(req);
  const { data: ins, error } = await supabase.from("coffee_categories").insert({
    name: data.name,
  }).select("id").single();
  if (error) return { success: false, error: error.message };
  return { success: true, message: "分類已新增", id: ins.id };
}

export async function updateCategory(
  data: Record<string, unknown>,
  req: Request,
) {
  await requireAdmin(req);
  const newName = String(data.name);

  // 先取得舊名稱
  const { data: oldRow } = await supabase.from("coffee_categories").select(
    "name",
  ).eq("id", data.id).single();
  const oldName = oldRow?.name;

  // 更新分類名稱
  const { error } = await supabase.from("coffee_categories").update({
    name: newName,
  }).eq("id", data.id);
  if (error) return { success: false, error: error.message };

  // 同步更新所有隸屬於舊名稱的商品
  if (oldName && oldName !== newName) {
    const { error: prodErr } = await supabase.from("coffee_products").update({
      category: newName,
    }).eq("category", oldName);
    if (prodErr) {
      return {
        success: true,
        message: "分類已更新，但商品同步失敗: " + prodErr.message,
      };
    }
  }

  return { success: true, message: "分類已更新" };
}

export async function deleteCategory(
  data: Record<string, unknown>,
  req: Request,
) {
  await requireAdmin(req);
  const { error } = await supabase.from("coffee_categories").delete().eq(
    "id",
    data.id,
  );
  if (error) return { success: false, error: error.message };
  return { success: true, message: "分類已刪除" };
}

export async function reorderCategory(
  data: Record<string, unknown>,
  req: Request,
) {
  await requireAdmin(req);
  const ids = data.ids as number[];
  if (!Array.isArray(ids)) return { success: false, error: "缺少排序資料" };
  const itemsToUpdate = ids.map((id, index) => ({
    id: parseInt(String(id)),
    sort_order: index * 10,
  }));
  const { error } = await supabase.rpc("batch_update_sort", {
    table_name: "coffee_categories",
    items: itemsToUpdate,
  });
  if (error) return { success: false, error: error.message };
  return { success: true, message: "分類排序已更新" };
}
