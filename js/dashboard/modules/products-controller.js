export function createProductsController(deps) {
  let productsMap = {};

  const defaultSpecs = [
    { key: "quarter", label: "1/4磅", price: 0, enabled: true },
    { key: "half", label: "半磅", price: 0, enabled: true },
    { key: "drip_bag", label: "單包耳掛", price: 0, enabled: true },
  ];

  function getProducts() {
    return Array.isArray(deps.getProducts?.()) ? deps.getProducts() : [];
  }

  function syncProductsMap(products = getProducts()) {
    productsMap = {};
    products.forEach((product) => {
      productsMap[product.id] = product;
    });
  }

  function isVueManagedProductsTable(
    table = document.getElementById("products-main-table"),
  ) {
    return table?.dataset?.vueManaged === "true";
  }

  function getProductPriceLines(product) {
    try {
      const specs = product.specs ? JSON.parse(product.specs) : [];
      const enabled = specs.filter((spec) => spec.enabled);
      if (enabled.length > 0) {
        return enabled.map((spec) => ({
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

  function buildGroupedProductsViewModel(nextProducts = getProducts()) {
    const grouped = {};
    (Array.isArray(nextProducts) ? nextProducts : []).forEach((product) => {
      const category = product?.category || "";
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(buildProductViewModel(product));
    });
    const categoryOrder = deps.getCategories().map((category) => category.name);
    const sortedCategories = Object.keys(grouped).sort((a, b) => {
      const ia = categoryOrder.indexOf(a);
      const ib = categoryOrder.indexOf(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    return sortedCategories.map((category) => ({
      category,
      items: grouped[category],
    }));
  }

  function emitDashboardProductsUpdated(nextProducts = getProducts()) {
    window.dispatchEvent(
      new CustomEvent("coffee:dashboard-products-updated", {
        detail: { groups: buildGroupedProductsViewModel(nextProducts) },
      }),
    );
  }

  function initializeProductSortables(table) {
    if (!deps.Sortable?.create) return;
    if (Array.isArray(window.productSortables)) {
      window.productSortables.forEach((sortable) => sortable?.destroy?.());
    }
    window.productSortables = [];
    if (!table) return;

    const sortables = table.querySelectorAll("tbody.sortable-tbody");
    sortables.forEach((tbody) => {
      if (!(tbody instanceof HTMLElement)) return;
      if (!tbody.querySelector("tr[data-id]")) return;
      const sortable = deps.Sortable.create(tbody, {
        handle: ".drag-handle",
        animation: 150,
        onEnd: async function (event) {
          if (event.oldIndex === event.newIndex) return;
          const ids = Array.from(tbody.querySelectorAll("tr[data-id]"))
            .map((row) => Number.parseInt(row.dataset.id || "", 10))
            .filter((id) => !Number.isNaN(id));
          await updateProductOrders(ids);
        },
      });
      window.productSortables.push(sortable);
    });
  }

  function renderProducts() {
    const products = getProducts();
    const table = document.getElementById("products-main-table");
    if (!table) return;

    syncProductsMap(products);

    if (isVueManagedProductsTable(table)) {
      emitDashboardProductsUpdated(products);
      if (typeof deps.requestAnimationFrame === "function") {
        deps.requestAnimationFrame(() => initializeProductSortables(table));
      } else {
        initializeProductSortables(table);
      }
      return;
    }

    table.querySelectorAll("tbody").forEach((el) => el.remove());

    const grouped = buildGroupedProductsViewModel(products);
    if (!grouped.length) {
      const tbody = document.createElement("tbody");
      tbody.innerHTML =
        '<tr><td colspan="6" class="text-center py-8 ui-text-subtle">尚無商品</td></tr>';
      table.appendChild(tbody);
      initializeProductSortables(table);
      return;
    }

    grouped.forEach((group) => {
      const tbody = document.createElement("tbody");
      tbody.className = "sortable-tbody";
      tbody.dataset.cat = group.category;

      let html = "";
      group.items.forEach((product) => {
        const priceDisplay = product.priceLines.map((line) =>
          line.isSpec
            ? `<div class="text-xs">${deps.esc(line.label)}: $${line.price}</div>`
            : `$${line.price}`
        ).join("");
        html += `
            <tr class="border-b" style="border-color:#E2DCC8;" data-id="${product.id}">
                <td class="p-3 text-center">
                    <span class="drag-handle cursor-move ui-text-muted hover:ui-text-warning text-xl font-bold select-none px-2 inline-block" title="拖曳排序" style="touch-action: none;">
                      <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="drag-handle-icon"><path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60-12a12,12,0,1,0,12,12A12,12,0,0,0,164,48ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z"></path></svg>
                    </span>
                </td>
                <td class="p-3 text-sm">${deps.esc(product.category)}</td>
                <td class="p-3">
                    <div class="font-medium mb-1">${deps.esc(product.name)}</div>
                    <div class="text-xs ui-text-subtle">${
          deps.esc(product.description || "")
        } ${product.roastLevel ? "・" + product.roastLevel : ""}</div>
                </td>
                <td class="p-3 text-right font-medium">${priceDisplay}</td>
                <td class="p-3 text-center">
                    <button data-action="toggle-product-enabled" data-product-id="${product.id}" data-enabled="${String(!product.enabled)}" class="text-sm font-medium ${product.statusClass} hover:underline">${product.statusLabel}</button>
                </td>
                <td class="p-3 text-center">
                    <button data-action="edit-product" data-product-id="${product.id}" class="text-sm mr-2 ui-text-highlight">編輯</button>
                    <button data-action="delete-product" data-product-id="${product.id}" class="text-sm ui-text-danger">刪除</button>
                </td>
            </tr>`;
      });
      tbody.innerHTML = html;
      table.appendChild(tbody);
    });
    initializeProductSortables(table);
  }

  async function loadProducts() {
    try {
      const response = await deps.authFetch(
        `${deps.API_URL}?action=getProducts&_=${Date.now()}`,
      );
      const data = await response.json();
      if (!data.success) return;
      deps.setProducts(data.products);
      renderProducts();
    } catch (error) {
      console.error(error);
    }
  }

  async function moveProduct(id, dir) {
    try {
      const response = await deps.authFetch(`${deps.API_URL}?action=reorderProduct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deps.getAuthUserId(), id, direction: dir }),
      });
      const data = await response.json();
      if (data.success) loadProducts();
      else throw new Error(data.error);
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  async function updateProductOrders(ids) {
    try {
      const response = await deps.authFetch(
        `${deps.API_URL}?action=reorderProductsBulk`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: deps.getAuthUserId(), ids }),
        },
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
      loadProducts();
    }
  }

  function addSpecRow(specData) {
    const container = document.getElementById("specs-container");
    const spec = specData || { key: "", label: "", price: 0, enabled: true };
    const div = document.createElement("div");
    div.className = "spec-row flex items-center gap-2 p-2 rounded-lg border";
    div.style.borderColor = "#E2DCC8";
    div.innerHTML = `
        <label class="flex items-center"><input type="checkbox" class="spec-enabled w-4 h-4" ${
      spec.enabled ? "checked" : ""
    }></label>
        <input type="text" class="spec-label input-field text-sm py-1" value="${
      deps.esc(spec.label)
    }" placeholder="規格名稱" style="width:90px">
        <span class="ui-text-subtle text-sm">$</span>
        <input type="number" class="spec-price input-field text-sm py-1" value="${
      spec.price || ""
    }" placeholder="價格" min="0" style="width:80px">
        <button type="button" data-action="remove-spec-row" class="text-red-400 hover:ui-text-danger text-lg font-bold">&times;</button>
    `;
    container.appendChild(div);
  }

  function getSpecsFromForm() {
    const rows = document.querySelectorAll("#specs-container > div");
    const specs = [];
    rows.forEach((row) => {
      const label = row.querySelector(".spec-label").value.trim();
      const price = parseInt(row.querySelector(".spec-price").value) || 0;
      const enabled = row.querySelector(".spec-enabled").checked;
      if (!label) return;
      const key =
        label.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, "_").toLowerCase() ||
        `spec_${Date.now()}`;
      specs.push({ key, label, price, enabled });
    });
    return specs;
  }

  function loadSpecsToForm(specsStr) {
    const container = document.getElementById("specs-container");
    container.innerHTML = "";
    let specs = [];
    try {
      if (specsStr) specs = JSON.parse(specsStr);
    } catch {
    }
    if (!specs.length) specs = JSON.parse(JSON.stringify(defaultSpecs));
    specs.forEach((spec) => addSpecRow(spec));
  }

  function updateCategorySelect() {
    const select = document.getElementById("pm-category");
    select.innerHTML = '<option value="">選擇分類</option>' +
      deps.getCategories().map((category) =>
        `<option value="${deps.esc(category.name)}">${deps.esc(category.name)}</option>`
      ).join("");
  }

  async function showProductModal() {
    if (!deps.getCategories().length) await deps.ensureCategoriesLoaded();
    document.getElementById("pm-title").textContent = "新增商品";
    document.getElementById("product-form").reset();
    document.getElementById("pm-id").value = "";
    document.getElementById("pm-enabled").checked = true;
    updateCategorySelect();
    loadSpecsToForm("");
    document.getElementById("product-modal").classList.remove("hidden");
  }

  async function editProduct(id) {
    if (!deps.getCategories().length) await deps.ensureCategoriesLoaded();
    syncProductsMap();
    const product = productsMap[id];
    if (!product) {
      deps.Swal.fire("錯誤", "找不到商品", "error");
      return;
    }
    document.getElementById("pm-title").textContent = "編輯商品";
    document.getElementById("pm-id").value = product.id;
    updateCategorySelect();
    document.getElementById("pm-category").value = product.category;
    document.getElementById("pm-name").value = product.name;
    document.getElementById("pm-desc").value = product.description || "";
    document.getElementById("pm-roast").value = product.roastLevel || "";
    document.getElementById("pm-enabled").checked = product.enabled;
    loadSpecsToForm(product.specs || "");
    document.getElementById("product-modal").classList.remove("hidden");
  }

  function closeProductModal() {
    document.getElementById("product-modal").classList.add("hidden");
  }

  async function saveProduct(event) {
    event.preventDefault();
    const id = document.getElementById("pm-id").value;
    const specs = getSpecsFromForm();
    const enabledSpecs = specs.filter((spec) => spec.enabled);
    if (!enabledSpecs.length) {
      deps.Swal.fire("錯誤", "請至少啟用一個規格", "error");
      return;
    }
    const hasZeroPrice = enabledSpecs.some((spec) => !spec.price || spec.price <= 0);
    if (hasZeroPrice) {
      deps.Swal.fire("錯誤", "已啟用的規格必須設定價格", "error");
      return;
    }

    const payload = {
      userId: deps.getAuthUserId(),
      category: document.getElementById("pm-category").value,
      name: document.getElementById("pm-name").value,
      description: document.getElementById("pm-desc").value,
      price: enabledSpecs[0]?.price || 0,
      roastLevel: document.getElementById("pm-roast").value,
      specs: JSON.stringify(specs),
      enabled: document.getElementById("pm-enabled").checked,
    };
    if (id) payload.id = parseInt(id);

    try {
      const response = await deps.authFetch(
        `${deps.API_URL}?action=${id ? "updateProduct" : "addProduct"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      deps.Toast.fire({ icon: "success", title: id ? "已更新" : "已新增" });
      closeProductModal();
      loadProducts();
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  async function delProduct(id) {
    const confirmation = await deps.Swal.fire({
      title: "刪除商品？",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#DC322F",
      confirmButtonText: "刪除",
      cancelButtonText: "取消",
    });
    if (!confirmation.isConfirmed) return;
    try {
      const response = await deps.authFetch(`${deps.API_URL}?action=deleteProduct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deps.getAuthUserId(), id }),
      });
      const data = await response.json();
      if (!data.success) return;
      deps.Toast.fire({ icon: "success", title: "已刪除" });
      loadProducts();
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  async function toggleProductEnabled(id, enabled) {
    syncProductsMap();
    const product = productsMap[id];
    if (!product) {
      deps.Swal.fire("錯誤", "找不到商品", "error");
      return;
    }

    const payload = {
      userId: deps.getAuthUserId(),
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
      const response = await deps.authFetch(`${deps.API_URL}?action=updateProduct`, {
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
      deps.Toast.fire({
        icon: "success",
        title: enabled ? "商品已啟用" : "商品已停用",
      });
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  return {
    loadProducts,
    renderProducts,
    moveProduct,
    updateProductOrders,
    addSpecRow,
    showProductModal,
    editProduct,
    closeProductModal,
    saveProduct,
    delProduct,
    toggleProductEnabled,
  };
}
