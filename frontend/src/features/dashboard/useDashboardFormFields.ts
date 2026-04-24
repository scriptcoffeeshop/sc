import { computed, nextTick, ref } from "vue";
import {
  buildAddFieldModalHtml,
  buildEditFieldModalHtml,
  collectAddFieldFormValues,
  collectEditFieldFormValues,
  renderDeliveryVisibilityCheckboxes,
  type DashboardDeliveryOptionLike,
  type DashboardFormFieldModalValues,
} from "./dashboardFormFieldsDialog.ts";
import {
  buildFormFieldViewModel,
  normalizeDeliveryVisibilityValue,
  type DashboardFormField,
} from "./dashboardFormFieldsShared.ts";

interface DashboardToastLike {
  fire: (...args: unknown[]) => unknown;
}

interface DashboardSwalLike {
  fire: (...args: unknown[]) => Promise<unknown>;
  showLoading?: () => void;
  showValidationMessage?: (message: string) => void;
}

interface DashboardSettingsRecord {
  delivery_options_config?: string;
  [key: string]: unknown;
}

interface DashboardFormFieldsResponse {
  success?: boolean;
  error?: string;
  fields?: DashboardFormField[];
}

interface DashboardMutationResponse {
  success?: boolean;
  error?: string;
}

interface DashboardSortableOptions {
  handle: string;
  animation: number;
  onEnd: () => Promise<void>;
}

interface DashboardSortableInstance {
  destroy: () => void;
}

interface DashboardSortableConstructor {
  new (
    element: HTMLElement,
    options: DashboardSortableOptions,
  ): DashboardSortableInstance;
  create?: (
    element: HTMLElement,
    options: DashboardSortableOptions,
  ) => DashboardSortableInstance;
}

interface DashboardFormFieldsServices {
  API_URL: string;
  authFetch: (input: string, init?: RequestInit) => Promise<Response>;
  getAuthUserId: () => string;
  getDashboardSettings?: () => DashboardSettingsRecord | null | undefined;
  Sortable?: DashboardSortableConstructor | null;
  Swal: DashboardSwalLike;
  Toast: DashboardToastLike;
  esc?: (value: string) => string;
  requestAnimationFrame?: (callback: FrameRequestCallback) => number;
}

const formFields = ref<DashboardFormField[]>([]);

let services: DashboardFormFieldsServices | null = null;
let formFieldsListElement: HTMLElement | null = null;
let formFieldsSortable: DashboardSortableInstance | null = null;

function getServices(): DashboardFormFieldsServices {
  if (!services) {
    throw new Error("Dashboard form fields services 尚未初始化");
  }
  return services;
}

function getDeliveryOptionsFromSettings(): DashboardDeliveryOptionLike[] {
  const configStr = String(
    getServices().getDashboardSettings?.()?.delivery_options_config || "",
  ).trim();
  if (!configStr) return [];

  try {
    const parsed = JSON.parse(configStr);
    return Array.isArray(parsed)
      ? parsed.map((option) => ({
        id: option?.id,
        label: option?.label || option?.id,
      }))
      : [];
  } catch {
    return [];
  }
}

function getFormFieldById(id: number): DashboardFormField | undefined {
  return formFields.value.find((entry) => Number(entry.id) === Number(id));
}

function buildMutationErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

