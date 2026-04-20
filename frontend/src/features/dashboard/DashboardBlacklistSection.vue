<template>
  <div id="blacklist-section" v-show="activeTab === 'blacklist'" class="glass-card p-6">
    <h2 class="text-lg font-bold mb-4 ui-text-highlight">
      黑名單
    </h2>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b-2 ui-border">
            <th class="p-3 text-left ui-text-highlight">
              用戶名稱
            </th>
            <th class="p-3 text-left ui-text-highlight">
              封鎖時間與原因
            </th>
            <th class="p-3 text-right ui-text-highlight">
              操作
            </th>
          </tr>
        </thead>
        <tbody id="blacklist-table">
          <tr v-if="blacklistView.length === 0">
            <td colspan="3" class="text-center py-8 ui-text-subtle">
              目前沒有封鎖名單
            </td>
          </tr>
          <template v-else>
            <tr
              v-for="blacklistEntry in blacklistView"
              :key="`blacklist-${blacklistEntry.lineUserId}`"
              class="border-b"
              style="border-color:#f0e6db;"
            >
              <td class="p-3">
                <div class="font-medium">{{ blacklistEntry.displayName }}</div>
                <div class="text-xs ui-text-muted font-mono">{{ blacklistEntry.lineUserId }}</div>
              </td>
              <td class="p-3">
                <div class="text-sm">{{ blacklistEntry.blockedAtText }}</div>
                <div class="text-xs ui-text-danger mt-1">{{ blacklistEntry.reasonText }}</div>
              </td>
              <td class="p-3 text-right">
                <button
                  type="button"
                  @click="handleToggleUserBlacklist(blacklistEntry.lineUserId, false)"
                  class="ui-text-success hover:text-green-800 text-sm font-medium"
                >
                  解除封鎖
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

const { blacklistView } = useDashboardUsers();
const { activeTab } = useDashboardSession();

function handleToggleUserBlacklist(userId, isBlocked) {
  dashboardUsersActions.toggleUserBlacklist(userId, isBlocked);
}
</script>
