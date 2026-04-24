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
  modelValue: {
    type: String,
    default: "",
  },
});
const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const attrs = useAttrs();
const classes = computed(() =>
  cn("ui-input", "ui-textarea", attrs.class as ClassValue, props.class)
);

function handleInput(event: Event) {
  const target = event.target instanceof HTMLTextAreaElement
    ? event.target
    : null;
  emit("update:modelValue", target?.value || "");
}
</script>

<template>
  <textarea
    v-bind="attrs"
    :value="modelValue"
    :class="classes"
    @input="handleInput"
  ></textarea>
</template>
