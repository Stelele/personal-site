import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import Overview from "../pages/home/Overview.vue";
import CV from "../pages/home/CV.vue";
import MyJourney from "../pages/home/MyJourney.vue";
import Blog from "../pages/blog/Blog.vue";

const routes: RouteRecordRaw[] = [
    {
        path: "/",
        component: Overview,
        meta: {
            title: "Home Page - Overview"
        }
    },
    {
        path: "/cv",
        component: CV,
        meta: {
            title: "Home Page - CV"
        }
    },
    {
        path: "/my-journey",
        component: MyJourney,
        meta: {
            title: "Home Page - My Journey"
        }
    },
    {
        path: "/blog/:site/:id",
        component: Blog,
        meta: {
            title: "Blog Page"
        }
    },
    {
        path: "/:catchAll(.*)",
        redirect: "/",
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

// This callback runs before every route change, including on page load.
router.beforeEach((to, from, next) => {
    // This goes through the matched routes from last to first, finding the closest route with a title.
    // e.g., if we have `/some/deep/nested/route` and `/some`, `/deep`, and `/nested` have titles,
    // `/nested`'s will be chosen.
    const nearestWithTitle = to.matched.slice().reverse().find(r => r.meta && r.meta.title);

    // Find the nearest route element with meta tags.
    const nearestWithMeta = to.matched.slice().reverse().find(r => r.meta && r.meta.metaTags);

    const previousNearestWithMeta = from.matched.slice().reverse().find(r => r.meta && r.meta.metaTags);

    // If a route with a title was found, set the document (page) title to that value.
    if (nearestWithTitle) {
        document.title = nearestWithTitle.meta.title as string;
    } else if (previousNearestWithMeta) {
        document.title = previousNearestWithMeta.meta.title as string;
    }

    // Remove any stale meta tags from the document using the key attribute we set below.
    Array.from(document.querySelectorAll('[data-vue-router-controlled]')).map(el => el.parentNode?.removeChild(el));

    // Skip rendering meta tags if there are none.
    if (!nearestWithMeta) return next();

    // Turn the meta tag definitions into actual elements in the head.
    (nearestWithMeta.meta.metaTags as any[])?.map(tagDef => {
        const tag = document.createElement('meta');

        Object.keys(tagDef).forEach(key => {
            tag.setAttribute(key, tagDef[key]);
        });

        // We use this to track which meta tags we create so we don't interfere with other ones.
        tag.setAttribute('data-vue-router-controlled', '');

        return tag;
    })
        // Add the meta tags to the document head.
        .forEach(tag => document.head.appendChild(tag));

    next();
})

export { router }