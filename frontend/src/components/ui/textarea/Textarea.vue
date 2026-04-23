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
  modelValue: {
    type: String,
    default: "",
  },
});
const emit = defineEmits(["update:modelValue"]);

const attrs = useAttrs();
const classes = computed(() =>
  cn("ui-input", "ui-textarea", attrs.class, props.class)
);

function handleInput(event) {
  emit("update:modelValue", event?.target?.value || "");
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
