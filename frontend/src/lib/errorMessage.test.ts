import { describe, expect, it } from "vitest";
import { getErrorMessage } from "./errorMessage.ts";

describe("getErrorMessage", () => {
  it("uses Error messages before fallback text", () => {
    expect(getErrorMessage(new Error("boom"), "fallback")).toBe("boom");
    expect(getErrorMessage(new Error(""), "fallback")).toBe("fallback");
  });

  it("normalizes unknown thrown values", () => {
    expect(getErrorMessage("plain", "fallback")).toBe("plain");
    expect(getErrorMessage(null, "fallback")).toBe("fallback");
    expect(getErrorMessage(undefined)).toBe("發生未知錯誤");
  });
});
