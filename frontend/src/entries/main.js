import { createApp } from "vue";
import LegacyPage from "../components/LegacyPage.vue";

async function bootstrapMainLegacyApp() {
  try {
    const legacyModuleUrl = new URL(
      `${import.meta.env.BASE_URL}legacy/js/main-app.js?v=52`,
      window.location.href,
    ).toString();
    const legacyModule = await import(/* @vite-ignore */ legacyModuleUrl);
    if (typeof legacyModule.initMainApp === "function") {
      await legacyModule.initMainApp();
    }
  } catch (error) {
    console.error("[main-entry] legacy bootstrap failed:", error);
    if (globalThis.Swal?.fire) {
      globalThis.Swal.fire("初始化失敗", "無法啟動訂購頁，請重新整理。", "error");
    }
  }
}

createApp(LegacyPage, {
  legacyPage: "main.html",
  onReady: bootstrapMainLegacyApp,
}).mount("#app");
