import { state } from "../../lib/appState.ts";

export function selectStorefrontBankAccount(id: string | number) {
  const accounts = Array.isArray(state.bankAccounts) ? state.bankAccounts : [];
  if (accounts.length === 0) {
    state.selectedBankAccountId = "";
    return;
  }

  const selected = accounts.find((account) => String(account.id) === String(id));
  const fallbackAccount = accounts[0];
  state.selectedBankAccountId = selected?.id ?? fallbackAccount?.id ?? "";
}
