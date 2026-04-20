export function createSettingsController(deps) {
  let settingsLoadToken = 0;

  function resetSectionTitle(section) {
    deps.resetSectionTitle(section);
  }

  async function loadSettings() {
    const currentLoadToken = ++settingsLoadToken;
    try {
      const response = await deps.authFetch(
        `${deps.API_URL}?action=getSettings&_=${Date.now()}`,
      );
      const data = await response.json();
      if (currentLoadToken !== settingsLoadToken) return;
      if (!data.success) return;

      const settings = data.settings;
      deps.setDashboardSettings(settings);
      deps.applyDashboardBranding(settings);
      deps.replaceSettingsConfig(settings);

      if (currentLoadToken !== settingsLoadToken) return;
      await deps.loadBankAccounts();
    } catch (error) {
      console.error(error);
    }
  }

  async function saveSettings() {
    try {
      const settingsConfig = deps.buildSettingsConfig();
      const response = await deps.authFetch(`${deps.API_URL}?action=updateSettings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: deps.getAuthUserId(),
          settings: settingsConfig.settings,
        }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      globalThis.localStorage?.setItem(
        deps.linePaySandboxCacheKey,
        String(settingsConfig.linePaySandboxChecked),
      );
      deps.Toast.fire({ icon: "success", title: "設定已儲存" });
      await loadSettings();
    } catch (error) {
      deps.Swal.fire("錯誤", error.message, "error");
    }
  }

  return {
    loadSettings,
    resetSectionTitle,
    saveSettings,
  };
}
