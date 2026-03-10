<template>
  <div class="legacy-page-root" v-html="legacyBodyHtml"></div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";

const props = defineProps({
  legacyPage: {
    type: String,
    required: true,
  },
  onReady: {
    type: Function,
    default: null,
  },
});

const legacyBodyHtml = ref(
  '<p class="p-6 text-center text-gray-500">Loading legacy page...</p>',
);
const originalBodyClass = document.body.className;
const injectedHeadNodes = [];

function getLegacyPageUrl(pageName) {
  return `${import.meta.env.BASE_URL}legacy/${pageName}`;
}

function stripBodyScripts(bodyElement) {
  bodyElement.querySelectorAll("script").forEach((node) => node.remove());
}

function injectLegacyHeadStyles(legacyHead) {
  legacyHead.querySelectorAll("style").forEach((styleNode) => {
    const cloned = document.createElement("style");
    cloned.textContent = styleNode.textContent || "";
    cloned.setAttribute("data-legacy-style", "true");
    document.head.appendChild(cloned);
    injectedHeadNodes.push(cloned);
  });
}

onMounted(async () => {
  try {
    const response = await fetch(getLegacyPageUrl(props.legacyPage), {
      cache: "no-cache",
    });
    if (!response.ok) {
      throw new Error(
        `Failed to load ${props.legacyPage}: HTTP ${response.status}`,
      );
    }

    const legacyHtml = await response.text();
    const parser = new DOMParser();
    const legacyDocument = parser.parseFromString(legacyHtml, "text/html");
    const legacyBody = legacyDocument.body;

    document.title = legacyDocument.title || document.title;
    if (legacyBody.className) {
      document.body.className = legacyBody.className;
    }
    injectLegacyHeadStyles(legacyDocument.head);
    stripBodyScripts(legacyBody);
    legacyBodyHtml.value = legacyBody.innerHTML;

    await nextTick();
    if (typeof props.onReady === "function") {
      await props.onReady();
    }
  } catch (error) {
    console.error("[LegacyPage] bootstrap failed:", error);
    legacyBodyHtml.value =
      '<div class="p-6"><p class="text-red-600 font-semibold">Legacy page load failed.</p></div>';
  }
});

onBeforeUnmount(() => {
  injectedHeadNodes.forEach((node) => node.remove());
  document.body.className = originalBodyClass;
});
</script>

<style scoped>
.legacy-page-root {
  min-height: 100vh;
}
</style>
