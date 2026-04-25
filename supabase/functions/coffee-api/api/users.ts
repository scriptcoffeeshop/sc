import { supabase } from "../utils/supabase.ts";
import { normalizeAdminPermissions, requireAdmin } from "../utils/auth.ts";
import { LINE_ADMIN_USER_ID } from "../utils/config.ts";
import type { JsonRecord } from "../utils/json.ts";

export async function getUsers(req: Request) {
  await requireAdmin(req);
  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("pageSize") || "50")),
  );
  const offset = (page - 1) * pageSize;

  let query = supabase.from("coffee_users").select("*", { count: "exact" });
  if (search) {
    query = query.or(
      `display_name.ilike.%${search}%,line_user_id.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`,
    );
  }
  query = query.order("last_login", { ascending: false }).range(
    offset,
    offset + pageSize - 1,
  );

  const { data: users, count, error } = await query;
  if (error) return { success: false, error: error.message };

  const formatted = (users || []).map((u: JsonRecord) => ({
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
    adminNote: u.admin_note || "",
    adminPermissions: normalizeAdminPermissions(u.admin_permissions),
    defaultDeliveryMethod: u.default_delivery_method || "",
    defaultCity: u.default_city || "",
    defaultDistrict: u.default_district || "",
    defaultAddress: u.default_address || "",
    defaultStoreId: u.default_store_id || "",
    defaultStoreName: u.default_store_name || "",
    defaultStoreAddress: u.default_store_address || "",
  }));

  return {
    success: true,
    users: formatted,
    pagination: {
      totalCount: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
      page,
      pageSize,
    },
  };
}

async function getTargetUser(targetUserId: string) {
  const { data, error } = await supabase.from("coffee_users").select(
    "line_user_id, role",
  ).eq("line_user_id", targetUserId).maybeSingle();
  if (error) return { user: null, error: error.message };
  if (!data) return { user: null, error: "找不到此用戶" };
  return { user: data as JsonRecord, error: "" };
}

function isProtectedSuperAdmin(targetUserId: string, user: JsonRecord | null) {
  return targetUserId === LINE_ADMIN_USER_ID || user?.role === "SUPER_ADMIN";
}

export async function updateUserRole(
  data: JsonRecord,
  req: Request,
) {
  const auth = await requireAdmin(req);
  const targetUserId = String(data.targetUserId || "").trim();
  const newRole = String(data.newRole || "").trim().toUpperCase();
  if (!targetUserId || !newRole) {
    return { success: false, error: "缺少必要資訊" };
  }
  if (targetUserId === auth.userId) {
    return { success: false, error: "不能修改自己的管理員角色" };
  }
  if (!["USER", "ADMIN"].includes(newRole)) {
    return { success: false, error: "無效的角色類型" };
  }
  const target = await getTargetUser(targetUserId);
  if (target.error || !target.user) {
    return { success: false, error: target.error || "找不到此用戶" };
  }
  if (isProtectedSuperAdmin(targetUserId, target.user)) {
    return { success: false, error: "不能修改最高管理員" };
  }

  const { error } = await supabase.from("coffee_users").update({
    role: newRole,
    admin_permissions: newRole === "ADMIN"
      ? normalizeAdminPermissions(data.adminPermissions)
      : {},
  }).eq("line_user_id", targetUserId);
  if (error) return { success: false, error: error.message };
  return { success: true, message: "角色已更新" };
}

export async function updateUserAdminNote(
  data: JsonRecord,
  req: Request,
) {
  await requireAdmin(req);
  const targetUserId = String(data.targetUserId || "").trim();
  const adminNote = String(data.adminNote || "").trim();
  if (!targetUserId) return { success: false, error: "缺少 targetUserId" };
  const { error } = await supabase.from("coffee_users").update({
    admin_note: adminNote,
  }).eq("line_user_id", targetUserId);
  if (error) return { success: false, error: error.message };
  return { success: true, message: "備註已更新" };
}

export async function updateUserPermissions(
  data: JsonRecord,
  req: Request,
) {
  const auth = await requireAdmin(req);
  const targetUserId = String(data.targetUserId || "").trim();
  if (!targetUserId) return { success: false, error: "缺少 targetUserId" };
  if (targetUserId === auth.userId) {
    return { success: false, error: "不能修改自己的管理員權限" };
  }
  const target = await getTargetUser(targetUserId);
  if (target.error || !target.user) {
    return { success: false, error: target.error || "找不到此用戶" };
  }
  if (isProtectedSuperAdmin(targetUserId, target.user)) {
    return { success: false, error: "不能修改最高管理員權限" };
  }
  if (target.user.role !== "ADMIN") {
    return { success: false, error: "請先將此用戶設為管理員" };
  }

  const { error } = await supabase.from("coffee_users").update({
    admin_permissions: normalizeAdminPermissions(data.adminPermissions),
  }).eq("line_user_id", targetUserId);
  if (error) return { success: false, error: error.message };
  return { success: true, message: "管理員權限已更新" };
}

export async function deleteUser(
  data: JsonRecord,
  req: Request,
) {
  const auth = await requireAdmin(req);
  const targetUserId = String(data.targetUserId || "").trim();
  if (!targetUserId) return { success: false, error: "缺少 targetUserId" };
  if (targetUserId === auth.userId) {
    return { success: false, error: "不能刪除自己的帳號" };
  }
  const target = await getTargetUser(targetUserId);
  if (target.error || !target.user) {
    return { success: false, error: target.error || "找不到此用戶" };
  }
  if (isProtectedSuperAdmin(targetUserId, target.user)) {
    return { success: false, error: "不能刪除最高管理員" };
  }

  const { error } = await supabase.from("coffee_users").delete().eq(
    "line_user_id",
    targetUserId,
  );
  if (error) return { success: false, error: error.message };
  return { success: true, message: "用戶已刪除" };
}

export async function getBlacklist(req: Request) {
  await requireAdmin(req);
  const { data, error } = await supabase.from("coffee_users").select(
    "line_user_id, display_name, picture_url, role, status, blocked_at, blacklist_reason",
  ).not("blocked_at", "is", null);
  if (error) return { success: false, error: error.message };
  const blacklist = (data || []).map((u: JsonRecord) => ({
    lineUserId: u.line_user_id,
    displayName: u.display_name,
    pictureUrl: u.picture_url,
    role: u.role,
    status: u.status,
    blockedAt: u.blocked_at,
    reason: u.blacklist_reason || "",
  }));
  return { success: true, blacklist };
}

export async function addToBlacklist(
  data: JsonRecord,
  req: Request,
) {
  await requireAdmin(req);
  const targetUserId = String(data.targetUserId || "").trim();
  const reason = String(data.reason || "未提供原因").trim();
  if (!targetUserId) return { success: false, error: "缺少 targetUserId" };
  const { error } = await supabase.from("coffee_users").update({
    status: "BLACKLISTED",
    blocked_at: new Date().toISOString(),
    blacklist_reason: reason || "未提供原因",
  }).eq("line_user_id", targetUserId);
  if (error) return { success: false, error: error.message };
  return { success: true, message: "已加入黑名單" };
}

export async function removeFromBlacklist(
  data: JsonRecord,
  req: Request,
) {
  await requireAdmin(req);
  const targetUserId = String(data.targetUserId || "").trim();
  if (!targetUserId) return { success: false, error: "缺少 targetUserId" };
  const { error } = await supabase.from("coffee_users").update({
    status: "ACTIVE",
    blocked_at: null,
    blacklist_reason: null,
  }).eq("line_user_id", targetUserId);
  if (error) return { success: false, error: error.message };
  return { success: true, message: "已移出黑名單" };
}
