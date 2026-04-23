import { computed, nextTick, reactive, ref } from "vue";

const defaultSpecs = [
  { key: "quarter", label: "1/4磅", price: 0, enabled: true },
  { key: "half", label: "半磅", price: 0, enabled: true },
  { key: "drip_bag", label: "單包耳掛", price: 0, enabled: true },
];

const products = ref([]);
const categoryOptions = ref([]);
const isProductModalOpen = ref(false);
const categoriesVersion = ref(0);

const productForm = reactive({
  id: "",
  category: "",
  name: "",
  description: "",
  roastLevel: "",
  enabled: true,
  specs: [],
});

let productsMap = {};
let services = null;
let productsTableElement = null;

function getServices() {
  if (!services) {
    throw new Error("Dashboard products services 尚未初始化");
  }
  return services;
}

function cloneSpecs(specs = defaultSpecs) {
  return specs.map((spec) => ({
    key: String(spec.key || ""),
    label: String(spec.label || ""),
    price: Number(spec.price) || 0,
    enabled: Boolean(spec.enabled),
  }));
}

function syncProductsMap(nextProducts = products.value) {
  productsMap = {};
  (Array.isArray(nextProducts) ? nextProducts : []).forEach((product) => {
    productsMap[product.id] = product;
  });
}

function refreshCategoryOptions() {
  const { getCategories } = getServices();
  categoryOptions.value = (getCategories?.() || []).map((category) => ({
    id: category.id,
    name: category.name,
  }));
}

function getProductPriceLines(product) {
  try {
    const specs = product.specs ? JSON.parse(product.specs) : [];
    const enabledSpecs = specs.filter((spec) => spec.enabled);
    if (enabledSpecs.length > 0) {
      return enabledSpecs.map((spec) => ({
        label: spec.label || "",
        price: Number(spec.price) || 0,
        isSpec: true,
      }));
    }
  } catch {
  }
  return [{ label: "", price: Number(product.price) || 0, isSpec: false }];
}

function buildProductViewModel(product) {
  const enabled = Boolean(product?.enabled);
  return {
    id: Number(product?.id) || 0,
    category: product?.category || "",
    name: product?.name || "",
    description: product?.description || "",
    roastLevel: product?.roastLevel || "",
    enabled,
    statusLabel: enabled ? "啟用" : "未啟用",
    statusClass: enabled ? "ui-text-success" : "ui-text-muted",
    priceLines: getProductPriceLines(product),
  };
}

const productsGroupsView = computed(() => {
  categoriesVersion.value;
  const grouped = {};
  products.value.forEach((product) => {
    const category = product?.category || "";
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(buildProductViewModel(product));
  });
  const { getCategories } = getServices();
  const categoryOrder = (getCategories?.() || []).map((category) => category.name);
  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a);
    const bIndex = categoryOrder.indexOf(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
  return sortedCategories.map((category) => ({
    category,
    items: grouped[category],
  }));
});

const productModalTitle = computed(() => productForm.id ? "編輯商品" : "新增商品");

function resetProductForm() {
  productForm.id = "";
  productForm.category = "";
  productForm.name = "";
  productForm.description = "";
  productForm.roastLevel = "";
  productForm.enabled = true;
  productForm.specs = cloneSpecs();
}

function updateProductField(field, value) {
  productForm[field] = value;
}

function updateProductSpec(index, field, value) {
  const targetSpec = productForm.specs[index];
  if (!targetSpec) return;
  targetSpec[field] = field === "enabled" ? Boolean(value) : value;
}

function addSpecRow(specData) {
  const spec = specData || { key: "", label: "", price: 0, enabled: true };
  productForm.specs.push({
    key: String(spec.key || ""),
    label: String(spec.label || ""),
    price: Number(spec.price) || 0,
    enabled: Boolean(spec.enabled),
  });
}

function removeSpecRow(index) {
  if (index < 0 || index >= productForm.specs.length) return;
  productForm.specs.splice(index, 1);
}

function getSpecsFromForm() {
  return productForm.specs.reduce((result, spec, index) => {
    const label = String(spec.label || "").trim();
    const price = Number(spec.price) || 0;
    const enabled = Boolean(spec.enabled);
    if (!label) return result;
    const key = String(spec.key || "").trim() ||
      label.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, "_").toLowerCase() ||
      `spec_${index}_${Date.now()}`;
    result.push({ key, label, price, enabled });
    return result;
  }, []);
}

