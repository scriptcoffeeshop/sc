export type JsonRecord = Record<string, unknown>;

export function asJsonRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

export function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const raw = String(value || "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseJsonRecord(value: unknown): JsonRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonRecord;
  }
  const raw = String(value || "").trim();
  if (!raw) return {};
  try {
    return asJsonRecord(JSON.parse(raw));
  } catch {
    return {};
  }
}

