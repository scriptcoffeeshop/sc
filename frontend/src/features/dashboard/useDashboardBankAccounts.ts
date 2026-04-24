import { nextTick, ref } from "vue";
import type {
  DashboardAuthFetch,
  DashboardSwal,
  DashboardToast,
} from "./dashboardOrderTypes.ts";
import { getDashboardErrorMessage } from "./dashboardErrors.ts";

interface BankAccountFormValues {
  bankCode?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
}

type BankAccountRecord = BankAccountFormValues & {
  id: number | string;
  enabled?: boolean;
};

type BankAccountsSortableEvent = {
  oldIndex?: number;
  newIndex?: number;
};

type BankAccountsSortableInstance = {
  destroy: () => void;
};

type BankAccountsSortableOptions = {
  handle: string;
  animation: number;
  ghostClass: string;
  onEnd: (event: BankAccountsSortableEvent) => void | Promise<void>;
};

type BankAccountsSortableFactory = {
  create?: (
    element: Element,
    options: BankAccountsSortableOptions,
  ) => BankAccountsSortableInstance;
};

type BankAccountsSortableConstructor = new (
  element: Element,
  options: BankAccountsSortableOptions,
) => BankAccountsSortableInstance;

type DashboardBankAccountsServices = {
  API_URL: string;
  authFetch: DashboardAuthFetch;
  getAuthUserId: () => string;
  Toast: DashboardToast;
  Swal: DashboardSwal;
  Sortable?: BankAccountsSortableFactory | BankAccountsSortableConstructor | null;
};

const bankAccounts = ref<BankAccountRecord[]>([]);

let services: DashboardBankAccountsServices | null = null;
let bankAccountsListElement: HTMLElement | null = null;
let bankAccountsSortable: BankAccountsSortableInstance | null = null;

function getServices(): DashboardBankAccountsServices {
  if (!services) {
    throw new Error("Dashboard bank accounts services 尚未初始化");
  }
  return services;
}

function normalizeBankAccount(value: unknown): BankAccountRecord {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return {
    id: record.id as number | string,
    bankCode: String(record.bankCode || ""),
    bankName: String(record.bankName || ""),
    accountNumber: String(record.accountNumber || ""),
    accountName: String(record.accountName || ""),
    enabled: record.enabled === undefined ? undefined : Boolean(record.enabled),
  };
}

function hasSortableCreate(
  sortable: DashboardBankAccountsServices["Sortable"],
): sortable is BankAccountsSortableFactory {
  return Boolean(sortable && typeof sortable === "object" && sortable.create);
}

function isSortableConstructor(
  sortable: DashboardBankAccountsServices["Sortable"],
): sortable is BankAccountsSortableConstructor {
  return typeof sortable === "function";
}

function getFormInputValue(id: string): string {
  const element = document.getElementById(id);
  return element instanceof HTMLInputElement ? element.value.trim() : "";
}

function destroyBankAccountsSortable() {
  if (!bankAccountsSortable) return;
  bankAccountsSortable.destroy();
  bankAccountsSortable = null;
}

