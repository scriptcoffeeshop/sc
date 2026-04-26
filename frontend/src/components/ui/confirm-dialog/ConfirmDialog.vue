<script setup lang="ts">
import UiButton from "../button/Button.vue";

type ConfirmDialogVariant = "default" | "danger";

withDefaults(
  defineProps<{
    open?: boolean;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmDialogVariant;
  }>(),
  {
    open: false,
    title: "確認操作",
    message: "",
    confirmText: "確認",
    cancelText: "取消",
    variant: "default",
  },
);

const emit = defineEmits<{
  confirm: [];
  cancel: [];
  "update:open": [open: boolean];
}>();

function cancel() {
  emit("cancel");
  emit("update:open", false);
}

function confirm() {
  emit("confirm");
}
</script>

<template>
  <div
    v-if="open"
    class="ui-confirm-dialog"
    role="dialog"
    aria-modal="true"
    :aria-label="title"
  >
    <div class="ui-confirm-dialog__backdrop" @click="cancel"></div>
    <section class="ui-confirm-dialog__panel">
      <h2 class="ui-confirm-dialog__title">{{ title }}</h2>
      <p v-if="message" class="ui-confirm-dialog__message">{{ message }}</p>
      <div class="ui-confirm-dialog__actions">
        <UiButton variant="outline" @click="cancel">
          {{ cancelText }}
        </UiButton>
        <UiButton :variant="variant === 'danger' ? 'danger' : 'default'" @click="confirm">
          {{ confirmText }}
        </UiButton>
      </div>
    </section>
  </div>
</template>

<style scoped>
.ui-confirm-dialog {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.ui-confirm-dialog__backdrop {
  position: absolute;
  inset: 0;
  background: rgb(17 24 39 / 45%);
}

.ui-confirm-dialog__panel {
  position: relative;
  width: min(100%, 28rem);
  padding: 1.15rem;
  border: 1px solid #e1d6c7;
  border-radius: 0.5rem;
  background: #ffffff;
  box-shadow: 0 18px 44px rgb(42 31 24 / 18%);
}

.ui-confirm-dialog__title {
  margin: 0;
  color: #3c2415;
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.35;
}

.ui-confirm-dialog__message {
  margin: 0.45rem 0 0;
  color: #4b5563;
  font-size: 0.9rem;
  line-height: 1.55;
}

.ui-confirm-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 1rem;
}

@media (max-width: 430px) {
  .ui-confirm-dialog__actions {
    display: grid;
  }
}
</style>
