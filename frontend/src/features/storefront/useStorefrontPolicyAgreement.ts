import { ref } from "vue";

export interface StorefrontPolicyHintEvent extends Event {
  detail?: {
    visible?: boolean;
  };
}

export function useStorefrontPolicyAgreement() {
  const policyAgreed = ref(false);
  const showPolicyHint = ref(false);

  function handlePolicyAgreementChanged() {
    if (policyAgreed.value) showPolicyHint.value = false;
  }

  function handlePolicyHintUpdated(event: Event) {
    const detail = (event as StorefrontPolicyHintEvent).detail || {};
    showPolicyHint.value = Boolean(detail.visible);
  }

  return {
    policyAgreed,
    showPolicyHint,
    handlePolicyAgreementChanged,
    handlePolicyHintUpdated,
  };
}
