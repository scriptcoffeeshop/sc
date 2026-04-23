// ============================================
// storefrontDeliveryActions.ts — 配送方式、地址、門市選擇
// ============================================

import { API_URL, districtData } from "../../lib/appConfig.ts";
import { Toast } from "../../lib/sharedUtils.ts";
import Swal from "../../lib/swal.ts";
import { state } from "../../lib/appState.ts";
import TwCitySelector from "../../lib/twCitySelector.js";
import { storefrontRuntime } from "./storefrontRuntime.ts";

let allStores = [];
let storeListLoaded = false;
let citySelectorInstance = null; // 用來儲存 tw-city-selector 實體

type DeliveryPrefs = Record<string, any>;

function getInputElement(id: string): HTMLInputElement | null {
  const element = document.getElementById(id);
  return element instanceof HTMLInputElement ? element : null;
}

function getSelectElement(id: string): HTMLSelectElement | null {
  const element = document.getElementById(id);
  return element instanceof HTMLSelectElement ? element : null;
}

function getSelectValue(id: string): string {
  return getSelectElement(id)?.value || "";
}

function setInputValue(id: string, value: unknown) {
  const input = getInputElement(id);
  if (input) input.value = String(value || "");
}

function setElementText(id: string, value: unknown) {
  const element = document.getElementById(id);
  if (element) element.textContent = String(value || "");
}

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

/** Vue 已接手配送選項渲染；保留相容入口避免舊流程呼叫中斷。 */
export function renderDeliveryOptions(config) {
  void config;
}

/** 選擇配送方式 */
export function selectDelivery(method, e = null, options: { skipQuote?: boolean } = {}) {
  state.selectedDelivery = method;
  state.orderQuote = null;
  state.quoteError = "";
  document.querySelectorAll(".delivery-option").forEach((el) =>
    el.classList.remove("active")
  );

  // 如果有傳入 event 則使用目前的 target，否則透過 method 尋找對應的選項元素
  if (
    e && e.currentTarget && typeof e.currentTarget.classList !== "undefined"
  ) {
    e.currentTarget.classList.add("active");
  } else {
    const btn = document.querySelector(`.delivery-option[data-id="${method}"]`);
    if (btn) btn.classList.add("active");
  }

  document.getElementById("delivery-address-section").classList.add("hidden");
  document.getElementById("store-pickup-section").classList.add("hidden");
  document.getElementById("in-store-section").classList.add("hidden");
  document.getElementById("home-delivery-section").classList.add("hidden");

  if (method === "delivery") {
    document.getElementById("delivery-address-section").classList.remove(
      "hidden",
    );
  } else if (method === "home_delivery") {
    initCitySelector(); // 確保使用者點擊時，如果尚未初始化，則再初始化一次
    document.getElementById("home-delivery-section").classList.remove("hidden");
  } else if (method === "in_store") {
    document.getElementById("in-store-section").classList.remove("hidden");
  } else {
    document.getElementById("store-pickup-section").classList.remove("hidden");
    storeListLoaded = false;
    allStores = [];
    clearSelectedStore();
  }

  // 處理付款方式選項（根據新版陣列設定動態更新顯示與選取）
  if (storefrontRuntime.updatePaymentOptionsState) {
    // 從 appSettings 重新抓取
    const deliveryConfigStr =
      storefrontRuntime.appSettings?.delivery_options_config || "";
    let deliveryConfig = [];
    if (deliveryConfigStr) {
      try {
        deliveryConfig = JSON.parse(deliveryConfigStr);
      } catch (e) {}
    }
    storefrontRuntime.updatePaymentOptionsState(deliveryConfig);
  }

  // 切換配送方式後，先更新畫面，再重新向後端取得 quote
  if (storefrontRuntime.updateCartUI) {
    storefrontRuntime.updateCartUI();
  }
  if (!options.skipQuote && storefrontRuntime.scheduleQuoteRefresh) {
    storefrontRuntime.scheduleQuoteRefresh({ silent: true });
  }

  // 切換配送方式後，重新渲染動態表單欄位（依配送方式過濾）
  if (storefrontRuntime.rerenderFormFields) {
    storefrontRuntime.rerenderFormFields();
  }
}

