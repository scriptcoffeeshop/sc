export interface JsonRecord {
  [key: string]: unknown;
}

export function asJsonRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function asJsonRecordOrNull(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

export function tryParseJsonArray(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch (_error) {
    return null;
  }
}

export function parseJsonArray(value: unknown): unknown[] {
  return tryParseJsonArray(value) ?? [];
}

export function tryParseJsonRecord(value: unknown): JsonRecord | null {
  const directRecord = asJsonRecordOrNull(value);
  if (directRecord) return directRecord;
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    return asJsonRecordOrNull(JSON.parse(raw));
  } catch (_error) {
    return null;
  }
}

export function parseJsonRecord(value: unknown): JsonRecord {
  return tryParseJsonRecord(value) ?? {};
}
