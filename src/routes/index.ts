import { RouteRecordRaw } from "vue-router";
import Overview from "../pages/home/Overview.vue";

export const routes: RouteRecordRaw[] = [
    {
        path: "/",
        component: Overview,
    }
] 