<template>
  <TabsRoot
    :model-value="activeTab"
    class="mb-6"
    @update:model-value="setActiveTab"
  >
    <TabsList id="sidebar" class="ui-tab-strip">
      <TabsTrigger value="orders" as-child>
        <button
          id="tab-orders"
          data-tab="orders"
          class="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
          :class="activeTab === 'orders' ? 'tab-active' : 'ui-text-strong'"
        >
          <span class="tab-with-icon"><ListOrdered class="ui-tab-icon" aria-hidden="true" />訂單管理</span>
        </button>
      </TabsTrigger>
      <TabsTrigger value="products" as-child>
        <button
          id="tab-products"
          data-tab="products"
          class="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
          :class="activeTab === 'products' ? 'tab-active' : 'ui-text-strong'"
        >
          <span class="tab-with-icon"><Package class="ui-tab-icon" aria-hidden="true" />商品管理</span>
        </button>
      </TabsTrigger>
      <TabsTrigger value="categories" as-child>
        <button
          id="tab-categories"
          data-tab="categories"
          class="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
          :class="activeTab === 'categories' ? 'tab-active' : 'ui-text-strong'"
        >
          <span class="tab-with-icon"><FolderOpen class="ui-tab-icon" aria-hidden="true" />分類管理</span>
        </button>
      </TabsTrigger>
      <TabsTrigger value="promotions" as-child>
        <button
          id="tab-promotions"
          data-tab="promotions"
          class="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
          :class="activeTab === 'promotions' ? 'tab-active' : 'ui-text-strong'"
        >
          <span class="tab-with-icon"><Gift class="ui-tab-icon" aria-hidden="true" />促銷活動</span>
        </button>
      </TabsTrigger>
      <TabsTrigger value="settings" as-child>
        <button
          id="tab-settings"
          data-tab="settings"
          class="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
          :class="activeTab === 'settings' ? 'tab-active' : 'ui-text-strong'"
        >
          <span class="tab-with-icon"><Settings class="ui-tab-icon" aria-hidden="true" />系統設定</span>
        </button>
      </TabsTrigger>
      <TabsTrigger value="icon-library" as-child>
        <button
          id="tab-icon-library"
          data-tab="icon-library"
          class="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
          :class="activeTab === 'icon-library' ? 'tab-active' : 'ui-text-strong'"
        >
          <span class="tab-with-icon"><Images class="ui-tab-icon" aria-hidden="true" />Icon 素材庫</span>
        </button>
      </TabsTrigger>
      <TabsTrigger value="formfields" as-child>
        <button
          id="tab-formfields"
          data-tab="formfields"
          class="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
          :class="activeTab === 'formfields' ? 'tab-active' : 'ui-text-strong'"
        >
          <span class="tab-with-icon"><FileText class="ui-tab-icon" aria-hidden="true" />表單管理</span>
        </button>
      </TabsTrigger>
      <TabsTrigger value="users" as-child>
        <button
          id="tab-users"
          data-tab="users"
          class="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
          :class="activeTab === 'users' ? 'tab-active' : 'ui-text-strong'"
        >
          <span class="tab-with-icon"><Users class="ui-tab-icon" aria-hidden="true" />用戶管理</span>
        </button>
      </TabsTrigger>
      <TabsTrigger value="blacklist" as-child>
        <button
          id="tab-blacklist"
          data-tab="blacklist"
          class="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
          :class="activeTab === 'blacklist' ? 'tab-active' : 'ui-text-strong'"
        >
          <span class="tab-with-icon"><ShieldAlert class="ui-tab-icon" aria-hidden="true" />黑名單</span>
        </button>
      </TabsTrigger>
    </TabsList>
  </TabsRoot>
</template>

<script setup>
import {
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
} from "./useDashboardSession.js";

const { activeTab } = useDashboardSession();
const setActiveTab = (tab) => dashboardSessionActions.setActiveTab(tab);
</script>
