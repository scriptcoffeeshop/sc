export function createUsersController(deps) {
  let users = [];
  let blacklist = [];

  function isVueManagedUsersTable(
    tbody = document.getElementById("users-table"),
  ) {
    return tbody?.dataset?.vueManaged === "true";
  }

  function isVueManagedBlacklistTable(
    tbody = document.getElementById("blacklist-table"),
  ) {
    return tbody?.dataset?.vueManaged === "true";
  }

  function isBlacklistTabActive() {
    return document.getElementById("tab-blacklist")?.classList.contains(
      "tab-active",
    );
  }

  function getUserDefaultDeliveryText(user) {
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

  function buildUserViewModel(user, isSuperAdmin) {
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
      userId: user.userId || "",
      displayName: user.displayName || "",
      pictureUrl: user.pictureUrl || "https://via.placeholder.com/40",
      email: user.email || "",
      phone: user.phone || "",
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
      lastLoginText: user.lastLogin
        ? new Date(user.lastLogin).toLocaleString("zh-TW")
        : "無紀錄",
      blacklistActionBlockedValue: String(!isBlocked),
      blacklistActionLabel: isBlocked ? "解除封鎖" : "封鎖",
      blacklistActionClass: isBlocked
        ? "ui-text-success hover:text-green-800"
        : "ui-text-danger hover:text-red-700",
      roleAction,
    };
  }

  function buildBlacklistViewModel(blacklistEntry) {
    return {
      displayName: blacklistEntry.displayName || "",
      lineUserId: blacklistEntry.lineUserId || "",
      blockedAtText: blacklistEntry.blockedAt
        ? new Date(blacklistEntry.blockedAt).toLocaleString("zh-TW")
        : "無紀錄",
      reasonText: blacklistEntry.reason || "(無原因)",
    };
  }

  function emitDashboardUsersUpdated(nextUsers = users) {
    const isSuperAdmin = deps.getCurrentUser()?.role === "SUPER_ADMIN";
    const viewUsers = (Array.isArray(nextUsers) ? nextUsers : []).map((user) =>
      buildUserViewModel(user, isSuperAdmin)
    );
    window.dispatchEvent(
      new CustomEvent("coffee:dashboard-users-updated", {
        detail: { users: viewUsers },
      }),
    );
  }

  function emitDashboardBlacklistUpdated(nextBlacklist = blacklist) {
    const viewBlacklist = (Array.isArray(nextBlacklist) ? nextBlacklist : [])
      .map((entry) => buildBlacklistViewModel(entry));
    window.dispatchEvent(
      new CustomEvent("coffee:dashboard-blacklist-updated", {
        detail: { blacklist: viewBlacklist },
      }),
    );
  }

  async function loadUsers() {
    try {
      const search = document.getElementById("user-search").value;
      deps.Swal.fire({
        title: "載入中...",
        allowOutsideClick: false,
        didOpen: () => deps.Swal.showLoading(),
      });
      const response = await deps.authFetch(
        `${deps.API_URL}?action=getUsers&userId=${deps.getAuthUserId()}&search=${
          encodeURIComponent(search)
        }&_=${Date.now()}`,
      );
      const data = await response.json();
      if (!data.success) {
        deps.Swal.fire("錯誤", data.error, "error");
        return;
      }
      users = data.users;
      renderUsers();
      deps.Swal.close();
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  function renderUsers() {
    const tbody = document.getElementById("users-table");
    if (!tbody) return;
    if (isVueManagedUsersTable(tbody)) {
      emitDashboardUsersUpdated(users);
      return;
    }
    if (!users.length) {
      tbody.innerHTML =
        '<tr><td colspan="4" class="text-center py-8 ui-text-subtle">無符合條件的用戶</td></tr>';
      return;
    }

    const isSuperAdmin = deps.getCurrentUser()?.role === "SUPER_ADMIN";
    tbody.innerHTML = users.map((user) => {
      const isUserSuperAdmin = user.role === "SUPER_ADMIN";
      const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
      const isBlocked = user.status === "BLACKLISTED";
      const lastLogin = user.lastLogin
        ? new Date(user.lastLogin).toLocaleString("zh-TW")
        : "無紀錄";

      let actions = "";
      if (isBlocked) {
        actions += `<button data-action="toggle-user-blacklist" data-user-id="${
          deps.esc(user.userId)
        }" data-blocked="false" class="ui-text-success hover:text-green-800 text-sm font-medium mr-3">解除封鎖</button>`;
      } else {
        actions += `<button data-action="toggle-user-blacklist" data-user-id="${
          deps.esc(user.userId)
        }" data-blocked="true" class="ui-text-danger hover:text-red-700 text-sm font-medium mr-3">封鎖</button>`;
      }

      if (isSuperAdmin && !isUserSuperAdmin) {
        if (isAdmin) {
          actions += `<button data-action="toggle-user-role" data-user-id="${
            deps.esc(user.userId)
          }" data-new-role="USER" class="ui-text-danger hover:text-red-800 text-sm font-medium">移除管理員</button>`;
        } else {
          actions += `<button data-action="toggle-user-role" data-user-id="${
            deps.esc(user.userId)
          }" data-new-role="ADMIN" class="text-purple-600 hover:text-purple-800 text-sm font-medium">設為管理員</button>`;
        }
      }

      return `
          <tr class="border-b" style="border-color:#E2DCC8;">
              <td class="p-3"><img src="${
        deps.esc(user.pictureUrl) || "https://via.placeholder.com/40"
      }" class="w-10 h-10 rounded-full border"></td>
              <td class="p-3">
                  <div class="font-medium ui-text-strong">${
        deps.esc(user.displayName)
      }</div>
                  <div class="text-xs ui-text-subtle">${
        deps.esc(user.email || "")
      } ${user.phone ? `・${deps.esc(user.phone)}` : ""}</div>
                  <div class="text-xs ui-text-subtle mt-1">${
        user.defaultDeliveryMethod === "delivery"
          ? `宅配 (${deps.esc(user.defaultCity)}${deps.esc(user.defaultDistrict)} ${
            deps.esc(user.defaultAddress)
          })`
          : user.defaultDeliveryMethod === "in_store"
          ? "來店自取"
          : user.defaultDeliveryMethod
          ? `${user.defaultDeliveryMethod === "seven_eleven" ? "7-11" : "全家"} (${
            deps.esc(user.defaultStoreName)
          } - ${deps.esc(user.defaultStoreId)})`
          : "尚未設定"
      }</div>
                  <div class="text-xs ui-text-muted font-mono mt-1 opacity-50">${
        deps.esc(user.userId)
      }</div>
              </td>
              <td class="p-3">
                  <div>${
        isAdmin
          ? '<span class="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800">管理員</span>'
          : '<span class="px-2 py-0.5 rounded text-xs font-medium ui-bg-soft ui-text-strong">用戶</span>'
      }</div>
                  <div class="mt-1">${
        isBlocked
          ? '<span class="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800">黑名單</span>'
          : '<span class="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">正常</span>'
      }</div>
                  <div class="text-xs ui-text-muted mt-1">登入：${lastLogin}</div>
              </td>
              <td class="p-3 text-right">${actions}</td>
          </tr>`;
    }).join("");
  }

  async function toggleUserRole(targetUserId, newRole) {
    const confirmation = await deps.Swal.fire({
      title: `設為 ${newRole === "ADMIN" ? "管理員" : "一般用戶"}？`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "確定",
    });
    if (!confirmation.isConfirmed) return;

    try {
      deps.Swal.fire({
        title: "處理中...",
        allowOutsideClick: false,
        didOpen: () => deps.Swal.showLoading(),
      });
      const response = await deps.authFetch(`${deps.API_URL}?action=updateUserRole`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, newRole }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      deps.Toast.fire({ icon: "success", title: "權限已更新" });
      loadUsers();
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  async function toggleUserBlacklist(targetUserId, isBlocked) {
    if (isBlocked) {
      const { value: reason } = await deps.Swal.fire({
        title: "封鎖用戶",
        input: "text",
        inputPlaceholder: "請輸入封鎖原因（例如惡意棄單）",
        showCancelButton: true,
        confirmButtonText: "封鎖",
      });
      if (reason === undefined) return;

      try {
        deps.Swal.fire({
          title: "處理中...",
          allowOutsideClick: false,
          didOpen: () => deps.Swal.showLoading(),
        });
        const response = await deps.authFetch(`${deps.API_URL}?action=addToBlacklist`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetUserId, reason }),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.error);

        deps.Toast.fire({ icon: "success", title: "已加入黑名單" });
        loadUsers();
        if (isBlacklistTabActive()) loadBlacklist();
      } catch (error) {
        deps.Swal.fire("錯誤", error.message, "error");
      }
      return;
    }

    const confirmation = await deps.Swal.fire({
      title: "解除封鎖？",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "確定解除",
    });
    if (!confirmation.isConfirmed) return;

    try {
      deps.Swal.fire({
        title: "處理中...",
        allowOutsideClick: false,
        didOpen: () => deps.Swal.showLoading(),
      });
      const response = await deps.authFetch(
        `${deps.API_URL}?action=removeFromBlacklist`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetUserId }),
        },
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      deps.Toast.fire({ icon: "success", title: "已解除封鎖" });
      loadUsers();
      if (isBlacklistTabActive()) loadBlacklist();
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  async function loadBlacklist() {
    try {
      const response = await deps.authFetch(
        `${deps.API_URL}?action=getBlacklist&userId=${deps.getAuthUserId()}&_=${
          Date.now()
        }`,
      );
      const data = await response.json();
      if (!data.success) return;
      blacklist = data.blacklist;
      renderBlacklist();
    } catch (error) {
      console.error(error);
    }
  }

  function renderBlacklist() {
    const tbody = document.getElementById("blacklist-table");
    if (!tbody) return;
    if (isVueManagedBlacklistTable(tbody)) {
      emitDashboardBlacklistUpdated(blacklist);
      return;
    }
    if (!blacklist.length) {
      tbody.innerHTML =
        '<tr><td colspan="3" class="text-center py-8 ui-text-subtle">目前沒有封鎖名單</td></tr>';
      return;
    }

    tbody.innerHTML = blacklist.map((entry) => {
      const blockedAt = entry.blockedAt
        ? new Date(entry.blockedAt).toLocaleString("zh-TW")
        : "無紀錄";
      return `
          <tr class="border-b" style="border-color:#E2DCC8;">
              <td class="p-3">
                  <div class="font-medium">${deps.esc(entry.displayName)}</div>
                  <div class="text-xs ui-text-muted font-mono">${
        deps.esc(entry.lineUserId)
      }</div>
              </td>
              <td class="p-3">
                  <div class="text-sm">${blockedAt}</div>
                  <div class="text-xs ui-text-danger mt-1">${
        deps.esc(entry.reason) || "(無原因)"
      }</div>
              </td>
              <td class="p-3 text-right">
                  <button data-action="toggle-user-blacklist" data-user-id="${
        deps.esc(entry.lineUserId)
      }" data-blocked="false" class="ui-text-success hover:text-green-800 text-sm font-medium">解除封鎖</button>
              </td>
          </tr>`;
    }).join("");
  }

  return {
    loadUsers,
    renderUsers,
    toggleUserRole,
    toggleUserBlacklist,
    loadBlacklist,
    renderBlacklist,
  };
}
