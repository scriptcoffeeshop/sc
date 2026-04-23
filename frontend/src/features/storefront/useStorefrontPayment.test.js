import { describe, expect, it, vi } from "vitest";
import { useStorefrontPayment } from "./useStorefrontPayment.ts";

describe("useStorefrontPayment", () => {
  it("syncs bank accounts and delegates payment selections", () => {
    let selectedBankAccountId = "1";
    const deps = {
      getStorefrontUiSnapshot: vi.fn(() => ({
        bankAccounts: [{ id: 1 }, { id: 2 }],
        selectedBankAccountId,
      })),
      selectPayment: vi.fn(),
      selectBankAccount: vi.fn((bankId) => {
        selectedBankAccountId = String(bankId);
      }),
    };
    const payment = useStorefrontPayment(deps);

    payment.syncPaymentState();
    payment.handleSelectPayment("transfer");
    payment.handleSelectBankAccount(2);

    expect(payment.bankAccounts.value).toEqual([{ id: 1 }, { id: 2 }]);
    expect(payment.selectedBankAccountId.value).toBe("2");
    expect(deps.selectPayment).toHaveBeenCalledWith("transfer");
    expect(deps.selectBankAccount).toHaveBeenCalledWith(2);
  });

  it("copies transfer account numbers and resets copied state", async () => {
    const scheduledCallbacks = [];
    const deps = {
      clipboard: { writeText: vi.fn(() => Promise.resolve()) },
      Toast: { fire: vi.fn() },
      Swal: { fire: vi.fn() },
      setTimeout: vi.fn((callback) => {
        scheduledCallbacks.push(callback);
      }),
    };
    const payment = useStorefrontPayment(deps);

    payment.handleCopyTransferAccount(7, " 822-123456789 ");
    await Promise.resolve();

    expect(deps.clipboard.writeText).toHaveBeenCalledWith("822-123456789");
    expect(payment.copiedBankAccountId.value).toBe("7");
    expect(deps.Toast.fire).toHaveBeenCalledWith({
      icon: "success",
      title: "帳號已複製",
    });

    scheduledCallbacks[0]?.();
    expect(payment.copiedBankAccountId.value).toBe("");
  });
});
