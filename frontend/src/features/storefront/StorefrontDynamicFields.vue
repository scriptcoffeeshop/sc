<template>
  <div id="dynamic-fields-container" data-vue-managed="true">
    <div
      v-if="visibleFields.length"
      class="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4"
    >
      <div
        v-for="field in visibleFields"
        :key="field.id || field.field_key"
        :class="field.field_type === 'section_title' || field.field_type === 'textarea'
          ? 'md:col-span-2'
          : ''"
      >
        <h2
          v-if="field.field_type === 'section_title'"
          class="text-lg font-bold mb-2"
          style="color: var(--primary)"
        >
          {{ field.label }}
        </h2>

        <template v-else-if="field.field_type === 'checkbox'">
          <label class="flex items-center gap-2 cursor-pointer font-medium" style="color: var(--primary)">
            <input
              :id="fieldId(field)"
              type="checkbox"
              class="w-4 h-4"
              :checked="isCheckboxChecked(field)"
              @change="handleCheckboxChange(field, $event)"
            >
            {{ field.label }}
          </label>
        </template>

        <template v-else>
          <label class="block font-medium mb-2" style="color: var(--primary)">
            {{ field.label }}
            <span v-if="field.required" class="text-red-500">*</span>
          </label>

          <textarea
            v-if="field.field_type === 'textarea'"
            :id="fieldId(field)"
            class="input-field resize-none"
            rows="2"
            :placeholder="field.placeholder || ''"
            :required="!!field.required"
            :value="fieldValue(field)"
            @input="handleFieldInput(field, $event)"
          ></textarea>

          <select
            v-else-if="field.field_type === 'select'"
            :id="fieldId(field)"
            class="input-field"
            :required="!!field.required"
            :value="fieldValue(field)"
            @change="handleFieldInput(field, $event)"
          >
            <option value="">請選擇</option>
            <option
              v-for="optionValue in parseDynamicFieldOptions(field)"
              :key="optionValue"
              :value="optionValue"
            >
              {{ optionValue }}
            </option>
          </select>

          <input
            v-else
            :id="fieldId(field)"
            :type="field.field_type || 'text'"
            class="input-field"
            :placeholder="field.placeholder || ''"
            :required="!!field.required"
            :value="fieldValue(field)"
            @input="handleFieldInput(field, $event)"
          >
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { SessionUser } from "../../types/session";
import {
  getInitialDynamicFieldValue,
  isDynamicFieldVisibleForDelivery,
  parseDynamicFieldOptions,
  type StorefrontDynamicField,
} from "./useStorefrontDynamicFields.ts";

const props = withDefaults(
  defineProps<{
    fields?: StorefrontDynamicField[];
    selectedDelivery?: string;
    currentUser?: SessionUser | null;
    fieldValues?: Record<string, string>;
  }>(),
  {
    fields: () => [],
    selectedDelivery: "",
    currentUser: null,
    fieldValues: () => ({}),
  },
);

function fieldId(field: StorefrontDynamicField) {
  return `field-${String(field?.field_key || "")}`;
}

function fieldKey(field: StorefrontDynamicField) {
  return String(field?.field_key || "");
}

function initialValue(field: StorefrontDynamicField) {
  return getInitialDynamicFieldValue(field, props.currentUser);
}

function fieldValue(field: StorefrontDynamicField) {
  const key = fieldKey(field);
  if (!key) return "";
  return Object.prototype.hasOwnProperty.call(props.fieldValues, key)
    ? String(props.fieldValues[key] || "")
    : initialValue(field);
}

function isCheckboxChecked(field: StorefrontDynamicField) {
  const value = fieldValue(field);
  return value === "true" || value === "是";
}

const emit = defineEmits<{
  "update-field-value": [fieldKey: string, value: string];
}>();

function getFieldControl(event: Event) {
  const target = event.target;
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return target;
  }
  return null;
}

function handleFieldInput(field: StorefrontDynamicField, event: Event) {
  const target = getFieldControl(event);
  emit("update-field-value", fieldKey(field), target?.value || "");
}

function handleCheckboxChange(field: StorefrontDynamicField, event: Event) {
  const target = event.target instanceof HTMLInputElement ? event.target : null;
  emit("update-field-value", fieldKey(field), target?.checked ? "是" : "否");
}

const visibleFields = computed(() =>
  props.fields
    .filter((field) => field?.enabled !== false)
    .filter((field) =>
      isDynamicFieldVisibleForDelivery(field, props.selectedDelivery)
    )
);
</script>
