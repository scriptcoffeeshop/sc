/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { submitExternalPostForm } from "./storefrontExternalPostForm.ts";

describe("submitExternalPostForm", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("creates and submits a POST form with hidden fields", () => {
    const submitSpy = vi
      .spyOn(HTMLFormElement.prototype, "submit")
      .mockImplementation(() => {
        // jsdom cannot perform native form submission.
      });

    const form = submitExternalPostForm({
      action: "https://emap.presco.com.tw/c2cemap.ashx",
      target: "_self",
      fields: {
        eshopid: "870",
        tempvar: "token-1",
        emptyValue: "",
      },
    });

    expect(form.method).toBe("post");
    expect(form.action).toBe("https://emap.presco.com.tw/c2cemap.ashx");
    expect(form.target).toBe("_self");
    expect(form.parentElement).toBe(document.body);
    expect(submitSpy).toHaveBeenCalledTimes(1);
    expect(
      Array.from(form.querySelectorAll("input")).map((input) => ({
        type: input.type,
        name: input.name,
        value: input.value,
      })),
    ).toEqual([
      { type: "hidden", name: "eshopid", value: "870" },
      { type: "hidden", name: "tempvar", value: "token-1" },
      { type: "hidden", name: "emptyValue", value: "" },
    ]);
  });
});
