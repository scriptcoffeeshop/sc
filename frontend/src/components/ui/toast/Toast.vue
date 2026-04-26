<script setup lang="ts">
import { computed } from "vue";

type ToastTone = "success" | "info" | "warning" | "danger";

const toneClasses: Record<ToastTone, string> = {
  success: "ui-toast--success",
  info: "ui-toast--info",
  warning: "ui-toast--warning",
  danger: "ui-toast--danger",
};

const props = withDefaults(
  defineProps<{
    open?: boolean;
    title?: string;
    message?: string;
    tone?: ToastTone;
  }>(),
  {
    open: false,
    title: "",
    message: "",
    tone: "info",
  },
);

const classes = computed(() => ["ui-toast", toneClasses[props.tone]]);
</script>

<template>
  <div
    v-if="open"
    :class="classes"
    :role="tone === 'danger' ? 'alert' : 'status'"
    aria-live="polite"
  >
    <div v-if="title" class="ui-toast__title">{{ title }}</div>
    <div v-if="message" class="ui-toast__message">{{ message }}</div>
  </div>
</template>

<style scoped>
.ui-toast {
  min-width: min(20rem, calc(100vw - 2rem));
  max-width: 26rem;
  padding: 0.85rem 1rem;
  border: 1px solid transparent;
  border-radius: 0.5rem;
  background: #ffffff;
  color: #1f2937;
  box-shadow: 0 12px 28px rgb(42 31 24 / 12%);
}

.ui-toast__title {
  font-size: 0.92rem;
  font-weight: 800;
  line-height: 1.35;
}

.ui-toast__message {
  margin-top: 0.2rem;
  color: #4b5563;
  font-size: 0.82rem;
  line-height: 1.45;
}

.ui-toast--success {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.ui-toast--info {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.ui-toast--warning {
  border-color: #fde68a;
  background: #fffbeb;
}

.ui-toast--danger {
  border-color: #fecaca;
  background: #fef2f2;
}
</style>
