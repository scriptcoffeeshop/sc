import { parseJsonRecord } from "../../lib/jsonUtils.ts";
import type { SessionUser } from "../../types/session";
import type { StorefrontDynamicField } from "./useStorefrontDynamicFields";

export type StorefrontDynamicFieldValues = Record<string, string>;

const dynamicFieldValues: StorefrontDynamicFieldValues = {};

function parseUserCustomDefaults(currentUser: SessionUser | null) {
  const rawDefaults = currentUser?.defaultCustomFields;
  if (!rawDefaults) return {};
  return parseJsonRecord(rawDefaults);
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

export function buildInitialDynamicFieldValues(
  fields: StorefrontDynamicField[],
  currentUser: SessionUser | null,
): StorefrontDynamicFieldValues {
  const values: StorefrontDynamicFieldValues = {};
  for (const field of fields || []) {
    const key = String(field?.field_key || "");
    if (!key || field?.field_type === "section_title") continue;
    values[key] = getInitialDynamicFieldValue(field, currentUser);
  }
  return values;
}

export function getStorefrontDynamicFieldValues(): StorefrontDynamicFieldValues {
  return { ...dynamicFieldValues };
}

export function replaceStorefrontDynamicFieldValues(
  values: StorefrontDynamicFieldValues,
) {
  for (const key of Object.keys(dynamicFieldValues)) {
    delete dynamicFieldValues[key];
  }
  for (const [key, value] of Object.entries(values || {})) {
    dynamicFieldValues[key] = String(value || "");
  }
  return getStorefrontDynamicFieldValues();
}

export function setStorefrontDynamicFieldValue(
  fieldKey: string,
  value: string,
) {
  const key = String(fieldKey || "");
  if (!key) return getStorefrontDynamicFieldValues();
  dynamicFieldValues[key] = String(value || "");
  return getStorefrontDynamicFieldValues();
}

export function emitStorefrontDynamicFieldValuesUpdated(
  values: StorefrontDynamicFieldValues,
) {
  const detail = replaceStorefrontDynamicFieldValues(values);
  if (typeof window === "undefined") return detail;
  window.dispatchEvent(
    new CustomEvent("coffee:dynamic-field-values-updated", { detail }),
  );
  return detail;
}
