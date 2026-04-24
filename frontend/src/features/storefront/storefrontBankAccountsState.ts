import { state } from "../../lib/appState.ts";

export function selectStorefrontBankAccount(id: string | number) {
  const accounts = Array.isArray(state.bankAccounts) ? state.bankAccounts : [];
  if (accounts.length === 0) {
    state.selectedBankAccountId = "";
    return;
  }

  const selected = accounts.find((account) => String(account.id) === String(id));
  state.selectedBankAccountId = selected ? selected.id : accounts[0].id;
}
