/** @vitest-environment jsdom */

import { describe, expect, it, vi } from "vitest";
import {
  emitStorefrontEvent,
  onStorefrontEvent,
  STOREFRONT_EVENTS,
} from "./storefrontEventBus.ts";

describe("storefrontEventBus", () => {
  it("emits and unsubscribes storefront custom events", () => {
    const listener = vi.fn();
    const unsubscribe = onStorefrontEvent(
      STOREFRONT_EVENTS.cartUpdated,
      listener,
    );

    emitStorefrontEvent(STOREFRONT_EVENTS.cartUpdated, { items: [] });
    unsubscribe();
    emitStorefrontEvent(STOREFRONT_EVENTS.cartUpdated, { items: ["ignored"] });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].detail).toEqual({ items: [] });
  });
});
