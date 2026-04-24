import { afterEach, describe, expect, it } from "vitest";
import { state } from "../../lib/appState.ts";
import { selectStorefrontBankAccount } from "./storefrontBankAccountsState.ts";

describe("storefrontBankAccountsState", () => {
  afterEach(() => {
    state.bankAccounts = [];
    state.selectedBankAccountId = "";
  });

  it("selects an existing transfer bank account", () => {
    state.bankAccounts = [{ id: 1 }, { id: 2 }];

    selectStorefrontBankAccount(2);

    expect(state.selectedBankAccountId).toBe(2);
  });

  it("falls back to the first account when the selected id is missing", () => {
    state.bankAccounts = [{ id: "primary" }, { id: "backup" }];

    selectStorefrontBankAccount("missing");

    expect(state.selectedBankAccountId).toBe("primary");
  });

  it("clears selection when there are no transfer bank accounts", () => {
    state.bankAccounts = [];
    state.selectedBankAccountId = "old";

    selectStorefrontBankAccount("old");

    expect(state.selectedBankAccountId).toBe("");
  });
});
