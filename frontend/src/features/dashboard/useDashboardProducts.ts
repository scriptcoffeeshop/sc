import { computed, nextTick, reactive, ref } from "vue";
import {
  buildGroupedProductsView,
  buildSaveProductPayload,
  cloneSpecs,
  fillProductFormState,
  resetProductFormState,
  type DashboardProductFormState,
  type DashboardProductRecord,
  type DashboardProductSpec,
} from "./dashboardProductsShared.ts";
import { getDashboardErrorMessage } from "./dashboardErrors.ts";

interface DashboardToastLike {
  fire: (...args: unknown[]) => unknown;
}

interface DashboardSwalResult {
  isConfirmed?: boolean;
}

interface DashboardSwalLike {
  fire: (...args: unknown[]) => Promise<DashboardSwalResult> | unknown;
}

interface DashboardSortableInstance {
  destroy?: () => void;
}

interface DashboardSortableConstructor {
  create?: (
    element: HTMLElement,
    options: Record<string, unknown>,
  ) => DashboardSortableInstance;
}

interface DashboardCategoryRecord {
  id: number | string;
  name: string;
}

interface DashboardProductsServices {
  API_URL: string;
  authFetch: (input: string, init?: RequestInit) => Promise<Response>;
  getAuthUserId: () => string;
  getCategories?: () => DashboardCategoryRecord[];
  ensureCategoriesLoaded?: () => Promise<unknown> | unknown;
  Sortable?: DashboardSortableConstructor | null;
  Swal: DashboardSwalLike;
  Toast: DashboardToastLike;
}

interface DashboardProductsResponse {
  success?: boolean;
  error?: string;
  products?: DashboardProductRecord[];
}

type DashboardProductSortableWindow = Window & {
  productSortables?: DashboardSortableInstance[];
};

const products = ref<DashboardProductRecord[]>([]);
const categoryOptions = ref<Array<{ id: number | string; name: string }>>([]);
const isProductModalOpen = ref(false);
const categoriesVersion = ref(0);

const productForm = reactive<DashboardProductFormState>({
  id: "",
  category: "",
  name: "",
  description: "",
  roastLevel: "",
  enabled: true,
  specs: cloneSpecs(),
});

let productsMap: Record<string | number, DashboardProductRecord> = {};
let services: DashboardProductsServices | null = null;
let productsTableElement: HTMLElement | null = null;

function getServices(): DashboardProductsServices {
  if (!services) {
    throw new Error("Dashboard products services 尚未初始化");
  }
  return services;
}

function syncProductsMap(nextProducts: DashboardProductRecord[] = products.value) {
  productsMap = {};
  (Array.isArray(nextProducts) ? nextProducts : []).forEach((product) => {
    productsMap[product.id || ""] = product;
  });
}

function refreshCategoryOptions() {
  const { getCategories } = getServices();
  categoryOptions.value = (getCategories?.() || []).map((category) => ({
    id: category.id,
    name: category.name,
  }));
}

const productsGroupsView = computed(() => {
  categoriesVersion.value;
  const { getCategories } = getServices();
  const categoryOrder = (getCategories?.() || []).map((category) => category.name);
  return buildGroupedProductsView(products.value, categoryOrder);
});

const productModalTitle = computed(() => productForm.id ? "編輯商品" : "新增商品");

function updateProductField(
  field: keyof DashboardProductFormState,
  value: string | boolean | DashboardProductSpec[],
) {
  if (field === "enabled") {
    productForm.enabled = Boolean(value);
    return;
  }
  if (field === "specs") {
    productForm.specs = Array.isArray(value) ? value : productForm.specs;
    return;
  }

  productForm[field] = String(value) as DashboardProductFormState[typeof field];
}

function updateProductSpec(
  index: number,
  field: keyof DashboardProductSpec,
  value: string | number | boolean,
) {
  const targetSpec = productForm.specs[index];
  if (!targetSpec) return;
  targetSpec[field] = (field === "enabled" ? Boolean(value) : value) as never;
}

function addSpecRow(specData?: Partial<DashboardProductSpec>) {
  const spec = specData || { key: "", label: "", price: 0, enabled: true };
  productForm.specs.push({
    key: String(spec.key || ""),
    label: String(spec.label || ""),
    price: Number(spec.price) || 0,
    enabled: Boolean(spec.enabled),
  });
}

