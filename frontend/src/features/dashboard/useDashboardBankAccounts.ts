import { nextTick, ref } from "vue";

const bankAccounts = ref([]);

let services = null;
let bankAccountsListElement = null;
let bankAccountsSortable = null;

function getServices() {
  if (!services) {
    throw new Error("Dashboard bank accounts services 尚未初始化");
  }
  return services;
}

function destroyBankAccountsSortable() {
  if (!bankAccountsSortable) return;
  bankAccountsSortable.destroy();
  bankAccountsSortable = null;
}

async function reorderBankAccounts(ids) {
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
        .map((element) => Number.parseInt(element.dataset.bankAccountId || "", 10))
        .filter((id) => Number.isInteger(id));

      try {
        await reorderBankAccounts(ids);
      } catch (error) {
        Swal.fire("錯誤", error?.message || "排序更新失敗", "error");
        await loadBankAccounts();
      }
    },
  };

  if (Sortable?.create) {
    bankAccountsSortable = Sortable.create(bankAccountsListElement, createOptions);
    return;
  }

  if (typeof Sortable === "function") {
    bankAccountsSortable = new Sortable(bankAccountsListElement, createOptions);
  }
}

async function queueBankAccountsSync() {
  await nextTick();
  await syncBankAccountsSortable();
}

function registerBankAccountsListElement(element) {
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
    bankAccounts.value = Array.isArray(data.accounts) ? data.accounts : [];
    await queueBankAccountsSync();
  } catch (error) {
    console.error(error);
  }
}

async function openBankAccountModal({
  title,
  confirmButtonText,
  initialValues = {},
}) {
  const { Swal } = getServices();
  const { value: formValues } = await Swal.fire({
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
      bankCode: document.getElementById("swal-bc").value.trim(),
      bankName: document.getElementById("swal-bn").value.trim(),
      accountNumber: document.getElementById("swal-an").value.trim(),
      accountName: document.getElementById("swal-am").value.trim(),
    }),
  });

  return formValues;
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
    getServices().Swal.fire("錯誤", error?.message || "新增失敗", "error");
  }
}

async function editBankAccount(id) {
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
    getServices().Swal.fire("錯誤", error?.message || "更新失敗", "error");
  }
}

async function deleteBankAccount(id) {
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
    getServices().Swal.fire("錯誤", error?.message || "刪除失敗", "error");
  }
}

export function configureDashboardBankAccountsServices(nextServices) {
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
