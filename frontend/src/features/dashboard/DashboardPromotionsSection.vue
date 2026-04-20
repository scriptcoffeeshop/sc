<template>
  <div id="promotions-section" v-show="activeTab === 'promotions'" class="glass-card p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-bold ui-text-highlight">
        促銷活動管理
      </h2>
      <button
        type="button"
        @click="handleShowPromotionModal"
        class="btn-primary text-sm"
      >
        + 新增活動
      </button>
    </div>
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b-2 ui-border">
            <th class="p-3 text-left w-10 text-center ui-text-highlight">
              排序
            </th>
            <th class="p-3 text-left ui-text-highlight">
              活動名稱
            </th>
            <th class="p-3 text-left ui-text-highlight">
              條件與折扣
            </th>
            <th class="p-3 text-center w-24 ui-text-highlight">
              狀態
            </th>
            <th class="p-3 text-right w-32 ui-text-highlight">
              操作
            </th>
          </tr>
        </thead>
        <tbody
          ref="promotionsTable"
          id="promotions-table"
          class="sortable-tbody"
        >
          <tr v-if="promotionsView.length === 0">
            <td colspan="5" class="text-center py-8 ui-text-subtle">
              尚無活動
            </td>
          </tr>
          <template v-else>
            <tr
              v-for="promotion in promotionsView"
              :key="`promotion-${promotion.id}`"
              class="border-b"
              style="border-color:#f0e6db;"
              :data-id="promotion.id"
            >
              <td class="p-3 text-center">
                <span
                  class="drag-handle-promo cursor-move ui-text-muted hover:text-amber-700 text-xl font-bold select-none px-2 inline-block"
                  title="拖曳排序"
                  style="touch-action: none;"
                ><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="drag-handle-icon"><path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60-12a12,12,0,1,0,12,12A12,12,0,0,0,164,48ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z"></path></svg></span>
              </td>
              <td class="p-3 font-medium">{{ promotion.name }}</td>
              <td class="p-3 text-sm ui-text-strong">
                {{ promotion.conditionText }} <span class="font-bold ui-text-danger">{{ promotion.discountText }}</span>
              </td>
              <td class="p-3 text-center">
                <button
                  type="button"
                  @click="handleTogglePromotionEnabled(promotion.id, !promotion.enabled)"
                  class="text-sm font-medium hover:underline"
                  :class="promotion.statusClass"
                >
                  {{ promotion.statusLabel }}
                </button>
              </td>
              <td class="p-3 text-right">
                <button
                  type="button"
                  @click="handleEditPromotion(promotion.id)"
                  class="text-sm mr-2"
                  style="color:var(--primary)"
                >
                  編輯
                </button>
                <button
                  type="button"
                  @click="handleDeletePromotion(promotion.id)"
                  class="text-sm ui-text-danger"
                >
                  刪除
                </button>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from "vue";
import {
  dashboardPromotionsActions,
  useDashboardPromotions,
} from "./useDashboardPromotions.js";
import { useDashboardSession } from "./useDashboardSession.js";

const { promotionsView } = useDashboardPromotions();
const { activeTab } = useDashboardSession();
const promotionsTable = ref(null);

function syncPromotionsTable() {
  dashboardPromotionsActions.registerPromotionsTableElement(
    promotionsTable.value,
  );
}

function handleShowPromotionModal() {
  dashboardPromotionsActions.showPromotionModal();
}

function handleTogglePromotionEnabled(id, enabled) {
  dashboardPromotionsActions.togglePromotionEnabled(id, enabled);
}

function handleEditPromotion(id) {
  dashboardPromotionsActions.editPromotion(id);
}

function handleDeletePromotion(id) {
  dashboardPromotionsActions.delPromotion(id);
}

onMounted(syncPromotionsTable);
watch(promotionsView, syncPromotionsTable, { deep: true });
</script>
