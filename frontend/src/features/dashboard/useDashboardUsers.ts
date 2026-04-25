import { computed, ref } from "vue";
import type {
  DashboardApiJson,
  DashboardAuthFetch,
  DashboardSwal,
  DashboardToast,
} from "./dashboardOrderTypes";
import { formatDateTimeText } from "../../lib/dateTime.ts";
import { asJsonRecord } from "../../lib/jsonUtils.ts";
import type { JsonRecord } from "../../lib/jsonUtils.ts";
import { getDashboardErrorMessage } from "./dashboardErrors.ts";
import { getDashboardActiveTab } from "./useDashboardSession.ts";
import {
  DASHBOARD_ADMIN_PERMISSIONS,
  normalizeDashboardAdminPermissions,
  type DashboardAdminPermissionMap,
} from "./dashboardAdminPermissions.ts";

type DashboardUserRole = "SUPER_ADMIN" | "ADMIN" | "USER" | string;

type DashboardCurrentUser = {
  userId?: string;
  role?: DashboardUserRole;
};

interface DashboardUserRecord {
  [key: string]: unknown;
  userId: string;
  displayName: string;
  role?: DashboardUserRole;
  status?: string;
  pictureUrl?: string;
  email?: string;
  phone?: string;
  defaultDeliveryMethod?: string;
  defaultCity?: string;
  defaultDistrict?: string;
  defaultAddress?: string;
  defaultStoreName?: string;
  defaultStoreId?: string;
  lastLogin?: string;
  adminNote?: string;
  adminPermissions?: DashboardAdminPermissionMap;
}

interface DashboardBlacklistRecord {
  [key: string]: unknown;
  displayName: string;
  lineUserId: string;
  blockedAt?: string;
  reason?: string;
}

type DashboardUsersServices = {
  API_URL: string;
  authFetch: DashboardAuthFetch;
  getAuthUserId: () => string;
  getCurrentUser?: () => DashboardCurrentUser | null | undefined;
  Swal: DashboardSwal;
  Toast: DashboardToast;
};

const users = ref<DashboardUserRecord[]>([]);
const blacklist = ref<DashboardBlacklistRecord[]>([]);
const userSearch = ref("");

let services: DashboardUsersServices | null = null;

function getServices(): DashboardUsersServices {
  if (!services) {
    throw new Error("Dashboard users services 尚未初始化");
  }
  return services;
}

function normalizeUser(value: unknown): DashboardUserRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = asJsonRecord(value);
  const normalized: DashboardUserRecord = {
    userId: String(record["userId"] || ""),
    displayName: String(record["displayName"] || ""),
    role: typeof record["role"] === "string" ? record["role"] : "USER",
    status: typeof record["status"] === "string" ? record["status"] : "ACTIVE",
    email: String(record["email"] || ""),
    phone: String(record["phone"] || ""),
    defaultDeliveryMethod:
      typeof record["defaultDeliveryMethod"] === "string"
        ? record["defaultDeliveryMethod"]
        : "",
    defaultCity: String(record["defaultCity"] || ""),
    defaultDistrict: String(record["defaultDistrict"] || ""),
    defaultAddress: String(record["defaultAddress"] || ""),
    defaultStoreName: String(record["defaultStoreName"] || ""),
    defaultStoreId: String(record["defaultStoreId"] || ""),
    lastLogin: typeof record["lastLogin"] === "string" ? record["lastLogin"] : "",
    adminNote: String(record["adminNote"] || ""),
    adminPermissions: normalizeDashboardAdminPermissions(
      record["adminPermissions"],
    ),
  };
  if (typeof record["pictureUrl"] === "string") {
    normalized.pictureUrl = record["pictureUrl"];
  }
  return normalized;
}

function normalizeBlacklistEntry(value: unknown): DashboardBlacklistRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = asJsonRecord(value);
  return {
    ...record,
    displayName: String(record["displayName"] || ""),
    lineUserId: String(record["lineUserId"] || ""),
    blockedAt: typeof record["blockedAt"] === "string" ? record["blockedAt"] : "",
    reason: String(record["reason"] || ""),
  };
}

function getUserDefaultDeliveryText(user: DashboardUserRecord) {
  if (user.defaultDeliveryMethod === "delivery") {
    return `宅配 (${user.defaultCity || ""}${user.defaultDistrict || ""} ${
      user.defaultAddress || ""
    })`;
  }
  if (user.defaultDeliveryMethod === "in_store") return "來店自取";
  if (user.defaultDeliveryMethod) {
    return `${user.defaultDeliveryMethod === "seven_eleven" ? "7-11" : "全家"} (${
      user.defaultStoreName || ""
    } - ${user.defaultStoreId || ""})`;
  }
  return "尚未設定";
}

