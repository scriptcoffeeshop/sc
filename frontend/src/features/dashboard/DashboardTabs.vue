<template>
  <TabsRoot default-value="orders" class="mb-6">
    <TabsList id="sidebar" class="ui-tab-strip">
      <TabsTrigger value="orders" as-child>
        <button
          id="tab-orders"
          data-tab="orders"
          class="px-4 py-2 rounded-lg text-sm font-medium ui-text-strong whitespace-nowrap"
        >
          <span class="tab-with-icon"><img :src="getDefaultIconUrl('orders')" alt="" class="ui-icon-inline">訂單管理</span>
        </button>
      </TabsTrigger>
      <TabsTrigger value="products" as-child>
        <button
          id="tab-products"
          data-tab="products"
          class="px-4 py-2 rounded-lg text-sm font-medium ui-text-strong whitespace-nowrap"
        >
          <span class="tab-with-icon"><img :src="getDefaultIconUrl('products')" alt="" class="ui-icon-inline">商品管理</span>
        </button>
      </TabsTrigger>
      <TabsTrigger value="categories" as-child>
        <button
          id="tab-categories"
          data-tab="categories"
          class="px-4 py-2 rounded-lg text-sm font-medium ui-text-strong whitespace-nowrap"
        >
          <span class="tab-with-icon"><img :src="getDefaultIconUrl('categories')" alt="" class="ui-icon-inline">分類管理</span>
        </button>
      </TabsTrigger>
      <TabsTrigger value="promotions" as-child>
        <button
          id="tab-promotions"
          data-tab="promotions"
          class="px-4 py-2 rounded-lg text-sm font-medium ui-text-strong whitespace-nowrap"
        >
          <span class="tab-with-icon"><img :src="getDefaultIconUrl('promotions')" alt="" class="ui-icon-inline">促銷活動</span>
        </button>
      </TabsTrigger>
      <TabsTrigger value="settings" as-child>
        <button
          id="tab-settings"
          data-tab="settings"
          class="px-4 py-2 rounded-lg text-sm font-medium ui-text-strong whitespace-nowrap"
        >
          <span class="tab-with-icon"><img :src="getDefaultIconUrl('settings')" alt="" class="ui-icon-inline">系統設定</span>
        </button>
      </TabsTrigger>
      <TabsTrigger value="icon-library" as-child>
        <button
          id="tab-icon-library"
          data-tab="icon-library"
          class="px-4 py-2 rounded-lg text-sm font-medium ui-text-strong whitespace-nowrap"
        >
          <span class="tab-with-icon"><img :src="getDefaultIconUrl('section')" alt="" class="ui-icon-inline">Icon 素材庫</span>
        </button>
      </TabsTrigger>
      <TabsTrigger value="formfields" as-child>
        <button
          id="tab-formfields"
          data-tab="formfields"
          class="px-4 py-2 rounded-lg text-sm font-medium ui-text-strong whitespace-nowrap"
        >
          <span class="tab-with-icon"><img :src="getDefaultIconUrl('form')" alt="" class="ui-icon-inline">表單管理</span>
        </button>
      </TabsTrigger>
      <TabsTrigger value="users" as-child>
        <button
          id="tab-users"
          data-tab="users"
          class="px-4 py-2 rounded-lg text-sm font-medium ui-text-strong whitespace-nowrap"
        >
          <span class="tab-with-icon"><img :src="getDefaultIconUrl('users')" alt="" class="ui-icon-inline">用戶管理</span>
        </button>
      </TabsTrigger>
      <TabsTrigger value="blacklist" as-child>
        <button
          id="tab-blacklist"
          data-tab="blacklist"
          class="px-4 py-2 rounded-lg text-sm font-medium ui-text-strong whitespace-nowrap"
        >
          <span class="tab-with-icon"><img :src="getDefaultIconUrl('blacklist')" alt="" class="ui-icon-inline">黑名單</span>
        </button>
      </TabsTrigger>
    </TabsList>
  </TabsRoot>
</template>

<script setup>
import { TabsList, TabsRoot, TabsTrigger } from "reka-ui";
import { getDefaultIconUrl } from "../../../../js/icons.js";
</script>
