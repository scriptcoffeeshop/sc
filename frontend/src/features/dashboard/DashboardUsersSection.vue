<template>
  <div id="users-section" v-show="activeTab === 'users'" class="glass-card users-panel dashboard-panel">
    <div class="users-panel__header">
      <div>
        <h2 class="text-lg font-bold ui-text-highlight">用戶管理</h2>
        <p class="users-panel__hint">點選會員可編輯後台備註、角色與可操作頁面。</p>
      </div>
      <div class="users-panel__search">
        <input
          type="text"
          id="user-search"
          class="input-field text-sm"
          placeholder="搜尋名稱/手機/Email"
          :value="userSearch"
          @input="handleUserSearchInput"
          @keyup.enter="handleSearchUsers"
        >
        <button
          type="button"
          @click="handleSearchUsers"
          class="btn-primary text-sm"
        >
          搜尋
        </button>
      </div>
    </div>

    <div v-if="usersView.length === 0" class="users-empty">
      無符合條件的用戶
    </div>

    <div v-else class="users-card-list">
      <article
        v-for="user in usersView"
        :key="`user-card-${user.userId}`"
        class="users-card"
        role="button"
        tabindex="0"
        @click="handleOpenUserAdminDialog(user.userId)"
        @keydown.enter.prevent="handleOpenUserAdminDialog(user.userId)"
        @keydown.space.prevent="handleOpenUserAdminDialog(user.userId)"
      >
        <UserAvatar :src="user.pictureUrl" :name="user.displayName" size="md" />
        <span class="users-card__body">
          <span class="users-card__topline">
            <span class="users-card__name">{{ user.displayName || user.userId }}</span>
            <span class="users-badges">
              <span class="users-badge" :class="user.roleBadgeClass">{{ user.roleBadgeText }}</span>
              <span class="users-badge" :class="user.statusBadgeClass">{{ user.statusBadgeText }}</span>
            </span>
          </span>
          <span class="users-card__meta">
            {{ user.email || "未填 Email" }}<span v-if="user.phone">・{{ user.phone }}</span>
          </span>
          <span class="users-card__meta">{{ user.defaultDeliveryText }}</span>
          <span v-if="user.isAdmin" class="users-card__permissions">
            {{ user.permissionSummary }}
          </span>
          <span v-if="user.adminNote" class="users-card__note">{{ user.adminNote }}</span>
        </span>
        <span class="users-card__actions">
          <span class="users-card__last-login">登入：{{ user.lastLoginText }}</span>
          <span>
            <button
              type="button"
              @click.stop="handleToggleUserBlacklist(user.userId, user.blacklistActionBlocksUser)"
              class="users-action dashboard-action"
              :class="user.blacklistActionClass"
            >
              {{ user.blacklistActionLabel }}
            </button>
            <button
              v-if="user.roleAction"
              type="button"
              @click.stop="handleToggleUserRole(user.userId, user.roleAction.newRole)"
              class="users-action dashboard-action"
              :class="user.roleAction.className"
            >
              {{ user.roleAction.label }}
            </button>
          </span>
        </span>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import UserAvatar from "../../components/UserAvatar.vue";
import {
  dashboardUsersActions,
  useDashboardUsers,
} from "./useDashboardUsers.ts";
import { useDashboardSession } from "./useDashboardSession.ts";

const { userSearch, usersView, updateUserSearch } = useDashboardUsers();
const { activeTab } = useDashboardSession();

function handleUserSearchInput(event: Event) {
  const target = event.target instanceof HTMLInputElement
    ? event.target
    : null;
  updateUserSearch(target?.value || "");
}

function handleSearchUsers() {
  dashboardUsersActions.loadUsers();
}

function handleOpenUserAdminDialog(userId: string) {
  dashboardUsersActions.openUserAdminDialog(userId);
}

function handleToggleUserBlacklist(userId: string, isBlocked: boolean) {
  dashboardUsersActions.toggleUserBlacklist(userId, isBlocked);
}

function handleToggleUserRole(userId: string, newRole: string) {
  if (newRole !== "ADMIN" && newRole !== "USER") return;
  dashboardUsersActions.toggleUserRole(userId, newRole);
}
</script>

<style scoped>
.users-panel {
  padding: 1.5rem;
}

.users-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.users-panel__hint,
.users-card__meta,
.users-card__note,
.users-card__permissions,
.users-permission-summary,
.users-note-preview {
  color: #64707a;
}

