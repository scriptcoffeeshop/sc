// ============================================
// storefrontDeliveryActions.ts — 配送方式、地址、門市選擇
// ============================================

import { API_URL, districtData } from "../../lib/appConfig.ts";
import { Toast } from "../../lib/sharedUtils.ts";
import Swal from "../../lib/swal.ts";
import { state } from "../../lib/appState.ts";
import { storefrontRuntime } from "./storefrontRuntime.ts";
import {
  buildFormBody,
  parseDeliveryConfig,
  parseDeliveryPrefs,
  type DeliveryPrefs,
} from "./storefrontDeliveryData.ts";
import {
  emitStorefrontHomeDeliveryAddressUpdated,
  emitStorefrontLocalDeliveryAddressUpdated,
  getStorefrontLocalDeliveryAddress,
  setStorefrontLocalDeliveryAddress,
} from "./storefrontDeliveryFormState.ts";
import { submitExternalPostForm } from "./storefrontExternalPostForm.ts";
import {
  applyStoreSelection,
  clearSelectedStore,
  openStoreSearchModal,
  resetStoreListCache,
} from "./storefrontStoreSearch.ts";

export {
  applyStoreSelection,
  clearSelectedStore,
  openStoreSearchModal,
} from "./storefrontStoreSearch.ts";

/** 選擇配送方式 */
export function selectDelivery(
  method: string,
  _event: Event | null = null,
  options: { skipQuote?: boolean } = {},
) {
  state.selectedDelivery = method;
  state.orderQuote = null;
  state.quoteError = "";

  if (method !== "delivery" && method !== "home_delivery" && method !== "in_store") {
    resetStoreListCache();
    clearSelectedStore();
  }

  // 處理付款方式選項（根據新版陣列設定動態更新顯示與選取）
  if (storefrontRuntime.updatePaymentOptionsState) {
    // 從 appSettings 重新抓取
    storefrontRuntime.updatePaymentOptionsState(
      parseDeliveryConfig(storefrontRuntime.appSettings?.delivery_options_config),
    );
  }

  // 切換配送方式後，先更新畫面，再重新向後端取得 quote
  if (storefrontRuntime.updateCartUI) {
    storefrontRuntime.updateCartUI();
  }
  if (!options.skipQuote && storefrontRuntime.scheduleQuoteRefresh) {
    storefrontRuntime.scheduleQuoteRefresh({ silent: true });
  }

  // 切換配送方式後，Vue 會依快照更新欄位；這裡只補上已顯示欄位的會員預設值。
  if (storefrontRuntime.syncDynamicFieldDefaults) {
    storefrontRuntime.syncDynamicFieldDefaults();
  }
}

/** 更新地區下拉 (限新竹使用) */
export function updateDistricts() {
  const current = getStorefrontLocalDeliveryAddress();
  const options = Array.isArray(districtData[current.city])
    ? districtData[current.city]
    : [];
  if (current.district && !options.includes(current.district)) {
    setStorefrontLocalDeliveryAddress({ district: "" });
  }
}

/** 舊別名保留，供歷史流程呼叫 */
export const populateDistricts = updateDistricts;