async function syncProductSortables() {
  const { Sortable, Swal } = getServices();
  if (!Sortable?.create) return;
  if (Array.isArray(window.productSortables)) {
    window.productSortables.forEach((sortable) => sortable?.destroy?.());
  }
  window.productSortables = [];
  if (!productsTableElement) return;

  const sortables = productsTableElement.querySelectorAll("tbody.sortable-tbody");
  sortables.forEach((tbody) => {
    if (!(tbody instanceof HTMLElement)) return;
    if (!tbody.querySelector("tr[data-id]")) return;
    const sortable = Sortable.create(tbody, {
      handle: ".drag-handle",
      animation: 150,
      onEnd: async (event) => {
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
          Swal.fire("錯誤", error?.message || "商品排序更新失敗", "error");
          await loadProducts();
        }
      },
    });
    window.productSortables.push(sortable);
  });
}

async function queueProductTableSync() {
  await nextTick();
  await syncProductSortables();
}

function registerProductsTableElement(element) {
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
    const data = await response.json();
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

async function moveProduct(id, direction) {
  try {
    const { API_URL, authFetch, getAuthUserId } = getServices();
    const response = await authFetch(`${API_URL}?action=reorderProduct`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), id, direction }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    await loadProducts();
  } catch (error) {
    getServices().Swal.fire("錯誤", error?.message || "商品排序失敗", "error");
  }
}

async function updateProductOrders(ids) {
  const { API_URL, authFetch, getAuthUserId } = getServices();
  const response = await authFetch(`${API_URL}?action=reorderProductsBulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: getAuthUserId(), ids }),
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "商品排序更新失敗");
  }
}

async function showProductModal() {
  const { getCategories, ensureCategoriesLoaded } = getServices();
  if (!(getCategories?.() || []).length) {
    await ensureCategoriesLoaded?.();
  }
  refreshCategoryOptions();
  resetProductForm();
  isProductModalOpen.value = true;
}

async function editProduct(id) {
  const { getCategories, ensureCategoriesLoaded, Swal } = getServices();
  if (!(getCategories?.() || []).length) {
    await ensureCategoriesLoaded?.();
  }
  refreshCategoryOptions();
  syncProductsMap();
  const product = productsMap[id];
  if (!product) {
    Swal.fire("錯誤", "找不到商品", "error");
    return;
  }

  productForm.id = String(product.id || "");
  productForm.category = product.category || "";
  productForm.name = product.name || "";
  productForm.description = product.description || "";
  productForm.roastLevel = product.roastLevel || "";
  productForm.enabled = Boolean(product.enabled);
  let specs = [];
  try {
    if (product.specs) specs = JSON.parse(product.specs);
  } catch {
  }
  productForm.specs = specs.length ? cloneSpecs(specs) : cloneSpecs();
  isProductModalOpen.value = true;
}

function closeProductModal() {
  isProductModalOpen.value = false;
}

async function saveProduct(event) {
  event?.preventDefault?.();
  const { API_URL, authFetch, getAuthUserId, Toast, Swal } = getServices();
  const specs = getSpecsFromForm();
  const enabledSpecs = specs.filter((spec) => spec.enabled);

  if (!enabledSpecs.length) {
    Swal.fire("錯誤", "請至少啟用一個規格", "error");
    return;
  }
  if (enabledSpecs.some((spec) => !spec.price || spec.price <= 0)) {
    Swal.fire("錯誤", "已啟用的規格必須設定價格", "error");
    return;
  }

  const payload: Record<string, any> = {
    userId: getAuthUserId(),
    category: productForm.category,
    name: productForm.name,
    description: productForm.description,
    price: enabledSpecs[0]?.price || 0,
    roastLevel: productForm.roastLevel,
    specs: JSON.stringify(specs),
    enabled: productForm.enabled,
  };
  if (productForm.id) {
    payload.id = Number.parseInt(productForm.id, 10);
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
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    Toast.fire({ icon: "success", title: productForm.id ? "已更新" : "已新增" });
    closeProductModal();
    await loadProducts();
  } catch (error) {
    Swal.fire("錯誤", error?.message || "商品儲存失敗", "error");
  }
}

async function delProduct(id) {
  const { API_URL, authFetch, getAuthUserId, Toast, Swal } = getServices();
  const confirmation = await Swal.fire({
    title: "刪除商品？",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#DC322F",
    confirmButtonText: "刪除",
    cancelButtonText: "取消",
  });
  if (!confirmation.isConfirmed) return;

  try {
    const response = await authFetch(`${API_URL}?action=deleteProduct`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), id }),
    });
    const data = await response.json();
    if (!data.success) return;
    Toast.fire({ icon: "success", title: "已刪除" });
    await loadProducts();
  } catch (error) {
    Swal.fire("錯誤", error?.message || "商品刪除失敗", "error");
  }
}

async function toggleProductEnabled(id, enabled) {
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
    const data = await response.json();
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
    Swal.fire("錯誤", error?.message || "商品狀態更新失敗", "error");
  }
}

export function configureDashboardProductsServices(nextServices) {
  services = {
    ...services,
    ...nextServices,
  };
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
