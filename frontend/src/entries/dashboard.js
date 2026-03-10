import { createApp } from "vue";
import LegacyPage from "../components/LegacyPage.vue";

async function bootstrapDashboardLegacyApp() {
  try {
    const legacyModuleUrl = new URL(
      `${import.meta.env.BASE_URL}legacy/js/dashboard-app.js?v=52`,
      window.location.href,
    ).toString();
    const legacyModule = await import(/* @vite-ignore */ legacyModuleUrl);
    if (typeof legacyModule.initDashboardApp === "function") {
      legacyModule.initDashboardApp();
    }
  } catch (error) {
    console.error("[dashboard-entry] legacy bootstrap failed:", error);
    if (globalThis.Swal?.fire) {
      globalThis.Swal.fire("初始化失敗", "無法啟動後台頁面，請重新整理。", "error");
    }
  }
}

createApp(LegacyPage, {
  legacyPage: "dashboard.html",
  onReady: bootstrapDashboardLegacyApp,
}).mount("#app");
