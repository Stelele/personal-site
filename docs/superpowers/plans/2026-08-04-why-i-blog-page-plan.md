# Why I Blog Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract post-rendering logic from `Blog.vue` into `usePostRenderer`, create `WhyIBlog.vue` at `/why-i-blog`, extract shared `PostSkeleton.vue`, add `findPostBySlug` to store, add "special" blog to data fetch, update sidebar link.

**Architecture:** A composable (`usePostRenderer`) uses `watch(post, ..., { immediate: true })` internally to handle post loading + markdown rendering + HTML augmentation + DOMPurify sanitization + SEO. This naturally handles initial data arrival AND route changes (route params change → `post` computed re-evaluates → watch fires). A shared `PostSkeleton.vue` handles loading UI. Both `Blog.vue` and `WhyIBlog.vue` consume them, keeping only their template and post-resolution logic.

**Tech Stack:** Vue 3 + TypeScript + Vite, @nuxt/ui, markdown-it, DOMPurify, @unhead/vue, moment, Pinia

**Prerequisite:** The CMS database must contain a "Special Articles" blog (slug `special`) with a published "Why I blog" post (slug `why-i-blog`). This data is already present in the CMS host database at `cms-system/backend/Host/cms.db`.

---

### Task 1: Create `PostSkeleton.vue` component

**Files:**
- Create: `frontend/src/components/PostSkeleton.vue`

- [ ] **Step 1: Write the skeleton component**

Extract exactly the skeleton block from `Blog.vue:5-23`:

```vue
<template>
  <UCard variant="ghost" class="p-4 md:p-6 lg:p-8">
    <template #header>
      <div class="flex flex-col gap-3">
        <USkeleton class="h-8 w-3/4" />
        <USkeleton class="h-5 w-1/2" />
      </div>
    </template>
    <div class="flex flex-col gap-3">
      <div v-for="(_, index) in 6" :key="index" class="flex flex-col gap-2">
        <USkeleton v-if="index % 2 === 0" class="h-4 w-full" />
        <USkeleton v-else class="h-4 w-[90%]" />
      </div>
      <USkeleton class="h-64 w-full rounded-lg mt-2" />
      <div v-for="(_, index) in 4" :key="`p${index}`" class="flex flex-col gap-2">
        <USkeleton class="h-4 w-full" />
      </div>
    </div>
  </UCard>
</template>
```

- [ ] **Step 2: Verify build**

Run: `npm run build` from `frontend/`
Expected: No errors

---

### Task 2: Create `usePostRenderer` composable

**Files:**
- Create: `frontend/src/composables/usePostRenderer.ts`

- [ ] **Step 1: Write the composable**