function removeSpecRow(index: number) {
  if (index < 0 || index >= productForm.specs.length) return;
  productForm.specs.splice(index, 1);
}

function getProductSortablesWindow(): DashboardProductSortableWindow {
  return window as DashboardProductSortableWindow;
}

async function syncProductSortables() {
  const { Sortable, Swal } = getServices();
  if (!Sortable?.create) return;

  const productsWindow = getProductSortablesWindow();
  if (Array.isArray(productsWindow.productSortables)) {
    productsWindow.productSortables.forEach((sortable) => sortable?.destroy?.());
  }
  productsWindow.productSortables = [];
  if (!productsTableElement) return;

  const sortables = productsTableElement.querySelectorAll("tbody.sortable-tbody");
  sortables.forEach((tbody) => {
    if (!(tbody instanceof HTMLElement)) return;
    if (!tbody.querySelector("tr[data-id]")) return;
    const sortable = Sortable.create?.(tbody, {
      handle: ".drag-handle",
      animation: 150,
      onEnd: async (event: { oldIndex?: number; newIndex?: number }) => {
        if (event.oldIndex === event.newIndex) return;
        const ids = Array.from(tbody.querySelectorAll("tr[data-id]"))
          .map((row) =>
            row instanceof HTMLElement
              ? Number.parseInt(row.dataset.id || "", 10)
              : NaN
          )
          .filter((id) => !Number.isNaN(id));
        try {
          await updateProductOrders(ids);
        } catch (error) {
          Swal.fire("錯誤", getDashboardErrorMessage(error, "商品排序更新失敗"), "error");
          await loadProducts();
        }
      },
    });
    if (sortable) productsWindow.productSortables.push(sortable);
  });
}

async function queueProductTableSync() {
  await nextTick();
  await syncProductSortables();
}

function registerProductsTableElement(element: HTMLElement | null) {
  productsTableElement = element || null;
  if (productsTableElement) {
    queueProductTableSync();
  }
}

function syncCategories() {
  categoriesVersion.value++;
  refreshCategoryOptions();
  queueProductTableSync();
}

async function loadProducts() {
  try {
    const { API_URL, authFetch } = getServices();
    const response = await authFetch(`${API_URL}?action=getProducts&_=${Date.now()}`);
    const data = await response.json() as DashboardProductsResponse;
    if (!data.success) return;
    products.value = Array.isArray(data.products) ? data.products : [];
    syncProductsMap();
    await queueProductTableSync();
  } catch (error) {
    console.error(error);
  }
}

function renderProducts() {
  syncProductsMap();
  queueProductTableSync();
  return productsGroupsView.value;
}

async function moveProduct(id: number, direction: string) {
  try {
    const { API_URL, authFetch, getAuthUserId } = getServices();
    const response = await authFetch(`${API_URL}?action=reorderProduct`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), id, direction }),
    });
    const data = await response.json() as { success?: boolean; error?: string };
    if (!data.success) throw new Error(data.error);
    await loadProducts();
  } catch (error) {
    getServices().Swal.fire("錯誤", getDashboardErrorMessage(error, "商品排序失敗"), "error");
  }
}

