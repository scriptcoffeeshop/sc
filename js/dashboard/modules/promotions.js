export function createPromotionsController(deps) {
  let promotions = [];
  let promotionsMap = {};
  let promoSortable = null;

  function syncPromotionsMap() {
    promotionsMap = {};
    promotions.forEach((promotion) => {
      promotionsMap[promotion.id] = promotion;
    });
  }

  function destroyPromotionSortable() {
    if (!promoSortable) return;
    promoSortable.destroy();
    promoSortable = null;
  }

  function isVueManagedPromotionsTable(
    table = document.getElementById("promotions-table"),
  ) {
    return table?.dataset?.vueManaged === "true";
  }

  function buildPromotionViewModel(promotion) {
    const isPercent = promotion?.discountType === "percent";
    const enabled = Boolean(promotion?.enabled);
    return {
      id: Number(promotion?.id) || 0,
      name: promotion?.name || "",
      conditionText: `任選 ${Number(promotion?.minQuantity) || 0} 件`,
      discountText: isPercent
        ? `${promotion?.discountValue} 折`
        : `折 $${promotion?.discountValue}`,
      enabled,
      statusLabel: enabled ? "啟用" : "未啟用",
      statusClass: enabled ? "ui-text-success" : "ui-text-muted",
    };
  }

  function emitDashboardPromotionsUpdated(nextPromotions = promotions) {
    const viewPromotions = (Array.isArray(nextPromotions) ? nextPromotions : [])
      .map((promotion) => buildPromotionViewModel(promotion));
    window.dispatchEvent(
      new CustomEvent("coffee:dashboard-promotions-updated", {
        detail: { promotions: viewPromotions },
      }),
    );
  }

  async function loadPromotions() {
    try {
      const response = await deps.authFetch(
        `${deps.API_URL}?action=getPromotions&_=${Date.now()}`,
      );
      const data = await response.json();
      if (!data.success) return;
      promotions = Array.isArray(data.promotions) ? data.promotions : [];
      renderPromotions();
    } catch (error) {
      console.error(error);
    }
  }

  async function savePromotionSort(ids) {
    const response = await deps.authFetch(
      `${deps.API_URL}?action=reorderPromotionsBulk`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deps.getAuthUserId(), ids }),
      },
    );
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
  }

  function initializePromotionSortable(table) {
    if (!deps.Sortable?.create) return;

    destroyPromotionSortable();
    if (!table?.querySelector("tr[data-id]")) return;

    promoSortable = deps.Sortable.create(table, {
      handle: ".drag-handle-promo",
      animation: 150,
      onEnd: async (event) => {
        if (event.oldIndex === event.newIndex) return;

        const ids = Array.from(table.querySelectorAll("tr[data-id]"))
          .map((row) => Number.parseInt(row.dataset.id || "", 10))
          .filter((id) => !Number.isNaN(id));

        try {
          await savePromotionSort(ids);
        } catch (error) {
          deps.Swal.fire("錯誤", error.message, "error");
          loadPromotions();
        }
      },
    });
  }

  function renderPromotions() {
    const table = document.getElementById("promotions-table");
    if (!table) return;

    syncPromotionsMap();

    if (isVueManagedPromotionsTable(table)) {
      emitDashboardPromotionsUpdated(promotions);
      const raf = deps.requestAnimationFrame || globalThis.requestAnimationFrame;
      if (typeof raf === "function") {
        raf(() => initializePromotionSortable(table));
      } else {
        initializePromotionSortable(table);
      }
      return;
    }

    table.innerHTML = "";
    if (!promotions.length) {
      table.innerHTML =
        '<tr><td colspan="5" class="text-center py-8 ui-text-subtle">尚無活動</td></tr>';
      initializePromotionSortable(table);
      return;
    }

    let html = "";
    promotions.forEach((promotion) => {
      const viewPromotion = buildPromotionViewModel(promotion);
      html += `
          <tr class="border-b" style="border-color:#E2DCC8;" data-id="${viewPromotion.id}">
              <td class="p-3 text-center">
                  <span class="drag-handle-promo cursor-move ui-text-muted hover:ui-text-warning text-xl font-bold select-none px-2 inline-block" title="拖曳排序" style="touch-action: none;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="drag-handle-icon"><path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60-12a12,12,0,1,0,12,12A12,12,0,0,0,164,48ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z"></path></svg>
                  </span>
              </td>
              <td class="p-3 font-medium">${deps.esc(viewPromotion.name)}</td>
              <td class="p-3 text-sm ui-text-strong">${deps.esc(viewPromotion.conditionText)} <span class="font-bold ui-text-danger">${deps.esc(viewPromotion.discountText)}</span></td>
              <td class="p-3 text-center"><button data-action="toggle-promotion-enabled" data-promotion-id="${viewPromotion.id}" data-enabled="${String(!viewPromotion.enabled)}" class="text-sm font-medium ${viewPromotion.statusClass} hover:underline">${viewPromotion.statusLabel}</button></td>
              <td class="p-3 text-right">
                  <button data-action="edit-promotion" data-promotion-id="${viewPromotion.id}" class="text-sm mr-2 ui-text-highlight">編輯</button>
                  <button data-action="delete-promotion" data-promotion-id="${viewPromotion.id}" class="text-sm ui-text-danger">刪除</button>
              </td>
          </tr>`;
    });
    table.innerHTML = html;
    initializePromotionSortable(table);
  }

  function renderPromoProducts(selectedItems = []) {
    const list = document.getElementById("prm-products-list");
    if (!list) return;

    const products = deps.getProducts();
    if (!products.length) {
      list.innerHTML = '<p class="ui-text-muted">目前沒有商品可選</p>';
      return;
    }

    const isSelected = (productId, specKey) =>
      selectedItems.some((item) =>
        item.productId === productId && item.specKey === specKey
      );

    let html = "";
    products.forEach((product) => {
      let specs = [];
      try {
        specs = JSON.parse(product.specs || "[]");
      } catch {
      }

      if (specs.length === 0) {
        html += `
              <div class="mb-1 border-b pb-1 last:border-0" style="border-color:#E2DCC8">
                  <label class="flex items-center gap-2 cursor-pointer p-1 hover:ui-bg-soft rounded">
                      <input type="checkbox" class="promo-product-cb" data-pid="${product.id}" data-skey="" ${
          isSelected(product.id, "") ? "checked" : ""
        }>
                      <span class="ui-text-strong font-medium">[${
          deps.esc(product.category)
        }] ${deps.esc(product.name)}</span>
                  </label>
              </div>`;
        return;
      }

      html += `
            <div class="mb-2 border-b pb-1 last:border-0" style="border-color:#E2DCC8">
                <div class="ui-text-strong font-medium p-1 ui-bg-soft rounded">[${
        deps.esc(product.category)
      }] ${deps.esc(product.name)}</div>
                <div class="pl-4 mt-1 space-y-1">
                    ${
        specs.map((spec) => `
                          <label class="flex items-center gap-2 cursor-pointer p-1 hover:ui-bg-soft rounded text-sm">
                              <input type="checkbox" class="promo-product-cb" data-pid="${product.id}" data-skey="${
          deps.esc(spec.key)
        }" ${isSelected(product.id, spec.key) ? "checked" : ""}>
                              <span class="ui-text-strong">${
          deps.esc(spec.label)
        } <span class="text-xs ui-text-muted">($${spec.price})</span></span>
                          </label>
                      `).join("")
      }
                </div>
            </div>`;
    });

    list.innerHTML = html;
  }

  function showPromotionModal() {
    document.getElementById("prm-title").textContent = "新增活動";
    document.getElementById("promotion-form").reset();
    document.getElementById("prm-id").value = "";
    document.getElementById("prm-enabled").checked = true;
    renderPromoProducts([]);
    document.getElementById("promotion-modal").classList.remove("hidden");
  }

  function editPromotion(id) {
    const promotion = promotionsMap[id];
    if (!promotion) return;

    document.getElementById("prm-title").textContent = "編輯活動";
    document.getElementById("prm-id").value = promotion.id;
    document.getElementById("prm-name").value = promotion.name;
    document.getElementById("prm-type").value = promotion.type || "bundle";
    document.getElementById("prm-min-qty").value = promotion.minQuantity || 1;
    document.getElementById("prm-discount-type").value =
      promotion.discountType || "percent";
    document.getElementById("prm-discount-value").value =
      promotion.discountValue || 0;
    document.getElementById("prm-enabled").checked = promotion.enabled;

    let targetItems = promotion.targetItems || [];
    if (
      targetItems.length === 0 && promotion.targetProductIds &&
      promotion.targetProductIds.length > 0
    ) {
      targetItems = promotion.targetProductIds.map((targetId) => ({
        productId: targetId,
        specKey: "",
      }));
    }

    renderPromoProducts(targetItems);
    document.getElementById("promotion-modal").classList.remove("hidden");
  }

  function closePromotionModal() {
    document.getElementById("promotion-modal").classList.add("hidden");
  }

  async function savePromotion(event) {
    event.preventDefault();

    const id = document.getElementById("prm-id").value;
    const checkboxes = document.querySelectorAll(".promo-product-cb:checked");
    const targetItems = Array.from(checkboxes).map((checkbox) => ({
      productId: Number.parseInt(checkbox.dataset.pid, 10),
      specKey: checkbox.dataset.skey || "",
    }));

    const payload = {
      userId: deps.getAuthUserId(),
      name: document.getElementById("prm-name").value.trim(),
      type: document.getElementById("prm-type").value,
      targetItems,
      minQuantity:
        Number.parseInt(document.getElementById("prm-min-qty").value, 10) || 1,
      discountType: document.getElementById("prm-discount-type").value,
      discountValue:
        Number.parseFloat(document.getElementById("prm-discount-value").value) ||
        0,
      enabled: document.getElementById("prm-enabled").checked,
    };
    if (id) payload.id = Number.parseInt(id, 10);

    try {
      const response = await deps.authFetch(
        `${deps.API_URL}?action=${id ? "updatePromotion" : "addPromotion"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      deps.Toast.fire({ icon: "success", title: id ? "已更新" : "已新增" });
      closePromotionModal();
      loadPromotions();
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  async function delPromotion(id) {
    const confirmation = await deps.Swal.fire({
      title: "刪除活動？",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#DC322F",
      confirmButtonText: "刪除",
      cancelButtonText: "取消",
    });
    if (!confirmation.isConfirmed) return;

    try {
      const response = await deps.authFetch(`${deps.API_URL}?action=deletePromotion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deps.getAuthUserId(), id }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      deps.Toast.fire({ icon: "success", title: "已刪除" });
      loadPromotions();
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  async function togglePromotionEnabled(id, enabled) {
    const promotion = promotionsMap[id];
    if (!promotion) {
      deps.Swal.fire("錯誤", "找不到活動", "error");
      return;
    }

    const payload = {
      userId: deps.getAuthUserId(),
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
      const response = await deps.authFetch(`${deps.API_URL}?action=updatePromotion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "活動狀態更新失敗");

      promotion.enabled = Boolean(enabled);
      renderPromotions();
      deps.Toast.fire({
        icon: "success",
        title: enabled ? "活動已啟用" : "活動已停用",
      });
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  return {
    loadPromotions,
    renderPromotions,
    showPromotionModal,
    editPromotion,
    closePromotionModal,
    savePromotion,
    delPromotion,
    togglePromotionEnabled,
  };
}