function buildPermissionSummary(
  permissions: DashboardAdminPermissionMap | undefined,
) {
  const normalized = normalizeDashboardAdminPermissions(permissions);
  const enabledLabels = DASHBOARD_ADMIN_PERMISSIONS
    .filter((permission) => normalized[permission.key] === true)
    .map((permission) => permission.label);
  if (enabledLabels.length === 0) return "沿用完整管理權限";
  return enabledLabels.join("、");
}

function buildUserViewModel(
  user: DashboardUserRecord,
  currentUser: DashboardCurrentUser | null | undefined,
) {
  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";
  const isUserSuperAdmin = user.role === "SUPER_ADMIN";
  const isAdmin = user.role === "ADMIN" || isUserSuperAdmin;
  const isBlocked = user.status === "BLACKLISTED";
  const roleAction = isSuperAdmin && !isUserSuperAdmin
    ? {
      newRole: isAdmin ? "USER" : "ADMIN",
      label: isAdmin ? "移除管理員" : "設為管理員",
      className: isAdmin
        ? "ui-text-danger hover:text-red-800"
        : "text-purple-600 hover:text-purple-800",
    }
    : null;

  return {
    userId: String(user.userId || ""),
    displayName: String(user.displayName || ""),
    pictureUrl: user.pictureUrl || "",
    email: String(user.email || ""),
    phone: String(user.phone || ""),
    adminNote: String(user.adminNote || ""),
    isSelf: currentUser?.userId === user.userId,
    canDelete: isSuperAdmin && !isUserSuperAdmin &&
      currentUser?.userId !== user.userId,
    permissionSummary: buildPermissionSummary(user.adminPermissions),
    defaultDeliveryText: getUserDefaultDeliveryText(user),
    isAdmin,
    isBlocked,
    roleBadgeText: isAdmin ? "管理員" : "用戶",
    roleBadgeClass: isAdmin
      ? "bg-purple-100 text-purple-800"
      : "ui-bg-soft ui-text-strong",
    statusBadgeText: isBlocked ? "黑名單" : "正常",
    statusBadgeClass: isBlocked
      ? "bg-red-100 text-red-800"
      : "bg-green-100 text-green-800",
    lastLoginText: formatDateTimeText(user.lastLogin) || "無紀錄",
    blacklistActionBlocksUser: !isBlocked,
    blacklistActionLabel: isBlocked ? "解除封鎖" : "封鎖",
    blacklistActionClass: isBlocked
      ? "ui-text-success hover:text-green-800"
      : "ui-text-danger hover:text-red-700",
    roleAction,
  };
}

function buildBlacklistViewModel(blacklistEntry: DashboardBlacklistRecord) {
  return {
    displayName: String(blacklistEntry.displayName || ""),
    lineUserId: String(blacklistEntry.lineUserId || ""),
    blockedAtText: formatDateTimeText(blacklistEntry.blockedAt) || "無紀錄",
    reasonText: blacklistEntry.reason || "(無原因)",
  };
}

const usersView = computed(() => {
  const currentUser = getServices().getCurrentUser?.();
  return users.value.map((user) => buildUserViewModel(user, currentUser));
});

const blacklistView = computed(() =>
  blacklist.value.map((entry) => buildBlacklistViewModel(entry))
);

function updateUserSearch(value: unknown) {
  userSearch.value = String(value || "");
}

function isBlacklistTabActive() {
  return getDashboardActiveTab() === "blacklist";
}

async function loadUsers() {
  const { Swal, authFetch, API_URL, getAuthUserId } = getServices();
  try {
    Swal.fire({
      title: "載入中...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading?.(),
    });
    const response = await authFetch(
      `${API_URL}?action=getUsers&userId=${getAuthUserId()}&search=${
        encodeURIComponent(userSearch.value)
      }&_=${Date.now()}`,
    );
    const data = await response.json();
    if (!data.success) {
      Swal.fire("錯誤", String(data.error || "載入用戶失敗"), "error");
      return;
    }
    users.value = Array.isArray(data["users"])
      ? data["users"].map(normalizeUser).filter((user) => user !== null)
      : [];
    Swal.close?.();
  } catch (error) {
    Swal.fire("錯誤", getDashboardErrorMessage(error, "載入用戶失敗"), "error");
  }
}

async function loadBlacklist() {
  const { authFetch, API_URL, getAuthUserId } = getServices();
  try {
    const response = await authFetch(
      `${API_URL}?action=getBlacklist&userId=${getAuthUserId()}&_=${Date.now()}`,
    );
    const data = await response.json();
    if (!data.success) return;
    blacklist.value = Array.isArray(data["blacklist"])
      ? data["blacklist"]
        .map(normalizeBlacklistEntry)
        .filter((entry) => entry !== null)
      : [];
  } catch (error) {
    console.error(error);
  }
}

