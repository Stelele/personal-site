import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";

const Overview = () => import("@/pages/home/Overview.vue");
const CV = () => import("@/pages/home/CV.vue");
const Blog = () => import("@/pages/blog/Blog.vue");
const AllPosts = () => import("@/pages/blog/AllPosts.vue");
const WorkInProgress = () => import("@/pages/home/WorkInProgess.vue");

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
    path: "/blog",
    name: "Blog",
    component: WorkInProgress,
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
    path: "/projects",
    name: "Projects",
    component: WorkInProgress,
  },
  {
    path: "/projects/:type",
    name: "Projects",
    component: WorkInProgress,
  },
  {
    path: "/books",
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