async function reorderBankAccounts(ids: number[]) {
  const { API_URL, authFetch, getAuthUserId, Toast } = getServices();
  const response = await authFetch(`${API_URL}?action=reorderBankAccounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: getAuthUserId(), ids }),
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "排序更新失敗");
  }
  Toast.fire({ icon: "success", title: "排序已更新" });
  await loadBankAccounts();
}

async function syncBankAccountsSortable() {
  const { Sortable, Swal } = getServices();
  destroyBankAccountsSortable();
  if (!bankAccountsListElement?.querySelector?.("[data-bank-account-row]")) return;

  const createOptions = {
    handle: ".drag-handle-bank",
    animation: 150,
    ghostClass: "ui-bg-soft",
    onEnd: async (event) => {
      if (event.oldIndex === event.newIndex) return;
      const ids = Array.from(
        bankAccountsListElement.querySelectorAll("[data-bank-account-row]"),
      )
        .map((element) =>
          element instanceof HTMLElement
            ? Number.parseInt(element.dataset.bankAccountId || "", 10)
            : NaN
        )
        .filter((id) => Number.isInteger(id));

      try {
        await reorderBankAccounts(ids);
      } catch (error) {
        Swal.fire("錯誤", getDashboardErrorMessage(error, "排序更新失敗"), "error");
        await loadBankAccounts();
      }
    },
  };

  if (hasSortableCreate(Sortable)) {
    bankAccountsSortable = Sortable.create(bankAccountsListElement, createOptions);
    return;
  }

  if (isSortableConstructor(Sortable)) {
    bankAccountsSortable = new Sortable(bankAccountsListElement, createOptions);
  }
}

async function queueBankAccountsSync() {
  await nextTick();
  await syncBankAccountsSortable();
}

function registerBankAccountsListElement(element: HTMLElement | null) {
  bankAccountsListElement = element || null;
  if (!bankAccountsListElement) {
    destroyBankAccountsSortable();
    return;
  }
  queueBankAccountsSync();
}

async function loadBankAccounts() {
  try {
    const { API_URL, authFetch } = getServices();
    const response = await authFetch(
      `${API_URL}?action=getBankAccounts&_=${Date.now()}`,
    );
    const data = await response.json();
    if (!data.success) return;
    bankAccounts.value = Array.isArray(data.accounts)
      ? data.accounts.map(normalizeBankAccount)
      : [];
    await queueBankAccountsSync();
  } catch (error) {
    console.error(error);
  }
}

async function openBankAccountModal({
  title,
  confirmButtonText,
  initialValues = {},
}: {
  title: string;
  confirmButtonText: string;
  initialValues?: BankAccountFormValues;
}): Promise<BankAccountFormValues | undefined> {
  const { Swal } = getServices();
  const result = await Swal.fire({
    title,
    html: `<div style="text-align:left;">
            <label class="block text-sm mb-1 font-medium">銀行代碼</label>
            <input id="swal-bc" class="swal2-input" value="${
      String(initialValues.bankCode || "")
    }" placeholder="例：013" style="margin:0 0 12px 0;width:100%">
            <label class="block text-sm mb-1 font-medium">銀行名稱</label>
            <input id="swal-bn" class="swal2-input" value="${
      String(initialValues.bankName || "")
    }" placeholder="例：國泰世華" style="margin:0 0 12px 0;width:100%">
            <label class="block text-sm mb-1 font-medium">帳號</label>
            <input id="swal-an" class="swal2-input" value="${
      String(initialValues.accountNumber || "")
    }" placeholder="帳號號碼" style="margin:0 0 12px 0;width:100%">
            <label class="block text-sm mb-1 font-medium">戶名（選填）</label>
            <input id="swal-am" class="swal2-input" value="${
      String(initialValues.accountName || "")
    }" placeholder="戶名" style="margin:0 0 12px 0;width:100%">
        </div>`,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: "取消",
    preConfirm: () => ({
      bankCode: getFormInputValue("swal-bc"),
      bankName: getFormInputValue("swal-bn"),
      accountNumber: getFormInputValue("swal-an"),
      accountName: getFormInputValue("swal-am"),
    }),
  });

  return result?.value as BankAccountFormValues | undefined;
}

async function showAddBankAccountModal() {
  const formValues = await openBankAccountModal({
    title: "新增匯款帳號",
    confirmButtonText: "新增",
  });
  if (!formValues?.bankCode || !formValues?.accountNumber) return;

  try {
    const { API_URL, authFetch, getAuthUserId, Toast } = getServices();
    const response = await authFetch(`${API_URL}?action=addBankAccount`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), ...formValues }),
    });
    const data = await response.json();
    if (!data.success) {
      getServices().Swal.fire("錯誤", data.error, "error");
      return;
    }

    Toast.fire({ icon: "success", title: "帳號已新增" });
    await loadBankAccounts();
  } catch (error) {
    getServices().Swal.fire("錯誤", getDashboardErrorMessage(error, "新增失敗"), "error");
  }
}

async function editBankAccount(id: number | string) {
  const bankAccount = bankAccounts.value.find((account) => account.id === id);
  if (!bankAccount) return;

  const formValues = await openBankAccountModal({
    title: "編輯匯款帳號",
    confirmButtonText: "更新",
    initialValues: bankAccount,
  });
  if (!formValues) return;

  try {
    const { API_URL, authFetch, getAuthUserId, Toast } = getServices();
    const response = await authFetch(`${API_URL}?action=updateBankAccount`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), id, ...formValues }),
    });
    const data = await response.json();
    if (!data.success) {
      getServices().Swal.fire("錯誤", data.error, "error");
      return;
    }

    Toast.fire({ icon: "success", title: "帳號已更新" });
    await loadBankAccounts();
  } catch (error) {
    getServices().Swal.fire("錯誤", getDashboardErrorMessage(error, "更新失敗"), "error");
  }
}

async function deleteBankAccount(id: number | string) {
  const confirmation = await getServices().Swal.fire({
    title: "刪除帳號？",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#DC322F",
    confirmButtonText: "刪除",
    cancelButtonText: "取消",
  });
  if (!confirmation.isConfirmed) return;

  try {
    const { API_URL, authFetch, getAuthUserId, Toast } = getServices();
    const response = await authFetch(`${API_URL}?action=deleteBankAccount`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: getAuthUserId(), id }),
    });
    const data = await response.json();
    if (!data.success) {
      getServices().Swal.fire("錯誤", data.error, "error");
      return;
    }

    Toast.fire({ icon: "success", title: "帳號已刪除" });
    await loadBankAccounts();
  } catch (error) {
    getServices().Swal.fire("錯誤", getDashboardErrorMessage(error, "刪除失敗"), "error");
  }
}

export function configureDashboardBankAccountsServices(
  nextServices: DashboardBankAccountsServices,
) {
  services = {
    ...services,
    ...nextServices,
  };
}

export function useDashboardBankAccounts() {
  return {
    bankAccounts,
  };
}

export const dashboardBankAccountsActions = {
  registerBankAccountsListElement,
  loadBankAccounts,
  showAddBankAccountModal,
  editBankAccount,
  deleteBankAccount,
};
