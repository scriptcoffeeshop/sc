import { isValidEmail } from "../../lib/sharedUtils.ts";
import type {
  StorefrontDynamicField,
  StorefrontDynamicFieldValues,
} from "../../types/storefront";

export interface CollectDynamicFieldsResult {
  valid: boolean;
  data: Record<string, string>;
  error: string;
}

export function collectDynamicFields(
  fields: StorefrontDynamicField[] = [],
  values: Partial<StorefrontDynamicFieldValues> = {},
): CollectDynamicFieldsResult {
  const data: Record<string, string> = {};

  for (const field of fields) {
    if (field.field_type === "section_title") continue;
    if (field.enabled === false) continue;

    const fieldKey = String(field.field_key || "");
    if (!fieldKey || !Object.prototype.hasOwnProperty.call(values, fieldKey)) {
      continue;
    }

    const value = field.field_type === "checkbox"
      ? values[fieldKey] === "是" || values[fieldKey] === "true"
        ? "是"
        : "否"
      : String(values[fieldKey] || "").trim();

    if (field.required && !value) {
      return {
        valid: false,
        data: {},
        error: `請填寫「${String(field.label || "").trim()}」`,
      };
    }

    if (field.field_type === "email" && value && !isValidEmail(value)) {
      return {
        valid: false,
        data: {},
        error: `「${String(field.label || "").trim()}」格式不正確`,
      };
    }

    data[fieldKey] = value;
  }

  return { valid: true, data, error: "" };
}
