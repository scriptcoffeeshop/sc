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
const classes = computed(() => cn("ui-card", attrs.class, props.class));
</script>

<template>
  <section v-bind="attrs" :class="classes">
    <slot />
  </section>
</template>
