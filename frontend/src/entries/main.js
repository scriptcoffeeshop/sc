import { createApp } from "vue";
import Swal from "sweetalert2";
import "../tailwind.css";
import "sweetalert2/dist/sweetalert2.min.css";
import MainPage from "../pages/MainPage.vue";
import "../../../css/common.css";
import "../../../css/main.css";

globalThis.Swal = Swal;

createApp(MainPage).mount("#app");
