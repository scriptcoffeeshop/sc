<script setup lang="ts">
withDefaults(
  defineProps<{
    open?: boolean;
    label?: string;
  }>(),
  {
    open: false,
    label: "載入中",
  },
);
</script>

<template>
  <div
    v-if="open"
    class="ui-loading-overlay"
    role="status"
    aria-live="polite"
    :aria-label="label"
  >
    <div class="ui-loading-overlay__surface">
      <span class="ui-loading-overlay__spinner" aria-hidden="true"></span>
      <span class="ui-loading-overlay__label">{{ label }}</span>
    </div>
  </div>
</template>

<style scoped>
.ui-loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  background: rgb(255 255 255 / 72%);
  backdrop-filter: blur(1px);
}

.ui-loading-overlay__surface {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  min-height: 2.75rem;
  padding: 0.7rem 1rem;
  border: 1px solid #e1d6c7;
  border-radius: 0.5rem;
  background: #fffdf8;
  color: #3c2415;
  font-size: 0.9rem;
  font-weight: 700;
  box-shadow: 0 10px 26px rgb(42 31 24 / 10%);
}

.ui-loading-overlay__spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid #d8c7b8;
  border-top-color: #3c2415;
  border-radius: 999px;
  animation: ui-loading-overlay-spin 0.8s linear infinite;
}

@keyframes ui-loading-overlay-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
