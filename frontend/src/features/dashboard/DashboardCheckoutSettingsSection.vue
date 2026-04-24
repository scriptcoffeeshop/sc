<template>
  <div
    id="checkout-settings-section"
    v-show="activeTab === 'checkout-settings'"
    class="glass-card p-6"
  >
    <h2 class="text-lg font-bold mb-6 ui-text-highlight">
      付款與取貨設定
    </h2>

    <DashboardDeliveryPaymentSettingsCard />
    <DashboardPaymentOptionsSettingsCard />

    <div class="text-center">
      <button type="button" @click="handleSaveSettings" class="btn-primary">
        儲存設定
      </button>
    </div>
  </div>
</template>

<script setup>
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
