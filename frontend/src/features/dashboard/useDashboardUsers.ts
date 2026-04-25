import { computed, ref } from "vue";
import type {
  DashboardAuthFetch,
  DashboardSwal,
  DashboardToast,
} from "./dashboardOrderTypes";
import { formatDateTimeText } from "../../lib/dateTime.ts";
import { asJsonRecord } from "../../lib/jsonUtils.ts";
import { getDashboardErrorMessage } from "./dashboardErrors.ts";
import { getDashboardActiveTab } from "./useDashboardSession.ts";

type DashboardUserRole = "SUPER_ADMIN" | "ADMIN" | "USER" | string;

type DashboardCurrentUser = {
  role?: DashboardUserRole;
};

interface DashboardUserRecord extends Record<string, unknown> {
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
}

interface DashboardBlacklistRecord extends Record<string, unknown> {
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
  return {
    ...record,
    userId: String(record.userId || ""),
    displayName: String(record.displayName || ""),
    role: typeof record.role === "string" ? record.role : "USER",
    status: typeof record.status === "string" ? record.status : "ACTIVE",
    pictureUrl:
      typeof record.pictureUrl === "string" ? record.pictureUrl : undefined,
    email: String(record.email || ""),
    phone: String(record.phone || ""),
    defaultDeliveryMethod:
      typeof record.defaultDeliveryMethod === "string"
        ? record.defaultDeliveryMethod
        : "",
    defaultCity: String(record.defaultCity || ""),
    defaultDistrict: String(record.defaultDistrict || ""),
    defaultAddress: String(record.defaultAddress || ""),
    defaultStoreName: String(record.defaultStoreName || ""),
    defaultStoreId: String(record.defaultStoreId || ""),
    lastLogin: typeof record.lastLogin === "string" ? record.lastLogin : "",
  };
}

function normalizeBlacklistEntry(value: unknown): DashboardBlacklistRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = asJsonRecord(value);
  return {
    ...record,
    displayName: String(record.displayName || ""),
    lineUserId: String(record.lineUserId || ""),
    blockedAt: typeof record.blockedAt === "string" ? record.blockedAt : "",
    reason: String(record.reason || ""),
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

function buildUserViewModel(user: DashboardUserRecord, isSuperAdmin: boolean) {
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
    pictureUrl: user.pictureUrl || "https://via.placeholder.com/40",
    email: String(user.email || ""),
    phone: String(user.phone || ""),
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
  const isSuperAdmin = getServices().getCurrentUser?.()?.role === "SUPER_ADMIN";
  return users.value.map((user) => buildUserViewModel(user, isSuperAdmin));
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
    users.value = Array.isArray(data.users)
      ? data.users.map(normalizeUser).filter((user) => user !== null)
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
    blacklist.value = Array.isArray(data.blacklist)
      ? data.blacklist
        .map(normalizeBlacklistEntry)
        .filter((entry) => entry !== null)
      : [];
  } catch (error) {
    console.error(error);
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
  toggleUserRole,
  toggleUserBlacklist,
};
