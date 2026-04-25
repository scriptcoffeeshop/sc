<template>
  <div class="dashboard-shipping-info-form">
    <label class="dashboard-shipping-info-form__label" :for="trackingNumberId">
      {{ sharedLabelPrefix }}物流單號（可選）
    </label>
    <input
      :id="trackingNumberId"
      v-model.trim="formValues.trackingNumber"
      class="swal2-input dashboard-shipping-info-form__control"
      placeholder="請輸入物流單號"
    >

    <label class="dashboard-shipping-info-form__label" :for="shippingProviderId">
      {{ sharedLabelPrefix }}物流商（可選）
    </label>
    <input
      :id="shippingProviderId"
      v-model.trim="formValues.shippingProvider"
      class="swal2-input dashboard-shipping-info-form__control"
      placeholder="例如：黑貓宅急便"
    >

    <label class="dashboard-shipping-info-form__label" :for="trackingUrlId">
      {{ sharedLabelPrefix }}物流追蹤網址（可選）
    </label>
    <input
      :id="trackingUrlId"
      v-model.trim="formValues.trackingUrl"
      class="swal2-input dashboard-shipping-info-form__control"
      placeholder="https://..."
    >
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from "vue";

export interface DashboardShippingInfoValues {
  trackingNumber?: string;
  shippingProvider?: string;
  trackingUrl?: string;
}

export interface DashboardShippingInfoFormExpose {
  getValues: () => DashboardShippingInfoValues;
}

const props = withDefaults(
  defineProps<{
    initialValues?: DashboardShippingInfoValues;
    idPrefix?: string;
    shared?: boolean;
  }>(),
  {
    initialValues: () => ({}),
    idPrefix: "swal",
    shared: false,
  },
);

const formValues = reactive({
  trackingNumber: String(props.initialValues.trackingNumber || ""),
  shippingProvider: String(props.initialValues.shippingProvider || ""),
  trackingUrl: String(props.initialValues.trackingUrl || ""),
});

const sharedLabelPrefix = computed(() => props.shared ? "共用" : "");
const trackingNumberId = computed(() => `${props.idPrefix}-tracking-number`);
const shippingProviderId = computed(() => `${props.idPrefix}-shipping-provider`);
const trackingUrlId = computed(() => `${props.idPrefix}-tracking-url`);

defineExpose<DashboardShippingInfoFormExpose>({
  getValues: () => ({ ...formValues }),
});
</script>

<style scoped>
.dashboard-shipping-info-form {
  display: grid;
  gap: 8px;
  text-align: left;
}

.dashboard-shipping-info-form__label {
  color: #586e75;
  display: block;
  font-size: 0.875rem;
  font-weight: 700;
}

.dashboard-shipping-info-form__control {
  width: 100%;
  margin: 0 0 8px;
}
</style>
