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
    path: "/projects/:type",
    name: "Projects",
    component: WorkInProgress,
  },
  {
    path: "/books/:genre",
    name: "Books",
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
