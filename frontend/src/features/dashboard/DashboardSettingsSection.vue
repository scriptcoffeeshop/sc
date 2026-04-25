<template>
  <div id="settings-section" v-show="activeTab === 'settings'" class="glass-card dashboard-panel">
    <div class="dashboard-section-header">
      <div>
        <h2 class="dashboard-section-title">
          系統設定
        </h2>
        <p class="dashboard-section-hint">
          管理品牌、公告、營業狀態、區塊樣式與匯款帳號。
        </p>
      </div>
    </div>

    <DashboardBrandingSettingsCard />
    <DashboardSectionTitlesSettingsCard />
    <DashboardStorefrontStatusSettingsCard />
    <DashboardBankAccountsSettingsCard />

    <div class="text-center mt-4">
      <button type="button" @click="handleSaveSettings" class="btn-primary">
        儲存設定
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import DashboardBankAccountsSettingsCard from "./DashboardBankAccountsSettingsCard.vue";
import DashboardBrandingSettingsCard from "./DashboardBrandingSettingsCard.vue";
import DashboardSectionTitlesSettingsCard from "./DashboardSectionTitlesSettingsCard.vue";
import DashboardStorefrontStatusSettingsCard from "./DashboardStorefrontStatusSettingsCard.vue";
import {
  dashboardSettingsActions,
} from "./useDashboardSettings.ts";
import { useDashboardSession } from "./useDashboardSession.ts";

const { activeTab } = useDashboardSession();

function handleSaveSettings() {
  dashboardSettingsActions.saveSettings();
}
</script>
