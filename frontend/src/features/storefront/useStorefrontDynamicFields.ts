import { computed, ref } from "vue";
import { parseJsonArray, parseJsonRecord } from "../../lib/jsonUtils.ts";
import type { SessionUser } from "../../types/session";
import type {
  StorefrontDynamicField,
  StorefrontDynamicFieldValues,
} from "../../types/storefront";
import type { StorefrontUiSnapshot } from "./storefrontUiSnapshot";
import {
  buildInitialDynamicFieldValues,
  getInitialDynamicFieldValue,
  getStorefrontDynamicFieldValues,
  replaceStorefrontDynamicFieldValues,
  setStorefrontDynamicFieldValue,
} from "./storefrontDynamicFieldValues.ts";

interface StorefrontDynamicFieldsDeps {
  getStorefrontUiSnapshot?: () => Partial<StorefrontUiSnapshot>;
}

export function parseDynamicFieldOptions(field: StorefrontDynamicField) {
  return parseJsonArray(field.options).map((item) => String(item || ""));
}

export function isDynamicFieldVisibleForDelivery(
  field: StorefrontDynamicField,
  selectedDelivery: string,
) {
  if (!selectedDelivery || !field.delivery_visibility) return true;
  const visibility = parseJsonRecord(field.delivery_visibility);
  return visibility[selectedDelivery] !== false;
}

export { getInitialDynamicFieldValue };

export interface StorefrontDynamicFieldValuesEvent extends Event {
  detail?: StorefrontDynamicFieldValues;
}

export function useStorefrontDynamicFields(
  deps: StorefrontDynamicFieldsDeps = {},
) {
  const formFields = ref<StorefrontDynamicField[]>([]);
  const currentUser = ref<SessionUser | null>(null);
  const selectedDelivery = ref("");
  const fieldValues = ref<StorefrontDynamicFieldValues>(
    getStorefrontDynamicFieldValues(),
  );
  let lastUserId = "";

  const visibleFormFields = computed(() =>
    formFields.value
      .filter((field) => field.enabled !== false)
      .filter((field) =>
        isDynamicFieldVisibleForDelivery(field, selectedDelivery.value)
      )
  );

  function syncDynamicFieldsState(snapshot: Partial<StorefrontUiSnapshot> = {}) {
    const nextFields = Array.isArray(snapshot.formFields)
      ? snapshot.formFields
      : [];
    const nextUser = snapshot.currentUser || null;
    const nextUserId = String(nextUser?.userId || "");
    const resetDefaults = nextUserId !== lastUserId;
    lastUserId = nextUserId;
    formFields.value = nextFields;
    currentUser.value = nextUser;
    selectedDelivery.value = String(snapshot.selectedDelivery || "");
    const defaults = buildInitialDynamicFieldValues(nextFields, nextUser);
    const existing = resetDefaults ? {} : fieldValues.value;
    const nextValues: StorefrontDynamicFieldValues = {};

    for (const field of nextFields) {
      const key = String(field?.field_key || "");
      if (
        !key ||
        field?.field_type === "section_title" ||
        field?.enabled === false ||
        !isDynamicFieldVisibleForDelivery(field, selectedDelivery.value)
      ) continue;
      nextValues[key] = Object.prototype.hasOwnProperty.call(existing, key)
        ? String(existing[key] || "")
        : String(defaults[key] || "");
    }

    fieldValues.value = replaceStorefrontDynamicFieldValues(nextValues);
  }

  function refreshDynamicFieldsState() {
    syncDynamicFieldsState(deps.getStorefrontUiSnapshot?.() || {});
  }

  function updateDynamicFieldValue(fieldKey: string, value: string) {
    fieldValues.value = setStorefrontDynamicFieldValue(fieldKey, value);
  }

  function handleDynamicFieldValuesUpdated(event: Event) {
    const detail = (event as StorefrontDynamicFieldValuesEvent).detail || {};
    const nextValues: StorefrontDynamicFieldValues = { ...fieldValues.value };
    for (const field of visibleFormFields.value) {
      const key = String(field?.field_key || "");
      if (!key || !Object.prototype.hasOwnProperty.call(detail, key)) continue;
      nextValues[key] = String(detail[key] || "");
    }
    fieldValues.value = replaceStorefrontDynamicFieldValues(nextValues);
  }

  return {
    formFields,
    currentUser,
    selectedDelivery,
    fieldValues,
    visibleFormFields,
    syncDynamicFieldsState,
    refreshDynamicFieldsState,
    updateDynamicFieldValue,
    handleDynamicFieldValuesUpdated,
  };
}
