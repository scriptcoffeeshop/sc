export function createCategoriesController(deps) {
  let categoriesMap = {};

  function getCategories() {
    return Array.isArray(deps.getCategories?.()) ? deps.getCategories() : [];
  }

  function isVueManagedCategoriesList(
    container = document.getElementById("categories-list"),
  ) {
    return container?.dataset?.vueManaged === "true";
  }

  function buildCategoryViewModel(category) {
    return {
      id: Number(category?.id) || 0,
      name: category?.name || "",
    };
  }

  function emitDashboardCategoriesUpdated(nextCategories = getCategories()) {
    const viewCategories = (Array.isArray(nextCategories) ? nextCategories : [])
      .map((category) => buildCategoryViewModel(category))
      .filter((category) => category.id > 0);
    window.dispatchEvent(
      new CustomEvent("coffee:dashboard-categories-updated", {
        detail: { categories: viewCategories },
      }),
    );
  }

  function initializeCategorySortable(container) {
    if (!deps.Sortable) return;
    if (window.categorySortable) {
      window.categorySortable.destroy();
      window.categorySortable = null;
    }
    if (!container?.querySelector("[data-id]")) return;
    window.categorySortable = deps.Sortable.create(container, {
      handle: ".drag-handle-cat",
      animation: 150,
      onEnd: async function () {
        const ids = Array.from(container.querySelectorAll("[data-id]"))
          .map((el) => Number.parseInt(el.dataset.id || "", 10))
          .filter((id) => !Number.isNaN(id));
        await updateCategoryOrders(ids);
      },
    });
  }

  function renderCategories() {
    const categories = getCategories();
    const container = document.getElementById("categories-list");
    if (!container) return;

    categoriesMap = {};
    categories.forEach((category) => {
      categoriesMap[category.id] = category;
    });

    if (isVueManagedCategoriesList(container)) {
      emitDashboardCategoriesUpdated(categories);
      if (typeof deps.requestAnimationFrame === "function") {
        deps.requestAnimationFrame(() => initializeCategorySortable(container));
      } else {
        initializeCategorySortable(container);
      }
      return;
    }

    if (!categories.length) {
      container.innerHTML =
        '<p class="text-center ui-text-subtle py-4">尚無分類</p>';
      initializeCategorySortable(container);
      return;
    }

    container.innerHTML = categories.map((category) => `
        <div class="flex items-center justify-between p-3 mb-2 rounded-lg" style="background:#FFFDF7; border:1px solid #E2DCC8;" data-id="${category.id}">
            <div class="flex items-center gap-2">
                <span class="drag-handle-cat cursor-move ui-text-muted hover:ui-text-warning text-xl font-bold select-none px-1" title="拖曳排序" style="touch-action: none;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="drag-handle-icon"><path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60-12a12,12,0,1,0,12,12A12,12,0,0,0,164,48ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z"></path></svg>
                </span>
                <span class="font-medium">${deps.esc(category.name)}</span>
            </div>
            <div class="flex gap-2">
                <button data-action="edit-category" data-category-id="${category.id}" class="text-sm ui-text-highlight">編輯</button>
                <button data-action="delete-category" data-category-id="${category.id}" class="text-sm ui-text-danger">刪除</button>
            </div>
        </div>
    `).join("");

    initializeCategorySortable(container);
  }

  async function loadCategories() {
    try {
      const response = await deps.authFetch(
        `${deps.API_URL}?action=getCategories&_=${Date.now()}`,
      );
      const data = await response.json();
      if (!data.success) return;
      deps.setCategories(data.categories);
      renderCategories();
    } catch (error) {
      console.error(error);
    }
  }

  async function addCategory() {
    const name = document.getElementById("new-cat-name").value.trim();
    if (!name) return;
    try {
      const response = await deps.authFetch(`${deps.API_URL}?action=addCategory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deps.getAuthUserId(), name }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      document.getElementById("new-cat-name").value = "";
      deps.Toast.fire({ icon: "success", title: "已新增" });
      loadCategories();
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  async function editCategory(id) {
    const category = categoriesMap[id];
    if (!category) {
      deps.Swal.fire("錯誤", "找不到分類", "error");
      return;
    }
    const oldName = category.name;
    const { value } = await deps.Swal.fire({
      title: "修改分類",
      input: "text",
      inputValue: oldName,
      showCancelButton: true,
      confirmButtonText: "更新",
      cancelButtonText: "取消",
    });
    if (!value || value === oldName) return;

    try {
      const response = await deps.authFetch(`${deps.API_URL}?action=updateCategory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: deps.getAuthUserId(),
          id,
          name: value,
        }),
      });
      const data = await response.json();
      if (!data.success) return;
      deps.Toast.fire({ icon: "success", title: "分類已更新，商品同步完成" });
      loadCategories();
      deps.loadProducts();
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  async function delCategory(id) {
    const confirmation = await deps.Swal.fire({
      title: "刪除分類？",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#DC322F",
      confirmButtonText: "刪除",
      cancelButtonText: "取消",
    });
    if (!confirmation.isConfirmed) return;
    try {
      const response = await deps.authFetch(`${deps.API_URL}?action=deleteCategory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deps.getAuthUserId(), id }),
      });
      const data = await response.json();
      if (data.success) loadCategories();
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  async function updateCategoryOrders(ids) {
    try {
      const response = await deps.authFetch(`${deps.API_URL}?action=reorderCategory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deps.getAuthUserId(), ids }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
      loadCategories();
    }
  }

  return {
    loadCategories,
    renderCategories,
    addCategory,
    editCategory,
    delCategory,
    updateCategoryOrders,
  };
}