```typescript
import { ref, computed, watch, type ComputedRef, type Ref } from "vue";
import { useSeoMeta, useHead } from "@unhead/vue";
import DOMPurify from "dompurify";
import MarkdownIt from "markdown-it";
import moment from "moment";
import type { Post } from "@/helpers/type";

const md = new MarkdownIt();

function getAbsoluteImageUrl(image: string | undefined): string {
  const img = image || "/assets/logo.png";
  if (img.startsWith("http")) return img;
  const base = import.meta.env.VITE_SITE_URL ?? "";
  return `${base}${img}`;
}

export interface UsePostRendererInput {
  post: ComputedRef<Post | undefined>;
  contentType: ComputedRef<"markdown" | "html">;
  /** Becomes true when the store has finished fetching. Used to distinguish
   *  "still loading" (skeleton) from "post not found" (error card). */
  isDataReady: ComputedRef<boolean>;
}

export interface UsePostRendererReturn {
  augmentedContent: ComputedRef<string>;
  isLoading: Ref<boolean>;
  isNotFound: ComputedRef<boolean>;
  showCanonical: ComputedRef<boolean>;
  formatDate: (date: string) => string;
}

export function usePostRenderer(
  input: UsePostRendererInput,
): UsePostRendererReturn {
  const { post, contentType, isDataReady } = input;
  const isLoading = ref(true);
  const parsedMarkdown = ref("");

  const showCanonical = computed(() => {
    return post.value?.link?.startsWith("https://") ?? false;
  });

  function formatDate(date: string): string {
    if (!moment(date).isValid()) return "Never Published";
    return moment(date).format("MMMM D, YYYY");
  }

  function renderContent() {
    parsedMarkdown.value = "";

    if (!isDataReady.value) {
      isLoading.value = true;
      return;
    }

    if (!post.value) {
      isLoading.value = false;
      return;
    }

    if (contentType.value === "markdown") {
      parsedMarkdown.value = md.render(post.value.content);
    }

    isLoading.value = false;
  }

  watch([post, isDataReady], renderContent, { immediate: true });

  const isNotFound = computed(() => {
    return isDataReady.value && !post.value;
  });

  const augmentedContent = computed(() => {
    if (isLoading.value) return "";

    const rawContent = post.value?.content ?? "";
    let htmlContent: string;

    if (contentType.value === "markdown") {
      htmlContent = parsedMarkdown.value || rawContent;
    } else {
      htmlContent = rawContent;
    }

    const doc = new DOMParser().parseFromString(htmlContent, "text/html");
    doc.querySelectorAll("img").forEach((img) => {
      img.style.display = "block";
      img.style.marginLeft = "auto";
      img.style.marginRight = "auto";
      img.style.maxWidth = "400px";
      img.style.borderRadius = "0.5rem";
    });
    doc.querySelectorAll("figcaption").forEach((caption) => {
      caption.style.textAlign = "center";
    });
    doc.querySelectorAll("audio").forEach((audio) => {
      audio.style.display = "block";
      audio.style.marginLeft = "auto";
      audio.style.marginRight = "auto";
      audio.style.maxWidth = "400px";
      audio.style.width = "100%";
    });

    const serialized = new XMLSerializer().serializeToString(doc);
    return DOMPurify.sanitize(serialized, {
      ADD_TAGS: ["audio"],
      ADD_ATTR: ["src", "controls"],
    });
  });

  useSeoMeta({
    title: () => post.value?.title,
    description: () => post.value?.brief,
    ogTitle: () => post.value?.title,
    ogDescription: () => post.value?.brief,
    ogImage: () => getAbsoluteImageUrl(post.value?.coverImage),
    ogType: "article",
    twitterCard: "summary_large_image",
    twitterTitle: () => post.value?.title,
    twitterDescription: () => post.value?.brief,
    twitterImage: () => getAbsoluteImageUrl(post.value?.coverImage),
  });

  useHead({
    meta: [
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
    ],
  });

  useHead(() => {
    if (!post.value) {
      return;
    }
    return {
      meta: [
        { property: "og:image:alt", content: post.value.title },
        { property: "og:image:secure_url", content: getAbsoluteImageUrl(post.value.coverImage) },
      ],
      script: [
        {
          type: "application/ld+json",
          innerHTML: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: post.value.title,
            image: post.value.coverImage?.length ? [post.value.coverImage] : [],
            datePublished: post.value.publishDate,
            dateModified: post.value.updateDate,
            author: {
              "@type": "Person",
              name: "Gift Mugweni",
            },
            description: post.value.brief,
          }).replace(/</g, "\\u003c"),
        },
      ],
    };
  });

  return { augmentedContent, isLoading, isNotFound, showCanonical, formatDate };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx vue-tsc --noEmit` from `frontend/`
Expected: No errors related to `usePostRenderer.ts`

---

### Task 3: Refactor `Blog.vue` to use composable and PostSkeleton

**Files:**
- Modify: `frontend/src/pages/blog/Blog.vue`

- [ ] **Step 1: Replace the skeleton loader**

Replace lines 5-23 (the `<UCard v-if="isLoading" ...>` block) with:

```vue
<PostSkeleton v-if="isLoading" />
```

- [ ] **Step 2: Add not-found state**

Insert after the `<PostSkeleton />` line:

```vue
<UCard v-else-if="isNotFound" variant="ghost" class="w-full">
  <p class="text-muted text-center py-8">The requested article could not be found.</p>
</UCard>
```

- [ ] **Step 3: Update the existing content card opening**

Change line 25 from `v-else` to `v-else-if="post"`:

```vue
<UCard v-else-if="post" variant="ghost" class="w-full">
```

**The rest of the template (lines 26-42) stays unchanged** — title, publish date, "View original article" button, cover image, and the `<article>` all remain as-is — but will be wrapped in `.post-body` in the next step.

- [ ] **Step 4: Wrap the article in a `.post-body` div**

Change line 41 (`<article class="prose ...">`) to:

```vue
<div class="post-body">
  <!-- eslint-disable-next-line vue/no-v-html -->
  <article class="prose prose-xl prose-slate max-w-none text-justify leading-relaxed" v-html="augmentedContent" />
</div>
```

- [ ] **Step 5: Replace the script section**

Replace the entire `<script lang="ts" setup>` section with:

