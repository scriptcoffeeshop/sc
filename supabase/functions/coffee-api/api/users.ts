import { supabase } from "../utils/supabase.ts";
import { requireAdmin, requireSuperAdmin } from "../utils/auth.ts";

export async function getUsers(data: Record<string, unknown>, req: Request) {
  await requireSuperAdmin(req);
  const { data: users, error } = await supabase.from("coffee_users").select("*")
    .order("last_login", { ascending: false });
  if (error) return { success: false, error: error.message };

  const search = String(data.search || "").toLowerCase();
  let filtered = users;
  if (search) {
    filtered = users.filter((u: Record<string, unknown>) =>
      (u.display_name && u.display_name.toLowerCase().includes(search)) ||
      (u.line_user_id && u.line_user_id.toLowerCase().includes(search)) ||
      (u.phone && u.phone.includes(search)) ||
      (u.email && u.email.includes(search))
    );
  }
  const formatted = filtered.map((u: Record<string, unknown>) => ({
    userId: u.line_user_id,
    displayName: u.display_name,
    pictureUrl: u.picture_url,
    role: u.role,
    status: u.status,
    lastLogin: u.last_login,
    phone: u.phone,
    email: u.email,
    blacklistReason: u.blacklist_reason,
    blockedAt: u.blocked_at,
  }));
  return { success: true, users: formatted };
}

export async function updateUserRole(
  data: Record<string, unknown>,
  req: Request,
) {
  await requireSuperAdmin(req);
  const { userId, role } = data;
  if (!userId || !role) return { success: false, error: "缺少必要資訊" };

  // 如果是降權 SUPER_ADMIN，需確認是否有其他 SUPER_ADMIN 存在或特定邏輯
  // 目前簡化處理
  const { error } = await supabase.from("coffee_users").update({
    role: String(role),
  }).eq("line_user_id", String(userId));
  if (error) return { success: false, error: error.message };
  return { success: true, message: "角色已更新" };
}

export async function getBlacklist(req: Request) {
  await requireAdmin(req);
  const { data, error } = await supabase.from("coffee_users").select("*").not(
    "blocked_at",
    "is",
    null,
  );
  if (error) return { success: false, error: error.message };
  return { success: true, blacklist: data || [] };
}

export async function addToBlacklist(
  data: Record<string, unknown>,
  req: Request,
) {
  await requireAdmin(req);
  const { userId, reason } = data;
  if (!userId) return { success: false, error: "缺少 userId" };
  const { error } = await supabase.from("coffee_users").update({
    status: "BLACKLISTED",
    blocked_at: new Date().toISOString(),
    blacklist_reason: String(reason || "未提供原因"),
  }).eq("line_user_id", String(userId));
  if (error) return { success: false, error: error.message };
  return { success: true, message: "已加入黑名單" };
}

export async function removeFromBlacklist(
  data: Record<string, unknown>,
  req: Request,
) {
  await requireAdmin(req);
  const { userId } = data;
  if (!userId) return { success: false, error: "缺少 userId" };
  const { error } = await supabase.from("coffee_users").update({
    status: "USER",
    blocked_at: null,
    blacklist_reason: null,
  }).eq("line_user_id", String(userId));
  if (error) return { success: false, error: error.message };
  return { success: true, message: "已移出黑名單" };
}
