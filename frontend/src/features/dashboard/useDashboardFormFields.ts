import { computed, nextTick, ref } from "vue";

type DashboardFormFieldsServices = Record<string, any>;
type DashboardFormControl =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

const FIELD_TYPE_LABELS: Record<string, string> = {
  text: "文字",
  email: "Email",
  tel: "電話",
  number: "數字",
  select: "下拉選單",
  checkbox: "勾選框",
  textarea: "多行文字",
  section_title: "區塊標題",
};

const formFields = ref<any[]>([]);

let services: DashboardFormFieldsServices | null = null;
let formFieldsListElement: HTMLElement | null = null;
let formFieldsSortable: any = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getServices(): DashboardFormFieldsServices {
  if (!services) {
    throw new Error("Dashboard form fields services 尚未初始化");
  }
  return services;
}

function getFormControl(id: string) {
  return document.getElementById(id) as DashboardFormControl | null;
}

function getFormControlValue(id: string) {
  return String(getFormControl(id)?.value || "").trim();
}

function isFormCheckboxChecked(id: string) {
  return Boolean((document.getElementById(id) as HTMLInputElement | null)?.checked);
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
    label: String(field?.label || ""),
    fieldTypeLabel: FIELD_TYPE_LABELS[field?.field_type] || field?.field_type ||
      "",
    required: Boolean(field?.required),
    enabled: Boolean(field?.enabled),
    fieldKey: String(field?.field_key || ""),
    placeholder: String(field?.placeholder || ""),
    hiddenDeliveryMethodsText: getHiddenDeliveryMethodsText(
      field?.delivery_visibility,
    ),
    toggleEnabledValue: String(!field?.enabled),
    toggleEnabledTitle: field?.enabled ? "停用" : "啟用",
    toggleEnabledIcon: field?.enabled ? "開" : "關",
  };
}

const formFieldsView = computed(() =>
  formFields.value
    .map((field) => buildFormFieldViewModel(field))
    .filter((field) => field.id > 0)
);

function destroyFormFieldsSortable() {
  if (!formFieldsSortable) return;
  formFieldsSortable.destroy();
  formFieldsSortable = null;
}

async function syncFormFieldsSortable() {
  const { Sortable, Swal, Toast } = getServices();
  destroyFormFieldsSortable();
  const listElement = formFieldsListElement;
  if (!listElement?.querySelector?.("[data-field-id]")) return;

  if (Sortable?.create) {
    formFieldsSortable = Sortable.create(listElement, {
      handle: ".drag-handle",
      animation: 150,
      onEnd: async () => {
        const ids = Array.from(
          listElement.querySelectorAll<HTMLElement>("[data-field-id]"),
        )
          .map((element) => Number.parseInt(element.dataset.fieldId || "", 10))
          .filter((id) => !Number.isNaN(id));

        try {
          await reorderFormFields(ids);
          Toast.fire({ icon: "success", title: "排序已更新" });
        } catch (error) {
          Swal.fire("錯誤", error?.message || "排序更新失敗", "error");
          await loadFormFields();
        }
      },
    });
    return;
  }

  if (typeof Sortable === "function") {
    formFieldsSortable = new Sortable(listElement, {
      handle: ".drag-handle",
      animation: 150,
      onEnd: async () => {
        const ids = Array.from(
          listElement.querySelectorAll<HTMLElement>("[data-field-id]"),
        )
          .map((element) => Number.parseInt(element.dataset.fieldId || "", 10))
          .filter((id) => !Number.isNaN(id));

        try {
          await reorderFormFields(ids);
          Toast.fire({ icon: "success", title: "排序已更新" });
        } catch (error) {
          Swal.fire("錯誤", error?.message || "排序更新失敗", "error");
          await loadFormFields();
        }
      },
    });
  }
}

async function queueFormFieldsSync() {
  await nextTick();
  await syncFormFieldsSortable();
}

function registerFormFieldsListElement(element: HTMLElement | null) {
  formFieldsListElement = element || null;
  if (!formFieldsListElement) {
    destroyFormFieldsSortable();
    return;
  }
  queueFormFieldsSync();
}

function renderDeliveryVisibilityCheckboxes(existingVisibility) {
  const container = document.getElementById("swal-dv");
  if (!container) return;

  const configStr = getServices().getDashboardSettings()?.delivery_options_config ||
    "";
  let deliveryOptions: any[] = [];
  if (configStr) {
    try {
      deliveryOptions = JSON.parse(configStr);
    } catch {
    }
  }

  if (!deliveryOptions.length) {
    const emptyState = document.createElement("p");
    emptyState.className = "text-xs ui-text-muted";
    emptyState.textContent = "尚未設定配送方式";
    container.replaceChildren(emptyState);
    return;
  }

  let visibility: Record<string, boolean> = {};
  if (existingVisibility) {
    try {
      visibility = JSON.parse(existingVisibility);
    } catch {
    }
  }

  const fragment = document.createDocumentFragment();
  deliveryOptions.forEach((option) => {
    const checkboxLabel = document.createElement("label");
    checkboxLabel.className =
      "flex items-center gap-1 text-sm cursor-pointer px-2 py-1 rounded-lg border";
    checkboxLabel.style.borderColor = "#E2DCC8";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "dv-cb";
    checkbox.dataset.deliveryId = String(option.id || "");
    checkbox.checked = visibility[option.id] !== false;

    checkboxLabel.append(checkbox, ` ${String(option.label || option.id || "")}`);
    fragment.appendChild(checkboxLabel);
  });

  container.replaceChildren(fragment);
}

