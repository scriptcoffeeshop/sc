import { computed, nextTick, reactive, ref } from "vue";
import { createLogger } from "../../lib/logger.ts";
import type {
  DashboardAuthFetch,
  DashboardSwal,
  DashboardToast,
} from "./dashboardOrderTypes.ts";
import { getDashboardErrorMessage } from "./dashboardErrors.ts";
import {
  buildPromotionProductGroups,
  buildPromotionViewModel,
  normalizePromotion,
  normalizeTargetItems,
  type DashboardProductRecord,
  type DashboardPromotionRecord,
  type PromotionFormState,
  type PromotionTargetItem,
} from "./dashboardPromotionsShared.ts";

const logger = createLogger("dashboard-promotions");

type PromotionSortableEvent = {
  oldIndex?: number | undefined;
  newIndex?: number | undefined;
};

type PromotionEditableField = Exclude<keyof PromotionFormState, "targetItems">;

type PromotionSortableInstance = {
  destroy: () => void;
};

type PromotionSortableService = {
  create?: (
    element: HTMLElement,
    options: {
      handle: string;
      animation: number;
      onEnd: (event: PromotionSortableEvent) => void | Promise<void>;
    },
  ) => PromotionSortableInstance;
};

type DashboardPromotionsServices = {
  API_URL: string;
  authFetch: DashboardAuthFetch;
  getAuthUserId: () => string;
  getProducts: () => DashboardProductRecord[];
  ensureProductsLoaded?: () => Promise<unknown> | unknown;
  Sortable?: PromotionSortableService | null;
  Swal: DashboardSwal;
  Toast: DashboardToast;
};

const promotions = ref<DashboardPromotionRecord[]>([]);
const isPromotionModalOpen = ref(false);

const promotionForm = reactive<PromotionFormState>({
  id: "",
  name: "",
  type: "bundle",
  minQuantity: 2,
  discountType: "percent",
  discountValue: 90,
  enabled: true,
  targetItems: [],
});

let promotionsMap: { [id: string]: DashboardPromotionRecord } = {};
let services: DashboardPromotionsServices | null = null;
let promotionsTableElement: HTMLElement | null = null;
let promotionSortable: PromotionSortableInstance | null = null;

function getServices(): DashboardPromotionsServices {
  if (!services) {
    throw new Error("Dashboard promotions services 尚未初始化");
  }
  return services;
}

function syncPromotionsMap(nextPromotions = promotions.value) {
  promotionsMap = {};
  (Array.isArray(nextPromotions) ? nextPromotions : []).forEach((promotion) => {
    promotionsMap[String(promotion.id || "")] = promotion;
  });
}

const promotionsView = computed(() =>
  promotions.value
    .map((promotion) => buildPromotionViewModel(promotion))
    .filter((promotion) => promotion.id > 0)
);

const promotionModalTitle = computed(() =>
  promotionForm.id ? "編輯活動" : "新增活動"
);

function resetPromotionForm() {
  promotionForm.id = "";
  promotionForm.name = "";
  promotionForm.type = "bundle";
  promotionForm.minQuantity = 2;
  promotionForm.discountType = "percent";
  promotionForm.discountValue = 90;
  promotionForm.enabled = true;
  promotionForm.targetItems = [];
}

function updatePromotionField(field: PromotionEditableField, value: unknown) {
  switch (field) {
    case "id":
    case "name":
    case "type":
    case "discountType":
      promotionForm[field] = String(value ?? "");
      break;
    case "minQuantity":
    case "discountValue":
      promotionForm[field] = Number(value) || 0;
      break;
    case "enabled":
      promotionForm.enabled = Boolean(value);
      break;
  }
}

function isPromotionTargetSelected(productId: number | string, specKey = "") {
  return promotionForm.targetItems.some((item) =>
    Number(item.productId) === Number(productId) &&
    String(item.specKey || "") === String(specKey || "")
  );
}

function togglePromotionTarget(
  productId: number | string,
  specKey = "",
  checked = false,
) {
  const normalizedProductId = Number(productId) || 0;
  const normalizedSpecKey = String(specKey || "");
  if (!normalizedProductId) return;

  const nextItems = promotionForm.targetItems.filter((item) =>
    !(
      Number(item.productId) === normalizedProductId &&
      String(item.specKey || "") === normalizedSpecKey
    )
  );

  if (checked) {
    nextItems.push({
      productId: normalizedProductId,
      specKey: normalizedSpecKey,
    });
  }

  promotionForm.targetItems = nextItems;
}