.users-panel__hint {
  margin-top: 0.25rem;
  font-size: 0.82rem;
}

.users-panel__search {
  display: grid;
  grid-template-columns: minmax(13rem, 18rem) auto;
  gap: 0.5rem;
}

.users-empty {
  padding: 2rem 1rem;
  text-align: center;
  color: #7a8790;
}

.users-card-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 24rem), 1fr));
  gap: 0.85rem;
}

.users-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.85rem;
  width: 100%;
  min-height: 7rem;
  padding: 1rem;
  border: 1px solid color-mix(in srgb, var(--primary) 14%, #e2d8cc);
  border-radius: 0.5rem;
  background: #fffdf8;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
}

.users-card:hover,
.users-card:focus-visible {
  border-color: #c9c0a8;
  box-shadow: 0 8px 18px -16px rgba(7, 54, 66, 0.36);
  outline: none;
  transform: translateY(-1px);
}

.users-card__body,
.users-card__topline {
  display: grid;
  min-width: 0;
  gap: 0.35rem;
}

.users-card__name {
  overflow: hidden;
  font-weight: 800;
  color: var(--primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.users-card__meta,
.users-card__permissions,
.users-card__note,
.users-card__last-login {
  display: block;
  overflow-wrap: anywhere;
  font-size: 0.78rem;
  line-height: 1.45;
}

.users-card__note {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.users-card__actions {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  padding-top: 0.25rem;
  border-top: 1px solid #f0e6db;
}

.users-card__last-login {
  color: #93a1a1;
}

.users-badges {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
}

.users-badges--stacked {
  display: flex;
}

.users-badge {
  display: inline-flex;
  align-items: center;
  min-height: 1.35rem;
  padding: 0.15rem 0.5rem;
  border-radius: 0.35rem;
  font-size: 0.75rem;
  font-weight: 700;
}

.users-action + .users-action {
  margin-left: 0.4rem;
}

.users-permission-summary,
.users-note-preview {
  max-width: 18rem;
  margin-top: 0.35rem;
  font-size: 0.75rem;
  line-height: 1.4;
}

.users-note-preview {
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

@media (max-width: 760px) {
  .users-panel {
    padding: 1rem;
  }

  .users-panel__header {
    display: grid;
  }

  .users-panel__search {
    grid-template-columns: 1fr;
  }

  .users-panel__search .btn-primary {
    min-height: 2.75rem;
  }

  .users-card-list {
    gap: 0.75rem;
  }
}

@media (max-width: 390px) {
  .users-panel {
    padding: 0.85rem;
  }

  .users-card {
    padding: 0.8rem;
    gap: 0.65rem;
  }
}

:global(.dashboard-user-dialog) {
  display: grid;
  gap: 0.85rem;
  text-align: left;
}

:global(.dashboard-user-dialog__identity) {
  display: grid;
  gap: 0.2rem;
  padding: 0.75rem;
  border-radius: 0.5rem;
  background: #fff8ee;
  color: var(--primary);
}

:global(.dashboard-user-dialog__identity span) {
  font-size: 0.78rem;
  color: #7a8790;
  overflow-wrap: anywhere;
}

:global(.dashboard-user-dialog__label) {
  display: block;
  margin-bottom: 0.25rem;
  color: var(--primary);
  font-size: 0.86rem;
  font-weight: 800;
}

:global(.dashboard-user-dialog__textarea),
:global(.dashboard-user-dialog__select) {
  width: 100%;
  min-height: 2.6rem;
  padding: 0.65rem 0.75rem;
  border: 1px solid #d8cdbd;
  border-radius: 0.45rem;
  color: var(--primary);
  background: #fffefa;
}

:global(.dashboard-user-dialog__textarea) {
  resize: vertical;
  line-height: 1.5;
}

:global(.dashboard-user-dialog__permissions[data-disabled="true"]) {
  opacity: 0.55;
}

:global(.dashboard-user-permission-grid) {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

:global(.dashboard-user-permission-option) {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 2.5rem;
  padding: 0.5rem 0.65rem;
  border: 1px solid #e0d6c8;
  border-radius: 0.45rem;
  background: #fffefa;
  color: #344256;
  font-size: 0.88rem;
  font-weight: 650;
}

@media (max-width: 430px) {
  :global(.dashboard-user-permission-grid) {
    grid-template-columns: 1fr;
  }
}
</style>