function collectDeliveryVisibility() {
  const checkboxes = document.querySelectorAll<HTMLInputElement>(".dv-cb");
  if (!checkboxes.length) return null;

  const visibility: Record<string, boolean> = {};
  checkboxes.forEach((checkbox) => {
    const deliveryId = checkbox.dataset.deliveryId || "";
    if (deliveryId) visibility[deliveryId] = checkbox.checked;
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

async function loadFormFields() {
  try {
    const { API_URL, authFetch } = getServices();
    const response = await authFetch(
      `${API_URL}?action=getFormFieldsAdmin&_=${Date.now()}`,
    );
    const data = await response.json();
    if (!data.success) return;
    formFields.value = Array.isArray(data.fields) ? data.fields : [];
    await queueFormFieldsSync();
  } catch (error) {
    console.error(error);
  }
}

async function reorderFormFields(ids) {
  const { API_URL, authFetch, getAuthUserId } = getServices();
  const response = await authFetch(`${API_URL}?action=reorderFormFields`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: getAuthUserId(), ids }),
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "欄位排序更新失敗");
  }
  await loadFormFields();
}

async function showAddFieldModal() {
  const { Swal, authFetch, API_URL, getAuthUserId, Toast } = getServices();
  const { value: formValues } = await Swal.fire({
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
      const fieldKey = getFormControlValue("swal-fk");
      const label = getFormControlValue("swal-fl");
      if (!fieldKey || !label) {
        Swal.showValidationMessage("識別碼和名稱為必填");
        return false;
      }

      const fieldType = getFormControlValue("swal-ft");
      const placeholder = getFormControlValue("swal-fp");
      const optionsRaw = getFormControlValue("swal-fo");
      const options = optionsRaw
        ? JSON.stringify(
          optionsRaw.split(",").map((value) => value.trim()).filter(Boolean),
        )
        : "";
      const required = isFormCheckboxChecked("swal-fr");
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
    Swal.fire({
      title: "新增中...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });
    const response = await authFetch(`${API_URL}?action=addFormField`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), ...formValues }),
    });
    const data = await response.json();
    if (!data.success) {
      Swal.fire("錯誤", data.error, "error");
      return;
    }

    Toast.fire({ icon: "success", title: "欄位已新增" });
    await loadFormFields();
  } catch (error) {
    Swal.fire("錯誤", error?.message || "欄位新增失敗", "error");
  }
}

async function editFormField(id) {
  const field = formFields.value.find((entry) => entry.id === id);
  if (!field) return;
  const { Swal, authFetch, API_URL, getAuthUserId, Toast } = getServices();

  const optionsStr = (() => {
    try {
      return JSON.parse(field.options || "[]").join(",");
    } catch {
      return "";
    }
  })();

  const { value: formValues } = await Swal.fire({
    title: "編輯欄位",
    html: `
              <div style="text-align:left;">
                  <label class="block text-sm mb-1 font-medium">顯示名稱</label>
                  <input id="swal-fl" class="swal2-input" value="${
      escapeHtml(field.label || "")
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
      escapeHtml(field.placeholder || "")
    }" style="margin:0 0 12px 0;width:100%">
                  <label class="block text-sm mb-1 font-medium">選項 (下拉選單，逗號分隔)</label>
                  <input id="swal-fo" class="swal2-input" value="${
      escapeHtml(optionsStr)
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
      const label = getFormControlValue("swal-fl");
      if (!label) {
        Swal.showValidationMessage("名稱為必填");
        return false;
      }

      const fieldType = getFormControlValue("swal-ft");
      const placeholder = getFormControlValue("swal-fp");
      const optionsRaw = getFormControlValue("swal-fo");
      const options = optionsRaw
        ? JSON.stringify(
          optionsRaw.split(",").map((value) => value.trim()).filter(Boolean),
        )
        : "";
      const required = isFormCheckboxChecked("swal-fr");
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
    const response = await authFetch(`${API_URL}?action=updateFormField`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), id, ...formValues }),
    });
    const data = await response.json();
    if (!data.success) {
      Swal.fire("錯誤", data.error, "error");
      return;
    }

    Toast.fire({ icon: "success", title: "已更新" });
    await loadFormFields();
  } catch (error) {
    Swal.fire("錯誤", error?.message || "欄位更新失敗", "error");
  }
}

async function deleteFormField(id) {
  const field = formFields.value.find((entry) => entry.id === id);
  const { Swal, authFetch, API_URL, getAuthUserId, Toast } = getServices();
  const confirmation = await Swal.fire({
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
    const response = await authFetch(`${API_URL}?action=deleteFormField`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), id }),
    });
    const data = await response.json();
    if (!data.success) {
      Swal.fire("錯誤", data.error, "error");
      return;
    }

    Toast.fire({ icon: "success", title: "已刪除" });
    await loadFormFields();
  } catch (error) {
    Swal.fire("錯誤", error?.message || "欄位刪除失敗", "error");
  }
}

async function toggleFieldEnabled(id, enabled) {
  const { Swal, authFetch, API_URL, getAuthUserId, Toast } = getServices();
  try {
    const response = await authFetch(`${API_URL}?action=updateFormField`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), id, enabled }),
    });
    const data = await response.json();
    if (!data.success) {
      Swal.fire("錯誤", data.error, "error");
      return;
    }

    Toast.fire({
      icon: "success",
      title: enabled ? "已啟用" : "已停用",
    });
    await loadFormFields();
  } catch (error) {
    Swal.fire("錯誤", error?.message || "欄位狀態更新失敗", "error");
  }
}

export function configureDashboardFormFieldsServices(nextServices) {
  services = {
    ...services,
    ...nextServices,
  };
}

export function useDashboardFormFields() {
  return {
    formFieldsView,
  };
}

export const dashboardFormFieldsActions = {
  registerFormFieldsListElement,
  loadFormFields,
  showAddFieldModal,
  editFormField,
  deleteFormField,
  toggleFieldEnabled,
};
