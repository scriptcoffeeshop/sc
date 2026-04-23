import { createApp } from "vue";
import Sortable from "sortablejs";
import "../lib/swal.js";
import "../tailwind.css";
import "sweetalert2/dist/sweetalert2.min.css";
import DashboardPage from "../pages/DashboardPage.vue";
import "../../../css/common.css";
import "../../../css/dashboard.css";

globalThis.Sortable = Sortable;

createApp(DashboardPage).mount("#app");
