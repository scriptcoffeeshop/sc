import { describe, expect, it, vi } from "vitest";
import { useStorefrontShell } from "./useStorefrontShell.js";

function createClassList() {
  return { add: vi.fn() };
}

describe("useStorefrontShell", () => {
  it("syncs storefront products, delivery options, and bank account state", () => {
    const deps = {
      getProductsViewModel: vi.fn(() => ({
        categories: [{ category: "咖啡豆", products: [] }],
      })),
      getStorefrontUiSnapshot: vi.fn(() => ({
        deliveryConfig: [
          { id: "delivery", name: "宅配", enabled: true },
          { id: "seven_eleven", name: "7-11", enabled: false },
        ],
        bankAccounts: [{ id: 1, bankName: "測試銀行" }],
        selectedBankAccountId: 1,
      })),
    };

    const shell = useStorefrontShell(deps);
    shell.syncProductsSnapshot();
    shell.syncStorefrontUiState();

    expect(shell.productsCategories.value).toEqual([
      { category: "咖啡豆", products: [] },
    ]);
    expect(shell.deliveryOptions.value).toEqual([
      { id: "delivery", name: "宅配", enabled: true },
    ]);
    expect(shell.bankAccounts.value).toEqual([{ id: 1, bankName: "測試銀行" }]);
    expect(shell.selectedBankAccountId.value).toBe("1");
  });

  it("delegates storefront actions and keeps derived UI state in sync", () => {
    let selectedBankAccountId = "1";
    const announcementClassList = createClassList();
    const ordersClassList = createClassList();
    const deps = {
      document: {
        getElementById: vi.fn((id) => {
          if (id === "announcement-banner") {
            return { classList: announcementClassList };
          }
          if (id === "my-orders-modal") {
            return { classList: ordersClassList };
          }
          return null;
        }),
      },
      getStorefrontUiSnapshot: vi.fn(() => ({
        deliveryConfig: [{ id: "delivery", enabled: true }],
        bankAccounts: [{ id: 1 }, { id: 2 }],
        selectedBankAccountId,
      })),
      startMainLogin: vi.fn(),
      logoutCurrentUser: vi.fn(),
      showProfileModal: vi.fn(),
      showMyOrders: vi.fn(),
      selectPayment: vi.fn(),
      selectDelivery: vi.fn(),
      openStoreMap: vi.fn(),
      clearSelectedStore: vi.fn(),
      selectBankAccount: vi.fn((bankId) => {
        selectedBankAccountId = String(bankId);
      }),
    };

    const shell = useStorefrontShell(deps);
    shell.handleCloseAnnouncement();
    shell.handleStorefrontLogin();
    shell.handleStorefrontLogout();
    shell.handleShowProfile();
    shell.handleShowMyOrders();
    shell.handleCloseOrdersModal();
    shell.handleSelectPayment("linepay");
    shell.handleSelectDelivery("delivery");
    shell.handleOpenStoreMap();
    shell.handleClearSelectedStore();
    shell.handleSelectBankAccount("2");

    expect(announcementClassList.add).toHaveBeenCalledWith("hidden");
    expect(ordersClassList.add).toHaveBeenCalledWith("hidden");
    expect(deps.startMainLogin).toHaveBeenCalledTimes(1);
    expect(deps.logoutCurrentUser).toHaveBeenCalledTimes(1);
    expect(deps.showProfileModal).toHaveBeenCalledTimes(1);
    expect(deps.showMyOrders).toHaveBeenCalledTimes(1);
    expect(deps.selectPayment).toHaveBeenCalledWith("linepay");
    expect(deps.selectDelivery).toHaveBeenCalledWith("delivery");
    expect(deps.openStoreMap).toHaveBeenCalledTimes(1);
    expect(deps.clearSelectedStore).toHaveBeenCalledTimes(1);
    expect(deps.selectBankAccount).toHaveBeenCalledWith("2");
    expect(shell.selectedBankAccountId.value).toBe("2");
  });

  it("copies transfer account numbers and resets the copied marker", async () => {
    const scheduledCallbacks = [];
    const deps = {
      clipboard: { writeText: vi.fn(() => Promise.resolve()) },
      Toast: { fire: vi.fn() },
      Swal: { fire: vi.fn() },
      setTimeout: vi.fn((callback) => {
        scheduledCallbacks.push(callback);
      }),
    };
    const shell = useStorefrontShell(deps);

    shell.handleCopyTransferAccount(7, " 822-123456789 ");
    await Promise.resolve();

    expect(deps.clipboard.writeText).toHaveBeenCalledWith("822-123456789");
    expect(shell.copiedBankAccountId.value).toBe("7");
    expect(deps.Toast.fire).toHaveBeenCalledWith({
      icon: "success",
      title: "帳號已複製",
    });

    scheduledCallbacks[0]?.();
    expect(shell.copiedBankAccountId.value).toBe("");
  });
});
