function parseId(value) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function createSettingsActionHandlers(deps) {
  return {
    "upload-site-icon": () => deps.uploadSiteIcon(),
    "reset-site-icon": () => deps.resetSiteIcon(),
    "upload-section-icon": (el) => deps.uploadSectionIcon(el),
    "upload-payment-icon": (el) => deps.uploadPaymentIcon(el),
    "upload-delivery-row-icon": (el) => deps.uploadDeliveryRowIcon(el),
    "icon-library-apply": (el) => deps.applyIconFromLibrary(el),
    "reset-section-title": (el) => deps.resetSectionTitle(el.dataset.section),
    "add-delivery-option-admin": () => deps.addDeliveryOption(),
    "show-add-bank-account-modal": () => deps.showAddBankAccountModal(),
    "save-settings": () => deps.saveSettings(),
    "show-add-field-modal": () => deps.showAddFieldModal(),
    "remove-delivery-option-row": (el) => deps.removeDeliveryOption(
      el?.dataset?.deliveryId || el?.closest(".delivery-option-row")?.dataset?.deliveryId,
    ),
    "toggle-field-enabled": (el) => {
      const id = parseId(el.dataset.fieldId);
      if (id !== null) {
        deps.toggleFieldEnabled(id, el.dataset.enabled === "true");
      }
    },
    "edit-form-field": (el) => {
      const id = parseId(el.dataset.fieldId);
      if (id !== null) deps.editFormField(id);
    },
    "delete-form-field": (el) => {
      const id = parseId(el.dataset.fieldId);
      if (id !== null) deps.deleteFormField(id);
    },
    "edit-bank-account": (el) => {
      const id = parseId(el.dataset.bankAccountId);
      if (id !== null) deps.editBankAccount(id);
    },
    "delete-bank-account": (el) => {
      const id = parseId(el.dataset.bankAccountId);
      if (id !== null) deps.deleteBankAccount(id);
    },
  };
}

export function createSettingsTabLoaders(deps) {
  return {
    settings: () => deps.loadSettings(),
    "icon-library": () => deps.loadSettings(),
    formfields: () => deps.loadFormFields(),
  };
}
