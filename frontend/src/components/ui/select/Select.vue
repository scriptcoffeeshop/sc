<script setup>
import { computed, useAttrs } from "vue";
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
const classes = computed(() => cn("ui-input", attrs.class, props.class));
</script>

<template>
  <select v-bind="attrs" :class="classes">
    <slot />
  </select>
</template>
