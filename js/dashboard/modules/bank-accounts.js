export function createBankAccountsController(deps) {
  let bankAccounts = [];
  let bankAccountsSortable = null;

  function destroyBankAccountsSortable() {
    if (!bankAccountsSortable) return;
    bankAccountsSortable.destroy();
    bankAccountsSortable = null;
  }

  async function loadBankAccountsAdmin() {
    try {
      const response = await deps.authFetch(
        `${deps.API_URL}?action=getBankAccounts&_=${Date.now()}`,
      );
      const data = await response.json();
      if (!data.success) return;
      bankAccounts = data.accounts || [];
      renderBankAccountsAdmin();
    } catch (error) {
      console.error(error);
    }
  }

  function renderBankAccountsAdmin() {
    const container = document.getElementById("bank-accounts-admin-list");
    if (!container) return;

    if (!bankAccounts.length) {
      destroyBankAccountsSortable();
      container.innerHTML = '<p class="text-sm ui-text-subtle">尚無匯款帳號</p>';
      return;
    }

    container.innerHTML = `
      <p class="text-xs ui-text-subtle mb-2">可拖曳左側排序圖示自由排序匯款帳號</p>
      <div id="bank-accounts-sortable" class="space-y-2">
        ${
      bankAccounts.map((account) => `
            <div class="flex items-center justify-between p-3 rounded-lg" data-account-id="${account.id}" style="background:#FFFDF7; border:1px solid #E2DCC8;">
                <div class="flex items-start gap-3 min-w-0">
                    <span class="drag-handle-bank cursor-move ui-text-muted hover:ui-text-strong select-none pt-1" title="拖曳排序">
                      <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="currentColor" viewBox="0 0 256 256" class="drag-handle-icon-sm"><path d="M104,60A12,12,0,1,1,92,48,12,12,0,0,1,104,60Zm60-12a12,12,0,1,0,12,12A12,12,0,0,0,164,48ZM92,116a12,12,0,1,0,12,12A12,12,0,0,0,92,116Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,116ZM92,184a12,12,0,1,0,12,12A12,12,0,0,0,92,184Zm72,0a12,12,0,1,0,12,12A12,12,0,0,0,164,184Z"></path></svg>
                    </span>
                    <div>
                        <div class="font-medium">${deps.esc(account.bankName)} (${
        deps.esc(account.bankCode)
      })</div>
                        <div class="text-sm font-mono ui-text-strong">${
        deps.esc(account.accountNumber)
      }</div>
                        ${
        account.accountName
          ? `<div class="text-xs ui-text-muted">戶名: ${deps.esc(account.accountName)}</div>`
          : ""
      }
                    </div>
                </div>
                <div class="flex gap-2 shrink-0">
                    <button data-action="edit-bank-account" data-bank-account-id="${account.id}" class="text-sm ui-text-highlight">編輯</button>
                    <button data-action="delete-bank-account" data-bank-account-id="${account.id}" class="text-sm ui-text-danger">刪除</button>
                </div>
            </div>
        `).join("")
    }
      </div>`;

    const sortableRoot = document.getElementById("bank-accounts-sortable");
    if (!sortableRoot || !deps.Sortable) return;

    destroyBankAccountsSortable();
    bankAccountsSortable = new deps.Sortable(sortableRoot, {
      handle: ".drag-handle-bank",
      animation: 150,
      ghostClass: "ui-bg-soft",
      onEnd: async (event) => {
        if (event.oldIndex === event.newIndex) return;

        const ids = Array.from(
          sortableRoot.querySelectorAll("[data-account-id]"),
        ).map((element) => Number.parseInt(element.dataset.accountId, 10)).filter((
          id,
        ) => Number.isInteger(id));

        if (!ids.length) return;

        try {
          const response = await deps.authFetch(
            `${deps.API_URL}?action=reorderBankAccounts`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: deps.getAuthUserId(), ids }),
            },
          );
          const data = await response.json();
          if (!data.success) throw new Error(data.error || "排序更新失敗");
          deps.Toast.fire({ icon: "success", title: "排序已更新" });
        } catch (error) {
          deps.Swal.fire("錯誤", error.message, "error");
          loadBankAccountsAdmin();
        }
      },
    });
  }

  async function showAddBankAccountModal() {
    const { value: formValues } = await deps.Swal.fire({
      title: "新增匯款帳號",
      html: `<div style="text-align:left;">
              <label class="block text-sm mb-1 font-medium">銀行代碼</label>
              <input id="swal-bc" class="swal2-input" placeholder="例：013" style="margin:0 0 12px 0;width:100%">
              <label class="block text-sm mb-1 font-medium">銀行名稱</label>
              <input id="swal-bn" class="swal2-input" placeholder="例：國泰世華" style="margin:0 0 12px 0;width:100%">
              <label class="block text-sm mb-1 font-medium">帳號</label>
              <input id="swal-an" class="swal2-input" placeholder="帳號號碼" style="margin:0 0 12px 0;width:100%">
              <label class="block text-sm mb-1 font-medium">戶名（選填）</label>
              <input id="swal-am" class="swal2-input" placeholder="戶名" style="margin:0 0 12px 0;width:100%">
          </div>`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "新增",
      cancelButtonText: "取消",
      preConfirm: () => ({
        bankCode: document.getElementById("swal-bc").value.trim(),
        bankName: document.getElementById("swal-bn").value.trim(),
        accountNumber: document.getElementById("swal-an").value.trim(),
        accountName: document.getElementById("swal-am").value.trim(),
      }),
    });

    if (!formValues || !formValues.bankCode || !formValues.accountNumber) return;

    try {
      const response = await deps.authFetch(`${deps.API_URL}?action=addBankAccount`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deps.getAuthUserId(), ...formValues }),
      });
      const data = await response.json();
      if (!data.success) {
        deps.Swal.fire("錯誤", data.error, "error");
        return;
      }

      deps.Toast.fire({ icon: "success", title: "帳號已新增" });
      loadBankAccountsAdmin();
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  async function editBankAccount(id) {
    const bankAccount = bankAccounts.find((account) => account.id === id);
    if (!bankAccount) return;

    const { value: formValues } = await deps.Swal.fire({
      title: "編輯匯款帳號",
      html: `<div style="text-align:left;">
              <label class="block text-sm mb-1 font-medium">銀行代碼</label>
              <input id="swal-bc" class="swal2-input" value="${
        deps.esc(bankAccount.bankCode)
      }" style="margin:0 0 12px 0;width:100%">
              <label class="block text-sm mb-1 font-medium">銀行名稱</label>
              <input id="swal-bn" class="swal2-input" value="${
        deps.esc(bankAccount.bankName)
      }" style="margin:0 0 12px 0;width:100%">
              <label class="block text-sm mb-1 font-medium">帳號</label>
              <input id="swal-an" class="swal2-input" value="${
        deps.esc(bankAccount.accountNumber)
      }" style="margin:0 0 12px 0;width:100%">
              <label class="block text-sm mb-1 font-medium">戶名（選填）</label>
              <input id="swal-am" class="swal2-input" value="${
        deps.esc(bankAccount.accountName || "")
      }" style="margin:0 0 12px 0;width:100%">
          </div>`,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "更新",
      cancelButtonText: "取消",
      preConfirm: () => ({
        bankCode: document.getElementById("swal-bc").value.trim(),
        bankName: document.getElementById("swal-bn").value.trim(),
        accountNumber: document.getElementById("swal-an").value.trim(),
        accountName: document.getElementById("swal-am").value.trim(),
      }),
    });

    if (!formValues) return;

    try {
      const response = await deps.authFetch(
        `${deps.API_URL}?action=updateBankAccount`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: deps.getAuthUserId(),
            id,
            ...formValues,
          }),
        },
      );
      const data = await response.json();
      if (!data.success) {
        deps.Swal.fire("錯誤", data.error, "error");
        return;
      }

      deps.Toast.fire({ icon: "success", title: "帳號已更新" });
      loadBankAccountsAdmin();
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  async function deleteBankAccount(id) {
    const confirmation = await deps.Swal.fire({
      title: "刪除帳號？",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#DC322F",
      confirmButtonText: "刪除",
      cancelButtonText: "取消",
    });
    if (!confirmation.isConfirmed) return;

    try {
      const response = await deps.authFetch(
        `${deps.API_URL}?action=deleteBankAccount`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: deps.getAuthUserId(), id }),
        },
      );
      const data = await response.json();
      if (!data.success) {
        deps.Swal.fire("錯誤", data.error, "error");
        return;
      }

      deps.Toast.fire({ icon: "success", title: "帳號已刪除" });
      loadBankAccountsAdmin();
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  return {
    loadBankAccountsAdmin,
    showAddBankAccountModal,
    editBankAccount,
    deleteBankAccount,
  };
}
