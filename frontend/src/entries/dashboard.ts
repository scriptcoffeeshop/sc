import { createApp } from "vue";
import Sortable from "sortablejs";
import "../lib/swal.ts";
import "../tailwind.css";
import "sweetalert2/dist/sweetalert2.min.css";
import DashboardPage from "../pages/DashboardPage.vue";
import "../../../css/common.css";
import "../../../css/dashboard.css";

(globalThis as typeof globalThis & { Sortable?: typeof Sortable }).Sortable =
  Sortable;

createApp(DashboardPage).mount("#app");
