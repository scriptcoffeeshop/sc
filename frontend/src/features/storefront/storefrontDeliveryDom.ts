import { parseJsonArray, parseJsonRecord } from "../../lib/jsonUtils.ts";
import type { StorefrontDeliveryOption } from "./storefrontModels.ts";

export type DeliveryPrefs = Record<string, unknown>;

export type StoreRecord = {
  id: string;
  name: string;
  address: string;
};

type FormControlElement =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function parseDeliveryPrefs(rawPrefs: string | null): DeliveryPrefs {
  return parseJsonRecord(rawPrefs);
}

export function normalizeStoreRecord(value: unknown): StoreRecord {
  const record = asRecord(value);
  return {
    id: String(record.id || ""),
    name: String(record.name || ""),
    address: String(record.address || ""),
  };
}

export function parseDeliveryConfig(value: unknown): StorefrontDeliveryOption[] {
  return parseJsonArray(value) as StorefrontDeliveryOption[];
}

export function getFormControlElement(id: string): FormControlElement | null {
  const element = document.getElementById(id);
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  ) {
    return element;
  }
  return null;
}

export function getFormControlValue(id: string): string {
  return getFormControlElement(id)?.value.trim() || "";
}

export function buildFormBody(data: Record<string, unknown>): URLSearchParams {
  const body = new URLSearchParams();
  Object.entries(data).forEach(([key, value]) => {
    body.set(key, String(value || ""));
  });
  return body;
}
