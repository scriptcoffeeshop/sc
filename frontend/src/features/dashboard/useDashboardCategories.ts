import { computed, nextTick, ref } from "vue";

import type {
  DashboardAuthFetch,
  DashboardSwal,
  DashboardToast,
} from "./dashboardOrderTypes";
import { asJsonRecord } from "../../lib/jsonUtils.ts";
import { getDashboardErrorMessage } from "./dashboardErrors.ts";

type DashboardCategoryRecord = Record<string, unknown> & {
  id: number | string;
  name: string;
};

type CategorySortableEvent = {
  oldIndex?: number;
  newIndex?: number;
};

type CategorySortableInstance = {
  destroy: () => void;
};

type CategorySortableService = {
  create?: (
    element: Element,
    options: {
      handle: string;
      animation: number;
      onEnd: (event: CategorySortableEvent) => void | Promise<void>;
    },
  ) => CategorySortableInstance;
};

type DashboardCategoriesServices = {
  API_URL: string;
  authFetch: DashboardAuthFetch;
  getAuthUserId: () => string;
  onCategoriesChanged?: (categories: DashboardCategoryRecord[]) => unknown;
  loadProducts?: () => Promise<unknown> | unknown;
  Sortable?: CategorySortableService | null;
  Swal: DashboardSwal;
  Toast: DashboardToast;
};

const categories = ref<DashboardCategoryRecord[]>([]);
const newCategoryName = ref("");

let categoriesMap: Record<string, DashboardCategoryRecord> = {};
let services: DashboardCategoriesServices | null = null;
let categoriesListElement: HTMLElement | null = null;
let categorySortable: CategorySortableInstance | null = null;

function getServices(): DashboardCategoriesServices {
  if (!services) {
    throw new Error("Dashboard categories services 尚未初始化");
  }
  return services;
}

function normalizeCategory(value: unknown): DashboardCategoryRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = asJsonRecord(value);
  if (record.id === undefined || record.id === null) return null;
  return {
    ...record,
    id:
      typeof record.id === "number" || typeof record.id === "string"
        ? record.id
        : String(record.id),
    name: String(record.name || ""),
  };
}

function syncCategoriesMap(nextCategories = categories.value) {
  categoriesMap = {};
  (Array.isArray(nextCategories) ? nextCategories : []).forEach((category) => {
    categoriesMap[String(category.id || "")] = category;
  });
}

function buildCategoryViewModel(category: DashboardCategoryRecord) {
  return {
    id: Number(category.id) || 0,
    name: String(category.name || ""),
  };
}

const categoriesView = computed(() =>
  categories.value
    .map((category) => buildCategoryViewModel(category))
    .filter((category) => category.id > 0)
);

function destroyCategorySortable() {
  if (!categorySortable) return;
  categorySortable.destroy();
  categorySortable = null;
}

async function syncCategorySortable() {
  const { Sortable, Swal } = getServices();
  destroyCategorySortable();
  if (!Sortable?.create) return;
  if (!categoriesListElement?.querySelector?.("[data-id]")) return;

  categorySortable = Sortable.create(categoriesListElement, {
    handle: ".drag-handle-cat",
    animation: 150,
    onEnd: async (event) => {
      if (event.oldIndex === event.newIndex) return;
      const ids = Array.from(categoriesListElement.querySelectorAll("[data-id]"))
        .map((element) =>
          element instanceof HTMLElement
            ? Number.parseInt(element.dataset.id || "", 10)
            : NaN
        )
        .filter((id) => !Number.isNaN(id));

      try {
        await updateCategoryOrders(ids);
      } catch (error) {
        Swal.fire("錯誤", getDashboardErrorMessage(error, "分類排序更新失敗"), "error");
        await loadCategories();
      }
    },
  });
}

async function queueCategoriesSync() {
  await nextTick();
  await syncCategorySortable();
}

