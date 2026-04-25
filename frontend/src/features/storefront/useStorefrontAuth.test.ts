import { describe, expect, it } from "vitest";
import {
  getStorefrontUserAvatarUrl,
  getStorefrontUserDisplayName,
  useStorefrontAuth,
} from "./useStorefrontAuth.ts";

describe("useStorefrontAuth", () => {
  it("syncs the current user into header view state", () => {
    const auth = useStorefrontAuth({
      getStorefrontUiSnapshot: () => ({
        currentUser: {
          userId: "line-1",
          displayName: "Kimi",
          pictureUrl: "https://example.com/avatar.png",
        },
      }),
    });

    auth.refreshAuthState();

    expect(auth.currentUser.value?.userId).toBe("line-1");
    expect(auth.userDisplayName.value).toBe("Kimi");
    expect(auth.userAvatarUrl.value).toBe("https://example.com/avatar.png");
  });

  it("supports legacy LINE profile key names", () => {
    const user = {
      userId: "line-2",
      display_name: "舊欄位會員",
      picture_url: "https://example.com/legacy.png",
    };

    expect(getStorefrontUserDisplayName(user)).toBe("舊欄位會員");
    expect(getStorefrontUserAvatarUrl(user)).toBe(
      "https://example.com/legacy.png",
    );
  });
});
