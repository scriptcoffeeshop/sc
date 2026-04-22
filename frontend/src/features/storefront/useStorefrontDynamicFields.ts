import { computed, ref } from "vue";
import type { SessionUser } from "../../types/session";
import type { StorefrontUiSnapshot } from "./storefrontUiSnapshot";

export interface StorefrontDynamicField {
  id?: number | string;
  field_key?: string;
  field_type?: string;
  label?: string;
  placeholder?: string;
  options?: string;
  required?: boolean;
  enabled?: boolean;
  delivery_visibility?: string | null;
  [key: string]: unknown;
}

interface StorefrontDynamicFieldsDeps {
  getStorefrontUiSnapshot?: () => Partial<StorefrontUiSnapshot>;
}

function parseUserCustomDefaults(currentUser: SessionUser | null) {
  const rawDefaults = currentUser?.defaultCustomFields;
  if (!rawDefaults) return {};
  if (typeof rawDefaults === "object" && !Array.isArray(rawDefaults)) {
    return rawDefaults as Record<string, unknown>;
  }
  try {
    const parsed = JSON.parse(String(rawDefaults));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

export function parseDynamicFieldOptions(field: StorefrontDynamicField) {
  try {
    const parsed = JSON.parse(String(field.options || "[]"));
    return Array.isArray(parsed) ? parsed.map((item) => String(item || "")) : [];
  } catch {
    return [];
  }
}

export function isDynamicFieldVisibleForDelivery(
  field: StorefrontDynamicField,
  selectedDelivery: string,
) {
  if (!selectedDelivery || !field.delivery_visibility) return true;
  try {
    const visibility = JSON.parse(String(field.delivery_visibility));
    return visibility?.[selectedDelivery] !== false;
  } catch {
    return true;
  }
}

export function getInitialDynamicFieldValue(
  field: StorefrontDynamicField,
  currentUser: SessionUser | null,
) {
  const key = String(field.field_key || "");
  if (!key || !currentUser) return "";
  if (key === "phone") return String(currentUser.phone || "");
  if (key === "email") return String(currentUser.email || "");
  const customDefaults = parseUserCustomDefaults(currentUser);
  return String(customDefaults[key] || "");
}

export function useStorefrontDynamicFields(
  deps: StorefrontDynamicFieldsDeps = {},
) {
  const formFields = ref<StorefrontDynamicField[]>([]);
  const currentUser = ref<SessionUser | null>(null);
  const selectedDelivery = ref("");

  const visibleFormFields = computed(() =>
    formFields.value
      .filter((field) => field.enabled !== false)
      .filter((field) =>
        isDynamicFieldVisibleForDelivery(field, selectedDelivery.value)
      )
  );

  function syncDynamicFieldsState(snapshot: Partial<StorefrontUiSnapshot> = {}) {
    formFields.value = Array.isArray(snapshot.formFields)
      ? snapshot.formFields
      : [];
    currentUser.value = snapshot.currentUser || null;
    selectedDelivery.value = String(snapshot.selectedDelivery || "");
  }

  function refreshDynamicFieldsState() {
    syncDynamicFieldsState(deps.getStorefrontUiSnapshot?.() || {});
  }

  return {
    formFields,
    currentUser,
    selectedDelivery,
    visibleFormFields,
    syncDynamicFieldsState,
    refreshDynamicFieldsState,
  };
}