```vue
<script lang="ts" setup>
import { computed } from "vue";
import { useArticlesStore } from "@/stores/aritcles-store";
import { useRoute } from "vue-router";
import { useSideBarStore } from "@/stores/sidebar-store";
import { usePostRenderer } from "@/composables/usePostRenderer";
import PostSkeleton from "@/components/PostSkeleton.vue";
import type { BreadcrumbItem } from "@nuxt/ui";

const articlesStore = useArticlesStore();
const sidebarStore = useSideBarStore();
const route = useRoute();

const post = computed(() => {
  return articlesStore.findPost(
    route.params.site as string,
    route.params.id as string,
  );
});

const capitalizedSite = computed(() => {
  const site = route.params.site as string;
  return site?.charAt(0).toUpperCase() + site?.slice(1) || "";
});

const contentType = computed<"markdown" | "html">(() => {
  const blog = articlesStore.findBlog(route.params.site as string);
  return blog?.contentType ?? "html";
});

const isDataReady = computed(() => !articlesStore.isDownloading);

const { augmentedContent, isLoading, isNotFound, showCanonical, formatDate } = usePostRenderer({
  post,
  contentType,
  isDataReady,
});

const breadcrumbLinks = computed<BreadcrumbItem[]>(() => {
  return [
    { label: "Home", to: "/", onClick: () => sidebarStore.init("/") },
    {
      label: capitalizedSite.value,
      to: `/blog/${route.params.site}`,
      onClick: () => sidebarStore.init(`/blog/${route.params.site}`),
    },
    { label: post.value?.title || "" },
  ];
});
</script>
```

- [ ] **Step 6: Delete the `<style scoped>` block**

Remove lines 229-237 (the `:deep(.prose)` scoped styles). Prose styles will be global with `.post-body` scoping, added in Task 6.

- [ ] **Step 7: Verify build**

Run: `npm run build` from `frontend/`
Expected: Clean build

---

### Task 4: Add `findPostBySlug` to articles store

**Files:**
- Modify: `frontend/src/stores/aritcles-store.ts`

- [ ] **Step 1: Add the method**

Add after `findPost` (after line 20):

```typescript
function findPostBySlug(blogSlug: string, postSlug: string): Post | undefined {
  return findBlog(blogSlug)?.posts.find((p) => p.link === postSlug);
}
```

- [ ] **Step 2: Add to return statement**

Add to the return object (after `findPost`):

```typescript
findPostBySlug,
```

- [ ] **Step 3: Verify build**

Run: `npm run build` from `frontend/`
Expected: Clean build

---

### Task 5: Create `WhyIBlog.vue` page

**Files:**
- Create: `frontend/src/pages/blog/WhyIBlog.vue`

- [ ] **Step 1: Write the page component**

```vue
<template>
  <div class="min-w-full min-h-full lg:p-8">
    <UContainer class="lg:max-w-9/10">
      <UBreadcrumb :items="breadcrumbs" class="mb-4" />
      <PostSkeleton v-if="isLoading" />
      <UCard v-else-if="post" variant="ghost" class="w-full">
        <template #header>
          <h1 class="text-2xl md:text-3xl font-bold">
            {{ post.title }}
          </h1>
          <p v-if="post?.publishDate" class="text-lg font-medium text-muted mt-1">
            {{ formatDate(post.publishDate) }}
          </p>
          <img
            v-if="post?.coverImage"
            :src="post.coverImage"
            :alt="post.title"
            class="w-full mt-4 rounded-lg"
          />
        </template>
        <div class="post-body">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <article
            class="prose prose-xl prose-slate max-w-none text-justify leading-relaxed"
            v-html="augmentedContent"
          />
        </div>
      </UCard>
      <UCard v-else-if="isNotFound" variant="ghost" class="w-full">
        <p class="text-muted text-center py-8">The requested page could not be found.</p>
      </UCard>
    </UContainer>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue";
import { useArticlesStore } from "@/stores/aritcles-store";
import { useSideBarStore } from "@/stores/sidebar-store";
import { usePostRenderer } from "@/composables/usePostRenderer";
import PostSkeleton from "@/components/PostSkeleton.vue";
import type { BreadcrumbItem } from "@nuxt/ui";

const articlesStore = useArticlesStore();
const sidebarStore = useSideBarStore();

const post = computed(() => articlesStore.findPostBySlug("special", "why-i-blog"));

const contentType = computed<"markdown" | "html">(() => {
  return articlesStore.findBlog("special")?.contentType ?? "markdown";
});

const isDataReady = computed(() => !articlesStore.isDownloading);

const { augmentedContent, isLoading, isNotFound, formatDate } = usePostRenderer({
  post,
  contentType,
  isDataReady,
});

const breadcrumbs = computed<BreadcrumbItem[]>(() => [
  { label: "Home", to: "/", onClick: () => sidebarStore.init("/") },
  { label: post.value?.title ?? "Why I blog" },
]);
</script>
```

