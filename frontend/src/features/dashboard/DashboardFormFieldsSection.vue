<template>
  <div id="formfields-section" v-show="activeTab === 'formfields'" class="glass-card dashboard-panel">
    <div class="dashboard-section-header">
      <div>
        <h2 class="dashboard-section-title">
          表單欄位管理
        </h2>
        <p class="dashboard-section-hint">
          管理前台訂購表單的自訂欄位，可拖曳排序、設定必填與啟用狀態。
        </p>
      </div>
      <button
        type="button"
        @click="handleShowAddFieldModal"
        class="btn-primary text-sm"
      >
        + 新增欄位
      </button>
    </div>
    <div id="formfields-list">
      <p v-if="formFieldsView.length === 0" class="dashboard-empty-state">
        尚無自訂欄位
      </p>
      <div v-else ref="formFieldsList" class="dashboard-card-list" id="formfields-sortable">
        <article
          v-for="field in formFieldsView"
          :key="`field-${field.id}`"
          class="dashboard-item-card form-field-card"
          :class="field.enabled ? '' : 'is-disabled'"
          :data-field-id="field.id"
        >
          <div class="dashboard-card-row">
            <span class="drag-handle dashboard-drag-handle">
              <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="drag-handle-icon-sm"><path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60-12a12,12,0,1,0,12,12A12,12,0,0,0,164,48ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z"></path></svg>
            </span>
            <div class="dashboard-card-main">
              <div class="dashboard-card-title">{{ field.label }}</div>
              <div class="form-field-card__chips">
                <span class="dashboard-chip dashboard-chip--info">{{ field.fieldTypeLabel }}</span>
                <span v-if="field.required" class="dashboard-chip dashboard-chip--danger">必填</span>
                <span v-if="!field.enabled" class="dashboard-chip">已停用</span>
              </div>
              <div class="dashboard-code">
                key: {{ field.fieldKey }}<span v-if="field.placeholder">・{{ field.placeholder }}</span>
              </div>
              <div v-if="field.hiddenDeliveryMethodsText" class="dashboard-card-subtitle">
                {{ field.hiddenDeliveryMethodsText }}
              </div>
            </div>
            <div class="dashboard-card-actions">
              <button
                type="button"
                @click="handleToggleFieldEnabled(field.id, field.toggleEnabledValue)"
                class="dashboard-action"
                :class="field.enabled ? '' : 'dashboard-action--success'"
                :title="field.toggleEnabledTitle"
              >
                {{ field.enabled ? "停用" : "啟用" }}
              </button>
              <button
                type="button"
                @click="handleEditFormField(field.id)"
                class="dashboard-action dashboard-action--primary"
                title="編輯"
              >
                編輯
              </button>
              <button
                type="button"
                @click="handleDeleteFormField(field.id)"
                class="dashboard-action dashboard-action--danger"
                title="刪除"
              >
                刪除
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import {
  dashboardFormFieldsActions,
  useDashboardFormFields,
} from "./useDashboardFormFields.ts";
import { useDashboardSession } from "./useDashboardSession.ts";

const { formFieldsView } = useDashboardFormFields();
const { activeTab } = useDashboardSession();
const formFieldsList = ref<HTMLElement | null>(null);

function syncFormFieldsList() {
  dashboardFormFieldsActions.registerFormFieldsListElement(formFieldsList.value);
}

function handleShowAddFieldModal() {
  dashboardFormFieldsActions.showAddFieldModal();
}

function handleToggleFieldEnabled(id: number, enabled: string) {
  dashboardFormFieldsActions.toggleFieldEnabled(id, enabled === "true");
}

function handleEditFormField(id: number) {
  dashboardFormFieldsActions.editFormField(id);
}

function handleDeleteFormField(id: number) {
  dashboardFormFieldsActions.deleteFormField(id);
}

onMounted(syncFormFieldsList);
watch(formFieldsView, syncFormFieldsList, { deep: true });
</script>

<style scoped>
.form-field-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin: 0.45rem 0;
}
</style>
