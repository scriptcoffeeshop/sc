<template>
  <div id="settings-section" v-show="activeTab === 'settings'" class="glass-card p-6">
    <h2 class="text-lg font-bold mb-6 ui-text-highlight">
      系統設定
    </h2>

    <DashboardBrandingSettingsCard />
    <DashboardSectionTitlesSettingsCard />
    <DashboardStorefrontStatusSettingsCard />
    <DashboardDeliveryPaymentSettingsCard />
    <DashboardPaymentOptionsSettingsCard />
    <DashboardBankAccountsSettingsCard />

    <div class="text-center">
      <button type="button" @click="handleSaveSettings" class="btn-primary">
        儲存設定
      </button>
    </div>
  </div>
</template>

<script setup>
import DashboardBankAccountsSettingsCard from "./DashboardBankAccountsSettingsCard.vue";
import DashboardBrandingSettingsCard from "./DashboardBrandingSettingsCard.vue";
import DashboardDeliveryPaymentSettingsCard from "./DashboardDeliveryPaymentSettingsCard.vue";
import DashboardPaymentOptionsSettingsCard from "./DashboardPaymentOptionsSettingsCard.vue";
import DashboardSectionTitlesSettingsCard from "./DashboardSectionTitlesSettingsCard.vue";
import DashboardStorefrontStatusSettingsCard from "./DashboardStorefrontStatusSettingsCard.vue";
import {
  dashboardSettingsActions,
} from "./useDashboardSettings.js";
import { useDashboardSession } from "./useDashboardSession.js";

const { activeTab } = useDashboardSession();

function handleSaveSettings() {
  dashboardSettingsActions.saveSettings();
}
</script>
