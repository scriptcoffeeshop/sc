<template>
  <div id="promotions-section" v-show="activeTab === 'promotions'" class="glass-card dashboard-panel">
    <div class="dashboard-section-header">
      <div>
        <h2 class="dashboard-section-title">
          促銷活動管理
        </h2>
        <p class="dashboard-section-hint">
          管理優惠條件、折扣與啟用狀態，可拖曳活動卡片調整前台套用順序。
        </p>
      </div>
      <button
        type="button"
        @click="handleShowPromotionModal"
        class="btn-primary text-sm"
      >
        + 新增活動
      </button>
    </div>

    <div
      ref="promotionsTable"
      id="promotions-table"
      class="dashboard-card-list promotions-list"
    >
      <p v-if="promotionsView.length === 0" class="dashboard-empty-state">
        尚無活動
      </p>
      <template v-else>
        <article
          v-for="promotion in promotionsView"
          :key="`promotion-${promotion.id}`"
          class="dashboard-item-card promotion-card"
          :data-id="promotion.id"
        >
          <div class="dashboard-card-row">
            <span
              class="drag-handle-promo dashboard-drag-handle"
              title="拖曳排序"
              aria-label="拖曳排序"
            ><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="drag-handle-icon"><path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60-12a12,12,0,1,0,12,12A12,12,0,0,0,164,48ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z"></path></svg></span>
            <div class="dashboard-card-main">
              <div class="dashboard-card-title">{{ promotion.name }}</div>
              <div class="dashboard-card-subtitle">
                {{ promotion.conditionText }}
                <span class="promotion-card__discount">{{ promotion.discountText }}</span>
              </div>
            </div>
            <div class="dashboard-card-actions">
              <button
                type="button"
                @click="handleTogglePromotionEnabled(promotion.id, !promotion.enabled)"
                class="dashboard-action"
                :class="promotion.enabled ? 'dashboard-action--success' : ''"
              >
                {{ promotion.statusLabel }}
              </button>
              <button
                type="button"
                @click="handleEditPromotion(promotion.id)"
                class="dashboard-action dashboard-action--primary"
              >
                編輯
              </button>
              <button
                type="button"
                @click="handleDeletePromotion(promotion.id)"
                class="dashboard-action dashboard-action--danger"
              >
                刪除
              </button>
            </div>
          </div>
        </article>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import {
  dashboardPromotionsActions,
  useDashboardPromotions,
} from "./useDashboardPromotions.ts";
import { useDashboardSession } from "./useDashboardSession.ts";

const { promotionsView } = useDashboardPromotions();
const { activeTab } = useDashboardSession();
const promotionsTable = ref<HTMLElement | null>(null);

function syncPromotionsTable() {
  dashboardPromotionsActions.registerPromotionsTableElement(
    promotionsTable.value,
  );
}

function handleShowPromotionModal() {
  dashboardPromotionsActions.showPromotionModal();
}

function handleTogglePromotionEnabled(id: number | string, enabled: boolean) {
  dashboardPromotionsActions.togglePromotionEnabled(id, enabled);
}

function handleEditPromotion(id: number | string) {
  dashboardPromotionsActions.editPromotion(id);
}

function handleDeletePromotion(id: number | string) {
  dashboardPromotionsActions.delPromotion(id);
}

onMounted(syncPromotionsTable);
watch(promotionsView, syncPromotionsTable, { deep: true });
</script>

<style scoped>
.promotion-card__discount {
  color: #dc322f;
  font-weight: 900;
}
</style>
