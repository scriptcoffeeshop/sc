export function createDashboardEvents(
  actionHandlers,
  loadUsers,
  previewIcon,
  saveProduct,
  savePromotion,
  _changeOrderStatus,
  renderOrders,
) {
  function initializeDashboardEventDelegation() {
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const actionButton = target.closest("[data-action]");
      if (!actionButton) return;

      const action = actionButton.dataset.action;
      if (!action) return;
      // 訂單狀態下拉選單只應在 change 事件觸發更新，
      // 避免點開選單時就誤觸發更新。
      if (action === "change-order-status") return;
      const isInputToIgnore = actionButton instanceof HTMLInputElement &&
        (actionButton.type === "checkbox" || actionButton.type === "file");
      if (isInputToIgnore) return;
      event.preventDefault();

      const handler = actionHandlers[action];
      if (handler) {
        handler(actionButton, event);
      }
    });

    document.addEventListener("change", (event) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement &&
        target.type === "file" &&
        (
          target.classList.contains("icon-upload-input") ||
          target.classList.contains("do-icon-file")
        )
      ) {
        previewIcon(target);
        return;
      }
      if (target instanceof HTMLSelectElement && target.dataset.action) {
        const handler = actionHandlers[target.dataset.action];
        if (handler) {
          handler(target, event);
        }
        return;
      }
      if (target instanceof HTMLInputElement && target.dataset.action) {
        const handler = actionHandlers[target.dataset.action];
        if (handler) {
          handler(target, event);
        }
      }
    });

    const orderFilters = document.querySelectorAll("[data-order-filter]");
    orderFilters.forEach((el) => {
      el.addEventListener("change", renderOrders);
      if (
        el instanceof HTMLInputElement &&
        (el.type === "number" || el.type === "date")
      ) {
        el.addEventListener("input", renderOrders);
      }
    });

    const userSearchInput = document.getElementById("user-search");
    if (userSearchInput) {
      userSearchInput.addEventListener("keyup", (event) => {
        if (event.key === "Enter") loadUsers();
      });
    }

    const productForm = document.getElementById("product-form");
    if (productForm) {
      productForm.addEventListener("submit", saveProduct);
    }

    const promotionForm = document.getElementById("promotion-form");
    if (promotionForm) {
      promotionForm.addEventListener("submit", savePromotion);
    }
  }

  return { initializeDashboardEventDelegation };
}
