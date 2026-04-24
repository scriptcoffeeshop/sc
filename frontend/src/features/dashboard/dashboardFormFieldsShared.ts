export type DashboardFormFieldType =
  | "text"
  | "email"
  | "tel"
  | "number"
  | "select"
  | "checkbox"
  | "textarea"
  | "section_title";

export interface DashboardFormField {
  id?: number | string;
  field_key?: string;
  label?: string;
  field_type?: string;
  placeholder?: string;
  required?: boolean;
  enabled?: boolean;
  options?: string | null;
  delivery_visibility?: string | null;
}

export interface DashboardFormFieldViewModel {
  id: number;
  label: string;
  fieldTypeLabel: string;
  required: boolean;
  enabled: boolean;
  fieldKey: string;
  placeholder: string;
  hiddenDeliveryMethodsText: string;
  toggleEnabledValue: string;
  toggleEnabledTitle: string;
  toggleEnabledIcon: string;
}

export const FIELD_TYPE_LABELS: Record<DashboardFormFieldType, string> = {
  text: "文字",
  email: "Email",
  tel: "電話",
  number: "數字",
  select: "下拉選單",
  checkbox: "勾選框",
  textarea: "多行文字",
  section_title: "區塊標題",
};

export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function getHiddenDeliveryMethodsText(
  deliveryVisibility: string | null | undefined,
): string {
  if (!deliveryVisibility) return "";
  try {
    const visibilityConfig = JSON.parse(deliveryVisibility) as Record<
      string,
      boolean
    >;
    const hiddenDeliveryMethods = Object.entries(visibilityConfig)
      .filter(([, visible]) => visible === false)
      .map(([deliveryMethod]) => deliveryMethod);
    if (!hiddenDeliveryMethods.length) return "";
    return `在 ${hiddenDeliveryMethods.join(", ")} 時隱藏`;
  } catch (_error) {
    return "";
  }
}

export function buildFormFieldViewModel(
  field: DashboardFormField,
): DashboardFormFieldViewModel {
  const fieldType = String(field?.field_type || "");
  const enabled = Boolean(field?.enabled);
  return {
    id: Number(field?.id) || 0,
    label: String(field?.label || ""),
    fieldTypeLabel: FIELD_TYPE_LABELS[fieldType as DashboardFormFieldType] ||
      fieldType,
    required: Boolean(field?.required),
    enabled,
    fieldKey: String(field?.field_key || ""),
    placeholder: String(field?.placeholder || ""),
    hiddenDeliveryMethodsText: getHiddenDeliveryMethodsText(
      field?.delivery_visibility,
    ),
    toggleEnabledValue: String(!enabled),
    toggleEnabledTitle: enabled ? "停用" : "啟用",
    toggleEnabledIcon: enabled ? "開" : "關",
  };
}

export function parseFieldOptionsText(options: string | null | undefined): string {
  try {
    return JSON.parse(String(options || "[]")).join(",");
  } catch (_error) {
    return "";
  }
}

export function serializeFieldOptions(rawValue: string): string {
  const normalized = String(rawValue || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return normalized.length ? JSON.stringify(normalized) : "";
}

export function normalizeDeliveryVisibilityValue(
  rawValue: string | null | undefined,
): string | null | undefined {
  if (!rawValue) return rawValue;
  try {
    const visibility = JSON.parse(rawValue) as Record<string, boolean>;
    if (Object.values(visibility).every((value) => value === true)) {
      return null;
    }
  } catch (_error) {
  }
  return rawValue;
}
