import { describe, expect, it } from "vitest";
import { useStorefrontPolicyAgreement } from "./useStorefrontPolicyAgreement.ts";

describe("useStorefrontPolicyAgreement", () => {
  it("tracks policy hint visibility from submit validation events", () => {
    const policy = useStorefrontPolicyAgreement();

    policy.handlePolicyHintUpdated(
      new CustomEvent("coffee:policy-agree-hint-updated", {
        detail: { visible: true },
      }),
    );
    expect(policy.showPolicyHint.value).toBe(true);

    policy.policyAgreed.value = true;
    policy.handlePolicyAgreementChanged();
    expect(policy.showPolicyHint.value).toBe(false);
  });
});
