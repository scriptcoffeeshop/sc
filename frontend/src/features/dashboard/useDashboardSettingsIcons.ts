import { ref } from "vue";
import {
  getDefaultIconUrl,
  getDeliveryIconFallbackKey,
  getPaymentIconFallbackKey,
  normalizeIconPath,
  resolveAssetUrl,
} from "../../lib/icons.ts";
import { sectionIconSettingKey } from "./dashboardSettingsShared.ts";
import { useDashboardSettings } from "./useDashboardSettings.ts";

const {
  brandingSettings,
  sectionTitleSettings,
  deliveryOptions,
  paymentOptions,
} = useDashboardSettings();

const siteIconPreviewOverride = ref("");
const sectionIconPreviewOverrides = ref({
  products: "",
  delivery: "",
  notes: "",
});
const paymentIconPreviewOverrides = ref({
  cod: "",
  linepay: "",
  jkopay: "",
  transfer: "",
});
const deliveryIconPreviewOverrides = ref({});

let services = null;

function getServices() {
  if (!services) {
    throw new Error("Dashboard settings icon services 尚未初始化");
  }
  return services;
}

function revokeObjectUrl(url = "") {
  if (typeof url === "string" && url.startsWith("blob:")) {
    globalThis.URL?.revokeObjectURL?.(url);
  }
}

function replaceSitePreviewOverride(nextUrl = "") {
  revokeObjectUrl(siteIconPreviewOverride.value);
  siteIconPreviewOverride.value = String(nextUrl || "");
}

function replaceSectionPreviewOverride(section, nextUrl = "") {
  const key = String(section || "").trim();
  if (!key) return;
  revokeObjectUrl(sectionIconPreviewOverrides.value[key]);
  sectionIconPreviewOverrides.value = {
    ...sectionIconPreviewOverrides.value,
    [key]: String(nextUrl || ""),
  };
}

function replacePaymentPreviewOverride(method, nextUrl = "") {
  const key = String(method || "").trim();
  if (!key) return;
  revokeObjectUrl(paymentIconPreviewOverrides.value[key]);
  paymentIconPreviewOverrides.value = {
    ...paymentIconPreviewOverrides.value,
    [key]: String(nextUrl || ""),
  };
}

function replaceDeliveryPreviewOverride(deliveryId, nextUrl = "") {
  const key = String(deliveryId || "").trim();
  if (!key) return;
  revokeObjectUrl(deliveryIconPreviewOverrides.value[key]);
  deliveryIconPreviewOverrides.value = {
    ...deliveryIconPreviewOverrides.value,
    [key]: String(nextUrl || ""),
  };
}

function buildObjectPreviewUrl(file) {
  if (!file) return "";
  if (typeof globalThis.URL?.createObjectURL !== "function") return "";
  return globalThis.URL.createObjectURL(file);
}

function validateIconFile(file) {
  const { Swal } = getServices();
  if (!file) {
    Swal.fire("提示", "請先選擇圖片檔案", "info");
    return false;
  }
  if (!String(file.type || "").startsWith("image/")) {
    Swal.fire("錯誤", "請選擇圖片檔案 (PNG/JPG/WebP)", "error");
    return false;
  }
  return true;
}

