import { computed, ref } from "vue";
import type { SessionUser } from "../../types/session";
import type { StorefrontUiSnapshot } from "./storefrontUiSnapshot";

interface StorefrontAuthDeps {
  getStorefrontUiSnapshot?: () => Partial<StorefrontUiSnapshot>;
}

export function getStorefrontUserDisplayName(
  user: SessionUser | null | undefined,
) {
  return String(user?.displayName || user?.display_name || "");
}

export function getStorefrontUserAvatarUrl(
  user: SessionUser | null | undefined,
) {
  return String(
    user?.pictureUrl ||
      user?.picture_url ||
      "https://via.placeholder.com/48",
  );
}

export function useStorefrontAuth(deps: StorefrontAuthDeps = {}) {
  const currentUser = ref<SessionUser | null>(null);
  const userDisplayName = computed(() =>
    getStorefrontUserDisplayName(currentUser.value)
  );
  const userAvatarUrl = computed(() =>
    getStorefrontUserAvatarUrl(currentUser.value)
  );

  function syncAuthState(snapshot: Partial<StorefrontUiSnapshot> = {}) {
    currentUser.value = snapshot.currentUser || null;
  }

  function refreshAuthState() {
    syncAuthState(deps.getStorefrontUiSnapshot?.() || {});
  }

  return {
    currentUser,
    userDisplayName,
    userAvatarUrl,
    syncAuthState,
    refreshAuthState,
  };
}