async function updateProductOrders(ids: number[]) {
  const { API_URL, authFetch, getAuthUserId } = getServices();
  const response = await authFetch(`${API_URL}?action=reorderProductsBulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: getAuthUserId(), ids }),
  });
  const data = await response.json() as { success?: boolean; error?: string };
  if (!data.success) {
    throw new Error(data.error || "商品排序更新失敗");
  }
}

async function ensureCategoriesReady() {
  const { getCategories, ensureCategoriesLoaded } = getServices();
  if (!(getCategories?.() || []).length) {
    await ensureCategoriesLoaded?.();
  }
  refreshCategoryOptions();
}

async function showProductModal() {
  await ensureCategoriesReady();
  resetProductFormState(productForm);
  isProductModalOpen.value = true;
}

async function editProduct(id: number) {
  const { Swal } = getServices();
  await ensureCategoriesReady();
  syncProductsMap();
  const product = productsMap[id];
  if (!product) {
    Swal.fire("錯誤", "找不到商品", "error");
    return;
  }

  fillProductFormState(productForm, product);
  isProductModalOpen.value = true;
}

function closeProductModal() {
  isProductModalOpen.value = false;
}

async function saveProduct(event?: Event) {
  event?.preventDefault?.();
  const { API_URL, authFetch, getAuthUserId, Toast, Swal } = getServices();
  const { enabledSpecs, payload } = buildSaveProductPayload(
    productForm,
    getAuthUserId(),
  );

  if (!enabledSpecs.length) {
    Swal.fire("錯誤", "請至少啟用一個規格", "error");
    return;
  }
  if (enabledSpecs.some((spec) => !spec.price || spec.price <= 0)) {
    Swal.fire("錯誤", "已啟用的規格必須設定價格", "error");
    return;
  }

  try {
    const response = await authFetch(
      `${API_URL}?action=${productForm.id ? "updateProduct" : "addProduct"}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = await response.json() as { success?: boolean; error?: string };
    if (!data.success) throw new Error(data.error);
    Toast.fire({ icon: "success", title: productForm.id ? "已更新" : "已新增" });
    closeProductModal();
    await loadProducts();
  } catch (error) {
    Swal.fire("錯誤", getDashboardErrorMessage(error, "商品儲存失敗"), "error");
  }
}

async function delProduct(id: number) {
  const { API_URL, authFetch, getAuthUserId, Toast, Swal } = getServices();
  const confirmation = await Swal.fire({
    title: "刪除商品？",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#DC322F",
    confirmButtonText: "刪除",
    cancelButtonText: "取消",
  }) as DashboardSwalResult;
  if (!confirmation.isConfirmed) return;

  try {
    const response = await authFetch(`${API_URL}?action=deleteProduct`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), id }),
    });
    const data = await response.json() as { success?: boolean; error?: string };
    if (!data.success) return;
    Toast.fire({ icon: "success", title: "已刪除" });
    await loadProducts();
  } catch (error) {
    Swal.fire("錯誤", getDashboardErrorMessage(error, "商品刪除失敗"), "error");
  }
}

async function toggleProductEnabled(id: number, enabled: boolean) {
  const { API_URL, authFetch, getAuthUserId, Toast, Swal } = getServices();
  syncProductsMap();
  const product = productsMap[id];
  if (!product) {
    Swal.fire("錯誤", "找不到商品", "error");
    return;
  }

  const payload = {
    userId: getAuthUserId(),
    id: Number(product.id),
    category: product.category || "",
    name: product.name || "",
    description: product.description || "",
    price: Number(product.price) || 0,
    weight: product.weight || "",
    origin: product.origin || "",
    roastLevel: product.roastLevel || "",
    specs: product.specs || "",
    imageUrl: product.imageUrl || "",
    enabled: Boolean(enabled),
  };

  try {
    const response = await authFetch(`${API_URL}?action=updateProduct`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json() as { success?: boolean; error?: string };
    if (!data.success) {
      throw new Error(data.error || "商品狀態更新失敗");
    }
    product.enabled = Boolean(enabled);
    renderProducts();
    Toast.fire({
      icon: "success",
      title: enabled ? "商品已啟用" : "商品已停用",
    });
  } catch (error) {
    Swal.fire("錯誤", getDashboardErrorMessage(error, "商品狀態更新失敗"), "error");
  }
}

export function configureDashboardProductsServices(
  nextServices: Partial<DashboardProductsServices>,
) {
  services = {
    ...(services || {}),
    ...nextServices,
  } as DashboardProductsServices;
}

export function getDashboardProducts() {
  return products.value;
}

export function useDashboardProducts() {
  return {
    productsGroupsView,
    isProductModalOpen,
    productModalTitle,
    productForm,
    categoryOptions,
    updateProductField,
    updateProductSpec,
  };
}

export const dashboardProductsActions = {
  registerProductsTableElement,
  syncCategories,
  loadProducts,
  renderProducts,
  moveProduct,
  updateProductOrders,
  addSpecRow,
  removeSpecRow,
  showProductModal,
  editProduct,
  closeProductModal,
  saveProduct,
  delProduct,
  toggleProductEnabled,
};