async function fileToBase64(file) {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      resolve(value.split(",")[1] || "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadAssetFile(file, settingKey = "") {
  const { API_URL, authFetch, getAuthUserId } = getServices();
  const base64 = await fileToBase64(file);
  const response = await authFetch(`${API_URL}?action=uploadAsset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: getAuthUserId(),
      fileData: base64,
      fileName: file.name,
      contentType: file.type,
      settingKey,
    }),
  });
  return await response.json();
}

function openLoadingModal() {
  const { Swal } = getServices();
  Swal.fire({
    title: "上傳中...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });
}

function closeLoadingModal() {
  getServices().Swal.close?.();
}

function setSectionIconUrl(section, url = "") {
  const key = String(section || "").trim();
  if (!key || !sectionTitleSettings.value[key]) return;
  sectionTitleSettings.value = {
    ...sectionTitleSettings.value,
    [key]: {
      ...sectionTitleSettings.value[key],
      iconUrl: normalizeIconPath(url),
    },
  };
}

function setPaymentIconUrl(method, url = "") {
  const key = String(method || "").trim();
  if (!key || !paymentOptions.value[key]) return;
  paymentOptions.value = {
    ...paymentOptions.value,
    [key]: {
      ...paymentOptions.value[key],
      icon_url: normalizeIconPath(url),
    },
  };
}

function setDeliveryIconUrl(deliveryId, url = "") {
  const key = String(deliveryId || "").trim();
  const option = deliveryOptions.value.find((item) => String(item.id || "") === key);
  if (!option) return;
  option.icon_url = normalizeIconPath(url);
}

function resolvePreviewUrl(rawUrl = "", fallbackKey = "", overrideUrl = "") {
  return String(overrideUrl || "").trim() ||
    resolveAssetUrl(rawUrl) ||
    getDefaultIconUrl(fallbackKey);
}

function getDisplayUrl(rawUrl = "") {
  return resolveAssetUrl(rawUrl) || String(rawUrl || "");
}

function getSiteIconPreviewUrl() {
  return resolvePreviewUrl(
    brandingSettings.value.siteIconUrl,
    "brand",
    siteIconPreviewOverride.value,
  );
}

function getSectionIconPreviewUrl(section) {
  const key = String(section || "").trim();
  return resolvePreviewUrl(
    sectionTitleSettings.value?.[key]?.iconUrl,
    key,
    sectionIconPreviewOverrides.value[key],
  );
}

function getPaymentPreviewUrl(method) {
  const key = String(method || "").trim();
  return resolvePreviewUrl(
    paymentOptions.value?.[key]?.icon_url,
    getPaymentIconFallbackKey(key),
    paymentIconPreviewOverrides.value[key],
  );
}

function getDeliveryPreviewUrl(option) {
  const deliveryId = String(option?.id || "").trim();
  return resolvePreviewUrl(
    option?.icon_url,
    getDeliveryIconFallbackKey(deliveryId),
    deliveryIconPreviewOverrides.value[deliveryId],
  );
}

function previewSectionIconFile(section, file) {
  if (!validateIconFile(file)) return false;
  replaceSectionPreviewOverride(section, buildObjectPreviewUrl(file));
  return true;
}

function previewPaymentIconFile(method, file) {
  if (!validateIconFile(file)) return false;
  replacePaymentPreviewOverride(method, buildObjectPreviewUrl(file));
  return true;
}

function previewDeliveryIconFile(deliveryId, file) {
  if (!validateIconFile(file)) return false;
  replaceDeliveryPreviewOverride(deliveryId, buildObjectPreviewUrl(file));
  return true;
}

async function handleSiteIconSelection(file) {
  if (!validateIconFile(file)) return false;

  replaceSitePreviewOverride(buildObjectPreviewUrl(file));
  openLoadingModal();
  try {
    const data = await uploadAssetFile(file, "site_icon_url");
    if (!data.success) {
      throw new Error(data.error || "品牌 Logo 上傳失敗");
    }

    brandingSettings.value = {
      ...brandingSettings.value,
      siteIconUrl: normalizeIconPath(data.url),
    };
    replaceSitePreviewOverride("");
    closeLoadingModal();
    getServices().Toast.fire({
      icon: "success",
      title: "品牌 Logo 已上傳！請記得點擊儲存設定。",
    });
    return true;
  } catch (error) {
    closeLoadingModal();
    getServices().Swal.fire("錯誤", error.message, "error");
    return false;
  }
}

function resetSiteIcon() {
  brandingSettings.value = {
    ...brandingSettings.value,
    siteIconUrl: "",
  };
  replaceSitePreviewOverride("");
  getServices().Toast.fire({
    icon: "success",
    title: "已恢復預設 Logo！請記得點擊儲存設定。",
  });
}

async function uploadSectionIconFile(section, file) {
  if (!validateIconFile(file)) return false;

  openLoadingModal();
  try {
    const data = await uploadAssetFile(file, sectionIconSettingKey(section));
    if (!data.success) {
      throw new Error(data.error || "區塊圖示上傳失敗");
    }
    setSectionIconUrl(section, data.url);
    replaceSectionPreviewOverride(section, "");
    closeLoadingModal();
    getServices().Toast.fire({ icon: "success", title: "區塊圖示已更新" });
    return true;
  } catch (error) {
    closeLoadingModal();
    getServices().Swal.fire("錯誤", error.message, "error");
    return false;
  }
}

async function uploadPaymentIconFile(method, file) {
  if (!validateIconFile(file)) return false;

  openLoadingModal();
  try {
    const data = await uploadAssetFile(file, "");
    if (!data.success) {
      throw new Error(data.error || "付款圖示上傳失敗");
    }
    setPaymentIconUrl(method, data.url);
    replacePaymentPreviewOverride(method, "");
    closeLoadingModal();
    getServices().Toast.fire({ icon: "success", title: "付款圖示已更新" });
    return true;
  } catch (error) {
    closeLoadingModal();
    getServices().Swal.fire("錯誤", error.message, "error");
    return false;
  }
}

async function uploadDeliveryIconFile(deliveryId, file) {
  if (!validateIconFile(file)) return false;

  openLoadingModal();
  try {
    const data = await uploadAssetFile(file, "");
    if (!data.success) {
      throw new Error(data.error || "物流圖示上傳失敗");
    }
    setDeliveryIconUrl(deliveryId, data.url);
    replaceDeliveryPreviewOverride(deliveryId, "");
    closeLoadingModal();
    getServices().Toast.fire({ icon: "success", title: "物流圖示已更新" });
    return true;
  } catch (error) {
    closeLoadingModal();
    getServices().Swal.fire("錯誤", error.message, "error");
    return false;
  }
}

function applyIconFromLibrary(targetKey, iconKey, rawUrl = "") {
  const key = String(targetKey || "").trim();
  const fallbackUrl = getDefaultIconUrl(iconKey);
  const iconUrl = normalizeIconPath(rawUrl || fallbackUrl);
  if (!iconUrl) {
    getServices().Swal.fire("錯誤", "找不到要套用的 icon 路徑", "error");
    return false;
  }

  let targetLabel = "";
  if (key === "site") {
    brandingSettings.value = {
      ...brandingSettings.value,
      siteIconUrl: iconUrl,
    };
    replaceSitePreviewOverride("");
    targetLabel = "品牌 Icon";
  } else if (["products", "delivery", "notes"].includes(key)) {
    setSectionIconUrl(key, iconUrl);
    replaceSectionPreviewOverride(key, "");
    targetLabel = `${key} 區塊 Icon`;
  } else if (["cod", "linepay", "jkopay", "transfer"].includes(key)) {
    setPaymentIconUrl(key, iconUrl);
    replacePaymentPreviewOverride(key, "");
    targetLabel = `${key} 付款 Icon`;
  } else {
    getServices().Swal.fire("錯誤", "請先選擇有效的套用目標", "error");
    return false;
  }

  getServices().Toast.fire({
    icon: "success",
    title: `已套用到${targetLabel}`,
  });
  return true;
}

export function configureDashboardSettingsIconServices(nextServices) {
  services = {
    ...services,
    ...nextServices,
  };
}

export function useDashboardSettingsIcons() {
  return {
    getDisplayUrl,
    getSiteIconPreviewUrl,
    getSectionIconPreviewUrl,
    getPaymentPreviewUrl,
    getDeliveryPreviewUrl,
  };
}

export const dashboardSettingsIconActions = {
  handleSiteIconSelection,
  resetSiteIcon,
  previewSectionIconFile,
  uploadSectionIconFile,
  previewPaymentIconFile,
  uploadPaymentIconFile,
  previewDeliveryIconFile,
  uploadDeliveryIconFile,
  applyIconFromLibrary,
};
