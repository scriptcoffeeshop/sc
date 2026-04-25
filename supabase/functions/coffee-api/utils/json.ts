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

export function parseJsonText<T = unknown>(text: string): T {
  return JSON.parse(text) as T;
}

export function tryParseJsonArray<T = unknown>(value: unknown): T[] | null {
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  try {
    const parsed = parseJsonText<unknown>(raw);
    return Array.isArray(parsed) ? parsed as T[] : null;
  } catch (_error) {
    return null;
  }
}

export function parseJsonArray<T = unknown>(value: unknown): T[] {
  return tryParseJsonArray<T>(value) ?? [];
}

export function tryParseJsonRecord(value: unknown): JsonRecord | null {
  const directRecord = asJsonRecordOrNull(value);
  if (directRecord) return directRecord;
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  try {
    return asJsonRecordOrNull(parseJsonText<unknown>(raw));
  } catch (_error) {
    return null;
  }
}

export function parseJsonRecord(value: unknown): JsonRecord {
  return tryParseJsonRecord(value) ?? {};
}