function registerCategoriesListElement(element: HTMLElement | null) {
  categoriesListElement = element || null;
  if (categoriesListElement) {
    queueCategoriesSync();
  }
}

function notifyCategoriesChanged() {
  const { onCategoriesChanged } = getServices();
  onCategoriesChanged?.(categories.value);
}

async function loadCategories() {
  try {
    const { API_URL, authFetch } = getServices();
    const response = await authFetch(
      `${API_URL}?action=getCategories&_=${Date.now()}`,
    );
    const data = await response.json();
    if (!data.success) return;
    categories.value = Array.isArray(data.categories)
      ? data.categories.map(normalizeCategory).filter((category) => category !== null)
      : [];
    syncCategoriesMap();
    notifyCategoriesChanged();
    await queueCategoriesSync();
  } catch (error) {
    console.error(error);
  }
}

async function addCategory() {
  const name = newCategoryName.value.trim();
  if (!name) return;

  try {
    const { API_URL, authFetch, getAuthUserId, Toast } = getServices();
    const response = await authFetch(`${API_URL}?action=addCategory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), name }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || "新增分類失敗");
    newCategoryName.value = "";
    Toast.fire({ icon: "success", title: "已新增" });
    await loadCategories();
  } catch (error) {
    getServices().Swal.fire("錯誤", getDashboardErrorMessage(error, "新增分類失敗"), "error");
  }
}

async function editCategory(id: number | string) {
  syncCategoriesMap();
  const category = categoriesMap[String(id)];
  if (!category) {
    getServices().Swal.fire("錯誤", "找不到分類", "error");
    return;
  }

  const { value } = await getServices().Swal.fire({
    title: "修改分類",
    input: "text",
    inputValue: category.name,
    showCancelButton: true,
    confirmButtonText: "更新",
    cancelButtonText: "取消",
  });
  const nextName = String(value || "").trim();
  if (!nextName || nextName === category.name) return;

  try {
    const { API_URL, authFetch, getAuthUserId, Toast, loadProducts } =
      getServices();
    const response = await authFetch(`${API_URL}?action=updateCategory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: getAuthUserId(),
        id,
        name: nextName,
      }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || "分類更新失敗");
    Toast.fire({ icon: "success", title: "分類已更新，商品同步完成" });
    await loadCategories();
    await loadProducts?.();
  } catch (error) {
    getServices().Swal.fire("錯誤", getDashboardErrorMessage(error, "分類更新失敗"), "error");
  }
}

async function delCategory(id: number | string) {
  const confirmation = await getServices().Swal.fire({
    title: "刪除分類？",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#DC322F",
    confirmButtonText: "刪除",
    cancelButtonText: "取消",
  });
  if (!confirmation.isConfirmed) return;

  try {
    const { API_URL, authFetch, getAuthUserId, Toast, loadProducts } =
      getServices();
    const response = await authFetch(`${API_URL}?action=deleteCategory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), id }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || "分類刪除失敗");
    Toast.fire({ icon: "success", title: "已刪除" });
    await loadCategories();
    await loadProducts?.();
  } catch (error) {
    getServices().Swal.fire("錯誤", getDashboardErrorMessage(error, "分類刪除失敗"), "error");
  }
}

async function updateCategoryOrders(ids: number[]) {
  const { API_URL, authFetch, getAuthUserId } = getServices();
  const response = await authFetch(`${API_URL}?action=reorderCategory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: getAuthUserId(), ids }),
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "分類排序更新失敗");
  }
  await loadCategories();
}

export function configureDashboardCategoriesServices(
  nextServices: DashboardCategoriesServices,
) {
  services = {
    ...services,
    ...nextServices,
  };
}

export function getDashboardCategories() {
  return categories.value;
}

export function useDashboardCategories() {
  return {
    categoriesView,
    newCategoryName,
  };
}

export const dashboardCategoriesActions = {
  registerCategoriesListElement,
  loadCategories,
  addCategory,
  editCategory,
  delCategory,
  updateCategoryOrders,
};
