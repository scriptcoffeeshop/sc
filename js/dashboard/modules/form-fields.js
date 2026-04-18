const FIELD_TYPE_LABELS = {
  text: "文字",
  email: "Email",
  tel: "電話",
  number: "數字",
  select: "下拉選單",
  checkbox: "勾選框",
  textarea: "多行文字",
  section_title: "區塊標題",
};

export function createFormFieldsController(deps) {
  let formFields = [];
  let formFieldsSortable = null;

  function destroyFormFieldsSortable() {
    if (!formFieldsSortable) return;
    formFieldsSortable.destroy();
    formFieldsSortable = null;
  }

  async function loadFormFields() {
    try {
      const response = await deps.authFetch(
        `${deps.API_URL}?action=getFormFieldsAdmin&_=${Date.now()}`,
      );
      const data = await response.json();
      if (!data.success) return;
      formFields = data.fields || [];
      renderFormFields();
    } catch (error) {
      console.error(error);
    }
  }

  function isVueManagedFormFieldsList(
    container = document.getElementById("formfields-list"),
  ) {
    return container?.dataset?.vueManaged === "true";
  }

  function getHiddenDeliveryMethodsText(deliveryVisibility) {
    if (!deliveryVisibility) return "";
    try {
      const visibilityConfig = JSON.parse(deliveryVisibility);
      const hiddenDeliveryMethods = Object.entries(visibilityConfig)
        .filter(([, visible]) => visible === false)
        .map(([deliveryMethod]) => deliveryMethod);
      if (!hiddenDeliveryMethods.length) return "";
      return `在 ${hiddenDeliveryMethods.join(", ")} 時隱藏`;
    } catch {
      return "";
    }
  }

  function buildFormFieldViewModel(field) {
    return {
      id: Number(field?.id) || 0,
      label: field?.label || "",
      fieldTypeLabel: FIELD_TYPE_LABELS[field?.field_type] || field?.field_type ||
        "",
      required: Boolean(field?.required),
      enabled: Boolean(field?.enabled),
      fieldKey: field?.field_key || "",
      placeholder: field?.placeholder || "",
      hiddenDeliveryMethodsText: getHiddenDeliveryMethodsText(
        field?.delivery_visibility,
      ),
      toggleEnabledValue: String(!field?.enabled),
      toggleEnabledTitle: field?.enabled ? "停用" : "啟用",
      toggleEnabledIcon: field?.enabled ? "開" : "關",
    };
  }

  function emitDashboardFormFieldsUpdated(nextFields = formFields) {
    const viewFields = (Array.isArray(nextFields) ? nextFields : [])
      .map((field) => buildFormFieldViewModel(field));
    window.dispatchEvent(
      new CustomEvent("coffee:dashboard-formfields-updated", {
        detail: { fields: viewFields },
      }),
    );
  }

  function initializeFormFieldsSortable(container) {
    if (!deps.Sortable) return;

    destroyFormFieldsSortable();
    if (!container?.querySelector("[data-field-id]")) return;

    formFieldsSortable = new deps.Sortable(container, {
      handle: ".drag-handle",
      animation: 150,
      onEnd: async () => {
        const ids = Array.from(container.querySelectorAll("[data-field-id]"))
          .map((element) => Number.parseInt(element.dataset.fieldId || "", 10))
          .filter((id) => !Number.isNaN(id));

        try {
          await deps.authFetch(`${deps.API_URL}?action=reorderFormFields`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: deps.getAuthUserId(), ids }),
          });
          deps.Toast.fire({ icon: "success", title: "排序已更新" });
        } catch (error) {
          console.error(error);
        }
      },
    });
  }

  function renderFormFields() {
    const container = document.getElementById("formfields-list");
    if (!container) return;

    if (isVueManagedFormFieldsList(container)) {
      emitDashboardFormFieldsUpdated(formFields);
      const raf = deps.requestAnimationFrame || globalThis.requestAnimationFrame;
      const sortableRoot = document.getElementById("formfields-sortable");
      if (typeof raf === "function") {
        raf(() => initializeFormFieldsSortable(sortableRoot));
      } else {
        initializeFormFieldsSortable(sortableRoot);
      }
      return;
    }

    if (!formFields.length) {
      container.innerHTML =
        '<p class="text-center ui-text-subtle py-8">尚無自訂欄位</p>';
      initializeFormFieldsSortable(document.getElementById("formfields-sortable"));
      return;
    }

    container.innerHTML = `
          <div class="space-y-2" id="formfields-sortable">
              ${
      formFields.map((field) => {
        const viewField = buildFormFieldViewModel(field);
        const requiredBadge = viewField.required
          ? '<span class="text-xs bg-red-100 ui-text-danger px-2 py-0.5 rounded-full">必填</span>'
          : "";
        const enabledClass = viewField.enabled ? "" : "opacity-50";
        const isProtected = false;
        return `
                  <div class="flex items-center gap-3 p-3 bg-white rounded-xl border ${enabledClass}" style="border-color:#E2DCC8;" data-field-id="${viewField.id}">
                      <span class="cursor-grab ui-text-muted drag-handle">
                        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="drag-handle-icon-sm"><path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60-12a12,12,0,1,0,12,12A12,12,0,0,0,164,48ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z"></path></svg>
                      </span>
                      <div class="flex-1">
                          <div class="flex items-center gap-2 flex-wrap">
                              <span class="font-medium">${deps.esc(viewField.label)}</span>
                              <span class="text-xs ui-primary-soft ui-text-highlight px-2 py-0.5 rounded-full">${deps.esc(viewField.fieldTypeLabel)}</span>
                              ${requiredBadge}
                              ${
          !viewField.enabled
            ? '<span class="text-xs ui-bg-soft ui-text-subtle px-2 py-0.5 rounded-full">已停用</span>'
            : ""
        }
                              ${
          isProtected
            ? '<span class="text-xs bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-full">系統</span>'
            : ""
        }
                          </div>
                          <div class="text-xs ui-text-muted mt-1">key: ${deps.esc(viewField.fieldKey)} ${viewField.placeholder ? "・" + deps.esc(viewField.placeholder) : ""}</div>
                          ${
          viewField.hiddenDeliveryMethodsText
            ? `<div class="text-xs text-orange-500 mt-1">${
              deps.esc(viewField.hiddenDeliveryMethodsText)
            }</div>`
            : ""
        }
                      </div>
                      <div class="flex gap-1 items-center">
                          <button data-action="toggle-field-enabled" data-field-id="${viewField.id}" data-enabled="${viewField.toggleEnabledValue}" class="text-sm px-2 py-1 rounded hover:ui-bg-soft" title="${viewField.toggleEnabledTitle}">${viewField.toggleEnabledIcon}</button>
                          <button data-action="edit-form-field" data-field-id="${viewField.id}" class="text-sm px-2 py-1 rounded hover:ui-bg-soft" title="編輯">編輯</button>
                          ${
          !isProtected
            ? `<button data-action="delete-form-field" data-field-id="${viewField.id}" class="text-sm px-2 py-1 rounded hover:bg-red-50 ui-text-danger" title="刪除">刪除</button>`
            : ""
        }
                      </div>
                  </div>`;
      }).join("")
    }
          </div>`;

    initializeFormFieldsSortable(document.getElementById("formfields-sortable"));
  }

  function renderDeliveryVisibilityCheckboxes(existingVisibility) {
    const container = document.getElementById("swal-dv");
    if (!container) return;

    const configStr = deps.getDashboardSettings()?.delivery_options_config || "";
    let deliveryOptions = [];
    if (configStr) {
      try {
        deliveryOptions = JSON.parse(configStr);
      } catch {
      }
    }

    if (!deliveryOptions.length) {
      container.innerHTML =
        '<p class="text-xs ui-text-muted">尚未設定配送方式</p>';
      return;
    }

    let visibility = {};
    if (existingVisibility) {
      try {
        visibility = JSON.parse(existingVisibility);
      } catch {
      }
    }

    container.innerHTML = deliveryOptions.map((option) => {
      const checked = visibility[option.id] !== false;
      return `<label class="flex items-center gap-1 text-sm cursor-pointer px-2 py-1 rounded-lg border" style="border-color:#E2DCC8">
              <input type="checkbox" class="dv-cb" data-delivery-id="${
        deps.esc(option.id)
      }" ${checked ? "checked" : ""}> ${
        deps.esc(option.label || option.id)
      }
          </label>`;
    }).join("");
  }

  function collectDeliveryVisibility() {
    const checkboxes = document.querySelectorAll(".dv-cb");
    if (!checkboxes.length) return null;

    const visibility = {};
    checkboxes.forEach((checkbox) => {
      visibility[checkbox.dataset.deliveryId] = checkbox.checked;
    });
    return JSON.stringify(visibility);
  }

  function normalizeDeliveryVisibilityValue(rawValue) {
    if (!rawValue) return rawValue;
    try {
      const visibility = JSON.parse(rawValue);
      if (Object.values(visibility).every((value) => value === true)) {
        return null;
      }
    } catch {
    }
    return rawValue;
  }

  async function showAddFieldModal() {
    const { value: formValues } = await deps.Swal.fire({
      title: "新增欄位",
      html: `
              <div style="text-align:left;">
                  <label class="block text-sm mb-1 font-medium">欄位識別碼 (英文，唯一)</label>
                  <input id="swal-fk" class="swal2-input" placeholder="例：receipt_type" style="margin:0 0 12px 0;width:100%">
                  <label class="block text-sm mb-1 font-medium">顯示名稱</label>
                  <input id="swal-fl" class="swal2-input" placeholder="例：開立收據" style="margin:0 0 12px 0;width:100%">
                  <label class="block text-sm mb-1 font-medium">類型</label>
                  <select id="swal-ft" class="swal2-select" style="margin:0 0 12px 0;width:100%">
                      <option value="text">文字</option>
                      <option value="email">Email</option>
                      <option value="tel">電話</option>
                      <option value="number">數字</option>
                      <option value="select">下拉選單</option>
                      <option value="checkbox">勾選框</option>
                      <option value="textarea">多行文字</option>
                  </select>
                  <label class="block text-sm mb-1 font-medium">提示文字 (placeholder)</label>
                  <input id="swal-fp" class="swal2-input" placeholder="例：請選擇" style="margin:0 0 12px 0;width:100%">
                  <label class="block text-sm mb-1 font-medium">選項 (僅下拉選單，逗號分隔)</label>
                  <input id="swal-fo" class="swal2-input" placeholder="例：二聯式,三聯式,免開" style="margin:0 0 12px 0;width:100%">
                  <label class="flex items-center gap-2 cursor-pointer mt-2">
                      <input type="checkbox" id="swal-fr"> <span class="text-sm">必填</span>
                  </label>
                  <div class="mt-3 pt-3 border-t" style="border-color:#E2DCC8">
                      <label class="block text-sm mb-1 font-medium">配送方式可見性</label>
                      <p class="text-xs ui-text-muted mb-2">取消勾選 = 該配送方式下不顯示此欄位，全勾 = 全部顯示</p>
                      <div id="swal-dv" class="flex flex-wrap gap-2"></div>
                  </div>
              </div>`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "新增",
      cancelButtonText: "取消",
      confirmButtonColor: "#268BD2",
      didOpen: () => renderDeliveryVisibilityCheckboxes(null),
      preConfirm: () => {
        const fieldKey = document.getElementById("swal-fk").value.trim();
        const label = document.getElementById("swal-fl").value.trim();
        if (!fieldKey || !label) {
          deps.Swal.showValidationMessage("識別碼和名稱為必填");
          return false;
        }

        const fieldType = document.getElementById("swal-ft").value;
        const placeholder = document.getElementById("swal-fp").value.trim();
        const optionsRaw = document.getElementById("swal-fo").value.trim();
        const options = optionsRaw
          ? JSON.stringify(
            optionsRaw.split(",").map((value) => value.trim()).filter(Boolean),
          )
          : "";
        const required = document.getElementById("swal-fr").checked;
        const deliveryVisibility = collectDeliveryVisibility();

        return {
          fieldKey,
          label,
          fieldType,
          placeholder,
          options,
          required,
          deliveryVisibility,
        };
      },
    });

    if (!formValues) return;
    formValues.deliveryVisibility = normalizeDeliveryVisibilityValue(
      formValues.deliveryVisibility,
    );

    try {
      deps.Swal.fire({
        title: "新增中...",
        allowOutsideClick: false,
        didOpen: () => deps.Swal.showLoading(),
      });
      const response = await deps.authFetch(`${deps.API_URL}?action=addFormField`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deps.getAuthUserId(), ...formValues }),
      });
      const data = await response.json();
      if (!data.success) {
        deps.Swal.fire("錯誤", data.error, "error");
        return;
      }

      deps.Toast.fire({ icon: "success", title: "欄位已新增" });
      loadFormFields();
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  async function editFormField(id) {
    const field = formFields.find((entry) => entry.id === id);
    if (!field) return;

    const optionsStr = (() => {
      try {
        return JSON.parse(field.options || "[]").join(",");
      } catch {
        return "";
      }
    })();

    const { value: formValues } = await deps.Swal.fire({
      title: "編輯欄位",
      html: `
              <div style="text-align:left;">
                  <label class="block text-sm mb-1 font-medium">顯示名稱</label>
                  <input id="swal-fl" class="swal2-input" value="${
        deps.esc(field.label)
      }" style="margin:0 0 12px 0;width:100%">
                  <label class="block text-sm mb-1 font-medium">類型</label>
                  <select id="swal-ft" class="swal2-select" style="margin:0 0 12px 0;width:100%">
                      ${
        Object.entries(FIELD_TYPE_LABELS).map(([key, value]) =>
          `<option value="${key}" ${
            key === field.field_type ? "selected" : ""
          }>${value}</option>`
        ).join("")
      }
                  </select>
                  <label class="block text-sm mb-1 font-medium">提示文字</label>
                  <input id="swal-fp" class="swal2-input" value="${
        deps.esc(field.placeholder || "")
      }" style="margin:0 0 12px 0;width:100%">
                  <label class="block text-sm mb-1 font-medium">選項 (下拉選單，逗號分隔)</label>
                  <input id="swal-fo" class="swal2-input" value="${
        deps.esc(optionsStr)
      }" style="margin:0 0 12px 0;width:100%">
                  <label class="flex items-center gap-2 cursor-pointer mt-2">
                      <input type="checkbox" id="swal-fr" ${
        field.required ? "checked" : ""
      }> <span class="text-sm">必填</span>
                  </label>
                  <div class="mt-3 pt-3 border-t" style="border-color:#E2DCC8">
                      <label class="block text-sm mb-1 font-medium">配送方式可見性</label>
                      <p class="text-xs ui-text-muted mb-2">取消勾選 = 該配送方式下不顯示此欄位</p>
                      <div id="swal-dv" class="flex flex-wrap gap-2"></div>
                  </div>
              </div>`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "儲存",
      cancelButtonText: "取消",
      confirmButtonColor: "#268BD2",
      didOpen: () =>
        renderDeliveryVisibilityCheckboxes(field.delivery_visibility || null),
      preConfirm: () => {
        const label = document.getElementById("swal-fl").value.trim();
        if (!label) {
          deps.Swal.showValidationMessage("名稱為必填");
          return false;
        }

        const fieldType = document.getElementById("swal-ft").value;
        const placeholder = document.getElementById("swal-fp").value.trim();
        const optionsRaw = document.getElementById("swal-fo").value.trim();
        const options = optionsRaw
          ? JSON.stringify(
            optionsRaw.split(",").map((value) => value.trim()).filter(Boolean),
          )
          : "";
        const required = document.getElementById("swal-fr").checked;
        const deliveryVisibility = collectDeliveryVisibility();

        return {
          label,
          fieldType,
          placeholder,
          options,
          required,
          deliveryVisibility,
        };
      },
    });

    if (!formValues) return;
    formValues.deliveryVisibility = normalizeDeliveryVisibilityValue(
      formValues.deliveryVisibility,
    );

    try {
      const response = await deps.authFetch(`${deps.API_URL}?action=updateFormField`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deps.getAuthUserId(), id, ...formValues }),
      });
      const data = await response.json();
      if (!data.success) {
        deps.Swal.fire("錯誤", data.error, "error");
        return;
      }

      deps.Toast.fire({ icon: "success", title: "已更新" });
      loadFormFields();
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  async function deleteFormField(id) {
    const field = formFields.find((entry) => entry.id === id);
    const confirmation = await deps.Swal.fire({
      title: "確認刪除",
      text: `確定要刪除「${field?.label || ""}」欄位嗎？`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "刪除",
      cancelButtonText: "取消",
      confirmButtonColor: "#DC322F",
    });
    if (!confirmation.isConfirmed) return;

    try {
      const response = await deps.authFetch(`${deps.API_URL}?action=deleteFormField`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deps.getAuthUserId(), id }),
      });
      const data = await response.json();
      if (!data.success) {
        deps.Swal.fire("錯誤", data.error, "error");
        return;
      }

      deps.Toast.fire({ icon: "success", title: "已刪除" });
      loadFormFields();
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  async function toggleFieldEnabled(id, enabled) {
    try {
      const response = await deps.authFetch(`${deps.API_URL}?action=updateFormField`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deps.getAuthUserId(), id, enabled }),
      });
      const data = await response.json();
      if (!data.success) {
        deps.Swal.fire("錯誤", data.error, "error");
        return;
      }

      deps.Toast.fire({
        icon: "success",
        title: enabled ? "已啟用" : "已停用",
      });
      loadFormFields();
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  return {
    loadFormFields,
    showAddFieldModal,
    editFormField,
    deleteFormField,
    toggleFieldEnabled,
  };
}
