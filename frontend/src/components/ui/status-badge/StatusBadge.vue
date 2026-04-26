<script setup lang="ts">
import { computed, useAttrs } from "vue";
import type { ClassValue } from "clsx";
import { cn } from "../../../lib/utils.ts";

defineOptions({
  inheritAttrs: false,
});

type StatusBadgeTone =
  | "none"
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info";

const toneClasses: Record<StatusBadgeTone, string> = {
  none: "",
  neutral: "bg-slate-100 text-slate-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
};

const props = withDefaults(
  defineProps<{
    tone?: StatusBadgeTone;
    class?: string;
  }>(),
  {
    tone: "none",
    class: "",
  },
);

const attrs = useAttrs();
const classes = computed(() =>
  cn(
    "ui-status-badge inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold leading-5",
    toneClasses[props.tone],
    attrs.class as ClassValue,
    props.class,
  )
);
</script>

<template>
  <span v-bind="attrs" :class="classes">
    <slot />
  </span>
</template>
