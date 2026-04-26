<template>
  <div class="mb-6">
    <h2
      id="delivery-section-title"
      class="mb-4"
      :class="[sectionTitle.sizeClass, sectionTitle.weightClass]"
      :style="{ color: sectionTitle.color }"
    >
      <span class="section-heading-inline">
        <span class="ui-icon-title">
          <img
            id="delivery-section-icon"
            :src="sectionTitle.iconUrl"
            :alt="sectionTitle.iconAlt"
            class="ui-icon-img"
          >
        </span>
        <span id="delivery-section-title-text">{{ sectionTitle.title }}</span>
      </span>
    </h2>
    <div
      id="delivery-options-list"
      data-vue-managed="true"
      class="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4"
    >
      <div
        v-for="option in deliveryOptions"
        :key="option.id"
        class="delivery-option"
        :class="{ active: selectedDelivery === option.id }"
        :data-id="option.id"
        @click="$emit('select-delivery', option.id)"
      >
        <div class="check-mark"><img :src="selectedCheckIconUrl" alt="" class="ui-icon-img"></div>
        <div class="option-icon">
          <img
            v-if="getDeliveryIcon(option).url"
            :src="getDeliveryIcon(option).url"
            :alt="`${option.name} 圖示`"
            class="ui-icon-img"
          >
        </div>
        <div class="font-semibold" style="font-size: 0.95rem;">
          {{ option.name }}
        </div>
        <div class="delivery-option-description text-xs text-gray-500 mt-1">
          {{ option.description }}
        </div>
      </div>
    </div>

    <StorefrontLocalDeliveryAddressForm
      :selected-delivery="selectedDelivery"
      :local-delivery-address="localDeliveryAddress"
      :local-district-options="localDistrictOptions"
      @update-local-delivery-address="forwardLocalDeliveryAddressUpdate"
    />

    <StorefrontHomeDeliveryAddressForm
      :selected-delivery="selectedDelivery"
      :home-delivery-address="homeDeliveryAddress"
      :home-county-options="homeCountyOptions"
      :home-district-options="homeDistrictOptions"
      @update-home-delivery-address="forwardHomeDeliveryAddressUpdate"
    />

    <div
      id="store-pickup-section"
      class="fade-in p-4 rounded-xl ui-card-section"
      :class="{ hidden: !isStorePickupDelivery }"
    >
      <h3 class="store-pickup-title">
        <span class="store-pickup-title__icon"><Store class="store-pickup-title__svg" aria-hidden="true" /></span>
        <span>取貨門市資訊</span>
      </h3>
      <div
        v-if="selectedStore.storeName"
        id="store-selected-info"
        class="store-info-card store-pickup-card"
      >
        <div class="store-pickup-card__content">
          <p id="selected-store-name" class="store-pickup-card__name">
            {{ selectedStore.storeName }}
          </p>
          <p id="selected-store-address" class="store-pickup-card__address">
            {{ selectedStore.storeAddress }}
          </p>
          <p id="selected-store-id" class="store-pickup-card__id">
            門市代號：{{ selectedStore.storeId }}
          </p>
        </div>
        <UiButton
          variant="ghost"
          size="sm"
          class="store-pickup-card__clear"
          @click="$emit('clear-selected-store')"
        >
          清除
        </UiButton>
      </div>
      <div class="store-pickup-actions">
        <UiButton class="store-select-btn store-pickup-actions__button" @click="$emit('open-store-map')">
          <span class="store-pickup-actions__icon">
            <MapPinned class="store-pickup-actions__svg" aria-hidden="true" />
          </span>
          <span class="store-pickup-actions__label">選擇門市</span>
        </UiButton>
        <p class="store-pickup-actions__hint">
          點擊後將開啟超商地圖選擇門市
        </p>
      </div>
    </div>

    <div
      id="in-store-section"
      class="fade-in p-4 rounded-xl ui-card-section mt-4"
      :class="{ hidden: selectedDelivery !== 'in_store' }"
    >
      <h3 class="font-semibold mb-3 text-gray-800">
        <span class="tab-with-icon"><img src="../../../../icons/store-front.png" alt="" class="ui-icon-inline">門市資訊</span>
      </h3>
      <p class="text-sm text-gray-700 leading-relaxed mb-3">
        <strong>地址：</strong>新竹市東區建中路101號1樓<br>
        <strong>電話：</strong><a
          href="tel:035718460"
          class="hover:underline text-blue-600"
        >03-5718460</a><br>
        <strong>官方 LINE：</strong><a
          href="https://lin.ee/aEiCEfh"
          target="_blank"
          class="hover:underline text-green-600 font-medium"
        >@scriptcoffee</a> <span
          class="text-xs text-gray-500"
        >(點擊加入官方 LINE 帳號)</span><br>
        <strong>營業時間：</strong>請以 Google 商家地圖上顯示的時間為準
      </p>
      <div class="flex flex-col sm:flex-row gap-3">
        <a
          href="https://maps.app.goo.gl/emnxgDhm3mRhCz5o7"
          target="_blank"
          class="inline-block text-sm font-medium hover:opacity-80 transition-opacity"
          style="color: var(--primary); text-decoration: underline"
        >
          <span class="tab-with-icon"><img src="../../../../icons/map-route.png" alt="" class="ui-icon-inline">去 Google Maps 查看路線和營業時間</span>
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { MapPinned, Store } from "lucide-vue-next";
import UiButton from "../../components/ui/button/Button.vue";
import StorefrontHomeDeliveryAddressForm from "./StorefrontHomeDeliveryAddressForm.vue";
import StorefrontLocalDeliveryAddressForm from "./StorefrontLocalDeliveryAddressForm.vue";
import type {
  StorefrontDeliveryOption,
  StorefrontHomeDistrictOption,
} from "./useStorefrontDelivery";
import type {
  StorefrontHomeDeliveryAddress,
  StorefrontLocalDeliveryAddress,
} from "./storefrontDeliveryFormState";
import type { StorefrontSelectedStore } from "./storefrontSelectedStoreState";
import type { StorefrontSectionTitleView } from "./useStorefrontBranding";
import { normalizeStorefrontBranding } from "./useStorefrontBranding.ts";

