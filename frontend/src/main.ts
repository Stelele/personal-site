import { createApp } from "vue";
import "./style.css";
import App from "@/App.vue";
import ui from "@nuxt/ui/vue-plugin";
import "highlight.js/styles/github-dark-dimmed.min.css";
import { createPinia } from "pinia";
import { router } from "@/routes";
import { createHead } from "@unhead/vue/client";

const pinia = createPinia();
const head = createHead();

createApp(App).use(pinia).use(router).use(head).use(ui).mount("#app");
