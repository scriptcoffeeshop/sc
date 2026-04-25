import { supabase } from "../utils/supabase.ts";
import { requireAdmin, requireSuperAdmin } from "../utils/auth.ts";
import type { JsonRecord } from "../utils/json.ts";

export async function getUsers(req: Request) {
  await requireSuperAdmin(req);
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
    defaultDeliveryMethod: u.default_delivery_method || "",
    defaultCity: u.default_city || "",
    defaultDistrict: u.default_district || "",
    defaultAddress: u.default_address || "",
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

export async function updateUserRole(
  data: JsonRecord,
  req: Request,
) {
  await requireSuperAdmin(req);
  const targetUserId = String(data.targetUserId || "").trim();
  const newRole = String(data.newRole || "").trim().toUpperCase();
  if (!targetUserId || !newRole) {
    return { success: false, error: "缺少必要資訊" };
  }
  if (!["USER", "ADMIN"].includes(newRole)) {
    return { success: false, error: "無效的角色類型" };
  }

  const { error } = await supabase.from("coffee_users").update({
    role: newRole,
  }).eq("line_user_id", targetUserId);
  if (error) return { success: false, error: error.message };
  return { success: true, message: "角色已更新" };
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
