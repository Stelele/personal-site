import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";

const Overview = () => import("@/pages/home/Overview.vue");
const CV = () => import("@/pages/home/CV.vue");
const Blog = () => import("@/pages/blog/Blog.vue");
const AllPosts = () => import("@/pages/blog/AllPosts.vue");
const WorkInProgress = () => import("@/pages/home/WorkInProgess.vue");
const WhyIBlogPage = () => import("@/pages/blog/WhyIBlog.vue");

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
    path: "/why-i-blog",
    name: "WhyIBlog",
    component: WhyIBlogPage,
    meta: { title: "Why I blog", scrollToTop: true },
  },
  {
    path: "/blog/special/:id",
    redirect: "/why-i-blog",
  },
  {
    path: "/blog/special",
    redirect: "/why-i-blog",
  },
  {
    path: "/blog/:site/:id",
    component: Blog,
    meta: { scrollToTop: true }
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

const scrollPositions = new Map<string, number>();

function getContentArea(): HTMLElement | null {
  const elements = Array.from(document.querySelectorAll('.overflow-y-auto'))
  return elements.find(el => el.tagName === 'DIV' && el.scrollHeight > 0) || null
}

router.beforeEach((to, from) => {
  if (from.path !== to.path) {
    const contentArea = getContentArea()
    if (contentArea) {
      scrollPositions.set(from.fullPath, contentArea.scrollTop)
    }
  }
});

router.afterEach((to, from) => {
  if (from.path !== to.path) {
    const contentArea = getContentArea()
    if (!contentArea) return
    
    if (to.meta.scrollToTop) {
      contentArea.scrollTop = 0
    } else {
      const savedPosition = scrollPositions.get(to.fullPath)
      if (savedPosition !== undefined) {
        contentArea.scrollTop = savedPosition
      } else {
        contentArea.scrollTop = 0
      }
    }
  }
});

export { router };
