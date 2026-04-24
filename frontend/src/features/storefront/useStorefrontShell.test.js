import { describe, expect, it, vi } from "vitest";
import { useStorefrontShell } from "./useStorefrontShell.ts";

function createClassList() {
  return { add: vi.fn() };
}

describe("useStorefrontShell", () => {
  it("delegates storefront shell actions", () => {
    const announcementClassList = createClassList();
    const closeOrderHistory = vi.fn();
    const profilePromise = Promise.resolve("saved");
    const deps = {
      document: {
        getElementById: vi.fn((id) => {
          if (id === "announcement-banner") {
            return { classList: announcementClassList };
          }
          return null;
        }),
      },
      startMainLogin: vi.fn(),
      logoutCurrentUser: vi.fn(),
      showProfileModal: vi.fn(() => profilePromise),
      showMyOrders: vi.fn(),
      closeOrderHistory,
    };

    const shell = useStorefrontShell(deps);
    shell.handleCloseAnnouncement();
    shell.handleStorefrontLogin();
    shell.handleStorefrontLogout();
    const showProfileResult = shell.handleShowProfile();
    shell.handleShowMyOrders();
    shell.handleCloseOrdersModal();

    expect(announcementClassList.add).toHaveBeenCalledWith("hidden");
    expect(closeOrderHistory).toHaveBeenCalledTimes(1);
    expect(deps.startMainLogin).toHaveBeenCalledTimes(1);
    expect(deps.logoutCurrentUser).toHaveBeenCalledTimes(1);
    expect(deps.showProfileModal).toHaveBeenCalledTimes(1);
    expect(showProfileResult).toBe(profilePromise);
    expect(deps.showMyOrders).toHaveBeenCalledTimes(1);
  });
});
