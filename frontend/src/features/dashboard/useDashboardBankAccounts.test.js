import { beforeEach, describe, expect, it, vi } from "vitest";

function jsonResponse(payload) {
  return { json: async () => payload };
}

async function loadBankAccountsModule() {
  vi.resetModules();
  return await import("./useDashboardBankAccounts.ts");
}

describe("useDashboardBankAccounts", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("loads bank accounts and adds a new transfer account from the modal", async () => {
    const module = await loadBankAccountsModule();
    const requestBodies = [];
    const authFetch = vi.fn(async (url, options = {}) => {
      if (String(url).includes("getBankAccounts")) {
        return jsonResponse({
          success: true,
          accounts: [{
            id: 1,
            bankCode: "013",
            bankName: "國泰世華",
            accountNumber: "1234567890",
            accountName: "Script Coffee",
          }],
        });
      }
      if (String(url).includes("addBankAccount")) {
        requestBodies.push(JSON.parse(String(options.body || "{}")));
        return jsonResponse({ success: true });
      }
      throw new Error(`unexpected url: ${url}`);
    });
    const Swal = {
      fire: vi.fn(async (options) => {
        if (options?.title === "新增匯款帳號") {
          return {
            value: {
              bankCode: "822",
              bankName: "中國信託",
              accountNumber: "9988776655",
              accountName: "Script Coffee",
            },
          };
        }
        return {};
      }),
    };
    const Toast = { fire: vi.fn() };

    module.configureDashboardBankAccountsServices({
      API_URL: "https://api.example",
      authFetch,
      getAuthUserId: () => "admin-user",
      Sortable: null,
      Swal,
      Toast,
    });

    await module.dashboardBankAccountsActions.loadBankAccounts();
    expect(module.useDashboardBankAccounts().bankAccounts.value).toEqual([
      {
        id: 1,
        bankCode: "013",
        bankName: "國泰世華",
        accountNumber: "1234567890",
        accountName: "Script Coffee",
      },
    ]);

    await module.dashboardBankAccountsActions.showAddBankAccountModal();

    expect(requestBodies[0]).toEqual({
      userId: "admin-user",
      bankCode: "822",
      bankName: "中國信託",
      accountNumber: "9988776655",
      accountName: "Script Coffee",
    });
    expect(Toast.fire).toHaveBeenCalledWith({
      icon: "success",
      title: "帳號已新增",
    });
  });

  it("updates and deletes bank accounts through the corresponding dashboard actions", async () => {
    const module = await loadBankAccountsModule();
    const requestBodies = [];
    const authFetch = vi.fn(async (url, options = {}) => {
      if (String(url).includes("getBankAccounts")) {
        return jsonResponse({
          success: true,
          accounts: [{
            id: 7,
            bankCode: "013",
            bankName: "國泰世華",
            accountNumber: "1234567890",
            accountName: "Script Coffee",
          }],
        });
      }
      if (
        String(url).includes("updateBankAccount") ||
        String(url).includes("deleteBankAccount")
      ) {
        requestBodies.push({
          url: String(url),
          body: JSON.parse(String(options.body || "{}")),
        });
        return jsonResponse({ success: true });
      }
      throw new Error(`unexpected url: ${url}`);
    });
    const Swal = {
      fire: vi.fn(async (options) => {
        if (options?.title === "編輯匯款帳號") {
          return {
            value: {
              bankCode: "812",
              bankName: "台新銀行",
              accountNumber: "5566778899",
              accountName: "好日子要來了咖啡商行",
            },
          };
        }
        if (options?.title === "刪除帳號？") {
          return { isConfirmed: true };
        }
        return {};
      }),
    };
    const Toast = { fire: vi.fn() };

    module.configureDashboardBankAccountsServices({
      API_URL: "https://api.example",
      authFetch,
      getAuthUserId: () => "admin-user",
      Sortable: null,
      Swal,
      Toast,
    });

    await module.dashboardBankAccountsActions.loadBankAccounts();
    await module.dashboardBankAccountsActions.editBankAccount(7);
    await module.dashboardBankAccountsActions.deleteBankAccount(7);

    expect(requestBodies[0]).toMatchObject({
      url: expect.stringContaining("updateBankAccount"),
      body: {
        userId: "admin-user",
        id: 7,
        bankCode: "812",
        bankName: "台新銀行",
        accountNumber: "5566778899",
        accountName: "好日子要來了咖啡商行",
      },
    });
    expect(requestBodies[1]).toMatchObject({
      url: expect.stringContaining("deleteBankAccount"),
      body: { userId: "admin-user", id: 7 },
    });
    expect(Toast.fire).toHaveBeenCalledWith({
      icon: "success",
      title: "帳號已更新",
    });
    expect(Toast.fire).toHaveBeenCalledWith({
      icon: "success",
      title: "帳號已刪除",
    });
  });
});
