import {
  asJsonRecord,
  parseJsonArray,
  parseJsonRecord,
} from "../../lib/jsonUtils.ts";
import {
  normalizeStorefrontDeliveryOption,
  type StorefrontDeliveryOption,
} from "./storefrontModels.ts";

export interface DeliveryPrefs {
  method?: unknown;
  city?: unknown;
  district?: unknown;
  address?: unknown;
  companyOrBuilding?: unknown;
  storeId?: unknown;
  storeName?: unknown;
  storeAddress?: unknown;
  [key: string]: unknown;
}

export type StoreRecord = {
  id: string;
  name: string;
  address: string;
};

export function parseDeliveryPrefs(rawPrefs: string | null): DeliveryPrefs {
  return parseJsonRecord(rawPrefs);
}

export function normalizeStoreRecord(value: unknown): StoreRecord {
  const record = asJsonRecord(value);
  return {
    id: String(record["id"] || ""),
    name: String(record["name"] || ""),
    address: String(record["address"] || ""),
  };
}

export function parseDeliveryConfig(value: unknown): StorefrontDeliveryOption[] {
  return parseJsonArray(value).map((option) =>
    normalizeStorefrontDeliveryOption(asJsonRecord(option))
  );
}

export function buildFormBody(data: { [key: string]: unknown }): URLSearchParams {
  const body = new URLSearchParams();
  Object.entries(data).forEach(([key, value]) => {
    body.set(key, String(value || ""));
  });
  return body;
}
