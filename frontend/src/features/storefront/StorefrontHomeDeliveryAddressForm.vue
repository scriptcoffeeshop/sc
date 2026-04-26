<template>
  <div
    id="home-delivery-section"
    class="fade-in p-4 rounded-xl ui-card-section"
    :class="{ hidden: selectedDelivery !== 'home_delivery' }"
  >
    <h3 class="font-semibold mb-3" style="color: var(--primary)">
      <span class="tab-with-icon"><img src="../../../../icons/shipping-box.png" alt="" class="ui-icon-inline">全台宅配地址</span>
    </h3>
    <div
      class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3"
    >
      <div>
        <label class="block text-sm text-gray-600 mb-1">縣市 <span class="text-red-500">*</span></label>
        <select
          class="county input-field"
          :value="homeDeliveryAddress.city"
          @change="handleHomeAddressInput('city', $event)"
        >
          <option value="">選擇縣市</option>
          <option
            v-for="county in homeCountyOptions"
            :key="county"
            :value="county"
          >
            {{ county }}
          </option>
        </select>
      </div>
      <div>
        <label class="block text-sm text-gray-600 mb-1">區域 <span class="text-red-500">*</span></label>
        <select
          class="district input-field"
          :value="homeDeliveryAddress.district"
          @change="handleHomeAddressInput('district', $event)"
        >
          <option value="">選擇區域</option>
          <option
            v-for="district in homeDistrictOptions"
            :key="district.name"
            :value="district.name"
          >
            {{ district.name }}
          </option>
        </select>
      </div>
      <div>
        <label class="block text-sm text-gray-600 mb-1">郵遞區號</label>
        <input
          class="zipcode input-field bg-gray-100"
          type="text"
          readonly
          placeholder="自動帶入"
          :value="homeDeliveryAddress.zipcode"
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
        :value="homeDeliveryAddress.address"
        @input="handleHomeAddressInput('address', $event)"
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  StorefrontHomeDeliveryAddress,
} from "./storefrontDeliveryFormState";
import type { StorefrontHomeDistrictOption } from "./useStorefrontDelivery";

withDefaults(
  defineProps<{
    selectedDelivery?: string;
    homeDeliveryAddress?: StorefrontHomeDeliveryAddress;
    homeCountyOptions?: string[];
    homeDistrictOptions?: StorefrontHomeDistrictOption[];
  }>(),
  {
    selectedDelivery: "",
    homeDeliveryAddress: () => ({
      city: "",
      district: "",
      zipcode: "",
      address: "",
    }),
    homeCountyOptions: () => [],
    homeDistrictOptions: () => [],
  },
);

const emit = defineEmits<{
  "update-home-delivery-address": [
    field: keyof StorefrontHomeDeliveryAddress,
    value: string,
  ];
}>();

function handleHomeAddressInput(
  field: keyof StorefrontHomeDeliveryAddress,
  event: Event,
) {
  const target = event.target;
  if (
    !(target instanceof HTMLInputElement) &&
    !(target instanceof HTMLSelectElement)
  ) {
    emit("update-home-delivery-address", field, "");
    return;
  }
  emit("update-home-delivery-address", field, target.value || "");
}
</script>
