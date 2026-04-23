import { createApp } from "vue";
import "../lib/swal.ts";
import "../tailwind.css";
import "sweetalert2/dist/sweetalert2.min.css";
import MainPage from "../pages/MainPage.vue";
import "../../../css/common.css";
import "../../../css/main.css";

createApp(MainPage).mount("#app");
