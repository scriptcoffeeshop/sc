import { asJsonRecord, type JsonRecord, tryParseJsonRecord } from "./json.ts";

export interface ReceiptInfo {
  buyer: string;
  taxId: string;
  address: string;
  needDateStamp: boolean;
}

function toTrimmedString(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

export function normalizeReceiptInfo(raw: unknown): ReceiptInfo | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const data = asJsonRecord(raw);
  const buyer = toTrimmedString(data.buyer);
  const taxId = toTrimmedString(data.taxId);
  const address = toTrimmedString(data.address);
  const needDateStamp = Boolean(data.needDateStamp);

  if (taxId && !/^\d{8}$/.test(taxId)) return null;

  return { buyer, taxId, address, needDateStamp };
}

export function parseReceiptInfo(raw: unknown): ReceiptInfo | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "string") {
    const str = raw.trim();
    if (!str) return null;
    return normalizeReceiptInfo(tryParseJsonRecord(str));
  }
  return normalizeReceiptInfo(raw);
}

export function parseReceiptInfoRecord(raw: unknown): JsonRecord | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    const value = raw.trim();
    if (!value) return null;
    return tryParseJsonRecord(value);
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return asJsonRecord(raw);
  }
  return null;
}

export function stringifyReceiptInfo(value: unknown): string {
  if (value === undefined || value === null) return "";

  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return "";
    const parsed = tryParseJsonRecord(raw);
    return parsed ? JSON.stringify(parsed) : "";
  }

  const normalized = normalizeReceiptInfo(value);
  return normalized ? JSON.stringify(normalized) : "";
}