- [ ] **Step 2: Verify build**

Run: `npm run build` from `frontend/`
Expected: Clean build

---

### Task 6: Add `.post-body` prose styles to global CSS

**Files:**
- Modify: `frontend/src/style.css`

- [ ] **Step 1: Append prose styles**

Append to `frontend/src/style.css`:

```css
.post-body .prose {
  font-size: 1.25rem;
}

.post-body .prose p {
  margin-bottom: 1.5rem;
}
```

Note: `:deep()` (Vue scoped-style escape hatch) is not used here — these are global styles scoped via the `.post-body` parent class.

- [ ] **Step 2: Verify build**

Run: `npm run build` from `frontend/`
Expected: Clean build

---

### Task 7: Add the route

**Files:**
- Modify: `frontend/src/routes/index.ts`

- [ ] **Step 1: Add import and route**

Add import after existing ones (after line 7):
```typescript
const WhyIBlogPage = () => import("@/pages/blog/WhyIBlog.vue");
```

Add route after the `/blog` route (after line 27):
```typescript
{
  path: "/why-i-blog",
  name: "WhyIBlog",
  component: WhyIBlogPage,
  meta: { title: "Why I blog", scrollToTop: true },
},
```

- [ ] **Step 2: Verify build**

Run: `npm run build` from `frontend/`
Expected: Clean build

---

### Task 8: Update sidebar link

**Files:**
- Modify: `frontend/src/stores/sidebar-store.ts`

- [ ] **Step 1: Change the "Why I blog" sidebar item**

Replace:
```typescript
{
  label: "Why I blog",
  icon: "i-heroicons-question-mark-circle",
  path: "/blog",
  active: currentLink.value?.path === "/blog",
  onSelect: () => navigateTo("/blog"),
},
```

With:
```typescript
{
  label: "Why I blog",
  icon: "i-heroicons-question-mark-circle",
  path: "/why-i-blog",
  active: currentLink.value?.path === "/why-i-blog",
  onSelect: () => navigateTo("/why-i-blog"),
},
```

- [ ] **Step 2: Verify build**

Run: `npm run build` from `frontend/`
Expected: Clean build

---

### Task 9: Add "special" blog to CMS data fetch

**Files:**
- Modify: `frontend/src/helpers/blogs/cms.ts`

- [ ] **Step 1: Add `"special"` to the slugs array**

Replace:
```typescript
slugs: ["progamming", "walking", "random"]
```

With:
```typescript
slugs: ["progamming", "walking", "random", "special"]
```

- [ ] **Step 2: Verify build**

Run: `npm run build` from `frontend/`
Expected: Clean build

---

### Task 10: Final verification

- [ ] **Step 1: Full build check**

Run: `npm run build` from `frontend/`
Expected: Clean build across all changes

- [ ] **Step 2: Lint check**

Run: `npm run lint` from `frontend/`
Expected: No new lint errors

- [ ] **Step 3: Manual smoke test** (requires running CMS backend + Go proxy)

  1. Start CMS backend, Go proxy, and frontend dev server
  2. Navigate to `/why-i-blog` — skeleton shows, then article renders
  3. Verify: breadcrumb shows "Home → {post title}" (or "Why I blog" as fallback)
  4. Verify: post title, date, and content display correctly
  5. Verify: audio player renders and is styled (centered, max-width 400px)
  6. Verify: sidebar highlights "Why I blog"
  7. Navigate to `/blog/progamming` — listing page still works
  8. Click into a post — detail page (`/blog/:site/:id`) renders correctly
  9. Navigate between two blog detail pages — content updates correctly (route change)
  10. Refresh on `/blog/:site/:id` — post loads correctly on direct navigation
  11. Refresh on `/why-i-blog` — post loads correctly
  12. Navigate directly to `/why-i-blog` in a new tab — data fetches and renders
  13. Verify SEO tags in `<head>` for both `/why-i-blog` and `/blog/:site/:id`
  14. Navigate to `/blog/progamming/nonexistent-post-id` — verify "not found" card appears instead of skeleton
  15. Navigate from a valid post to an invalid route (`/blog/progamming/typo`) — verify "not found" card appears
