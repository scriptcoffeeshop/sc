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

    <label
      class="dashboard-shipping-info-form__label"
      :for="shippingProviderPresetId"
    >
      {{ sharedLabelPrefix }}物流商（可選）
    </label>
    <select
      :id="shippingProviderPresetId"
      v-model="formValues.providerPreset"
      class="swal2-select dashboard-shipping-info-form__control dashboard-shipping-info-form__select"
    >
      <option
        v-for="preset in trackingProviderPresets"
        :key="preset.id"
        :value="preset.id"
      >
        {{ preset.label }}
      </option>
      <option value="other">其他</option>
    </select>

    <template v-if="isCustomProvider">
      <label
        class="dashboard-shipping-info-form__label"
        :for="shippingProviderId"
      >
        {{ sharedLabelPrefix }}物流商名稱（可選）
      </label>
      <input
        :id="shippingProviderId"
        v-model.trim="formValues.shippingProvider"
        class="swal2-input dashboard-shipping-info-form__control"
        placeholder="例如：黑貓宅急便"
      >
    </template>

    <label class="dashboard-shipping-info-form__label" :for="trackingUrlId">
      {{ sharedLabelPrefix }}貨態查詢網址（{{ trackingUrlLabelSuffix }}）
    </label>
    <input
      v-if="isCustomProvider"
      :id="trackingUrlId"
      v-model.trim="formValues.trackingUrl"
      class="swal2-input dashboard-shipping-info-form__control"
      placeholder="https://..."
    >
    <input
      v-else
      :id="trackingUrlId"
      class="swal2-input dashboard-shipping-info-form__control"
      :value="selectedPreset?.url || ''"
      disabled
    >
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from "vue";
import {
  getTrackingProviderPreset,
  normalizeTrackingUrl,
  TRACKING_PROVIDER_PRESETS,
  type TrackingProviderPresetId,
} from "../../lib/trackingUrls.ts";

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

const CUSTOM_PROVIDER_VALUE = "other";
const POST_PROVIDER_ALIASES = new Set(["中華郵政查詢", "中華郵政貨態查詢"]);
const trackingProviderPresets = TRACKING_PROVIDER_PRESETS;

function resolveInitialProviderPreset(
  initialValues: DashboardShippingInfoValues,
): TrackingProviderPresetId | typeof CUSTOM_PROVIDER_VALUE {
  const shippingProvider = String(initialValues.shippingProvider || "").trim();
  const trackingUrl = normalizeTrackingUrl(initialValues.trackingUrl || "");
  const providerMatchedPreset = trackingProviderPresets.find((preset) =>
    preset.label === shippingProvider ||
    (preset.id === "post" && POST_PROVIDER_ALIASES.has(shippingProvider))
  );
  if (providerMatchedPreset) return providerMatchedPreset.id;
  if (shippingProvider) return CUSTOM_PROVIDER_VALUE;

  const urlMatchedPreset = trackingProviderPresets.find((preset) =>
    normalizeTrackingUrl(preset.url) === trackingUrl
  );
  return urlMatchedPreset?.id || CUSTOM_PROVIDER_VALUE;
}

const initialProviderPreset = resolveInitialProviderPreset(props.initialValues);
const hasInitialPreset = Boolean(
  getTrackingProviderPreset(initialProviderPreset),
);

const formValues = reactive({
  trackingNumber: String(props.initialValues.trackingNumber || ""),
  providerPreset: initialProviderPreset,
  shippingProvider: hasInitialPreset
    ? ""
    : String(props.initialValues.shippingProvider || ""),
  trackingUrl: hasInitialPreset
    ? ""
    : String(props.initialValues.trackingUrl || ""),
});

const sharedLabelPrefix = computed(() => props.shared ? "共用" : "");
const trackingNumberId = computed(() => `${props.idPrefix}-tracking-number`);
const shippingProviderId = computed(() => `${props.idPrefix}-shipping-provider`);
const shippingProviderPresetId = computed(() =>
  `${props.idPrefix}-shipping-provider-preset`
);
const trackingUrlId = computed(() => `${props.idPrefix}-tracking-url`);
const selectedPreset = computed(() =>
  getTrackingProviderPreset(formValues.providerPreset)
);
const isCustomProvider = computed(() => !selectedPreset.value);
const trackingUrlLabelSuffix = computed(() =>
  isCustomProvider.value ? "可選" : "自動帶入"
);

defineExpose<DashboardShippingInfoFormExpose>({
  getValues: () => ({
    trackingNumber: formValues.trackingNumber,
    shippingProvider: selectedPreset.value?.label ||
      formValues.shippingProvider,
    trackingUrl: selectedPreset.value?.url || formValues.trackingUrl,
  }),
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

.dashboard-shipping-info-form__select {
  color: #073642;
  min-height: 3.25rem;
}

.dashboard-shipping-info-form__control:disabled {
  background: #f8f5ea;
  color: #586e75;
  opacity: 1;
}
</style>
