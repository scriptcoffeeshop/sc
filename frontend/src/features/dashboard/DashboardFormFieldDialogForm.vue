<template>
  <div class="dashboard-form-field-dialog">
    <label
      v-if="mode === 'add'"
      class="dashboard-form-field-dialog__label"
      for="swal-fk"
    >
      欄位識別碼 (英文，唯一)
    </label>
    <input
      v-if="mode === 'add'"
      id="swal-fk"
      v-model.trim="formValues.fieldKey"
      class="swal2-input dashboard-form-field-dialog__control"
      placeholder="例：receipt_type"
    >

    <label class="dashboard-form-field-dialog__label" for="swal-fl">
      顯示名稱
    </label>
    <input
      id="swal-fl"
      v-model.trim="formValues.label"
      class="swal2-input dashboard-form-field-dialog__control"
      placeholder="例：開立收據"
    >

    <label class="dashboard-form-field-dialog__label" for="swal-ft">
      類型
    </label>
    <select
      id="swal-ft"
      v-model="formValues.fieldType"
      class="swal2-select dashboard-form-field-dialog__control"
    >
      <option
        v-for="option in fieldTypeOptions"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>

    <label class="dashboard-form-field-dialog__label" for="swal-fp">
      提示文字
    </label>
    <input
      id="swal-fp"
      v-model.trim="formValues.placeholder"
      class="swal2-input dashboard-form-field-dialog__control"
      placeholder="例：請選擇"
    >

    <label class="dashboard-form-field-dialog__label" for="swal-fo">
      選項 (僅下拉選單，逗號分隔)
    </label>
    <input
      id="swal-fo"
      v-model="formValues.optionsText"
      class="swal2-input dashboard-form-field-dialog__control"
      placeholder="例：二聯式,三聯式,免開"
    >

    <label class="dashboard-form-field-dialog__check">
      <input
        id="swal-fr"
        v-model="formValues.required"
        type="checkbox"
      >
      <span>必填</span>
    </label>

    <section class="dashboard-form-field-dialog__visibility">
      <label class="dashboard-form-field-dialog__label">
        配送方式可見性
      </label>
      <p class="dashboard-form-field-dialog__hint">
        取消勾選 = 該配送方式下不顯示此欄位{{ mode === "add" ? "，全勾 = 全部顯示" : "" }}
      </p>
      <p
        v-if="!deliveryOptions.length"
        class="dashboard-form-field-dialog__empty"
      >
        尚未設定配送方式
      </p>
      <div
        v-else
        id="swal-dv"
        class="dashboard-form-field-dialog__delivery-list"
      >
        <label
          v-for="option in deliveryOptions"
          :key="String(option.id || '')"
          class="dashboard-form-field-dialog__delivery-option"
        >
          <input
            class="dv-cb"
            type="checkbox"
            :data-delivery-id="String(option.id || '')"
            :checked="isDeliveryVisible(option)"
            @change="setDeliveryVisible(option, getTargetChecked($event))"
          >
          <span>{{ option.label || option.id }}</span>
        </label>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from "vue";
import { parseJsonRecord } from "../../lib/jsonUtils.ts";
import {
  FIELD_TYPE_LABELS,
  parseFieldOptionsText,
  serializeFieldOptions,
  type DashboardFormField,
  type DashboardFormFieldType,
} from "./dashboardFormFieldsShared.ts";

export interface DashboardDeliveryOptionLike {
  id?: string | number;
  label?: string;
}

export interface DashboardFormFieldModalValues {
  fieldKey?: string;
  label: string;
  fieldType: string;
  placeholder: string;
  options: string;
  required: boolean;
  deliveryVisibility: string | null;
}

export interface DashboardFormFieldDialogExpose {
  getValues: () => DashboardFormFieldModalValues | false;
}

const props = withDefaults(
  defineProps<{
    mode: "add" | "edit";
    initialField?: DashboardFormField | null;
    deliveryOptions?: DashboardDeliveryOptionLike[];
  }>(),
  {
    initialField: null,
    deliveryOptions: () => [],
  },
);

const existingVisibility = parseJsonRecord(
  props.initialField?.delivery_visibility || null,
);
const deliveryVisibility = reactive<Record<string, boolean>>({});

for (const option of props.deliveryOptions) {
  const deliveryId = String(option.id || "");
  if (deliveryId) {
    deliveryVisibility[deliveryId] = existingVisibility[deliveryId] !== false;
  }
}

const formValues = reactive({
  fieldKey: "",
  label: String(props.initialField?.label || ""),
  fieldType: String(props.initialField?.field_type || "text"),
  placeholder: String(props.initialField?.placeholder || ""),
  optionsText: parseFieldOptionsText(props.initialField?.options),
  required: Boolean(props.initialField?.required),
});

const fieldTypeOptions = computed(() =>
  Object.entries(FIELD_TYPE_LABELS)
    .filter(([key]) => props.mode === "edit" || key !== "section_title")
    .map(([value, label]) => ({
      value: value as DashboardFormFieldType,
      label,
    }))
);

function getDeliveryId(option: DashboardDeliveryOptionLike): string {
  return String(option.id || "");
}

function getTargetChecked(event: Event): boolean {
  const target = event.target as HTMLInputElement | null;
  return Boolean(target?.checked);
}

function isDeliveryVisible(option: DashboardDeliveryOptionLike): boolean {
  const deliveryId = getDeliveryId(option);
  return deliveryId ? deliveryVisibility[deliveryId] !== false : false;
}

function setDeliveryVisible(
  option: DashboardDeliveryOptionLike,
  checked: boolean,
) {
  const deliveryId = getDeliveryId(option);
  if (deliveryId) deliveryVisibility[deliveryId] = checked;
}

function collectDeliveryVisibility(): string | null {
  const visibility: Record<string, boolean> = {};
  for (const option of props.deliveryOptions) {
    const deliveryId = getDeliveryId(option);
    if (deliveryId) visibility[deliveryId] = deliveryVisibility[deliveryId] !== false;
  }
  return Object.keys(visibility).length ? JSON.stringify(visibility) : null;
}

defineExpose<DashboardFormFieldDialogExpose>({
  getValues: () => {
    if (props.mode === "add" && !formValues.fieldKey) return false;
    if (!formValues.label) return false;

    return {
      ...(props.mode === "add" ? { fieldKey: formValues.fieldKey } : {}),
      label: formValues.label,
      fieldType: formValues.fieldType,
      placeholder: formValues.placeholder,
      options: serializeFieldOptions(formValues.optionsText),
      required: formValues.required,
      deliveryVisibility: collectDeliveryVisibility(),
    };
  },
});
</script>

<style scoped>
.dashboard-form-field-dialog {
  display: grid;
  gap: 8px;
  text-align: left;
}

.dashboard-form-field-dialog__label {
  color: #586e75;
  font-size: 0.875rem;
  font-weight: 700;
}

.dashboard-form-field-dialog__control {
  width: 100%;
  margin: 0 0 8px;
}

.dashboard-form-field-dialog__check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  cursor: pointer;
  font-size: 0.875rem;
}

.dashboard-form-field-dialog__visibility {
  display: grid;
  gap: 8px;
  margin-top: 10px;
  padding-top: 12px;
  border-top: 1px solid #e2dcc8;
}

.dashboard-form-field-dialog__hint,
.dashboard-form-field-dialog__empty {
  margin: 0;
  color: #839496;
  font-size: 0.75rem;
}

.dashboard-form-field-dialog__delivery-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dashboard-form-field-dialog__delivery-option {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px solid #e2dcc8;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
}
</style>
