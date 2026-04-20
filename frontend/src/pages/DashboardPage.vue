<template>
  <UiCard id="login-page" class="max-w-md mx-auto mt-20 p-8 text-center">
    <img
      id="dashboard-login-logo"
      :src="brandIconUrl"
      alt="品牌圖示"
      class="w-14 h-14 mx-auto mb-4"
    >
    <h1 class="text-2xl font-bold mb-2 text-slate-800">
      後台登入
    </h1>
    <p class="text-slate-600 mb-6">
      僅限管理員登入
    </p>
    <UiButton
      data-action="login-with-line"
      class="h-11 px-6 bg-[#06c755] hover:bg-[#05b84e]"
    >
      <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path
          d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"
        />
      </svg>
      使用 LINE 登入
    </UiButton>
  </UiCard>

  <div id="admin-page" class="hidden max-w-6xl mx-auto">
    <div class="flex justify-between items-center mb-6">
      <div class="flex items-center gap-3">
        <img id="dashboard-header-logo" :src="brandIconUrl" alt="品牌圖示" class="w-9 h-9">
        <div>
          <h1 class="text-xl font-bold ui-text-highlight">
            咖啡訂購後台
          </h1>
          <p class="text-sm ui-text-subtle">
            歡迎，<span id="admin-name"></span>
          </p>
        </div>
      </div>
      <button
        data-action="logout"
        class="text-sm ui-text-subtle hover:ui-text-danger"
      >
        登出
      </button>
    </div>

    <DashboardTabs />
    <DashboardOrdersSection />
    <DashboardProductsSection />
    <DashboardCategoriesSection />
    <DashboardPromotionsSection :promotions-view="promotionsView" />
    <DashboardSettingsSection />
    <DashboardIconLibrarySection
      :categories="iconLibraryCategories"
      :items="filteredIconCatalog"
      :selected-category="iconLibraryCategory"
      :keyword="iconLibraryKeyword"
      @update:keyword="iconLibraryKeyword = $event"
      @select-category="selectIconLibraryCategory"
    />
    <DashboardFormFieldsSection :form-fields-view="formFieldsView" />
    <DashboardUsersSection :users-view="usersView" />
    <DashboardBlacklistSection :blacklist-view="blacklistView" />

    <div class="content-spacer"></div>
  </div>

  <DashboardProductModal />
  <DashboardPromotionModal />
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import UiButton from "../components/ui/button/Button.vue";
import UiCard from "../components/ui/card/Card.vue";
import DashboardBlacklistSection from "../features/dashboard/DashboardBlacklistSection.vue";
import DashboardCategoriesSection from "../features/dashboard/DashboardCategoriesSection.vue";
import DashboardFormFieldsSection from "../features/dashboard/DashboardFormFieldsSection.vue";
import DashboardIconLibrarySection from "../features/dashboard/DashboardIconLibrarySection.vue";
import DashboardOrdersSection from "../features/dashboard/DashboardOrdersSection.vue";
import DashboardProductModal from "../features/dashboard/DashboardProductModal.vue";
import DashboardProductsSection from "../features/dashboard/DashboardProductsSection.vue";
import DashboardPromotionModal from "../features/dashboard/DashboardPromotionModal.vue";
import DashboardPromotionsSection from "../features/dashboard/DashboardPromotionsSection.vue";
import DashboardSettingsSection from "../features/dashboard/DashboardSettingsSection.vue";
import DashboardTabs from "../features/dashboard/DashboardTabs.vue";
import DashboardUsersSection from "../features/dashboard/DashboardUsersSection.vue";
import { ICON_CATALOG, getDefaultIconUrl } from "../../../js/icons.js";
import { initDashboardApp } from "../../../js/dashboard-app.js";

const brandIconUrl = getDefaultIconUrl("brand");
const originalBodyClass = document.body.className;
const DASHBOARD_BODY_CLASSES = ["dashboard-enterprise", "p-4", "md:p-6"];

const promotionsView = ref([]);
const formFieldsView = ref([]);
const usersView = ref([]);
const blacklistView = ref([]);
const iconLibraryCategory = ref("all");
const iconLibraryKeyword = ref("");

const iconLibraryCategories = computed(() => {
  const values = new Set(ICON_CATALOG.map((item) => item.category));
  return ["all", ...Array.from(values)];
});

const filteredIconCatalog = computed(() => {
  const keyword = iconLibraryKeyword.value.trim().toLowerCase();
  return ICON_CATALOG.filter((item) => {
    if (
      iconLibraryCategory.value !== "all" &&
      item.category !== iconLibraryCategory.value
    ) {
      return false;
    }
    if (!keyword) return true;
    const targetText = `${item.key} ${item.label} ${item.category} ${item.path}`
      .toLowerCase();
    return targetText.includes(keyword);
  });
});

function selectIconLibraryCategory(category) {
  iconLibraryCategory.value = category;
}

function buildDashboardBodyClass() {
  const classSet = new Set(
    originalBodyClass
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean),
  );
  for (const className of DASHBOARD_BODY_CLASSES) {
    classSet.add(className);
  }
  return Array.from(classSet).join(" ");
}

function handleDashboardPromotionsUpdated(event) {
  const detail = event?.detail || {};
  promotionsView.value = Array.isArray(detail.promotions)
    ? detail.promotions
    : [];
}

function handleDashboardFormFieldsUpdated(event) {
  const detail = event?.detail || {};
  formFieldsView.value = Array.isArray(detail.fields) ? detail.fields : [];
}

function handleDashboardUsersUpdated(event) {
  const detail = event?.detail || {};
  usersView.value = Array.isArray(detail.users) ? detail.users : [];
}

function handleDashboardBlacklistUpdated(event) {
  const detail = event?.detail || {};
  blacklistView.value = Array.isArray(detail.blacklist) ? detail.blacklist : [];
}

const dashboardEventListeners = [
  ["coffee:dashboard-promotions-updated", handleDashboardPromotionsUpdated],
  ["coffee:dashboard-formfields-updated", handleDashboardFormFieldsUpdated],
  ["coffee:dashboard-users-updated", handleDashboardUsersUpdated],
  ["coffee:dashboard-blacklist-updated", handleDashboardBlacklistUpdated],
];

onMounted(() => {
  document.body.className = buildDashboardBodyClass();
  for (const [eventName, handler] of dashboardEventListeners) {
    window.addEventListener(eventName, handler);
  }
  initDashboardApp();
});

onBeforeUnmount(() => {
  for (const [eventName, handler] of dashboardEventListeners) {
    window.removeEventListener(eventName, handler);
  }
  document.body.className = originalBodyClass;
});
</script>
