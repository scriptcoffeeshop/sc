<template>
  <div id="users-section" v-show="activeTab === 'users'" class="glass-card p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-bold ui-text-highlight">
        用戶管理
      </h2>
      <div class="flex gap-2 items-center">
        <input
          type="text"
          id="user-search"
          class="input-field text-sm py-1"
          placeholder="搜尋名稱/手機/Email"
          :value="userSearch"
          @input="updateUserSearch($event.target.value)"
          @keyup.enter="handleSearchUsers"
        >
        <button
          type="button"
          @click="handleSearchUsers"
          class="btn-primary text-sm py-1 px-4"
        >
          搜尋
        </button>
      </div>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b-2 ui-border">
            <th class="p-3 text-left w-12 ui-text-highlight">
              頭像
            </th>
            <th class="p-3 text-left ui-text-highlight">
              用戶資訊
            </th>
            <th class="p-3 text-left ui-text-highlight">
              角色與狀態
            </th>
            <th class="p-3 text-right ui-text-highlight">
              操作
            </th>
          </tr>
        </thead>
        <tbody id="users-table">
          <tr v-if="usersView.length === 0">
            <td colspan="4" class="text-center py-8 ui-text-subtle">
              無符合條件的用戶
            </td>
          </tr>
          <template v-else>
            <tr
              v-for="user in usersView"
              :key="`user-${user.userId}`"
              class="border-b"
              style="border-color:#f0e6db;"
            >
              <td class="p-3">
                <img
                  :src="user.pictureUrl"
                  class="w-10 h-10 rounded-full border"
                >
              </td>
              <td class="p-3">
                <div class="font-medium ui-text-strong">{{ user.displayName }}</div>
                <div class="text-xs ui-text-subtle">
                  {{ user.email }}<span v-if="user.phone">・{{ user.phone }}</span>
                </div>
                <div class="text-xs ui-text-subtle mt-1">{{ user.defaultDeliveryText }}</div>
                <div class="text-xs ui-text-muted font-mono mt-1 opacity-50">{{ user.userId }}</div>
              </td>
              <td class="p-3">
                <div>
                  <span
                    class="px-2 py-0.5 rounded text-xs font-medium"
                    :class="user.roleBadgeClass"
                  >
                    {{ user.roleBadgeText }}
                  </span>
                </div>
                <div class="mt-1">
                  <span
                    class="px-2 py-0.5 rounded text-xs font-medium"
                    :class="user.statusBadgeClass"
                  >
                    {{ user.statusBadgeText }}
                  </span>
                </div>
                <div class="text-xs ui-text-muted mt-1">登入：{{ user.lastLoginText }}</div>
              </td>
              <td class="p-3 text-right">
                <button
                  type="button"
                  @click="handleToggleUserBlacklist(user.userId, user.blacklistActionBlocksUser)"
                  class="text-sm font-medium mr-3"
                  :class="user.blacklistActionClass"
                >
                  {{ user.blacklistActionLabel }}
                </button>
                <button
                  v-if="user.roleAction"
                  type="button"
                  @click="handleToggleUserRole(user.userId, user.roleAction.newRole)"
                  class="text-sm font-medium"
                  :class="user.roleAction.className"
                >
                  {{ user.roleAction.label }}
                </button>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import {
  dashboardUsersActions,
  useDashboardUsers,
} from "./useDashboardUsers.js";
import { useDashboardSession } from "./useDashboardSession.js";

const { userSearch, usersView, updateUserSearch } = useDashboardUsers();
const { activeTab } = useDashboardSession();

function handleSearchUsers() {
  dashboardUsersActions.loadUsers();
}

function handleToggleUserBlacklist(userId, isBlocked) {
  dashboardUsersActions.toggleUserBlacklist(userId, isBlocked);
}

function handleToggleUserRole(userId, newRole) {
  dashboardUsersActions.toggleUserRole(userId, newRole);
}
</script>