async function postFormFieldsAction(
  action: string,
  payload: Record<string, unknown>,
): Promise<DashboardMutationResponse> {
  const { API_URL, authFetch, getAuthUserId } = getServices();
  const response = await authFetch(`${API_URL}?action=${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: getAuthUserId(),
      ...payload,
    }),
  });
  return await response.json() as DashboardMutationResponse;
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

function readSortedFieldIds(listElement: HTMLElement): number[] {
  return Array.from(listElement.querySelectorAll<HTMLElement>("[data-field-id]"))
    .map((element) => Number.parseInt(element.dataset.fieldId || "", 10))
    .filter((id) => !Number.isNaN(id));
}

async function reorderFormFields(ids: number[]) {
  const data = await postFormFieldsAction("reorderFormFields", { ids });
  if (!data.success) {
    throw new Error(data.error || "欄位排序更新失敗");
  }
  await loadFormFields();
}

function createSortableOptions(
  listElement: HTMLElement,
): DashboardSortableOptions {
  return {
    handle: ".drag-handle",
    animation: 150,
    onEnd: async () => {
      const { Swal, Toast } = getServices();
      try {
        await reorderFormFields(readSortedFieldIds(listElement));
        Toast.fire({ icon: "success", title: "排序已更新" });
      } catch (error) {
        Swal.fire(
          "錯誤",
          buildMutationErrorMessage(error, "排序更新失敗"),
          "error",
        );
        await loadFormFields();
      }
    },
  };
}

async function syncFormFieldsSortable() {
  const { Sortable } = getServices();
  destroyFormFieldsSortable();
  const listElement = formFieldsListElement;
  if (!listElement?.querySelector?.("[data-field-id]")) return;

  const options = createSortableOptions(listElement);
  if (Sortable?.create) {
    formFieldsSortable = Sortable.create(listElement, options);
    return;
  }

  if (typeof Sortable === "function") {
    formFieldsSortable = new Sortable(listElement, options);
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

async function loadFormFields() {
  try {
    const { API_URL, authFetch } = getServices();
    const response = await authFetch(
      `${API_URL}?action=getFormFieldsAdmin&_=${Date.now()}`,
    );
    const data = await response.json() as DashboardFormFieldsResponse;
    if (!data.success) return;
    formFields.value = Array.isArray(data.fields) ? data.fields : [];
    await queueFormFieldsSync();
  } catch (error) {
    console.error(error);
  }
}

function buildValidatedModalValues(
  values: DashboardFormFieldModalValues | false,
  validationMessage: string,
): DashboardFormFieldModalValues | false {
  if (values) return values;
  getServices().Swal.showValidationMessage?.(validationMessage);
  return false;
}

async function showAddFieldModal() {
  const { Swal, Toast } = getServices();
  const result = await Swal.fire({
    title: "新增欄位",
    html: buildAddFieldModalHtml(),
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "新增",
    cancelButtonText: "取消",
    confirmButtonColor: "#268BD2",
    didOpen: () =>
      renderDeliveryVisibilityCheckboxes(getDeliveryOptionsFromSettings(), null),
    preConfirm: () =>
      buildValidatedModalValues(
        collectAddFieldFormValues(),
        "識別碼和名稱為必填",
      ),
  }) as { value?: DashboardFormFieldModalValues };

  if (!result?.value) return;

  const formValues = {
    ...result.value,
    deliveryVisibility: normalizeDeliveryVisibilityValue(
      result.value.deliveryVisibility,
    ) ?? null,
  };

  try {
    Swal.fire({
      title: "新增中...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading?.(),
    });
    const data = await postFormFieldsAction("addFormField", formValues);
    if (!data.success) {
      Swal.fire("錯誤", data.error || "欄位新增失敗", "error");
      return;
    }

    Toast.fire({ icon: "success", title: "欄位已新增" });
    await loadFormFields();
  } catch (error) {
    Swal.fire(
      "錯誤",
      buildMutationErrorMessage(error, "欄位新增失敗"),
      "error",
    );
  }
}

async function editFormField(id: number) {
  const field = getFormFieldById(id);
  if (!field) return;

  const { Swal, Toast } = getServices();
  const result = await Swal.fire({
    title: "編輯欄位",
    html: buildEditFieldModalHtml(field),
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "儲存",
    cancelButtonText: "取消",
    confirmButtonColor: "#268BD2",
    didOpen: () =>
      renderDeliveryVisibilityCheckboxes(
        getDeliveryOptionsFromSettings(),
        field.delivery_visibility || null,
      ),
    preConfirm: () =>
      buildValidatedModalValues(collectEditFieldFormValues(), "名稱為必填"),
  }) as { value?: DashboardFormFieldModalValues };

  if (!result?.value) return;

  const formValues = {
    ...result.value,
    deliveryVisibility: normalizeDeliveryVisibilityValue(
      result.value.deliveryVisibility,
    ) ?? null,
  };

  try {
    const data = await postFormFieldsAction("updateFormField", {
      id,
      ...formValues,
    });
    if (!data.success) {
      Swal.fire("錯誤", data.error || "欄位更新失敗", "error");
      return;
    }

    Toast.fire({ icon: "success", title: "已更新" });
    await loadFormFields();
  } catch (error) {
    Swal.fire(
      "錯誤",
      buildMutationErrorMessage(error, "欄位更新失敗"),
      "error",
    );
  }
}

async function deleteFormField(id: number) {
  const field = getFormFieldById(id);
  const { Swal, Toast } = getServices();
  const confirmation = await Swal.fire({
    title: "確認刪除",
    text: `確定要刪除「${field?.label || ""}」欄位嗎？`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "刪除",
    cancelButtonText: "取消",
    confirmButtonColor: "#DC322F",
  }) as { isConfirmed?: boolean };
  if (!confirmation?.isConfirmed) return;

  try {
    const data = await postFormFieldsAction("deleteFormField", { id });
    if (!data.success) {
      Swal.fire("錯誤", data.error || "欄位刪除失敗", "error");
      return;
    }

    Toast.fire({ icon: "success", title: "已刪除" });
    await loadFormFields();
  } catch (error) {
    Swal.fire(
      "錯誤",
      buildMutationErrorMessage(error, "欄位刪除失敗"),
      "error",
    );
  }
}

async function toggleFieldEnabled(id: number, enabled: boolean) {
  const { Swal, Toast } = getServices();
  try {
    const data = await postFormFieldsAction("updateFormField", { id, enabled });
    if (!data.success) {
      Swal.fire("錯誤", data.error || "欄位狀態更新失敗", "error");
      return;
    }

    Toast.fire({
      icon: "success",
      title: enabled ? "已啟用" : "已停用",
    });
    await loadFormFields();
  } catch (error) {
    Swal.fire(
      "錯誤",
      buildMutationErrorMessage(error, "欄位狀態更新失敗"),
      "error",
    );
  }
}

export function configureDashboardFormFieldsServices(
  nextServices: Partial<DashboardFormFieldsServices>,
) {
  services = {
    ...(services || {}),
    ...nextServices,
  } as DashboardFormFieldsServices;
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
