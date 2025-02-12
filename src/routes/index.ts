import { RouteRecordRaw } from "vue-router";
import Overview from "../pages/home/Overview.vue";
import WorkInProgress from "../pages/home/WorkInProgess.vue";

export const routes: RouteRecordRaw[] = [
    {
        path: "/",

        component: Overview,
    },
    {
        path: "/cv",
        component: WorkInProgress,
    },
    {
        path: "/my-journey",
        component: WorkInProgress,
    },
    {
        path: "/:catchAll(.*)",
        component: WorkInProgress,
    }
] 