const promotionProductGroups = computed(() => {
  const { getProducts } = getServices();
  const products = Array.isArray(getProducts?.()) ? getProducts() : [];
  return buildPromotionProductGroups(products);
});

function destroyPromotionSortable() {
  if (!promotionSortable) return;
  promotionSortable.destroy();
  promotionSortable = null;
}

async function syncPromotionSortable() {
  const { Sortable, Swal } = getServices();
  destroyPromotionSortable();
  if (!Sortable?.create) return;
  const tableElement = promotionsTableElement;
  if (!tableElement?.querySelector?.("[data-id]")) return;

  promotionSortable = Sortable.create(tableElement, {
    handle: ".drag-handle-promo",
    animation: 150,
    onEnd: async (event) => {
      if (event.oldIndex === event.newIndex) return;
      const ids = Array.from(tableElement.querySelectorAll("[data-id]"))
        .map((element) =>
          element instanceof HTMLElement
            ? Number.parseInt(element.dataset["id"] || "", 10)
            : NaN
        )
        .filter((id) => !Number.isNaN(id));

      try {
        await updatePromotionOrders(ids);
      } catch (error) {
        Swal.fire("錯誤", getDashboardErrorMessage(error, "活動排序更新失敗"), "error");
        await loadPromotions();
      }
    },
  });
}

async function queuePromotionsSync() {
  await nextTick();
  await syncPromotionSortable();
}

function registerPromotionsTableElement(element: HTMLElement | null) {
  promotionsTableElement = element || null;
  if (promotionsTableElement) {
    queuePromotionsSync();
  }
}

async function ensureProductsReady() {
  const { getProducts, ensureProductsLoaded } = getServices();
  if (!(getProducts?.() || []).length) {
    await ensureProductsLoaded?.();
  }
}

async function loadPromotions() {
  try {
    const { API_URL, authFetch } = getServices();
    const response = await authFetch(
      `${API_URL}?action=getPromotions&_=${Date.now()}`,
    );
    const data = await response.json();
    if (!data.success) return;
    promotions.value = Array.isArray(data["promotions"])
      ? data["promotions"].map(normalizePromotion)
      : [];
    syncPromotionsMap();
    await queuePromotionsSync();
  } catch (error) {
    logger.error("載入優惠活動失敗", error);
  }
}

async function updatePromotionOrders(ids: number[]) {
  const { API_URL, authFetch, getAuthUserId } = getServices();
  const response = await authFetch(`${API_URL}?action=reorderPromotionsBulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: getAuthUserId(), ids }),
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "活動排序更新失敗");
  }
  await loadPromotions();
}

async function showPromotionModal() {
  await ensureProductsReady();
  resetPromotionForm();
  isPromotionModalOpen.value = true;
}

async function editPromotion(id: number | string) {
  await ensureProductsReady();
  syncPromotionsMap();
  const promotion = promotionsMap[String(id)];
  if (!promotion) {
    getServices().Swal.fire("錯誤", "找不到活動", "error");
    return;
  }

  promotionForm.id = String(promotion.id || "");
  promotionForm.name = String(promotion.name || "");
  promotionForm.type = String(promotion.type || "bundle");
  promotionForm.minQuantity = Number(promotion.minQuantity) || 1;
  promotionForm.discountType = String(promotion.discountType || "percent");
  promotionForm.discountValue = Number(promotion.discountValue) || 0;
  promotionForm.enabled = Boolean(promotion.enabled);
  promotionForm.targetItems = normalizeTargetItems(promotion);
  isPromotionModalOpen.value = true;
}

function closePromotionModal() {
  isPromotionModalOpen.value = false;
}

async function savePromotion(event?: Event) {
  event?.preventDefault?.();
  const { API_URL, authFetch, getAuthUserId, Toast, Swal } = getServices();

  const payload: {
    userId: string;
    name: string;
    type: string;
    targetItems: PromotionTargetItem[];
    minQuantity: number;
    discountType: string;
    discountValue: number;
    enabled: boolean;
    id?: number;
  } = {
    userId: getAuthUserId(),
    name: String(promotionForm.name || "").trim(),
    type: String(promotionForm.type || "bundle"),
    targetItems: promotionForm.targetItems.map((item) => ({
      productId: Number(item.productId) || 0,
      specKey: String(item.specKey || ""),
    })).filter((item) => item.productId > 0),
    minQuantity: Number.parseInt(String(promotionForm.minQuantity || 1), 10) || 1,
    discountType: String(promotionForm.discountType || "percent"),
    discountValue: Number.parseFloat(String(promotionForm.discountValue || 0)) || 0,
    enabled: Boolean(promotionForm.enabled),
  };

  if (promotionForm.id) {
    payload["id"] = Number.parseInt(promotionForm.id, 10);
  }

  try {
    const response = await authFetch(
      `${API_URL}?action=${promotionForm.id ? "updatePromotion" : "addPromotion"}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = await response.json();
    if (!data.success) throw new Error(data.error || "活動儲存失敗");
    Toast.fire({
      icon: "success",
      title: promotionForm.id ? "已更新" : "已新增",
    });
    closePromotionModal();
    await loadPromotions();
  } catch (error) {
    Swal.fire("錯誤", getDashboardErrorMessage(error, "活動儲存失敗"), "error");
  }
}

