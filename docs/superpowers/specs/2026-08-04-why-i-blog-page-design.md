# Why I Blog Page Design

## Problem

The sidebar has a "Why I blog" link pointing to `/blog`, which renders a `WorkInProgress.vue` placeholder. The CMS already has a published "Why I blog" post in the Special Articles blog (slug: `special`, post slug: `why-i-blog`). The site needs a dedicated page at `/why-i-blog` that renders this article directly.

`Blog.vue` contains reusable rendering logic (markdown parsing, HTML augmentation, SEO) that should be shared rather than duplicated. Additionally, the current code has several latent issues (unbounded setTimeout polling, missing optional chaining on `showCanonical`, no error state) that should be fixed during extraction.

## Solution

Extract the shared post-rendering logic from `Blog.vue` into a `usePostRenderer` composable. Fix the latent bugs during extraction. Create a new `WhyIBlog.vue` page that uses the composable to render the "Why I blog" article. Extract duplicate template parts (skeleton loader, prose styles) into shared components/composables. Refactor `Blog.vue` to use the same composable.

## Changes by File

### NEW: `src/composables/usePostRenderer.ts`

Extracted from `Blog.vue`, takes reactive inputs and handles all post rendering + SEO. Uses Vue's `watch` on the `post` computed, which naturally handles both initial data arrival (post changes from `undefined` to valid when the store populates) and route changes (route params change → `post` computed re-evaluates → watch fires).

```typescript
export interface UsePostRendererInput {
  /** Reactive post reference — may be undefined until data loads */
  post: ComputedRef<Post | undefined>;
  /** Expected content format */
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
```

**Key implementation details:**
- Uses `watch([post, isDataReady], renderContent, { immediate: true })` internally. This fires on mount, when store data arrives (`isDataReady` changes), and on route-param-driven `post` changes. Watching both ensures the composable detects "data ready but post still missing" (the not-found case).
- `showCanonical` uses `post.value?.link?.startsWith("https://") ?? false` — fixed optional chaining to prevent TypeError.
- `renderContent()` clears `parsedMarkdown.value = ""` at the start to prevent stale content flash.
- `MarkdownIt` instance is hoisted outside the function (created once).
- `isNotFound` is derived from `isDataReady.value && !post.value` — ensures the skeleton stays visible while the store is still fetching, and shows the "not found" card only when data is confirmed absent.
- JSON-LD image check: `post.value.coverImage?.length ? [post.value.coverImage] : []`
- Escape `</script>` in JSON-LD: `.replace(/</g, "\\u003c")`

**Loading lifecycle:**
1. Composable created: `isLoading = true`, `watch([post, isDataReady], ...)` fires immediately — `isDataReady` is `false`, stays in loading state
2. Store data arrives: `isDataReady` changes to `true`, `post` resolves → watch fires → `renderContent()` renders markdown → `isLoading = false`
3. Route changes (Blog.vue only): route params change → `post` computed returns new value → watch fires → `parsedMarkdown` cleared → `renderContent()` renders new content → `isLoading = false`
4. Post not found: `isDataReady` becomes `true` while `post` stays `undefined` → watch fires → `renderContent` sets `isLoading = false` → `isNotFound = true` → pages show "not found" card

### NEW: `src/components/PostSkeleton.vue`

Extracted skeleton loader from `Blog.vue` template. Used by both `Blog.vue` and `WhyIBlog.vue`.

A standalone component rendering the loading skeleton card — the full `<UCard variant="ghost"><template #header>...<USkeleton/>...</template>...<USkeleton/>...</UCard>` block from `Blog.vue:5-23`.

### `src/pages/blog/Blog.vue` (refactor)

Replace extracted logic with the composable. Template changes:
- Replace inline skeleton with `<PostSkeleton />`
- Add not-found state: show fallback card when `isNotFound` is true
- Article card stays the same (title, date, "View original" link, cover image, prose content)

Script — replace the entire `<script lang="ts" setup>` with:

```typescript
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
```

Removed from old Blog.vue: `onMounted`, `onUpdated`, `prevRoute`, `parsedMarkdown`, `augmentedContent`, `showCanonical`, `formatDate`, `loadPost`, `getAbsoluteImageUrl`, all `useSeoMeta`/`useHead` blocks, `DOMPurify` import, `MarkdownIt` import, `moment` import, `watch` import. Route change handling is now implicit — when route params change, the `post` computed re-evaluates, the composable's internal `watch` fires, and content is re-rendered.

Remove the `<style scoped>` block — prose styles move to `style.css`.

### NEW: `src/pages/blog/WhyIBlog.vue`

Dedicated page that renders the "Why I blog" post from the Special Articles blog. Uses `findPostBySlug` (new store method).

