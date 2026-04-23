<template>
  <div id="formfields-section" v-show="activeTab === 'formfields'" class="glass-card p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-bold ui-text-highlight">
        表單欄位管理
      </h2>
      <button
        type="button"
        @click="handleShowAddFieldModal"
        class="btn-primary text-sm"
      >
        + 新增欄位
      </button>
    </div>
    <p class="text-sm ui-text-subtle mb-4">
      管理前台訂購表單的自訂欄位（如聯絡電話、電子郵件、開立收據等）。可拖拽排序、設定必填、啟用/停用。
    </p>
    <div id="formfields-list">
      <p v-if="formFieldsView.length === 0" class="text-center ui-text-subtle py-8">
        尚無自訂欄位
      </p>
      <div v-else ref="formFieldsList" class="space-y-2" id="formfields-sortable">
        <div
          v-for="field in formFieldsView"
          :key="`field-${field.id}`"
          class="flex items-center gap-3 p-3 bg-white rounded-xl border"
          :class="field.enabled ? '' : 'opacity-50'"
          :data-field-id="field.id"
        >
          <span class="cursor-grab ui-text-muted drag-handle"><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="drag-handle-icon-sm"><path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60-12a12,12,0,1,0,12,12A12,12,0,0,0,164,48ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z"></path></svg></span>
          <div class="flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-medium">{{ field.label }}</span>
              <span class="text-xs ui-primary-soft ui-text-highlight px-2 py-0.5 rounded-full">
                {{ field.fieldTypeLabel }}
              </span>
              <span
                v-if="field.required"
                class="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full"
              >
                必填
              </span>
              <span
                v-if="!field.enabled"
                class="text-xs bg-gray-100 ui-text-subtle px-2 py-0.5 rounded-full"
              >
                已停用
              </span>
            </div>
            <div class="text-xs ui-text-muted mt-1">
              key: {{ field.fieldKey }}<span v-if="field.placeholder">・{{ field.placeholder }}</span>
            </div>
            <div v-if="field.hiddenDeliveryMethodsText" class="text-xs text-orange-500 mt-1">
              {{ field.hiddenDeliveryMethodsText }}
            </div>
          </div>
          <div class="flex gap-1 items-center">
            <button
              type="button"
              @click="handleToggleFieldEnabled(field.id, field.toggleEnabledValue)"
              class="text-sm px-2 py-1 rounded hover:bg-gray-100"
              :title="field.toggleEnabledTitle"
            >
              {{ field.toggleEnabledIcon }}
            </button>
            <button
              type="button"
              @click="handleEditFormField(field.id)"
              class="text-sm px-2 py-1 rounded hover:bg-gray-100"
              title="編輯"
            >
              編輯
            </button>
            <button
              type="button"
              @click="handleDeleteFormField(field.id)"
              class="text-sm px-2 py-1 rounded hover:bg-red-50 ui-text-danger"
              title="刪除"
            >
              刪除
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from "vue";
import {
  dashboardFormFieldsActions,
  useDashboardFormFields,
} from "./useDashboardFormFields.ts";
import { useDashboardSession } from "./useDashboardSession.ts";

const { formFieldsView } = useDashboardFormFields();
const { activeTab } = useDashboardSession();
const formFieldsList = ref(null);

function syncFormFieldsList() {
  dashboardFormFieldsActions.registerFormFieldsListElement(formFieldsList.value);
}

function handleShowAddFieldModal() {
  dashboardFormFieldsActions.showAddFieldModal();
}

function handleToggleFieldEnabled(id, enabled) {
  dashboardFormFieldsActions.toggleFieldEnabled(id, enabled === "true");
}

function handleEditFormField(id) {
  dashboardFormFieldsActions.editFormField(id);
}

function handleDeleteFormField(id) {
  dashboardFormFieldsActions.deleteFormField(id);
}

onMounted(syncFormFieldsList);
watch(formFieldsView, syncFormFieldsList, { deep: true });
</script>