async function delPromotion(id: number | string) {
  const { API_URL, authFetch, getAuthUserId, Toast, Swal } = getServices();
  const confirmation = await Swal.fire({
    title: "刪除活動？",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#DC322F",
    confirmButtonText: "刪除",
    cancelButtonText: "取消",
  });
  if (!confirmation.isConfirmed) return;

  try {
    const response = await authFetch(`${API_URL}?action=deletePromotion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), id }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || "活動刪除失敗");
    Toast.fire({ icon: "success", title: "已刪除" });
    await loadPromotions();
  } catch (error) {
    Swal.fire("錯誤", getDashboardErrorMessage(error, "活動刪除失敗"), "error");
  }
}

async function togglePromotionEnabled(id: number | string, enabled: boolean) {
  const { API_URL, authFetch, getAuthUserId, Toast, Swal } = getServices();
  syncPromotionsMap();
  const promotion = promotionsMap[String(id)];
  if (!promotion) {
    Swal.fire("錯誤", "找不到活動", "error");
    return;
  }

  const payload = {
    userId: getAuthUserId(),
    id: Number(promotion.id),
    name: promotion.name || "",
    type: promotion.type || "bundle",
    targetProductIds: Array.isArray(promotion.targetProductIds)
      ? promotion.targetProductIds
      : [],
    targetItems: Array.isArray(promotion.targetItems)
      ? promotion.targetItems
      : [],
    minQuantity: Number(promotion.minQuantity) || 1,
    discountType: promotion.discountType || "percent",
    discountValue: Number(promotion.discountValue) || 0,
    enabled: Boolean(enabled),
    startTime: promotion.startTime || null,
    endTime: promotion.endTime || null,
  };

  try {
    const response = await authFetch(`${API_URL}?action=updatePromotion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "活動狀態更新失敗");
    }
    promotion.enabled = Boolean(enabled);
    Toast.fire({
      icon: "success",
      title: enabled ? "活動已啟用" : "活動已停用",
    });
  } catch (error) {
    Swal.fire("錯誤", getDashboardErrorMessage(error, "活動狀態更新失敗"), "error");
  }
}

export function configureDashboardPromotionsServices(
  nextServices: DashboardPromotionsServices,
) {
  services = {
    ...services,
    ...nextServices,
  };
}

export function useDashboardPromotions() {
  return {
    promotionsView,
    isPromotionModalOpen,
    promotionModalTitle,
    promotionForm,
    promotionProductGroups,
    updatePromotionField,
    isPromotionTargetSelected,
    togglePromotionTarget,
  };
}

export const dashboardPromotionsActions = {
  registerPromotionsTableElement,
  loadPromotions,
  updatePromotionOrders,
  showPromotionModal,
  editPromotion,
  closePromotionModal,
  savePromotion,
  delPromotion,
  togglePromotionEnabled,
};
