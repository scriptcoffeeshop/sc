/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from "vitest";
import { createStorefrontBodyController } from "./storefrontBodySideEffects.ts";

describe("createStorefrontBodyController", () => {
  beforeEach(() => {
    document.body.className = "original";
    document.body.style.overflow = "auto";
  });

  it("applies storefront body class, locks scroll, and restores originals", () => {
    const controller = createStorefrontBodyController(document);

    controller.applyPageClass();
    controller.setCartDrawerOpen(true);
    expect(document.body.className).toBe("p-4 md:p-6");
    expect(document.body.style.overflow).toBe("hidden");

    controller.setCartDrawerOpen(false);
    expect(document.body.style.overflow).toBe("auto");

    controller.restore();
    expect(document.body.className).toBe("original");
    expect(document.body.style.overflow).toBe("auto");
  });
});
