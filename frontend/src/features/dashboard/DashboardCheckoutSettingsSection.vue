<template>
  <div
    id="checkout-settings-section"
    v-show="activeTab === 'checkout-settings'"
    class="glass-card dashboard-panel"
  >
    <div class="dashboard-section-header">
      <div>
        <h2 class="dashboard-section-title">
          付款與取貨設定
        </h2>
        <p class="dashboard-section-hint">
          管理配送方式、支援付款規則與前台付款選項顯示。
        </p>
      </div>
    </div>

    <DashboardDeliveryPaymentSettingsCard />
    <DashboardPaymentOptionsSettingsCard />

    <div class="text-center mt-4">
      <button type="button" @click="handleSaveSettings" class="btn-primary">
        儲存設定
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import DashboardDeliveryPaymentSettingsCard from "./DashboardDeliveryPaymentSettingsCard.vue";
import DashboardPaymentOptionsSettingsCard from "./DashboardPaymentOptionsSettingsCard.vue";
import {
  dashboardSettingsActions,
} from "./useDashboardSettings.ts";
import { useDashboardSession } from "./useDashboardSession.ts";

const { activeTab } = useDashboardSession();

function handleSaveSettings() {
  dashboardSettingsActions.saveSettings();
}
</script>
