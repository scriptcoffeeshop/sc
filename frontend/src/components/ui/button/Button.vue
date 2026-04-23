<script setup>
import { computed, useAttrs } from "vue";
import { cva } from "class-variance-authority";
import { cn } from "../../../lib/utils.ts";

defineOptions({
  inheritAttrs: false,
});

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[var(--ui-primary)] text-white hover:bg-[var(--ui-primary-strong)]",
        secondary:
          "bg-[var(--ui-muted)] text-[var(--ui-text)] hover:bg-[var(--ui-border)]",
        outline:
          "border border-[var(--ui-border)] bg-white text-[var(--ui-text)] hover:bg-[var(--ui-muted)]",
        ghost: "text-[var(--ui-text)] hover:bg-[var(--ui-muted)]",
        danger: "bg-[#b42318] text-white hover:bg-[#912018]",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-11 px-6 text-base",
        icon: "h-9 w-9 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const props = defineProps({
  variant: {
    type: String,
    default: "default",
  },
  size: {
    type: String,
    default: "default",
  },
  type: {
    type: String,
    default: "button",
  },
  class: {
    type: String,
    default: "",
  },
});

const attrs = useAttrs();
const classes = computed(() =>
  cn(
    buttonVariants({ variant: props.variant, size: props.size }),
    attrs.class,
    props.class,
  )
);
</script>

<template>
  <button v-bind="attrs" :type="type" :class="classes">
    <slot />
  </button>
</template>
