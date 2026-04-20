export function createSettingsTabLoaders(deps) {
  return {
    settings: () => deps.loadSettings(),
    "icon-library": () => deps.loadSettings(),
    formfields: () => deps.loadFormFields(),
  };
}