function escapeHtml(value: unknown) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function findUserById(userId: string) {
  return users.value.find((user) => user.userId === userId) || null;
}

function buildPermissionInputsHtml(
  permissions: DashboardAdminPermissionMap | undefined,
) {
  const normalized = normalizeDashboardAdminPermissions(permissions);
  return DASHBOARD_ADMIN_PERMISSIONS.map((permission) => `
    <label class="dashboard-user-permission-option">
      <input
        type="checkbox"
        data-admin-permission="${permission.key}"
        ${normalized[permission.key] === true ? "checked" : ""}
      >
      <span>${escapeHtml(permission.label)}</span>
    </label>
  `).join("");
}

function readPermissionInputs(container: HTMLElement | null) {
  const permissions: DashboardAdminPermissionMap = {};
  if (!container) return permissions;
  container
    .querySelectorAll<HTMLInputElement>("[data-admin-permission]")
    .forEach((input) => {
      const key = input.dataset["adminPermission"] || "";
      if (input.checked) {
        (permissions as Record<string, boolean>)[key] = true;
      }
    });
  return normalizeDashboardAdminPermissions(permissions);
}

async function postUserAction(action: string, body: JsonRecord) {
  const { authFetch, API_URL } = getServices();
  const response = await authFetch(`${API_URL}?action=${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json() as DashboardApiJson;
  if (!data.success) throw new Error(String(data.error || "操作失敗"));
  return data;
}

async function saveUserAdminDialogChanges(
  user: DashboardUserRecord,
  value: JsonRecord,
) {
  const newRole = String(value["newRole"] || user.role || "USER");
  await postUserAction("updateUserAdminNote", {
    targetUserId: user.userId,
    adminNote: String(value["adminNote"] || ""),
  });
  if (newRole !== user.role && (newRole === "ADMIN" || newRole === "USER")) {
    await postUserAction("updateUserRole", {
      targetUserId: user.userId,
      newRole,
    });
  }
  if (newRole === "ADMIN") {
    await postUserAction("updateUserPermissions", {
      targetUserId: user.userId,
      adminPermissions: value["adminPermissions"] || {},
    });
  }
}

async function deleteUserFromDialog(user: DashboardUserRecord) {
  const { Swal, Toast } = getServices();
  const confirmation = await Swal.fire({
    title: "刪除此用戶？",
    text: "刪除後會員需要重新登入才會再次建立資料。",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "刪除",
    cancelButtonText: "取消",
    confirmButtonColor: "#b91c1c",
  });
  if (!confirmation.isConfirmed) return;

  try {
    await postUserAction("deleteUser", { targetUserId: user.userId });
    Toast.fire({ icon: "success", title: "用戶已刪除" });
    await loadUsers();
  } catch (error) {
    Swal.fire("錯誤", getDashboardErrorMessage(error, "刪除用戶失敗"), "error");
  }
}

async function openUserAdminDialog(userId: string) {
  const user = findUserById(userId);
  if (!user) return;
  const { Swal, Toast, getCurrentUser } = getServices();
  const currentUser = getCurrentUser?.();
  const canManageAccess = currentUser?.role === "SUPER_ADMIN" &&
    currentUser?.userId !== user.userId && user.role !== "SUPER_ADMIN";
  const roleOptions = `
    <option value="USER" ${user.role !== "ADMIN" ? "selected" : ""}>一般會員</option>
    <option value="ADMIN" ${user.role === "ADMIN" ? "selected" : ""}>管理員</option>
  `;
  const permissionsHtml = buildPermissionInputsHtml(user.adminPermissions);
  const result = await Swal.fire({
    title: "會員備註",
    html: `
      <div class="dashboard-user-dialog">
        <div class="dashboard-user-dialog__identity">
          <strong>${escapeHtml(user.displayName || user.userId)}</strong>
          <span>${escapeHtml(user.userId)}</span>
        </div>
        <label class="dashboard-user-dialog__label" for="dashboard-user-admin-note">管理備註</label>
        <textarea id="dashboard-user-admin-note" class="dashboard-user-dialog__textarea" rows="5">${escapeHtml(user.adminNote)}</textarea>
        <label class="dashboard-user-dialog__label" for="dashboard-user-role">後台角色</label>
        <select id="dashboard-user-role" class="dashboard-user-dialog__select" ${canManageAccess ? "" : "disabled"}>
          ${roleOptions}
        </select>
        <div class="dashboard-user-dialog__permissions" ${canManageAccess ? "" : "data-disabled=\"true\""}>
          <div class="dashboard-user-dialog__label">管理員可操作頁面</div>
          <div class="dashboard-user-permission-grid">${permissionsHtml}</div>
        </div>
      </div>
    `,
    showCancelButton: true,
    showDenyButton: canManageAccess,
    confirmButtonText: "儲存",
    denyButtonText: "刪除用戶",
    cancelButtonText: "取消",
    width: 720,
    didOpen: () => {
      if (!canManageAccess) return;
      const popup = Swal.getPopup?.();
      const roleSelect = popup?.querySelector<HTMLSelectElement>(
        "#dashboard-user-role",
      );
      const permissionInputs = Array.from(
        popup?.querySelectorAll<HTMLInputElement>(
          "[data-admin-permission]",
        ) || [],
      );
      const syncPermissionDisabled = () => {
        const isAdmin = roleSelect?.value === "ADMIN";
        permissionInputs.forEach((input) => {
          input.disabled = !isAdmin;
        });
      };
      roleSelect?.addEventListener("change", syncPermissionDisabled);
      syncPermissionDisabled();
    },
    preConfirm: () => {
      const popup = Swal.getPopup?.();
      const noteInput = popup?.querySelector<HTMLTextAreaElement>(
        "#dashboard-user-admin-note",
      );
      const roleSelect = popup?.querySelector<HTMLSelectElement>(
        "#dashboard-user-role",
      );
      return {
        adminNote: noteInput?.value || "",
        newRole: canManageAccess ? roleSelect?.value || user.role : user.role,
        adminPermissions: canManageAccess
          ? readPermissionInputs(popup || null)
          : user.adminPermissions || {},
      };
    },
  });

  if (result.isDenied) {
    await deleteUserFromDialog(user);
    return;
  }
  if (!result.isConfirmed) return;

  try {
    await saveUserAdminDialogChanges(user, (result.value || {}) as JsonRecord);
    Toast.fire({ icon: "success", title: "會員資料已更新" });
    await loadUsers();
  } catch (error) {
    Swal.fire("錯誤", getDashboardErrorMessage(error, "更新會員資料失敗"), "error");
  }
}

async function toggleUserRole(targetUserId: string, newRole: "ADMIN" | "USER") {
  const { Swal, authFetch, API_URL, Toast } = getServices();
  const confirmation = await Swal.fire({
    title: `設為 ${newRole === "ADMIN" ? "管理員" : "一般用戶"}？`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "確定",
  });
  if (!confirmation.isConfirmed) return;

  try {
    Swal.fire({
      title: "處理中...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading?.(),
    });
    const response = await authFetch(`${API_URL}?action=updateUserRole`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId, newRole }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || "權限更新失敗");

    Toast.fire({ icon: "success", title: "權限已更新" });
    await loadUsers();
  } catch (error) {
    Swal.fire("錯誤", getDashboardErrorMessage(error, "權限更新失敗"), "error");
  }
}

async function toggleUserBlacklist(targetUserId: string, isBlocked: boolean) {
  const { Swal, authFetch, API_URL, Toast } = getServices();

  if (isBlocked) {
    const { value: reason } = await Swal.fire({
      title: "封鎖用戶",
      input: "text",
      inputPlaceholder: "請輸入封鎖原因（例如惡意棄單）",
      showCancelButton: true,
      confirmButtonText: "封鎖",
    });
    if (reason === undefined) return;

    try {
      Swal.fire({
        title: "處理中...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading?.(),
      });
      const response = await authFetch(`${API_URL}?action=addToBlacklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, reason: String(reason || "") }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "加入黑名單失敗");

      Toast.fire({ icon: "success", title: "已加入黑名單" });
      await loadUsers();
      if (isBlacklistTabActive()) await loadBlacklist();
    } catch (error) {
      Swal.fire("錯誤", getDashboardErrorMessage(error, "加入黑名單失敗"), "error");
    }
    return;
  }

  const confirmation = await Swal.fire({
    title: "解除封鎖？",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "確定解除",
  });
  if (!confirmation.isConfirmed) return;

  try {
    Swal.fire({
      title: "處理中...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading?.(),
    });
    const response = await authFetch(`${API_URL}?action=removeFromBlacklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || "解除封鎖失敗");

    Toast.fire({ icon: "success", title: "已解除封鎖" });
    await loadUsers();
    await loadBlacklist();
  } catch (error) {
    Swal.fire("錯誤", getDashboardErrorMessage(error, "解除封鎖失敗"), "error");
  }
}

export function configureDashboardUsersServices(nextServices: DashboardUsersServices) {
  services = {
    ...services,
    ...nextServices,
  };
}

export function useDashboardUsers() {
  return {
    userSearch,
    usersView,
    blacklistView,
    updateUserSearch,
  };
}

export const dashboardUsersActions = {
  loadUsers,
  loadBlacklist,
  openUserAdminDialog,
  toggleUserRole,
  toggleUserBlacklist,
};
