/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { state } from "../../lib/appState.ts";
import Swal from "../../lib/swal.ts";
import {
  openStoreSearchModal,
  resetStoreListCache,
} from "./storefrontStoreSearch.ts";

type StoreSearchSwalOptions = {
  html?: HTMLElement;
  title?: string;
};

vi.mock("../../lib/swal.ts", () => ({
  default: {
    fire: vi.fn(async (options) => {
      const popup = document.createElement("div");
      document.body.appendChild(popup);
      options?.didOpen?.(popup);
      return {};
    }),
    close: vi.fn(),
    showLoading: vi.fn(),
  },
}));

vi.mock("../../lib/sharedUtils.ts", () => ({
  Toast: {
    fire: vi.fn(),
  },
}));

describe("openStoreSearchModal", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetStoreListCache();
    state.selectedDelivery = "family_mart";
    vi.stubGlobal("fetch", vi.fn(async () => ({
      json: async () => ({
        success: true,
        stores: [
          { id: "001", name: "測試門市", address: "測試地址" },
        ],
      }),
    })));
  });

  it("mounts the Vue picker into a SweetAlert HTMLElement root", async () => {
    await openStoreSearchModal();

    const swalCalls = vi.mocked(Swal.fire).mock.calls as Array<[unknown]>;
    const modalOptions = swalCalls
      .map(([options]) => options)
      .find((options): options is StoreSearchSwalOptions =>
        Boolean(
          options &&
            typeof options === "object" &&
            "title" in options &&
            options.title === "搜尋門市",
        )
      );

    const modalHtml = modalOptions?.html;
    expect(modalHtml).toBeInstanceOf(HTMLElement);
    if (!(modalHtml instanceof HTMLElement)) {
      throw new Error("store search modal html was not mounted");
    }
    expect(modalHtml.id).toBe("");
    expect(document.querySelector("#store-search-input")).toBeTruthy();
  });
});
