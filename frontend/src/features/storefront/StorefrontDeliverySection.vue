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

    <div
      id="delivery-address-section"
      class="fade-in p-4 rounded-xl ui-card-section"
      :class="{ hidden: selectedDelivery !== 'delivery' }"
    >
      <h3 class="font-semibold mb-3" style="color: var(--primary)">
        <span class="tab-with-icon"><img src="../../../../icons/location-pin.png" alt="" class="ui-icon-inline">配送地址 (限新竹市/竹北市)</span>
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label class="block text-sm text-gray-600 mb-1">縣市</label>
          <select
            id="delivery-city"
            class="input-field"
            :value="localDeliveryAddress.city"
            @change="handleLocalAddressInput('city', $event)"
          >
            <option value="">請選擇</option>
            <option value="新竹市">新竹市</option>
            <option value="竹北市">竹北市</option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">區域</label>
          <select
            id="delivery-district"
            class="input-field"
            :value="localDeliveryAddress.district"
            @change="handleLocalAddressInput('district', $event)"
          >
            <option value="">{{ localDistrictOptions.length ? "請選擇" : "請先選擇縣市" }}</option>
            <option
              v-for="district in localDistrictOptions"
              :key="district"
              :value="district"
            >
              {{ district }}
            </option>
          </select>
        </div>
      </div>
      <div>
        <label class="block text-sm text-gray-600 mb-1">詳細地址</label>
        <input
          id="delivery-detail-address"
          type="text"
          class="input-field"
          placeholder="路/街、巷、弄、號、樓"
          :value="localDeliveryAddress.address"
          @input="handleLocalAddressInput('address', $event)"
        >
      </div>
    </div>

    <div
      id="home-delivery-section"
      class="fade-in p-4 rounded-xl ui-card-section"
      :class="{ hidden: selectedDelivery !== 'home_delivery' }"
    >
      <h3 class="font-semibold mb-3" style="color: var(--primary)">
        <span class="tab-with-icon"><img src="../../../../icons/shipping-box.png" alt="" class="ui-icon-inline">全台宅配地址</span>
      </h3>
      <div
        role="tw-city-selector"
        class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3"
      >
        <div>
          <label class="block text-sm text-gray-600 mb-1">縣市 <span class="text-red-500">*</span></label>
          <select class="county input-field"></select>
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">區域 <span class="text-red-500">*</span></label>
          <select class="district input-field"></select>
        </div>
        <div>
          <label class="block text-sm text-gray-600 mb-1">郵遞區號</label>
          <input
            class="zipcode input-field bg-gray-100"
            type="text"
            readonly
            placeholder="自動帶入"
          >
        </div>
      </div>
      <div>
        <label class="block text-sm text-gray-600 mb-1">詳細地址 <span class="text-red-500">*</span></label>
        <input
          id="home-delivery-detail"
          type="text"
          class="input-field"
          placeholder="路/街、巷、弄、號、樓"
        >
      </div>
    </div>

    <div
      id="store-pickup-section"
      class="fade-in p-4 rounded-xl ui-card-section"
      :class="{ hidden: !isStorePickupDelivery }"
    >
      <h3 class="font-semibold mb-3" style="color: var(--primary)">
        <span class="tab-with-icon"><img src="../../../../icons/store-front.png" alt="" class="ui-icon-inline">取貨門市資訊</span>
      </h3>
      <div class="mb-3 text-center">
        <UiButton class="store-select-btn" @click="$emit('open-store-map')">
          <span class="tab-with-icon"><img src="../../../../icons/map-route.png" alt="" class="ui-icon-inline">選擇門市</span>
        </UiButton>
        <p class="text-xs text-gray-500 mt-1">
          點擊後將開啟超商地圖選擇門市
        </p>
      </div>
      <div
        v-if="selectedStore.storeName"
        id="store-selected-info"
        class="store-info-card mb-3"
      >
        <div class="flex justify-between items-start">
          <div>
            <p id="selected-store-name" class="font-semibold">
              {{ selectedStore.storeName }}
            </p>
            <p id="selected-store-address" class="text-sm text-gray-600">
              {{ selectedStore.storeAddress }}
            </p>
            <p id="selected-store-id" class="text-xs text-gray-400">
              門市代號：{{ selectedStore.storeId }}
            </p>
          </div>
          <UiButton
            variant="ghost"
            size="sm"
            class="text-red-600 hover:text-red-700"
            @click="$emit('clear-selected-store')"
          >
            清除
          </UiButton>
        </div>
      </div>
      <input type="hidden" id="store-name-input" :value="selectedStore.storeName">
      <input type="hidden" id="store-address-input" :value="selectedStore.storeAddress">
      <input type="hidden" id="store-id-input" :value="selectedStore.storeId">
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
import UiButton from "../../components/ui/button/Button.vue";
import type { StorefrontDeliveryOption } from "./useStorefrontDelivery";
import type { StorefrontLocalDeliveryAddress } from "./storefrontDeliveryFormState";
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
}>();

function handleLocalAddressInput(
  field: keyof StorefrontLocalDeliveryAddress,
  event: Event,
) {
  const target = event.target;
  if (
    !(target instanceof HTMLInputElement) &&
    !(target instanceof HTMLSelectElement)
  ) {
    emit("update-local-delivery-address", field, "");
    return;
  }
  emit("update-local-delivery-address", field, target?.value || "");
}

function getDeliveryIcon(option: StorefrontDeliveryOption) {
  const resolvedIcon = props.resolveDeliveryIcon?.(option) || {};
  return {
    url: String(resolvedIcon.url || "").trim(),
  };
}

const isStorePickupDelivery = computed(() =>
  Boolean(props.selectedDelivery) &&
  !["delivery", "home_delivery", "in_store"].includes(props.selectedDelivery)
);
</script>
