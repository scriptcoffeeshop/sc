import { supabase } from "../utils/supabase.ts";
import { requireAdmin } from "../utils/auth.ts";
import type { JsonRecord } from "../utils/json.ts";

export async function getFormFields(includeDisabled: boolean) {
  let query = supabase.from("coffee_form_fields").select("*").order(
    "sort_order",
    { ascending: true },
  );
  if (!includeDisabled) {
    query = query.eq("enabled", true);
  }
  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  return { success: true, fields: data || [] };
}

export async function getFormFieldsAdmin(req: Request) {
  await requireAdmin(req);
  const query = supabase.from("coffee_form_fields").select("*").order(
    "sort_order",
    { ascending: true },
  ).order("id");
  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  return { success: true, fields: data || [] };
}

export async function addFormField(
  data: JsonRecord,
  req: Request,
) {
  await requireAdmin(req);
  const fieldKey = String(data.fieldKey || "").trim();
  if (!fieldKey) return { success: false, error: "欄位識別碼不能為空" };
  const { data: maxRow } = await supabase.from("coffee_form_fields").select(
    "sort_order",
  ).order("sort_order", { ascending: false }).limit(1);
  const nextOrder = (maxRow && maxRow[0]) ? maxRow[0].sort_order + 1 : 1;
  const { data: inserted, error } = await supabase.from("coffee_form_fields")
    .insert({
      section: String(data.section || "contact"),
      field_key: fieldKey,
      label: String(data.label || ""),
      field_type: String(data.fieldType || "text"),
      placeholder: String(data.placeholder || ""),
      options: String(data.options || ""),
      required: Boolean(data.required),
      enabled: data.enabled !== false,
      sort_order: nextOrder,
      delivery_visibility: data.deliveryVisibility
        ? String(data.deliveryVisibility)
        : null,
    }).select().single();
  if (error) return { success: false, error: error.message };
  return { success: true, field: inserted };
}

export async function updateFormField(
  data: JsonRecord,
  req: Request,
) {
  await requireAdmin(req);
  const id = parseInt(String(data.id));
  if (!id) return { success: false, error: "缺少欄位 ID" };
  const updates: JsonRecord = {};
  if (data.label !== undefined) updates.label = String(data.label);
  if (data.fieldType !== undefined) updates.field_type = String(data.fieldType);
  if (data.placeholder !== undefined) {
    updates.placeholder = String(data.placeholder);
  }
  if (data.options !== undefined) updates.options = String(data.options);
  if (data.required !== undefined) updates.required = Boolean(data.required);
  if (data.enabled !== undefined) updates.enabled = Boolean(data.enabled);
  if (data.section !== undefined) updates.section = String(data.section);
  if (data.deliveryVisibility !== undefined) {
    updates.delivery_visibility = data.deliveryVisibility
      ? String(data.deliveryVisibility)
      : null;
  }
  const { error } = await supabase.from("coffee_form_fields").update(updates)
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true, message: "欄位已更新" };
}

export async function deleteFormField(
  data: JsonRecord,
  req: Request,
) {
  await requireAdmin(req);
  const id = parseInt(String(data.id));
  if (!id) return { success: false, error: "缺少欄位 ID" };
  const { error } = await supabase.from("coffee_form_fields").delete().eq(
    "id",
    id,
  );
  if (error) return { success: false, error: error.message };
  return { success: true, message: "欄位已刪除" };
}

export async function reorderFormFields(
  data: JsonRecord,
  req: Request,
) {
  await requireAdmin(req);
  const ids = data.ids as number[];
  if (!Array.isArray(ids)) return { success: false, error: "缺少排序資料" };
  const itemsToUpdate = ids.map((id, index) => ({
    id: parseInt(String(id)),
    sort_order: index + 1,
  }));
  const { error } = await supabase.rpc("batch_update_sort", {
    table_name: "coffee_form_fields",
    items: itemsToUpdate,
  });
  if (error) return { success: false, error: error.message };
  return { success: true, message: "排序已更新" };
}
