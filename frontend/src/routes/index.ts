import {
  createRouter,
  createWebHistory,
  RouteRecordRaw,
  RouterScrollBehavior,
} from "vue-router";
import Overview from "../pages/home/Overview.vue";
import CV from "../pages/home/CV.vue";
import MyJourney from "../pages/home/MyJourney.vue";
import Blog from "../pages/blog/Blog.vue";
import AllPosts from "../pages/blog/AllPosts.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: Overview,
    meta: {
      title: "Home Page - Overview",
    },
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
    path: "/blog/:site/:id",
    component: Blog,
  },
  {
    path: "/blog/:site",
    component: AllPosts,
  },
  {
    path: "/:catchAll(.*)",
    redirect: "/",
  },
];

const scrollBehavior: RouterScrollBehavior = (to, from, savedBehaviour) => {
  return { top: 0 };
};

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior,
});

export { router };
