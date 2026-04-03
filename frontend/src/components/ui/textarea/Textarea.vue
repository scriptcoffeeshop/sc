<script setup>
import { computed, useAttrs } from "vue";
import { cn } from "../../../lib/utils.js";

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
  cn("ui-input", "ui-textarea", attrs.class, props.class)
);
</script>

<template>
  <textarea v-bind="attrs" :class="classes">
    <slot />
  </textarea>
</template>
