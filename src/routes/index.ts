import { RouteRecordRaw } from "vue-router";
import Overview from "../pages/home/Overview.vue";
import CV from "../pages/home/CV.vue";
import MyJourney from "../pages/home/MyJourney.vue";

export const routes: RouteRecordRaw[] = [
    {
        path: "/",

        component: Overview,
    },
    {
        path: "/cv",
        component: CV,
    },
    {
        path: "/my-journey",
        component: MyJourney,
    },
    {
        path: "/:catchAll(.*)",
        redirect: "/",
    }
] 