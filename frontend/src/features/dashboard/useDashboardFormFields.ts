import { computed, createApp, nextTick, ref, type App } from "vue";
import { asJsonRecord, parseJsonArray } from "../../lib/jsonUtils.ts";
import { createLogger } from "../../lib/logger.ts";
import { getDashboardErrorMessage } from "./dashboardErrors.ts";
import DashboardFormFieldDialogForm, {
  type DashboardDeliveryOptionLike,
  type DashboardFormFieldDialogExpose,
  type DashboardFormFieldModalValues,
} from "./DashboardFormFieldDialogForm.vue";
import {
  buildFormFieldViewModel,
  normalizeDeliveryVisibilityValue,
  type DashboardFormField,
} from "./dashboardFormFieldsShared.ts";
import type { DashboardSwal, DashboardToast } from "./dashboardOrderTypes.ts";

const logger = createLogger("dashboard-form-fields");

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
  Swal: DashboardSwal;
  Toast: DashboardToast;
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

  return parseJsonArray(configStr).map((option) => {
    const record = asJsonRecord(option);
    const id = typeof record["id"] === "number" ? record["id"] : String(record["id"] || "");
    return {
      id,
      label: String(record["label"] || id),
    };
  });
}

function getFormFieldById(id: number): DashboardFormField | undefined {
  return formFields.value.find((entry) => Number(entry.id) === Number(id));
}

async function postFormFieldsAction(
  action: string,
  payload: object,
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
    .map((element) => Number.parseInt(element.dataset["fieldId"] || "", 10))
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
          getDashboardErrorMessage(error, "排序更新失敗"),
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
    logger.error("載入表單欄位失敗", error);
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

function normalizeModalValues(
  values: DashboardFormFieldModalValues,
): DashboardFormFieldModalValues {
  return {
    ...values,
    deliveryVisibility: normalizeDeliveryVisibilityValue(
      values.deliveryVisibility,
    ) ?? null,
  };
}

async function openFormFieldModal(params: {
  title: string;
  mode: "add" | "edit";
  confirmButtonText: string;
  validationMessage: string;
  initialField?: DashboardFormField | null;
}): Promise<DashboardFormFieldModalValues | undefined> {
  const { Swal } = getServices();
  const root = document.createElement("div");
  const deliveryOptions = getDeliveryOptionsFromSettings();
  let dialogApp: App<Element> | null = null;
  let dialogRef: DashboardFormFieldDialogExpose | null = null;

  const result = await Swal.fire({
    title: params.title,
    html: root,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: params.confirmButtonText,
    cancelButtonText: "取消",
    confirmButtonColor: "#268BD2",
    didOpen: (popup: unknown) => {
      if (
        !root.isConnected &&
        popup &&
        typeof (popup as { appendChild?: unknown }).appendChild === "function"
      ) {
        (popup as { appendChild: (node: Node) => void }).appendChild(root);
      }
      dialogApp = createApp(DashboardFormFieldDialogForm, {
        mode: params.mode,
        initialField: params.initialField || null,
        deliveryOptions,
      });
      dialogRef = dialogApp.mount(root) as unknown as
        DashboardFormFieldDialogExpose;
    },
    willClose: () => {
      dialogApp?.unmount();
      dialogApp = null;
      dialogRef = null;
    },
    preConfirm: () =>
      buildValidatedModalValues(
        dialogRef?.getValues() || false,
        params.validationMessage,
      ),
  }) as { value?: DashboardFormFieldModalValues };

  return result?.value;
}

function showFormFieldsLoadingModal(title: string) {
  const { Swal } = getServices();
  Swal.fire({
    title,
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading?.(),
  });
}

async function runFormFieldMutation(params: {
  action: string;
  payload: object;
  successTitle: string;
  errorMessage: string;
  loadingTitle?: string;
}): Promise<boolean> {
  const { Swal, Toast } = getServices();
  try {
    if (params.loadingTitle) {
      showFormFieldsLoadingModal(params.loadingTitle);
    }
    const data = await postFormFieldsAction(params.action, params.payload);
    if (!data.success) {
      Swal.fire("錯誤", data.error || params.errorMessage, "error");
      return false;
    }

    Toast.fire({ icon: "success", title: params.successTitle });
    await loadFormFields();
    return true;
  } catch (error) {
    Swal.fire(
      "錯誤",
      getDashboardErrorMessage(error, params.errorMessage),
      "error",
    );
    return false;
  }
}

async function showAddFieldModal() {
  const value = await openFormFieldModal({
    title: "新增欄位",
    mode: "add",
    confirmButtonText: "新增",
    validationMessage: "識別碼和名稱為必填",
  });

  if (!value) return;

  await runFormFieldMutation({
    action: "addFormField",
    payload: normalizeModalValues(value),
    successTitle: "欄位已新增",
    errorMessage: "欄位新增失敗",
    loadingTitle: "新增中...",
  });
}

async function editFormField(id: number) {
  const field = getFormFieldById(id);
  if (!field) return;

  const value = await openFormFieldModal({
    title: "編輯欄位",
    mode: "edit",
    initialField: field,
    confirmButtonText: "儲存",
    validationMessage: "名稱為必填",
  });

  if (!value) return;

  await runFormFieldMutation({
    action: "updateFormField",
    payload: {
      id,
      ...normalizeModalValues(value),
    },
    successTitle: "已更新",
    errorMessage: "欄位更新失敗",
  });
}

async function deleteFormField(id: number) {
  const field = getFormFieldById(id);
  const { Swal } = getServices();
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

  await runFormFieldMutation({
    action: "deleteFormField",
    payload: { id },
    successTitle: "已刪除",
    errorMessage: "欄位刪除失敗",
  });
}

async function toggleFieldEnabled(id: number, enabled: boolean) {
  await runFormFieldMutation({
    action: "updateFormField",
    payload: { id, enabled },
    successTitle: enabled ? "已啟用" : "已停用",
    errorMessage: "欄位狀態更新失敗",
  });
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
