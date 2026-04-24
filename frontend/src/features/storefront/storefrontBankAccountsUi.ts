import { state } from "../../lib/appState.ts";

export function createStorefrontBankAccountsUi() {
  function selectBankAccount(id: string | number) {
    const hasAccounts = Array.isArray(state.bankAccounts) &&
      state.bankAccounts.length > 0;
    if (!hasAccounts) {
      state.selectedBankAccountId = "";
      renderBankAccounts();
      return;
    }

    const selected = state.bankAccounts.find((account) =>
      String(account.id) === String(id)
    );
    state.selectedBankAccountId = selected
      ? selected.id
      : state.bankAccounts[0].id;
    renderBankAccounts();
  }

  function renderBankAccounts() {
    const container = document.getElementById("bank-accounts-list");
    if (!container || container.dataset?.vueManaged === "true") return;

    if (!Array.isArray(state.bankAccounts) || state.bankAccounts.length === 0) {
      state.selectedBankAccountId = "";
      container.replaceChildren();
      return;
    }

    const selectedExists = state.bankAccounts.some((account) =>
      String(account.id) === String(state.selectedBankAccountId)
    );
    if (!selectedExists) {
      state.selectedBankAccountId = state.bankAccounts[0].id;
    }

    const fragment = document.createDocumentFragment();
    state.bankAccounts.forEach((account) => {
      const isSelected = state.selectedBankAccountId == account.id;
      const borderClass = isSelected
        ? "border-primary ring-2 ring-primary bg-orange-50"
        : "border-[#d1dce5] bg-white";

      const card = document.createElement("div");
      card.className =
        `p-3 rounded-lg mb-2 relative cursor-pointer font-sans transition-all border ${borderClass}`;
      card.dataset.bankCard = "true";
      card.dataset.bankId = String(account.id);

      const topRow = document.createElement("div");
      topRow.className = "flex items-center gap-3 mb-1";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "bank_account_selection";
      radio.value = String(account.id);
      radio.className = "w-4 h-4 text-primary";
      radio.checked = Boolean(isSelected);

      const bankLabel = document.createElement("div");
      bankLabel.className = "font-semibold text-gray-800";
      bankLabel.textContent =
        `${String(account.bankName || "")} (${String(account.bankCode || "")})`;

      topRow.append(radio, bankLabel);

      const accountRow = document.createElement("div");
      accountRow.className = "flex items-center gap-2 mt-1 pl-7";

      const accountNumber = document.createElement("span");
      accountNumber.className = "text-lg font-mono font-medium";
      accountNumber.style.color = "var(--primary)";
      accountNumber.textContent = String(account.accountNumber || "");

      const copyButton = document.createElement("button");
      copyButton.type = "button";
      copyButton.dataset.copyAccount = "true";
      copyButton.dataset.account = String(account.accountNumber || "");
      copyButton.className =
        "text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 px-2 py-1 rounded transition-colors";
      copyButton.title = "複製帳號";
      copyButton.textContent = "複製";

      accountRow.append(accountNumber, copyButton);
      card.append(topRow, accountRow);

      if (account.accountName) {
        const accountName = document.createElement("div");
        accountName.className = "text-sm text-gray-500 mt-1 pl-7";
        accountName.textContent = `戶名: ${String(account.accountName)}`;
        card.appendChild(accountName);
      }

      fragment.appendChild(card);
    });

    container.replaceChildren(fragment);

    container.querySelectorAll("[data-bank-card]").forEach((card) => {
      if (!(card instanceof HTMLElement)) return;
      card.addEventListener("click", () => {
        selectBankAccount(card.dataset.bankId || "");
      });
    });

    container.querySelectorAll('input[name="bank_account_selection"]').forEach(
      (radio) => {
        if (!(radio instanceof HTMLInputElement)) return;
        radio.addEventListener("click", (event) => {
          event.stopPropagation();
          selectBankAccount(radio.value);
        });
      },
    );

    container.querySelectorAll("[data-copy-account]").forEach((button) => {
      if (!(button instanceof HTMLElement)) return;
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        copyTransferAccount(button, button.dataset.account || "");
      });
    });
  }

  function copyTransferAccount(button: HTMLElement, account: string) {
    if (navigator.clipboard && globalThis.isSecureContext) {
      navigator.clipboard.writeText(account).then(() => {
        showCopySuccess(button);
      }).catch((error) => {
        console.error("複製失敗:", error);
        fallbackCopyTextToClipboard(account, button);
      });
      return;
    }

    fallbackCopyTextToClipboard(account, button);
  }

  function fallbackCopyTextToClipboard(text: string, button: HTMLElement) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      if (document.execCommand("copy")) {
        showCopySuccess(button);
      }
    } catch (error) {
      console.error("Fallback 複製失敗:", error);
    }
    document.body.removeChild(textArea);
  }

  function showCopySuccess(button: HTMLElement) {
    const originalText = button.textContent;
    button.textContent = "已複製";
    button.classList.add("bg-green-100", "text-green-700");
    setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove("bg-green-100", "text-green-700");
    }, 2000);
  }

  return {
    renderBankAccounts,
    selectBankAccount,
  };
}
