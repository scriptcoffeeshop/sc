import { supabase } from "../utils/supabase.ts";
import { requireAdmin } from "../utils/auth.ts";
import { getProducts } from "./products.ts";
import { getCategories } from "./categories.ts";
import { getFormFields } from "./form-fields.ts";
import { getBankAccounts } from "./bank-accounts.ts";
import { getPromotions } from "./promotions.ts";
import { asJsonRecord, tryParseJsonArray, tryParseJsonRecord } from "../utils/json.ts";

const PUBLIC_SETTINGS_KEYS = [
  "is_open",
  "announcement",
  "announcement_enabled",
  "store_name",
  "delivery_pricing_rules",
  "site_title",
  "site_subtitle",

  "site_icon_url",
  "products_section_title",
  "products_section_icon_url",
  "delivery_section_title",
  "delivery_section_icon_url",
  "notes_section_title",
  "notes_section_icon_url",
  "payment_enabled",
  "linepay_enabled",
  "linepay_sandbox",
  "transfer_enabled",
  "delivery_options_config",
  "payment_options_config",
];

const RELATIVE_ICON_HOSTS = new Set([
  "scriptcoffee.com.tw",
  "www.scriptcoffee.com.tw",
  "scriptcoffeeshop.github.io",
]);

function normalizeIconPath(rawValue: unknown): string {
  const value = String(rawValue ?? "").trim();
  if (!value) return "";

  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      const normalizedPath = parsed.pathname.replace(/^\/+/, "");
      if (RELATIVE_ICON_HOSTS.has(parsed.hostname)) {
        if (normalizedPath.startsWith("sc/icons/")) {
          return normalizedPath.slice(3);
        }
        if (normalizedPath.startsWith("icons/")) {
          return normalizedPath;
        }
      }
    } catch (_error) {
      return value;
    }
    return value;
  }

  if (/^\/?(?:sc\/)?icons\//i.test(value)) {
    return value
      .replace(/^\/+/, "")
      .replace(/^sc\//i, "");
  }

  return value;
}

function normalizeDeliveryOptionsConfig(value: string): string {
  const parsed = tryParseJsonArray(value);
  if (!parsed) return value;

  const normalized = parsed.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return item;
    const rawItem = asJsonRecord(item);
    const rest = { ...rawItem };
    delete rest.icon;
    delete rest.iconUrl;
    const normalizedIconUrl = normalizeIconPath(
      rawItem.icon_url ?? rawItem.iconUrl ?? "",
    );
    return {
      ...rest,
      icon_url: normalizedIconUrl,
    };
  });
  return JSON.stringify(normalized);
}

function normalizePaymentOptionsConfig(value: string): string {
  const parsed = tryParseJsonRecord(value);
  if (!parsed) {
    return value;
  }

  const normalized: Record<string, unknown> = {};
  for (const [method, option] of Object.entries(parsed)) {
    if (!option || typeof option !== "object" || Array.isArray(option)) {
      normalized[method] = option;
      continue;
    }
    const rawOption = asJsonRecord(option);
    const rest = { ...rawOption };
    delete rest.icon;
    delete rest.iconUrl;
    const normalizedIconUrl = normalizeIconPath(
      rawOption.icon_url ?? rawOption.iconUrl ?? "",
    );
    normalized[method] = {
      ...rest,
      icon_url: normalizedIconUrl,
    };
  }

  return JSON.stringify(normalized);
}

function normalizeSettingValue(key: string, rawValue: unknown): string {
  const value = String(rawValue ?? "");
  if (key === "delivery_options_config") {
    return normalizeDeliveryOptionsConfig(value);
  }
  if (key === "payment_options_config") {
    return normalizePaymentOptionsConfig(value);
  }
  if (key.endsWith("_icon_url")) {
    return normalizeIconPath(value);
  }
  return value;
}

// ============ 設定 ============
export async function getSettings(isAdmin = false) {
  const { data, error } = await supabase.from("coffee_settings").select("*");
  if (error) return { success: false, error: error.message };
  const settings: Record<string, string> = {};
  for (const row of (data || [])) {
    if (isAdmin || PUBLIC_SETTINGS_KEYS.includes(row.key)) {
      settings[row.key] = normalizeSettingValue(row.key, row.value);
    }
  }
  return { success: true, settings };
}

export async function updateSettingsAction(
  data: Record<string, unknown>,
  req: Request,
) {
  await requireAdmin(req);
  const settings = data.settings as Record<string, string>;
  const itemsToUpsert = Object.entries(settings).map(([key, value]) => ({
    key,
    value: normalizeSettingValue(key, value),
  }));

  const { error } = await supabase.from("coffee_settings").upsert(
    itemsToUpsert,
  );
  if (error) return { success: false, error: error.message };
  return { success: true, message: "設定已更新" };
}

function sanitizeFileName(fileName = "icon.png") {
  return String(fileName || "icon.png")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^_+/, "")
    .slice(0, 80) || "icon.png";
}

export async function uploadAsset(
  data: Record<string, unknown>,
  req: Request,
) {
  await requireAdmin(req);

  const base64Data = String(data.fileData || "");
  const contentType = String(data.contentType || "image/png");
  const rawName = String(data.fileName || "icon.png");
  const settingKey = String(data.settingKey || "").trim();

  if (!base64Data) return { success: false, error: "沒有檔案資料" };
  if (!contentType.startsWith("image/")) {
    return { success: false, error: "僅支援圖片檔案" };
  }

  const fileName = sanitizeFileName(rawName);
  const binaryStr = atob(base64Data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

  const storagePath = `icons/${Date.now()}-${fileName}`;
  const { error: uploadError } = await supabase.storage.from("site-assets")
    .upload(storagePath, bytes, { contentType, upsert: true });

  if (uploadError) {
    return { success: false, error: "上傳失敗: " + uploadError.message };
  }

  const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(
    storagePath,
  );
  const publicUrl = urlData?.publicUrl || "";

  if (settingKey) {
    const { error: upsertError } = await supabase.from("coffee_settings")
      .upsert({
        key: settingKey,
        value: publicUrl,
      });
    if (upsertError) {
      return { success: false, error: "設定更新失敗: " + upsertError.message };
    }
  }

  return { success: true, url: publicUrl, message: "圖示已上傳" };
}

// ============ 初始化資料 ============
export async function getInitData(isAdmin = false) {
  const [p, c, s, f, b, pr] = await Promise.all([
    getProducts(),
    getCategories(),
    getSettings(isAdmin),
    getFormFields(false),
    getBankAccounts(),
    getPromotions(),
  ]);
  const settings = s.success ? asJsonRecord(s).settings : {};
  return {
    success: true,
    products: p.success ? asJsonRecord(p).products : [],
    categories: c.success ? asJsonRecord(c).categories : [],
    settings,
    formFields: f.success ? asJsonRecord(f).fields : [],
    bankAccounts: b.success ? asJsonRecord(b).accounts : [],
    promotions: pr.success ? asJsonRecord(pr).promotions : [],
  };
}
