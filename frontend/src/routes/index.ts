import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import Overview from "@/pages/home/Overview.vue";
import CV from "@/pages/home/CV.vue";
import Blog from "@/pages/blog/Blog.vue";
import AllPosts from "@/pages/blog/AllPosts.vue";
import WorkInProgress from "@/pages/home/WorkInProgess.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "Home",
    component: Overview,
    meta: {
      title: "Home Page - Overview",
    },
  },
  {
    path: "/cv",
    name: "CV",
    component: CV,
  },
  {
    path: "/blog/:site/:id",
    component: Blog,
  },
  {
    path: "/blog/:site",
    component: AllPosts,
  },
  {
    path: "/web-gpu",
    name: "WebGPU",
    component: WorkInProgress,
  },
  {
    path: "/shader-land",
    name: "ShaderLand",
    component: WorkInProgress,
  },
  {
    path: "/pets",
    name: "Pets",
    component: WorkInProgress,
  },
  {
    path: "/fight-night",
    name: "FightNight",
    component: WorkInProgress,
  },
  {
    path: "/god-of-fishing",
    name: "GodOfFishing",
    component: WorkInProgress,
  },
  {
    path: "/martial-world",
    name: "MartialWorld",
    component: WorkInProgress,
  },
  {
    path: "/discworld",
    name: "Discworld",
    component: WorkInProgress,
  },
  {
    path: "/imajica",
    name: "Imajica",
    component: WorkInProgress,
  },
  {
    path: "/:catchAll(.*)",
    redirect: "/",
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export { router };
