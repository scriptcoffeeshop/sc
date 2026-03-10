import { createApp } from "vue";
import LegacyPage from "../components/LegacyPage.vue";

createApp(LegacyPage, {
  legacyPage: "policy.html",
}).mount("#app");