type DeliveryIconResolver = (
  option: StorefrontDeliveryOption,
) => { url?: string } | null | undefined;

const props = withDefaults(
  defineProps<{
    deliveryOptions?: StorefrontDeliveryOption[];
    selectedDelivery?: string;
    selectedStore?: StorefrontSelectedStore;
    localDeliveryAddress?: StorefrontLocalDeliveryAddress;
    localDistrictOptions?: string[];
    homeDeliveryAddress?: StorefrontHomeDeliveryAddress;
    homeCountyOptions?: string[];
    homeDistrictOptions?: StorefrontHomeDistrictOption[];
    sectionTitle?: StorefrontSectionTitleView;
    selectedCheckIconUrl: string;
    resolveDeliveryIcon?: DeliveryIconResolver | null;
  }>(),
  {
    deliveryOptions: () => [],
    selectedDelivery: "",
    selectedStore: () => ({
      storeId: "",
      storeName: "",
      storeAddress: "",
    }),
    localDeliveryAddress: () => ({
      city: "",
      district: "",
      address: "",
      companyOrBuilding: "",
    }),
    localDistrictOptions: () => [],
    homeDeliveryAddress: () => ({
      city: "",
      district: "",
      zipcode: "",
      address: "",
    }),
    homeCountyOptions: () => [],
    homeDistrictOptions: () => [],
    sectionTitle: () => normalizeStorefrontBranding({}).sections.delivery,
    resolveDeliveryIcon: null,
  },
);

const emit = defineEmits<{
  "select-delivery": [deliveryId: string];
  "open-store-map": [];
  "clear-selected-store": [];
  "update-local-delivery-address": [
    field: keyof StorefrontLocalDeliveryAddress,
    value: string,
  ];
  "update-home-delivery-address": [
    field: keyof StorefrontHomeDeliveryAddress,
    value: string,
  ];
}>();

function getDeliveryIcon(option: StorefrontDeliveryOption) {
  const resolvedIcon = props.resolveDeliveryIcon?.(option) || {};
  return {
    url: String(resolvedIcon.url || "").trim(),
  };
}

function forwardLocalDeliveryAddressUpdate(
  field: keyof StorefrontLocalDeliveryAddress,
  value: string,
) {
  emit("update-local-delivery-address", field, value);
}

function forwardHomeDeliveryAddressUpdate(
  field: keyof StorefrontHomeDeliveryAddress,
  value: string,
) {
  emit("update-home-delivery-address", field, value);
}

const isStorePickupDelivery = computed(() =>
  Boolean(props.selectedDelivery) &&
  !["delivery", "home_delivery", "in_store"].includes(props.selectedDelivery)
);
</script>

<style scoped>
.delivery-option-description {
  line-height: 1.45;
  white-space: pre-line;
}

.store-pickup-title {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 1rem;
  color: var(--primary);
  font-weight: 800;
}

.store-pickup-title__icon,
.store-pickup-actions__icon {
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  color: #344256;
}

.store-pickup-title__icon {
  width: 2rem;
  height: 2rem;
  border: 1px solid #e1d6c7;
  border-radius: 0.5rem;
  background: #fffdf8;
}

.store-pickup-title__svg {
  width: 1.2rem;
  height: 1.2rem;
  stroke-width: 1.9;
}

.store-pickup-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.9rem;
}

.store-pickup-card__name {
  color: var(--primary);
  font-weight: 800;
}

.store-pickup-card__address {
  margin-top: 0.2rem;
  color: #52606b;
  font-size: 0.9rem;
  line-height: 1.45;
}

.store-pickup-card__id {
  margin-top: 0.25rem;
  color: #8a96a0;
  font-size: 0.76rem;
}

.store-pickup-card__clear {
  min-height: 2.25rem;
  color: #b91c1c;
}

.store-pickup-actions {
  display: grid;
  gap: 0.45rem;
}

.store-pickup-actions__button {
  width: 100%;
  min-height: 3.1rem;
  justify-content: center;
  gap: 0.55rem;
  font-weight: 800;
}

.store-pickup-actions__icon {
  width: 2rem;
  height: 2rem;
  border-radius: 0.45rem;
  background: rgba(255, 255, 255, 0.22);
}

.store-pickup-actions__svg {
  width: 1.25rem;
  height: 1.25rem;
  stroke-width: 2.2;
}

.store-pickup-actions__hint {
  color: #6b7280;
  font-size: 0.78rem;
  line-height: 1.4;
  text-align: center;
}

@media (max-width: 430px) {
  #store-pickup-section {
    padding: 1rem;
  }

  .store-pickup-card {
    grid-template-columns: 1fr;
    margin-bottom: 1.15rem;
  }

  .store-pickup-card__clear {
    justify-self: stretch;
    min-height: 2.5rem;
  }

  .store-pickup-actions__button {
    min-height: 3.35rem;
  }
}
</style>
