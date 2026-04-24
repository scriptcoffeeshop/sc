<script setup lang="ts">
import { computed, useAttrs } from "vue";
import type { ClassValue } from "clsx";
import { cn } from "../../../lib/utils.ts";

defineOptions({
  inheritAttrs: false,
});

const props = defineProps({
  class: {
    type: String,
    default: "",
  },
});

const attrs = useAttrs();
const classes = computed(() =>
  cn("ui-input", attrs.class as ClassValue, props.class)
);
</script>

<template>
  <input v-bind="attrs" :class="classes">
</template>
