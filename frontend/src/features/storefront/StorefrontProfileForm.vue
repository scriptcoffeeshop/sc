<template>
  <div class="storefront-profile-form">
    <p class="storefront-profile-form__hint">
      編輯常用資料，下次登入時將自動帶入表單。
    </p>
    <div
      v-for="field in fields"
      :key="field.key"
      class="storefront-profile-form__field"
    >
      <label
        class="storefront-profile-form__label"
        :for="`profile-${field.key}`"
      >
        {{ field.label }}
      </label>
      <select
        v-if="field.type === 'select'"
        :id="`profile-${field.key}`"
        class="swal2-select storefront-profile-form__control"
        :value="profileValues[field.key] || ''"
        @change="updateField(field.key, getTargetValue($event))"
      >
        <option value="">-- 請選擇 --</option>
        <option
          v-for="option in field.options"
          :key="option"
          :value="option"
        >
          {{ option }}
        </option>
      </select>
      <textarea
        v-else-if="field.type === 'textarea'"
        :id="`profile-${field.key}`"
        class="swal2-textarea storefront-profile-form__control storefront-profile-form__textarea"
        :placeholder="field.placeholder"
        :value="profileValues[field.key] || ''"
        @input="updateField(field.key, getTargetValue($event))"
      />
      <input
        v-else
        :id="`profile-${field.key}`"
        class="swal2-input storefront-profile-form__control"
        :type="getInputType(field.type)"
        :placeholder="field.placeholder"
        :value="profileValues[field.key] || ''"
        @input="updateField(field.key, getTargetValue($event))"
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from "vue";

export interface StorefrontProfileFieldView {
  key: string;
  label: string;
  placeholder: string;
  type: string;
  options: string[];
}

export type StorefrontProfileFormValues = Record<string, string>;

const props = withDefaults(
  defineProps<{
    fields?: StorefrontProfileFieldView[];
    initialValues?: StorefrontProfileFormValues;
  }>(),
  {
    fields: () => [],
    initialValues: () => ({}),
  },
);

const profileValues = reactive<StorefrontProfileFormValues>({
  ...props.initialValues,
});

function getTargetValue(event: Event): string {
  const target = event.target as
    | HTMLInputElement
    | HTMLSelectElement
    | HTMLTextAreaElement
    | null;
  return target?.value || "";
}

function getInputType(type: string): string {
  if (["email", "number", "tel", "url"].includes(type)) return type;
  return "text";
}

function updateField(key: string, value: string) {
  profileValues[key] = value;
}

defineExpose({
  getValues: () => ({ ...profileValues }),
});
</script>

<style scoped>
.storefront-profile-form {
  max-height: 60vh;
  overflow-y: auto;
  padding: 4px;
  text-align: left;
}

.storefront-profile-form__hint {
  margin-bottom: 16px;
  color: #888;
  font-size: 13px;
}

.storefront-profile-form__field {
  margin-bottom: 12px;
}

.storefront-profile-form__label {
  display: block;
  margin-bottom: 4px;
  color: #3c2415;
  font-size: 14px;
  font-weight: 600;
}

.storefront-profile-form__control {
  width: 100%;
  margin: 0;
}

.storefront-profile-form__textarea {
  min-height: 60px;
}
</style>
