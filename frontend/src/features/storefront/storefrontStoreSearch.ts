import { createApp, type App } from "vue";
import { API_URL } from "../../lib/appConfig.ts";
import { Toast } from "../../lib/sharedUtils.ts";
import Swal from "../../lib/swal.ts";
import { state } from "../../lib/appState.ts";
import StorefrontStoreSearchPicker from "./StorefrontStoreSearchPicker.vue";
import {
  normalizeStoreRecord,
  type StoreRecord,
} from "./storefrontDeliveryDom.ts";
import { getStorefrontErrorMessage } from "./storefrontErrors.ts";
import {
  clearStorefrontSelectedStore,
  setStorefrontSelectedStore,
} from "./storefrontSelectedStoreState.ts";

let allStores: StoreRecord[] = [];
let storeListLoaded = false;

export function resetStoreListCache(): void {
  storeListLoaded = false;
  allStores = [];
}

/** 清除已選門市 */
export function clearSelectedStore(): void {
  clearStorefrontSelectedStore();
}

/** 套用門市選擇結果 */
export function applyStoreSelection(data: {
  storeId?: unknown;
  storeName?: unknown;
  storeAddress?: unknown;
}): void {
  setStorefrontSelectedStore(data);
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
        "無法載入門市清單：" + getStorefrontErrorMessage(error, "未知錯誤"),
        "error",
      );
      return;
    }
  }

  let searchPickerApp: App<Element> | null = null;
  await Swal.fire({
    title: "搜尋門市",
    html: '<div id="store-search-vue-root"></div>',
    showConfirmButton: false,
    showCloseButton: true,
    width: 480,
    didOpen: () => {
      const root = document.getElementById("store-search-vue-root");
      if (!root) return;
      searchPickerApp = createApp(StorefrontStoreSearchPicker, {
        stores: allStores,
        onSelectStore: (store: StoreRecord) => {
          applyStoreSelection({
            storeId: store.id,
            storeName: store.name,
            storeAddress: store.address,
          });
          Swal.close();
        },
      });
      searchPickerApp.mount(root);
    },
    willClose: () => {
      searchPickerApp?.unmount();
      searchPickerApp = null;
    },
  });
}
