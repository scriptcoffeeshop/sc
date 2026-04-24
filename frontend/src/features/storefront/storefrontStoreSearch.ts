import { API_URL } from "../../lib/appConfig.ts";
import { Toast } from "../../lib/sharedUtils.ts";
import Swal from "../../lib/swal.ts";
import { state } from "../../lib/appState.ts";
import {
  normalizeStoreRecord,
  setElementText,
  setInputValue,
  type StoreRecord,
} from "./storefrontDeliveryDom.ts";

let allStores: StoreRecord[] = [];
let storeListLoaded = false;

export function resetStoreListCache(): void {
  storeListLoaded = false;
  allStores = [];
}

/** 清除已選門市 */
export function clearSelectedStore(): void {
  document.getElementById("store-selected-info")?.classList.add("hidden");
  setInputValue("store-name-input", "");
  setInputValue("store-address-input", "");
  setInputValue("store-id-input", "");
  setElementText("selected-store-name", "");
  setElementText("selected-store-address", "");
  setElementText("selected-store-id", "");
}

/** 套用門市選擇結果 */
export function applyStoreSelection(data: {
  storeId?: unknown;
  storeName?: unknown;
  storeAddress?: unknown;
}): void {
  setElementText("selected-store-name", data.storeName);
  setElementText("selected-store-address", data.storeAddress);
  setElementText("selected-store-id", "門市代號：" + String(data.storeId || ""));
  setInputValue("store-name-input", data.storeName);
  setInputValue("store-address-input", data.storeAddress);
  setInputValue("store-id-input", data.storeId);
  document.getElementById("store-selected-info")?.classList.remove("hidden");
  Toast.fire({ icon: "success", title: "已選擇門市：" + data.storeName });
}

/** 開啟門市搜尋彈窗 */
export async function openStoreSearchModal(): Promise<void> {
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
      allStores = Array.isArray(result.stores)
        ? result.stores.map(normalizeStoreRecord)
        : [];
      storeListLoaded = true;
      Swal.close();
    } catch (error) {
      Swal.fire(
        "錯誤",
        "無法載入門市清單：" +
          (error instanceof Error ? error.message : String(error)),
        "error",
      );
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
        const matches = allStores.filter((store) =>
          store.name.toLowerCase().includes(kw) ||
          store.address.toLowerCase().includes(kw) || store.id.includes(kw)
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
