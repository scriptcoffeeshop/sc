import type { SessionUser } from "../../types/session";

export const DASHBOARD_ADMIN_PERMISSIONS = [
  { key: "orders", tab: "orders", label: "訂單管理" },
  { key: "products", tab: "products", label: "商品管理" },
  { key: "categories", tab: "categories", label: "分類管理" },
  { key: "promotions", tab: "promotions", label: "促銷活動" },
  { key: "settings", tab: "settings", label: "系統設定" },
  { key: "checkoutSettings", tab: "checkout-settings", label: "付款與取貨" },
  { key: "iconLibrary", tab: "icon-library", label: "Icon 素材庫" },
  { key: "formfields", tab: "formfields", label: "表單管理" },
  { key: "users", tab: "users", label: "用戶管理" },
  { key: "blacklist", tab: "blacklist", label: "黑名單" },
] as const;

export type DashboardAdminPermissionKey =
  typeof DASHBOARD_ADMIN_PERMISSIONS[number]["key"];

export type DashboardAdminPermissionMap = Partial<
  Record<DashboardAdminPermissionKey, boolean>
>;

interface PermissionSource {
  [key: string]: unknown;
}

const PERMISSION_BY_TAB = new Map<string, DashboardAdminPermissionKey>(
  DASHBOARD_ADMIN_PERMISSIONS.map((permission) => [
    permission.tab,
    permission.key,
  ]),
);

function isPermissionKey(value: string): value is DashboardAdminPermissionKey {
  return DASHBOARD_ADMIN_PERMISSIONS.some((permission) =>
    permission.key === value
  );
}

export function normalizeDashboardAdminPermissions(
  value: unknown,
): DashboardAdminPermissionMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as PermissionSource;
  const normalized: DashboardAdminPermissionMap = {};
  for (const [key, enabled] of Object.entries(record)) {
    if (isPermissionKey(key) && enabled === true) normalized[key] = true;
  }
  return normalized;
}

export function hasExplicitDashboardAdminPermissions(
  permissions: DashboardAdminPermissionMap,
) {
  return Object.values(permissions).some((enabled) => enabled === true);
}

export function canAccessDashboardPermission(
  user: SessionUser | null | undefined,
  permission: DashboardAdminPermissionKey,
) {
  if (!user?.userId) return false;
  if (user.role === "SUPER_ADMIN") return true;
  if (user.role !== "ADMIN") return false;
  const permissions = normalizeDashboardAdminPermissions(
    user["adminPermissions"],
  );
  if (!hasExplicitDashboardAdminPermissions(permissions)) return true;
  return permissions[permission] === true;
}

export function canAccessDashboardTab(
  user: SessionUser | null | undefined,
  tab: string,
) {
  const permission = PERMISSION_BY_TAB.get(tab);
  if (!permission) return false;
  return canAccessDashboardPermission(user, permission);
}

export function getVisibleDashboardTabs(
  tabs: string[],
  user: SessionUser | null | undefined,
) {
  return tabs.filter((tab) => canAccessDashboardTab(user, tab));
}
