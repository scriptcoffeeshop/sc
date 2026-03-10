import { supabase } from "../utils/supabase.ts";
import { requireAdmin } from "../utils/auth.ts";
import { getProducts } from "./products.ts";
import { getCategories } from "./categories.ts";
import { getFormFields } from "./form-fields.ts";
import { getBankAccounts } from "./bank-accounts.ts";
import { getPromotions } from "./promotions.ts";

const PUBLIC_SETTINGS_KEYS = [
  "is_open",
  "announcement",
  "announcement_enabled",
  "store_name",
  "delivery_pricing_rules",
  "site_title",
  "site_subtitle",
  "site_icon_url",
  "site_icon_emoji",
  "products_section_title",
  "delivery_section_title",
  "notes_section_title",
  "payment_enabled",
  "linepay_enabled",
  "linepay_sandbox",
  "transfer_enabled",
  "delivery_options_config",
];

// ============ 設定 ============
export async function getSettings(isAdmin = false) {
  const { data, error } = await supabase.from("coffee_settings").select("*");
  if (error) return { success: false, error: error.message };
  const settings: Record<string, string> = {};
  for (const row of (data || [])) {
    if (isAdmin || PUBLIC_SETTINGS_KEYS.includes(row.key)) {
      settings[row.key] = row.value;
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
    value: String(value),
  }));

  const { error } = await supabase.from("coffee_settings").upsert(
    itemsToUpsert,
  );
  if (error) return { success: false, error: error.message };
  return { success: true, message: "設定已更新" };
}

export async function uploadSiteIcon(
  data: Record<string, unknown>,
  req: Request,
) {
  await requireAdmin(req);
  const base64Data = String(data.fileData || "");
  const fileName = String(data.fileName || "icon.png");
  const contentType = String(data.contentType || "image/png");
  if (!base64Data) return { success: false, error: "沒有檔案資料" };
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
  await supabase.from("coffee_settings").upsert({
    key: "site_icon_url",
    value: publicUrl,
  });
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
  const settings = s.success ? (s as Record<string, unknown>).settings : {};
  return {
    success: true,
    products: p.success ? (p as Record<string, unknown>).products : [],
    categories: c.success ? (c as Record<string, unknown>).categories : [],
    settings,
    formFields: f.success ? (f as Record<string, unknown>).fields : [],
    bankAccounts: b.success ? (b as Record<string, unknown>).accounts : [],
    promotions: pr.success ? (pr as Record<string, unknown>).promotions : [],
  };
}
