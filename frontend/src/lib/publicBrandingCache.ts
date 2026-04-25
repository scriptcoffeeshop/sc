export interface PublicBrandingCacheSnapshot {
  siteTitle: string;
  siteSubtitle: string;
  resolvedLogoUrl: string;
}

function getDefaultStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch (_error) {
    return null;
  }
}

function normalizeCachedString(value: unknown): string {
  return String(value || "").trim();
}

export function readPublicBrandingCache(
  cacheKey: string,
  storage: Pick<Storage, "getItem"> | null = getDefaultStorage(),
): PublicBrandingCacheSnapshot {
  const emptySnapshot = {
    siteTitle: "",
    siteSubtitle: "",
    resolvedLogoUrl: "",
  };

  if (!cacheKey || !storage) return emptySnapshot;

  try {
    const rawValue = storage.getItem(cacheKey);
    if (!rawValue) return emptySnapshot;
    const parsedValue: unknown = JSON.parse(rawValue);
    if (
      !parsedValue ||
      typeof parsedValue !== "object" ||
      Array.isArray(parsedValue)
    ) {
      return emptySnapshot;
    }

    const record = parsedValue as Record<string, unknown>;
    return {
      siteTitle: normalizeCachedString(record["site_title"]),
      siteSubtitle: normalizeCachedString(record["site_subtitle"]),
      resolvedLogoUrl: normalizeCachedString(record["resolved_logo_url"]),
    };
  } catch (_error) {
    return emptySnapshot;
  }
}