export async function checkStoreToken(token: string) {
  Swal.fire({
    title: "載入門市資訊...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });
  try {
    const res = await fetch(
      `${API_URL}?action=getStoreSelection&token=${
        encodeURIComponent(token)
      }&_=${Date.now()}`,
    );
    const result = await res.json();
    if (result.success && result.found) {
      Swal.close();
      const typeMap: Record<string, string> = {
        "UNIMARTC2C": "seven_eleven",
        "FAMIC2C": "family_mart",
        "UNIMART": "seven_eleven",
        "FAMI": "family_mart",
      };
      const method = typeMap[String(result.logisticsSubType || "")] ||
        "seven_eleven";
      selectDelivery(method);

      applyStoreSelection({
        storeId: result.storeId,
        storeName: result.storeName,
        storeAddress: result.storeAddress,
      });

      Toast.fire({ icon: "success", title: "門市選擇成功" });
    } else {
      Swal.fire("提示", "門市資訊已過期或不存在，請重新選擇", "warning");
    }
  } catch (_error) {
    Swal.fire("錯誤", "門市資訊載入失敗", "error");
  }
}

export async function openStoreMap() {
  if (
    state.selectedDelivery !== "seven_eleven" &&
    state.selectedDelivery !== "family_mart"
  ) {
    Swal.fire("錯誤", "請先選擇 7-11 或全家取貨", "error");
    return;
  }

  // 7-11 使用 PCSC 官方電子地圖
  if (state.selectedDelivery === "seven_eleven") {
    Swal.fire({
      title: "準備前往 7-11 門市地圖...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    try {
      const clientUrl = location.origin + location.pathname;
      // 先在後端建立 store selection session（取得 token 與 callback URL）
      const res = await fetch(`${API_URL}?action=createPcscMapSession`, {
        method: "POST",
        body: buildFormBody({ clientUrl }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || "建立地圖會話失敗");

      Swal.close();
      submitExternalPostForm({
        action: "https://emap.presco.com.tw/c2cemap.ashx",
        target: "_self",
        fields: {
          eshopid: result.eshopid || "870",
          url: result.callbackUrl,
          tempvar: result.token,
          sid: "1",
          stoession: "",
          showtype: "1",
          servicetype: "1",
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const choice = await Swal.fire({
        icon: "error",
        title: "無法開啟 7-11 門市地圖",
        text: message,
        showCancelButton: true,
        confirmButtonText: "改用門市搜尋",
        cancelButtonText: "關閉",
        confirmButtonColor: "#3C2415",
      });
      if (choice.isConfirmed) await openStoreSearchModal();
    }
    return;
  }

  // 全家仍使用綠界地圖
  Swal.fire({
    title: "準備前往超商地圖...",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });
  try {
    const clientUrl = location.origin + location.pathname;
    const res = await fetch(`${API_URL}?action=createStoreMapSession`, {
      method: "POST",
      body: buildFormBody({
        deliveryMethod: state.selectedDelivery,
        clientUrl,
      }),
    });
    const result = await res.json();
    if (!result.success) throw new Error(result.error || "建立地圖會話失敗");

    submitExternalPostForm({
      action: result.mapUrl,
      fields: result.params || {},
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const choice = await Swal.fire({
      icon: "error",
      title: "無法開啟綠界地圖",
      text: message,
      showCancelButton: true,
      confirmButtonText: "改用門市搜尋",
      cancelButtonText: "關閉",
      confirmButtonColor: "#3C2415",
    });
    if (choice.isConfirmed) await openStoreSearchModal();
  }
}

/** 載入配送偏好 */
export function loadDeliveryPrefs() {
  try {
    let prefs: DeliveryPrefs = {};
    const localPrefs = parseDeliveryPrefs(
      localStorage.getItem("coffee_delivery_prefs"),
    );

    const u = state.currentUser;
    if (u && u.defaultDeliveryMethod) {
      prefs = {
        method: u.defaultDeliveryMethod,
        city: u.defaultCity,
        district: u.defaultDistrict,
        address: u.defaultAddress,
        storeId: u.defaultStoreId,
        storeName: u.defaultStoreName,
        storeAddress: u.defaultStoreAddress,
      };
      if (
        localPrefs &&
        String(localPrefs.method || "") === String(u.defaultDeliveryMethod || "")
      ) {
        prefs.companyOrBuilding = String(localPrefs.companyOrBuilding || "").trim();
      }
    } else {
      prefs = localPrefs;
    }

    if (prefs && prefs.method) {
      const method = String(prefs.method);
      selectDelivery(method);

      if (method === "delivery") {
        emitStorefrontLocalDeliveryAddressUpdated({
          city: String(prefs.city || ""),
          district: String(prefs.district || ""),
          address: String(prefs.address || ""),
          companyOrBuilding: String(prefs.companyOrBuilding || "").trim(),
        });
      } else if (method === "home_delivery") {
        // home_delivery 的 district 可能是 "300 東區"，回填時需拆出區域名稱
        const rawDistrict = String(prefs.district || "").trim();
        const districtText = rawDistrict.replace(/^\d{3}\s*/, "");
        const zipMatch = rawDistrict.match(/^(\d{3})/);
        emitStorefrontHomeDeliveryAddressUpdated({
          city: String(prefs.city || ""),
          district: districtText,
          zipcode: zipMatch ? zipMatch[1] : "",
          address: String(prefs.address || ""),
        });
      } else if (method === "seven_eleven" || method === "family_mart") {
        if (prefs.storeId) {
          applyStoreSelection({
            storeId: prefs.storeId,
            storeName: prefs.storeName,
            storeAddress: prefs.storeAddress,
          });
        }
      }
    }
  } catch (e) {
    console.error("載入配送偏好失敗", e);
  }
}
