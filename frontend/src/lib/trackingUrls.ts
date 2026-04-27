export const TRACKING_PROVIDER_PRESETS = [
  {
    id: "seven_eleven",
    label: "7-11貨態查詢",
    url: "https://eservice.7-11.com.tw/e-tracking/search.aspx",
  },
  {
    id: "family_mart",
    label: "全家貨態查詢",
    url: "https://fmec.famiport.com.tw/FP_Entrance/QueryBox",
  },
  {
    id: "post",
    label: "中華郵政貨態查詢",
    url: "https://postserv.post.gov.tw/pstmail/main_mail.html",
  },
] as const;

export type TrackingProviderPreset = typeof TRACKING_PROVIDER_PRESETS[number];
export type TrackingProviderPresetId = TrackingProviderPreset["id"];

export function normalizeTrackingUrl(url: unknown): string {
  const raw = String(url || "").trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return "";
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch (_error) {
    return "";
  }
}

export function getTrackingProviderPreset(
  id: unknown,
): TrackingProviderPreset | null {
  const presetId = String(id || "");
  return TRACKING_PROVIDER_PRESETS.find((preset) => preset.id === presetId) ||
    null;
}

export function getDefaultTrackingUrl(deliveryMethod: unknown): string {
  const deliveryPresetMap: Record<string, TrackingProviderPresetId> = {
    seven_eleven: "seven_eleven",
    family_mart: "family_mart",
    delivery: "post",
    home_delivery: "post",
  };
  const preset = getTrackingProviderPreset(
    deliveryPresetMap[String(deliveryMethod || "")],
  );
  return preset?.url || "";
}
