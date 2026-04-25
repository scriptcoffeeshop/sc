import { supabase } from "../utils/supabase.ts";
import { requireAdmin } from "../utils/auth.ts";
import type { JsonRecord } from "../utils/json.ts";

export async function getBankAccounts() {
  const { data, error } = await supabase.from("coffee_bank_accounts").select(
    "*",
  ).eq("enabled", true).order("sort_order", { ascending: true });
  if (error) return { success: false, error: error.message };
  return {
    success: true,
    accounts: (data || []).map((r: JsonRecord) => ({
      id: r.id,
      bankCode: r.bank_code,
      bankName: r.bank_name,
      accountNumber: r.account_number,
      accountName: r.account_name || "",
    })),
  };
}

export async function addBankAccount(
  data: JsonRecord,
  req: Request,
) {
  await requireAdmin(req);
  const { data: maxRow } = await supabase.from("coffee_bank_accounts").select(
    "sort_order",
  ).order("sort_order", { ascending: false }).limit(1);
  const nextOrder = (maxRow && maxRow[0]) ? maxRow[0].sort_order + 1 : 1;
  const { data: ins, error } = await supabase.from("coffee_bank_accounts")
    .insert({
      bank_code: String(data.bankCode || ""),
      bank_name: String(data.bankName || ""),
      account_number: String(data.accountNumber || ""),
      account_name: String(data.accountName || ""),
      enabled: true,
      sort_order: nextOrder,
    }).select("id").single();
  if (error) return { success: false, error: error.message };
  return { success: true, message: "帳號已新增", id: ins.id };
}

export async function updateBankAccount(
  data: JsonRecord,
  req: Request,
) {
  await requireAdmin(req);
  const id = parseInt(String(data.id));
  if (!id) return { success: false, error: "缺少帳號 ID" };
  const updates: JsonRecord = {};
  if (data.bankCode !== undefined) updates.bank_code = String(data.bankCode);
  if (data.bankName !== undefined) updates.bank_name = String(data.bankName);
  if (data.accountNumber !== undefined) {
    updates.account_number = String(data.accountNumber);
  }
  if (data.accountName !== undefined) {
    updates.account_name = String(data.accountName);
  }
  if (data.enabled !== undefined) updates.enabled = Boolean(data.enabled);
  const { error } = await supabase.from("coffee_bank_accounts").update(updates)
    .eq("id", id);
  if (error) return { success: false, error: error.message };
  return { success: true, message: "帳號已更新" };
}

export async function deleteBankAccount(
  data: JsonRecord,
  req: Request,
) {
  await requireAdmin(req);
  const id = parseInt(String(data.id));
  if (!id) return { success: false, error: "缺少帳號 ID" };
  const { error } = await supabase.from("coffee_bank_accounts").delete().eq(
    "id",
    id,
  );
  if (error) return { success: false, error: error.message };
  return { success: true, message: "帳號已刪除" };
}

export async function reorderBankAccounts(
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
    table_name: "coffee_bank_accounts",
    items: itemsToUpdate,
  });
  if (error) return { success: false, error: error.message };
  return { success: true, message: "匯款帳號排序已更新" };
}
