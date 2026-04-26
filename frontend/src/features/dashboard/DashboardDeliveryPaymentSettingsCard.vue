<template>
  <div class="dashboard-settings-card checkout-routing-card">
    <div class="dashboard-settings-card__header checkout-routing-card__header">
      <div>
        <h3 class="dashboard-settings-card__title">
          <img src="../../../../icons/payment-card.png" alt="" class="ui-icon-inline-lg">
          取貨方式與付款對應設定
        </h3>
        <p class="checkout-routing-card__hint">
          一張卡管理一種取貨方式。左側調整名稱、圖示與說明，右側設定運費與可用付款方式。
        </p>
      </div>
      <button
        type="button"
        @click="handleAddDeliveryOption"
        class="btn-primary text-sm"
      >
        + 新增取貨方式
      </button>
    </div>

    <div
      id="delivery-routing-table"
      :ref="registerDeliveryRoutingTableElement"
      class="delivery-routing-list settings-routing-list"
    >
      <DashboardDeliveryOptionRoutingCard
        v-for="item in deliveryOptions"
        :key="item.id"
        :delivery-id="item.id"
        :payment-methods="routingPaymentMethods"
        @remove="handleRemoveDeliveryOption"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { type ComponentPublicInstance } from "vue";
import DashboardDeliveryOptionRoutingCard from "./DashboardDeliveryOptionRoutingCard.vue";
import {
  dashboardSettingsActions,
  useDashboardSettings,
} from "./useDashboardSettings.ts";
import type { DashboardPaymentRouting } from "./dashboardSettingsShared.ts";

type RoutingPaymentMethodKey = keyof DashboardPaymentRouting;

const routingPaymentMethods: Array<{
  key: RoutingPaymentMethodKey;
  label: string;
}> = [
  { key: "cod", label: "取貨付款" },
  { key: "linepay", label: "LINE Pay" },
  { key: "jkopay", label: "街口支付" },
  { key: "transfer", label: "線上轉帳" },
];

const { deliveryOptions } = useDashboardSettings();
type TemplateRefElement = Element | ComponentPublicInstance | null;

function registerDeliveryRoutingTableElement(element: TemplateRefElement) {
  dashboardSettingsActions.registerDeliveryRoutingTableElement(
    element instanceof HTMLElement ? element : null,
  );
}

function handleAddDeliveryOption() {
  dashboardSettingsActions.addDeliveryOption();
}

function handleRemoveDeliveryOption(deliveryId: string | number) {
  dashboardSettingsActions.removeDeliveryOption(deliveryId);
}
</script>

<style scoped>
.checkout-routing-card__hint {
  margin-top: 0.35rem;
  color: #657B83;
  font-size: 0.84rem;
  line-height: 1.55;
}

.checkout-routing-card__header .btn-primary {
  min-height: 2.75rem;
  border-radius: 8px;
  padding: 0.55rem 1.1rem;
  box-shadow: 0 2px 8px -3px rgba(38, 139, 210, 0.5);
}

.delivery-routing-list {
  display: grid;
  gap: 0.85rem;
}

.delivery-routing-list > .settings-config-card + .settings-config-card {
  margin-top: 0;
}

@media (max-width: 639px) {
  .checkout-routing-card__header {
    display: grid;
    gap: 0.75rem;
  }

  .checkout-routing-card__header .btn-primary {
    width: 100%;
  }
}
</style>