```vue
<template>
  <div class="min-w-full min-h-full lg:p-8">
    <UContainer class="lg:max-w-9/10">
      <UBreadcrumb :items="breadcrumbs" class="mb-4" />
      <PostSkeleton v-if="isLoading" />
      <UCard v-else-if="post" variant="ghost" class="w-full">
        <template #header>
          <h1 class="text-2xl md:text-3xl font-bold">{{ post.title }}</h1>
          <p v-if="post?.publishDate" class="text-lg font-medium text-muted mt-1">
            {{ formatDate(post.publishDate) }}
          </p>
          <img v-if="post?.coverImage" :src="post.coverImage" :alt="post.title" class="w-full mt-4 rounded-lg" />
        </template>
        <div class="post-body">
          <article class="prose prose-xl prose-slate max-w-none text-justify leading-relaxed" v-html="augmentedContent" />
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

**Key differences from Blog.vue:**
- Post lookup via `findPostBySlug("special", "why-i-blog")`
- Breadcrumb reads from post title with "Why I blog" fallback (reactive `computed`)
- No "View original article" button
- No `showCanonical` destructured
- `sidebarStore` imported for breadcrumb `onClick` handler — keeps sidebar highlighting in sync
- No `articlesStore.update()` call — `App.vue` already triggers it in `onBeforeMount`

### `src/stores/aritcles-store.ts` (new method)

Add a `findPostBySlug` method that matches on the post's `link` field (which for CMS posts is the slug):

```typescript
function findPostBySlug(blogSlug: string, postSlug: string): Post | undefined {
  return findBlog(blogSlug)?.posts.find((p) => p.link === postSlug);
}
```

Add it to the return statement.

### `src/routes/index.ts`

```typescript
import WhyIBlogPage from "@/pages/blog/WhyIBlog.vue";

// New route:
{
  path: "/why-i-blog",
  name: "WhyIBlog",
  component: WhyIBlogPage,
  meta: { title: "Why I blog", scrollToTop: true },
},
```

### `src/stores/sidebar-store.ts`

Change "Why I blog" sidebar item path from `/blog` to `/why-i-blog`:

```typescript
{
  label: "Why I blog",
  icon: "i-heroicons-question-mark-circle",
  path: "/why-i-blog",
  active: currentLink.value?.path === "/why-i-blog",
  onSelect: () => navigateTo("/why-i-blog"),
},
```

### `src/helpers/blogs/cms.ts`

Add `"special"` to the fetched blog slugs:

```typescript
slugs: ["progamming", "walking", "random", "special"]
```

### `src/style.css`

Move prose styles from the deleted `<style scoped>` blocks to global CSS. Note: `:deep()` is a Vue scoped-style escape hatch and must be dropped when styles become global:

```css
.post-body .prose {
  font-size: 1.25rem;
}

.post-body .prose p {
  margin-bottom: 1.5rem;
}
```

These are scoped via a `.post-body` parent class to avoid affecting other `.prose` usages in the app. Update both Blog.vue and WhyIBlog.vue templates to wrap their `<article>` in a `<div class="post-body">`.

## Template Differences: Blog.vue vs WhyIBlog.vue

| Aspect | Blog.vue | WhyIBlog.vue |
|--------|----------|--------------|
| Post lookup | `findPost(site, id)` via route params | `findPostBySlug("special", "why-i-blog")` |
| Breadcrumb | Home → {BlogName} → {PostTitle} | Home → post title (or "Why I blog" as fallback) |
| "View original" button | Shown when `showCanonical` is true | Not shown |
| Route awareness | `post` computed uses route params — composable's watch fires on route change | Single static post — no route awareness needed |
| Error state | Skeleton → content or not-found card | Skeleton → content or not-found card |
| sidebarStore usage | Breadcrumb `onClick` handlers | Breadcrumb `onClick` handler |

## Bugs Fixed During This Refactor

| Bug | Location | Fix |
|-----|----------|-----|
| `showCanonical` TypeError when post undefined | `Blog.vue:70` | Optional chaining on `.link`, nullish coalesce fallback |
| Recursive `setTimeout` polling never cancelled | `Blog.vue:96` | Replaced with `watch` in composable |
| New `MarkdownIt()` on every render | `Blog.vue:101` | Hoisted outside load function |
| `parsedMarkdown` not cleared on new load | composable | Cleared at start of render |
| No not-found state — skeleton shows forever if post missing | `Blog.vue` | `isNotFound` ref exposed, both pages show fallback card |
| Prose styles duplicated in both pages | `Blog.vue`, `WhyIBlog.vue` | Moved to global `style.css` with `.post-body` scoping |

## Data Flow

```
App.vue calls articlesStore.update() on mount
        │
        ▼
cms.ts fetches ["progamming", "walking", "random", "special"]
        │
        ▼
Go backend proxies to CMS .NET API
        │
        ▼
CMS returns Special Articles blog + Why I blog post
        │
        ▼
Pinia store holds blogs with posts
        │
        ▼
WhyIBlog.vue → findPostBySlug("special", "why-i-blog") → usePostRenderer({post, contentType})
        │
        ▼
watch(post) fires on data arrival → renderContent() → isLoading = false
        │
        ▼
Rendered page with full SEO, markdown, audio, and prose styling
```

## Files Summary

| File | Action |
|------|--------|
| `src/composables/usePostRenderer.ts` | NEW |
| `src/components/PostSkeleton.vue` | NEW |
| `src/pages/blog/WhyIBlog.vue` | NEW |
| `src/pages/blog/Blog.vue` | MODIFY (refactor to composable) |
| `src/stores/aritcles-store.ts` | MODIFY (add findPostBySlug) |
| `src/routes/index.ts` | MODIFY (add route) |
| `src/stores/sidebar-store.ts` | MODIFY (update link) |
| `src/helpers/blogs/cms.ts` | MODIFY (add "special" slug) |
| `src/style.css` | MODIFY (move prose styles with .post-body scoping) |