if (typeof window !== "undefined") {
  window.renderDeliveryOptions = renderDeliveryOptions;
  window.selectDelivery = selectDelivery;
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

/** 清除已選門市 */
export function clearSelectedStore() {
  document.getElementById("store-selected-info").classList.add("hidden");
  setInputValue("store-name-input", "");
  setInputValue("store-address-input", "");
  setInputValue("store-id-input", "");
  setElementText("selected-store-name", "");
  setElementText("selected-store-address", "");
  setElementText("selected-store-id", "");
}

/** 套用門市選擇結果 */
export function applyStoreSelection(data) {
  setElementText("selected-store-name", data.storeName);
  setElementText("selected-store-address", data.storeAddress);
  setElementText("selected-store-id", "門市代號：" + String(data.storeId || ""));
  setInputValue("store-name-input", data.storeName);
  setInputValue("store-address-input", data.storeAddress);
  setInputValue("store-id-input", data.storeId);
  document.getElementById("store-selected-info").classList.remove("hidden");
  Toast.fire({ icon: "success", title: "已選擇門市：" + data.storeName });
}

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientUrl }),
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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

/** 開啟門市搜尋彈窗 */
export async function openStoreSearchModal() {
  if (!storeListLoaded) {
    Swal.fire({
      title: "載入門市清單中...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    try {
      const cvsType = state.selectedDelivery === "family_mart"
        ? "FAMI"
        : "UNIMART";
      const res = await fetch(
        `${API_URL}?action=getStoreList&cvsType=${cvsType}`,
      );
      const result = await res.json();
      if (!result.success) {
        Swal.fire("錯誤", result.error || "取得門市清單失敗", "error");
        return;
      }
      allStores = result.stores || [];
      storeListLoaded = true;
      Swal.close();
    } catch (e) {
      Swal.fire("錯誤", "無法載入門市清單：" + e.message, "error");
      return;
    }
  }

  await Swal.fire({
    title: "搜尋門市",
    html: `
            <input id="store-search-input" class="swal2-input" placeholder="輸入門市名稱、地址或關鍵字" style="width:90%">
            <div id="store-search-results" style="max-height:300px; overflow-y:auto; margin-top:12px; text-align:left;"></div>
            <p id="store-search-hint" style="color:#999; font-size:12px; margin-top:8px;">共 ${allStores.length} 間門市，請輸入關鍵字搜尋</p>
        `,
    showConfirmButton: false,
    showCloseButton: true,
    width: 480,
    didOpen: () => {
      const searchInput = document.getElementById("store-search-input");
      const resultsDiv = document.getElementById("store-search-results");
      const hintP = document.getElementById("store-search-hint");
      if (
        !(searchInput instanceof HTMLInputElement) ||
        !resultsDiv ||
        !hintP
      ) {
        return;
      }
      searchInput.focus();
      searchInput.addEventListener("input", () => {
        const kw = searchInput.value.trim().toLowerCase();
        if (kw.length < 1) {
          resultsDiv.replaceChildren();
          hintP.textContent = `共 ${allStores.length} 間門市，請輸入關鍵字搜尋`;
          return;
        }
        const matches = allStores.filter((s) =>
          s.name.toLowerCase().includes(kw) ||
          s.address.toLowerCase().includes(kw) || s.id.includes(kw)
        ).slice(0, 50);
        hintP.textContent = matches.length >= 50
          ? `顯示前 50 筆，請輸入更精確的關鍵字`
          : `找到 ${matches.length} 間門市`;
        const fragment = document.createDocumentFragment();
        matches.forEach((store) => {
          const item = document.createElement("div");
          item.className = "store-result-item";
          item.dataset.storeResult = "true";
          item.dataset.id = String(store.id || "");
          item.dataset.name = String(store.name || "");
          item.dataset.addr = String(store.address || "");
          item.style.padding = "10px 12px";
          item.style.borderBottom = "1px solid #eee";
          item.style.cursor = "pointer";
          item.style.transition = "background 0.2s";

          const name = document.createElement("div");
          name.style.fontWeight = "600";
          name.style.fontSize = "14px";
          name.textContent = String(store.name || "");

          const address = document.createElement("div");
          address.style.color = "#666";
          address.style.fontSize = "12px";
          address.textContent = String(store.address || "");

          const code = document.createElement("div");
          code.style.color = "#aaa";
          code.style.fontSize = "11px";
          code.textContent = `代號：${String(store.id || "")}`;

          item.append(name, address, code);
          item.addEventListener("click", () => {
            applyStoreSelection({
              storeId: item.dataset.id,
              storeName: item.dataset.name,
              storeAddress: item.dataset.addr,
            });
            Swal.close();
          });
          fragment.appendChild(item);
        });
        resultsDiv.replaceChildren(fragment);
      });
    },
  });
}

/** 載入配送偏好 */
export function loadDeliveryPrefs() {
  try {
    let prefs: DeliveryPrefs = {};
    let localPrefs: DeliveryPrefs = {};
    const prefsStr = localStorage.getItem("coffee_delivery_prefs");
    if (prefsStr) {
      try {
        localPrefs = JSON.parse(prefsStr);
      } catch {}
    }

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
          countyEl.value = prefs.city;
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
