<template>
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
        <label class="block text-sm text-gray-600 mb-1">縣市 <span class="text-red-500">*</span></label>
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
        <label class="block text-sm text-gray-600 mb-1">區域 <span class="text-red-500">*</span></label>
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
      <label class="block text-sm text-gray-600 mb-1">詳細地址 <span class="text-red-500">*</span></label>
      <input
        id="delivery-detail-address"
        type="text"
        class="input-field"
        placeholder="路/街、巷、弄、號、樓"
        :value="localDeliveryAddress.address"
        @input="handleLocalAddressInput('address', $event)"
      >
    </div>
    <div class="mt-3">
      <label class="block text-sm text-gray-600 mb-1">公司行號/社區大樓名稱（選填）</label>
      <input
        id="delivery-company-or-building"
        type="text"
        class="input-field"
        placeholder="例如：好日子商辦、幸福社區 A 棟"
        :value="localDeliveryAddress.companyOrBuilding"
        @input="handleLocalAddressInput('companyOrBuilding', $event)"
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StorefrontLocalDeliveryAddress } from "./storefrontDeliveryFormState";

withDefaults(
  defineProps<{
    selectedDelivery?: string;
    localDeliveryAddress?: StorefrontLocalDeliveryAddress;
    localDistrictOptions?: string[];
  }>(),
  {
    selectedDelivery: "",
    localDeliveryAddress: () => ({
      city: "",
      district: "",
      address: "",
      companyOrBuilding: "",
    }),
    localDistrictOptions: () => [],
  },
);

const emit = defineEmits<{
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
  emit("update-local-delivery-address", field, target.value || "");
}
</script>
