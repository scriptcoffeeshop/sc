// ============================================
// storefrontDeliveryActions.ts — 配送方式、地址、門市選擇
// ============================================

import { API_URL, districtData } from "../../lib/appConfig.ts";
import { Toast } from "../../lib/sharedUtils.ts";
import Swal from "../../lib/swal.ts";
import { state } from "../../lib/appState.ts";
import TwCitySelector from "../../lib/twCitySelector.js";
import { storefrontRuntime } from "./storefrontRuntime.ts";
import {
  buildFormBody,
  getSelectElement,
  getSelectValue,
  parseDeliveryConfig,
  parseDeliveryPrefs,
  setInputValue,
  type DeliveryPrefs,
} from "./storefrontDeliveryDom.ts";
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

let citySelectorInstance: unknown = null; // 用來儲存 tw-city-selector 實體

function initCitySelector() {
  if (TwCitySelector && !citySelectorInstance) {
    citySelectorInstance = new TwCitySelector({
      el: '[role="tw-city-selector"]',
      elCounty: ".county",
      elDistrict: ".district",
      elZipcode: ".zipcode",
    });
  }
}

// 由於 ES module (type="module") 預設為 defer 執行，DOMContentLoaded 可能已經觸發
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCitySelector);
} else {
  initCitySelector();
}

/** 選擇配送方式 */
export function selectDelivery(
  method,
  _event = null,
  options: { skipQuote?: boolean } = {},
) {
  state.selectedDelivery = method;
  state.orderQuote = null;
  state.quoteError = "";

  if (method === "home_delivery") {
    initCitySelector(); // 確保使用者點擊時，如果尚未初始化，則再初始化一次
  } else if (method !== "delivery" && method !== "in_store") {
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
  const city = getSelectValue("delivery-city");
  const distSelect = getSelectElement("delivery-district");
  if (!distSelect) return;
  distSelect.replaceChildren();
  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = "請選擇";
  distSelect.appendChild(placeholderOption);
  if (city && districtData[city]) {
    districtData[city].forEach((d) => {
      const option = document.createElement("option");
      option.value = String(d);
      option.textContent = String(d);
      distSelect.appendChild(option);
    });
  }
}

/** 舊別名保留，供歷史流程呼叫 */
export const populateDistricts = updateDistricts;

export async function checkStoreToken(token) {
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
      const typeMap = {
        "UNIMARTC2C": "seven_eleven",
        "FAMIC2C": "family_mart",
        "UNIMART": "seven_eleven",
        "FAMI": "family_mart",
      };
      const method = typeMap[result.logisticsSubType] || "seven_eleven";
      const btn = document.querySelector(
        `.delivery-option[data-id="${method}"]`,
      );
      if (btn instanceof HTMLElement) btn.click();
      else {
        selectDelivery(method, {
          currentTarget: { classList: { add: () => {} } },
        });
      }

      applyStoreSelection({
        storeId: result.storeId,
        storeName: result.storeName,
        storeAddress: result.storeAddress,
      });

      Toast.fire({ icon: "success", title: "門市選擇成功" });
    } else {
      Swal.fire("提示", "門市資訊已過期或不存在，請重新選擇", "warning");
    }
  } catch (e) {
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

      // 以 POST 表單提交到 PCSC 電子地圖
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "https://emap.presco.com.tw/c2cemap.ashx";
      form.target = "_self";

      const fields = {
        eshopid: result.eshopid || "870",
        url: result.callbackUrl,
        tempvar: result.token,
        sid: "1",
        stoession: "",
        showtype: "1",
        servicetype: "1",
      };
      Object.entries(fields).forEach(([k, v]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = k;
        input.value = String(v || "");
        form.appendChild(input);
      });
      document.body.appendChild(form);
      Swal.close();
      form.submit();
    } catch (e) {
      const choice = await Swal.fire({
        icon: "error",
        title: "無法開啟 7-11 門市地圖",
        text: e.message || String(e),
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

    const form = document.createElement("form");
    form.method = "POST";
    form.action = result.mapUrl;
    Object.entries(result.params || {}).forEach(([k, v]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = k;
      input.value = String(v || "");
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  } catch (e) {
    const choice = await Swal.fire({
      icon: "error",
      title: "無法開啟綠界地圖",
      text: e.message || String(e),
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
      const btn = document.querySelector(
        `.delivery-option[data-id="${method}"]`,
      );

      // 即使按鈕尚未渲染，也先套用 method，避免登入後偏好遺失
      if (btn) selectDelivery(method, { currentTarget: btn });
      else selectDelivery(method);

      if (method === "delivery") {
        if (prefs.city) {
          const cityEl = getSelectElement("delivery-city");
          if (cityEl) cityEl.value = String(prefs.city || "");
          populateDistricts();
          if (prefs.district) {
            const districtEl = getSelectElement("delivery-district");
            if (districtEl) districtEl.value = String(prefs.district || "");
          }
        }
        if (prefs.address) {
          setInputValue("delivery-detail-address", prefs.address);
        }
        const deliveryCompanyEl = document.getElementById("delivery-company");
        if (deliveryCompanyEl instanceof HTMLInputElement) {
          deliveryCompanyEl.value = String(prefs.companyOrBuilding || "").trim();
        }
      } else if (method === "home_delivery") {
        // home_delivery 的 district 可能是 "300 東區"，回填時需拆出區域名稱
        const countyEl = document.querySelector(".county");
        const districtEl = document.querySelector(".district");
        const zipEl = document.querySelector(".zipcode");
        const rawDistrict = String(prefs.district || "").trim();
        const districtText = rawDistrict.replace(/^\d{3}\s*/, "");
        const zipMatch = rawDistrict.match(/^(\d{3})/);

        if (countyEl instanceof HTMLSelectElement && prefs.city) {
          countyEl.value = String(prefs.city || "");
          countyEl.dispatchEvent(new Event("change", { bubbles: true }));
        }
        if (districtEl instanceof HTMLSelectElement && districtText) {
          districtEl.value = districtText;
          districtEl.dispatchEvent(new Event("change", { bubbles: true }));
        }
        if (zipEl instanceof HTMLInputElement && zipMatch) {
          zipEl.value = zipMatch[1];
        }
        if (prefs.address) {
          setInputValue("home-delivery-detail", prefs.address);
        }
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
