<template>
  <TabsRoot
    :model-value="activeTab"
    activation-mode="manual"
    class="mb-6"
    @update:model-value="setActiveTab"
  >
    <TabsList id="sidebar" class="ui-tab-strip dashboard-tab-strip">
      <TabsTrigger
        v-for="tab in visibleTabs"
        :key="tab.value"
        :value="tab.value"
        as-child
      >
        <button
          :id="`tab-${tab.value}`"
          :data-tab="tab.value"
          class="dashboard-tab-button"
          :class="activeTab === tab.value ? 'tab-active' : 'ui-text-strong'"
        >
          <span class="tab-with-icon">
            <component :is="tab.icon" class="ui-tab-icon" aria-hidden="true" />
            {{ tab.label }}
          </span>
        </button>
      </TabsTrigger>
    </TabsList>
  </TabsRoot>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  CreditCard,
  FileText,
  FolderOpen,
  Gift,
  Images,
  ListOrdered,
  Package,
  Settings,
  ShieldAlert,
  Users,
} from "lucide-vue-next";
import { TabsList, TabsRoot, TabsTrigger } from "reka-ui";
import {
  dashboardSessionActions,
  useDashboardSession,
} from "./useDashboardSession.ts";
import { canAccessDashboardTab } from "./dashboardAdminPermissions.ts";

const dashboardTabs = [
  { value: "orders", label: "訂單管理", icon: ListOrdered },
  { value: "products", label: "商品管理", icon: Package },
  { value: "categories", label: "分類管理", icon: FolderOpen },
  { value: "promotions", label: "促銷活動", icon: Gift },
  { value: "settings", label: "系統設定", icon: Settings },
  { value: "checkout-settings", label: "付款與取貨", icon: CreditCard },
  { value: "icon-library", label: "Icon 素材庫", icon: Images },
  { value: "formfields", label: "表單管理", icon: FileText },
  { value: "users", label: "用戶管理", icon: Users },
  { value: "blacklist", label: "黑名單", icon: ShieldAlert },
] as const;

const { activeTab, currentUser } = useDashboardSession();
const visibleTabs = computed(() =>
  dashboardTabs.filter((tab) =>
    canAccessDashboardTab(currentUser.value, tab.value)
  )
);
const setActiveTab = (tab: unknown) =>
  dashboardSessionActions.setActiveTab(String(tab || ""));
</script>

<style scoped>
.dashboard-tab-strip {
  gap: 0.4rem;
  overflow-x: auto;
  padding-bottom: 0.15rem;
  scrollbar-width: thin;
}

.dashboard-tab-button {
  min-height: 2.5rem;
  padding: 0.5rem 0.9rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  white-space: nowrap;
}

@media (max-width: 430px) {
  .dashboard-tab-strip {
    margin-inline: -0.25rem;
    padding-inline: 0.25rem;
    scroll-snap-type: x proximity;
  }

  .dashboard-tab-button {
    min-height: 2.75rem;
    padding-inline: 0.75rem;
    scroll-snap-align: start;
  }
}
</style>
