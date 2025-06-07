import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import { importIcons } from "./helpers/icons";
import { addLanguages } from "./helpers/code-highlighting";
import hljsVuePlugin from "@highlightjs/vue-plugin";
import "highlight.js/styles/github-dark-dimmed.min.css";
import { createPinia } from "pinia";
import { router } from "./routes";
import { createHead } from "@unhead/vue/client";

importIcons();
addLanguages();

const pinia = createPinia();
const head = createHead();

createApp(App)
  .use(pinia)
  .use(hljsVuePlugin)
  .use(router)
  .use(head)
  .mount("#app");
