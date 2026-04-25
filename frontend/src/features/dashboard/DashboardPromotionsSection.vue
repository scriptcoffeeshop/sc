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
          :class="{ 'is-disabled': !promotion.enabled }"
          :data-id="promotion.id"
        >
          <div class="dashboard-card-row promotion-card__row">
            <span
              class="drag-handle-promo dashboard-drag-handle"
              title="拖曳排序"
              aria-label="拖曳排序"
            ><svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="drag-handle-icon"><path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60-12a12,12,0,1,0,12,12A12,12,0,0,0,164,48ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z"></path></svg></span>
            <div class="dashboard-card-main">
              <div class="promotion-card__headline">
                <div class="dashboard-card-title">{{ promotion.name }}</div>
                <span
                  class="promotion-card__status"
                  :class="promotion.enabled ? 'promotion-card__status--enabled' : ''"
                >
                  {{ promotion.statusLabel }}
                </span>
              </div>
              <div class="promotion-card__summary">
                {{ promotion.conditionText }} {{ promotion.discountText }}
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
.promotion-card {
  border-left: 4px solid #268BD2;
}

.promotion-card.is-disabled {
  border-left-color: #93A1A1;
}

.promotion-card__row {
  align-items: center;
}

.promotion-card__headline {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  justify-content: space-between;
}

.promotion-card__summary {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
  width: fit-content;
  max-width: 100%;
  margin-top: 0.45rem;
  padding: 0.35rem 0.55rem;
  border-radius: 8px;
  background: rgba(38, 139, 210, 0.1);
  color: #073642;
  font-size: 0.84rem;
  font-weight: 900;
  line-height: 1.35;
  word-break: break-word;
}

.promotion-card__status {
  flex: 0 0 auto;
  border-radius: 999px;
  background: #EEE8D5;
  color: #657B83;
  padding: 0.22rem 0.55rem;
  font-size: 0.76rem;
  font-weight: 900;
  line-height: 1.25;
}

.promotion-card__status--enabled {
  background: rgba(133, 153, 0, 0.12);
  color: #859900;
}

@media (max-width: 639px) {
  .promotion-card__headline {
    display: grid;
    justify-content: stretch;
  }

  .promotion-card__status {
    width: fit-content;
  }
}
</style>
