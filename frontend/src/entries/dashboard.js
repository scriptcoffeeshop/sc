import { createApp } from "vue";
import Sortable from "sortablejs";
import Swal from "sweetalert2";
import "../tailwind.css";
import "sweetalert2/dist/sweetalert2.min.css";
import DashboardPage from "../pages/DashboardPage.vue";
import "../../../css/common.css";
import "../../../css/dashboard.css";

globalThis.Swal = Swal;
globalThis.Sortable = Sortable;

createApp(DashboardPage).mount("#app");
