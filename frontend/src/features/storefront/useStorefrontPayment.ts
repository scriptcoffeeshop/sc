import { ref } from "vue";

interface StorefrontBankAccount {
  id?: string | number;
}

interface StorefrontPaymentSnapshot {
  bankAccounts?: StorefrontBankAccount[];
  selectedBankAccountId?: string | number;
}

interface StorefrontPaymentDeps {
  getStorefrontUiSnapshot?: () => StorefrontPaymentSnapshot;
  selectPayment?: (method: string) => unknown;
  selectBankAccount?: (bankId: string | number) => unknown;
  clipboard?: {
    writeText?: (text: string) => Promise<unknown>;
  };
  Toast?: {
    fire?: (payload: { icon?: string; title?: string }) => unknown;
  };
  Swal?: {
    fire?: (...args: unknown[]) => unknown;
  };
  setTimeout?: (callback: () => void, delay: number) => unknown;
}

export function useStorefrontPayment(deps: StorefrontPaymentDeps = {}) {
  const bankAccounts = ref<StorefrontBankAccount[]>([]);
  const selectedBankAccountId = ref("");
  const copiedBankAccountId = ref("");

  function syncPaymentState() {
    const snapshot = deps.getStorefrontUiSnapshot?.() || {};
    bankAccounts.value = Array.isArray(snapshot.bankAccounts)
      ? snapshot.bankAccounts
      : [];
    selectedBankAccountId.value = String(snapshot.selectedBankAccountId || "");
  }

  function handleSelectPayment(method: string) {
    deps.selectPayment?.(method);
    syncPaymentState();
  }

  function handleSelectBankAccount(bankId: string | number) {
    deps.selectBankAccount?.(bankId);
    syncPaymentState();
  }

  function handleCopyTransferAccount(
    bankId: string | number,
    accountNumber: string,
  ) {
    const account = String(accountNumber || "").trim();
    if (!account) return;

    const writePromise = deps.clipboard?.writeText?.(account);
    if (!writePromise) {
      deps.Swal?.fire?.("錯誤", "複製失敗，請手動複製", "error");
      return;
    }

    writePromise
      .then(() => {
        copiedBankAccountId.value = String(bankId);
        deps.Toast?.fire?.({ icon: "success", title: "帳號已複製" });
        deps.setTimeout?.(() => {
          if (copiedBankAccountId.value === String(bankId)) {
            copiedBankAccountId.value = "";
          }
        }, 2000);
      })
      .catch(() => deps.Swal?.fire?.("錯誤", "複製失敗，請手動複製", "error"));
  }

  return {
    bankAccounts,
    selectedBankAccountId,
    copiedBankAccountId,
    syncPaymentState,
    handleSelectPayment,
    handleSelectBankAccount,
    handleCopyTransferAccount,
  };
}
