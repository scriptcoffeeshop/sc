import { computed, ref } from "vue";
import type { DashboardSettingsRecord } from "../../types/settings";
import type { StorefrontUiSnapshot } from "./storefrontUiSnapshot";

interface StorefrontAnnouncementDeps {
  getStorefrontUiSnapshot?: () => Partial<StorefrontUiSnapshot>;
}

function normalizeAnnouncementText(value: unknown) {
  return String(value || "").replace(/\\n/g, "\n").trim();
}

function isAnnouncementEnabled(settings: DashboardSettingsRecord = {}) {
  return String(settings["announcement_enabled"] || "") === "true";
}

export function useStorefrontAnnouncement(
  deps: StorefrontAnnouncementDeps = {},
) {
  const announcementText = ref("");
  const dismissedText = ref("");

  const isAnnouncementVisible = computed(() =>
    Boolean(announcementText.value) &&
    announcementText.value !== dismissedText.value
  );

  function syncAnnouncementState(snapshot: Partial<StorefrontUiSnapshot> = {}) {
    const settings = snapshot.settings || {};
    announcementText.value = isAnnouncementEnabled(settings)
      ? normalizeAnnouncementText(settings["announcement"])
      : "";
  }

  function refreshAnnouncementState() {
    syncAnnouncementState(deps.getStorefrontUiSnapshot?.() || {});
  }

  function closeAnnouncement() {
    dismissedText.value = announcementText.value;
  }

  return {
    announcementText,
    isAnnouncementVisible,
    closeAnnouncement,
    syncAnnouncementState,
    refreshAnnouncementState,
  };
}
