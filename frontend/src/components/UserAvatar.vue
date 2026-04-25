<template>
  <span
    class="user-avatar"
    :class="sizeClass"
    :aria-label="name || '會員頭像'"
  >
    <img
      v-if="canShowImage"
      :src="src"
      :alt="name || '會員頭像'"
      class="user-avatar__image"
      @error="hasImageError = true"
    >
    <span v-else class="user-avatar__fallback" aria-hidden="true">
      <UserRound class="user-avatar__icon" />
      <span v-if="initials" class="user-avatar__initials">{{ initials }}</span>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { UserRound } from "lucide-vue-next";

const props = withDefaults(defineProps<{
  src?: string;
  name?: string;
  size?: "sm" | "md" | "lg";
}>(), {
  src: "",
  name: "",
  size: "md",
});

const hasImageError = ref(false);

watch(() => props.src, () => {
  hasImageError.value = false;
});

const canShowImage = computed(() =>
  Boolean(String(props.src || "").trim()) && !hasImageError.value
);

const initials = computed(() => {
  const text = String(props.name || "").trim();
  if (!text) return "";
  return Array.from(text).slice(0, 2).join("");
});

const sizeClass = computed(() => `user-avatar--${props.size}`);
</script>

<style scoped>
.user-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: 999px;
  overflow: hidden;
  border: 2px solid color-mix(in srgb, var(--primary) 18%, #d7cbbb);
  background: #fffdf8;
}

.user-avatar--sm {
  width: 2.5rem;
  height: 2.5rem;
}

.user-avatar--md {
  width: 3rem;
  height: 3rem;
}

.user-avatar--lg {
  width: 3.5rem;
  height: 3.5rem;
}

.user-avatar__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-avatar__fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  position: relative;
  color: #344256;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.92), rgba(238, 232, 220, 0.74)),
    radial-gradient(circle at 50% 34%, rgba(60, 36, 21, 0.12), transparent 38%);
}

.user-avatar__icon {
  width: 58%;
  height: 58%;
  stroke-width: 1.7;
}

.user-avatar__initials {
  position: absolute;
  bottom: 0.18rem;
  left: 50%;
  transform: translateX(-50%);
  max-width: 90%;
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 1;
  color: var(--primary);
  white-space: nowrap;
}
</style>
