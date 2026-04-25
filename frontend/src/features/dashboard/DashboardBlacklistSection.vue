<template>
  <div id="blacklist-section" v-show="activeTab === 'blacklist'" class="glass-card dashboard-panel">
    <div class="dashboard-section-header">
      <div>
        <h2 class="dashboard-section-title">
          黑名單
        </h2>
        <p class="dashboard-section-hint">
          管理被封鎖的會員，解除後該會員即可重新送出訂單。
        </p>
      </div>
    </div>
    <div id="blacklist-table" class="dashboard-card-list">
      <p v-if="blacklistView.length === 0" class="dashboard-empty-state">
        目前沒有封鎖名單
      </p>
      <template v-else>
        <article
          v-for="blacklistEntry in blacklistView"
          :key="`blacklist-${blacklistEntry.lineUserId}`"
          class="dashboard-item-card"
        >
          <div class="dashboard-card-row">
            <span class="blacklist-card__mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M15 9l-6 6" />
                <path d="M9 9l6 6" />
              </svg>
            </span>
            <div class="dashboard-card-main">
              <div class="dashboard-card-title">{{ blacklistEntry.displayName }}</div>
              <div class="dashboard-code">{{ blacklistEntry.lineUserId }}</div>
              <div class="dashboard-card-meta">{{ blacklistEntry.blockedAtText }}</div>
              <div class="blacklist-card__reason">{{ blacklistEntry.reasonText }}</div>
            </div>
            <div class="dashboard-card-actions">
              <button
                type="button"
                @click="handleToggleUserBlacklist(blacklistEntry.lineUserId, false)"
                class="dashboard-action dashboard-action--success"
              >
                解除封鎖
              </button>
            </div>
          </div>
        </article>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  dashboardUsersActions,
  useDashboardUsers,
} from "./useDashboardUsers.ts";
import { useDashboardSession } from "./useDashboardSession.ts";

const { blacklistView } = useDashboardUsers();
const { activeTab } = useDashboardSession();

function handleToggleUserBlacklist(userId: string, isBlocked: boolean) {
  dashboardUsersActions.toggleUserBlacklist(userId, isBlocked);
}
</script>

<style scoped>
.blacklist-card__mark {
  display: inline-flex;
  width: 2.25rem;
  height: 2.25rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(220, 50, 47, 0.22);
  border-radius: 8px;
  background: rgba(220, 50, 47, 0.1);
  color: #dc322f;
}

.blacklist-card__mark svg {
  width: 1.2rem;
  height: 1.2rem;
}

.blacklist-card__reason {
  margin-top: 0.35rem;
  color: #dc322f;
  font-size: 0.82rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
}
</style>
