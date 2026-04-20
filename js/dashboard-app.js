// 相容殼：保留 legacy 根入口的匯入點，但真正的 dashboard boot/service wiring
// 已搬到 frontend feature 層，避免後續 Vue 遷移繼續綁在 js/ 相容目錄。
export { dashboardShellActions } from "../frontend/src/features/dashboard/bootstrapDashboard.js";
