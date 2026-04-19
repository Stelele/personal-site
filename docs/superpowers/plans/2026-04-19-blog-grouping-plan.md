# Blog Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Return blog posts already grouped by blog from the data layer, removing hardcoded blog sources

**Architecture:** Each blog source (Medium, Hashnode, CMS) returns a `Blog` object containing metadata (id, name, slug, icon) and its posts. The downloader aggregates these into `Blog[]`. Components then use the grouped structure directly.

**Tech Stack:** Vue 3, TypeScript, Pinia

---

## Task 1: Update Type Definitions

**Files:**
- Modify: `src/helpers/type.ts`

- [ ] **Step 1: Add Blog interface to type.ts**

```typescript
export interface Blog {
  id: string;
  name: string;
  slug: string;
  icon: string;
  posts: Post[];
}
```

- [ ] **Step 2: Remove blogSite from Post interface**

Remove line 69: `blogSite: "medium" | "hashnode";`

- [ ] **Step 3: Commit**

```bash
git add src/helpers/type.ts
git commit -m "feat: add Blog interface, remove blogSite from Post"
```

---

## Task 2: Update medium.ts to return Blog

**Files:**
- Modify: `src/helpers/blogs/medium.ts`

- [ ] **Step 1: Change return type to Blog**

Replace function signature and return:

```typescript
import { Blog, Post } from "@/helpers/type";

export async function getMediumFeed(): Promise<Blog> {
  const feedPosts: Post[] = [];
  const posts = await getMediumPosts();

  for (const post of posts) {
    feedPosts.push({
      id: generateTitleHash(post.title),
      title: post.title,
      brief: post.subtitle,
      link: post.url,
      publishDate: moment(post.date).isValid() ? moment(post.date).format() : "Never Published",
      updateDate: moment(post.date).isValid() ? moment(post.date).format() : "Never Updated",
      coverImage: post.coverImage,
      tags: [],
      content: post.content,
    });
  }

  return {
    id: "medium",
    name: "Medium Blog",
    slug: "medium",
    icon: "i-simple-icons:medium",
    posts: feedPosts,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/helpers/blogs/medium.ts
git commit -m "feat: getMediumFeed returns Blog instead of Post[]"
```

---

## Task 3: Update hashnode.ts to return Blog

**Files:**
- Modify: `src/helpers/blogs/hashnode.ts`

- [ ] **Step 1: Change return type to Blog**

Replace function signature and return:

```typescript
import { Blog, HashnodeFeed, Post } from "@/helpers/type";

export async function getHashNodeFeed(): Promise<Blog> {
  const hashnodeFeed = await getHashNodePosts();
  const posts: Post[] = [];
  
  for (const edge of hashnodeFeed.data.publication.posts.edges) {
    posts.push({
      id: edge.node.id,
      title: edge.node.title,
      brief: edge.node.brief,
      link: edge.node.url,
      coverImage: edge?.node?.coverImage?.url || undefined,
      publishDate: moment(edge.node.publishedAt).format(),
      updateDate: moment(edge.node.updatedAt).format(),
      tags: edge.node.tags.map((x) => x.name),
      content: edge.node.content.html,
    });
  }

  return {
    id: "hashnode",
    name: hashnodeFeed.data.publication.title,
    slug: "hashnode",
    icon: "i-simple-icons:hashnode",
    posts: posts,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/helpers/blogs/hashnode.ts
git commit -m "feat: getHashNodeFeed returns Blog instead of Post[]"
```

---

## Task 4: Update downloader.ts to return Blog[]

**Files:**
- Modify: `src/helpers/downloader.ts`

- [ ] **Step 1: Update imports and function signature**

```typescript
import { Blog, Post } from "@/helpers/type";
import { getHashNodeFeed } from "@/helpers/blogs/hashnode";
import moment from "moment";
import { getMediumFeed } from "./blogs/medium";
import { CmsService } from "@/services/cms";
import { components } from "@/services/cms/schema";

export async function getBlogFeeds(): Promise<Blog[]> {
```

- [ ] **Step 2: Refactor to build Blog objects**

Replace function body:

```typescript
export async function getBlogFeeds(): Promise<Blog[]> {
  const [mediumFeed, hashNodeFeed] = await Promise.all([getMediumFeed(), getHashNodeFeed()]);

  const cmsClient = await CmsService.getClient();
  const cmsBlogs = await cmsClient.GET('/blogs', {
    params: {
      query: {
        slugs: ["progamming", "walking", "random"]
      }
    }
  })

  const cmsBlogList: Blog[] = [];
  for (const blog of cmsBlogs.data ?? []) {
    if (!blog.id) continue;
    const blogPosts = await cmsClient.GET('/blogs/{blogId}/posts', {
      params: {
        path: {
          blogId: blog.id
        },
      },
    });
    
    const posts: Post[] = [];
    for (const post of blogPosts.data ?? []) {
      posts.push({
        id: post.id ?? '',
        title: post.title ?? '',
        brief: post.description ?? '',
        link: post.slug ?? '',
        coverImage: post.coverImageUrl ?? '',
        publishDate: post.publishedOn ?? '',
        updateDate: post.updatedOn ?? '',
        tags: [post.tag ?? ''],
        content: post.content ?? '',
      });
    }

    cmsBlogList.push({
      id: blog.id,
      name: blog.title ?? 'Untitled',
      slug: blog.slug ?? blog.id,
      icon: "i-heroicons-book-open",
      posts: posts,
    });
  }

  const allBlogs: Blog[] = [mediumFeed, hashNodeFeed, ...cmsBlogList];

  for (const blog of allBlogs) {
    blog.posts.sort((a, b) => (moment(a.publishDate).isBefore(moment(b.publishDate)) ? 1 : -1));
  }

  return allBlogs;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/helpers/downloader.ts
git commit -m "feat: getBlogFeeds returns Blog[] with posts already grouped"
```

---

## Task 5: Update articles-store.ts

**Files:**
- Modify: `src/stores/aritcles-store.ts`

- [ ] **Step 1: Update store to hold Blog[]**

```typescript
import { defineStore } from "pinia";
import { Blog } from "@/helpers/type";
import { Ref, ref } from "vue";
import { getBlogFeeds } from "@/helpers/downloader";

export const useArticlesStore = defineStore("ArticlesStore", () => {
  const blogs = ref<Blog[]>([]);
  const isDownloading = ref(true);

  function update() {
    updatePosts(blogs, isDownloading);
  }

  // Helper to find a post by blog slug and post id
  function findPost(blogSlug: string, postId: string): Blog["posts"][0] | undefined {
    const blog = blogs.value.find(b => b.slug === blogSlug);
    return blog?.posts.find(p => p.id === postId);
  }

  // Helper to get posts for a specific blog
  function getPostsByBlog(blogSlug: string): Blog["posts"] {
    const blog = blogs.value.find(b => b.slug === blogSlug);
    return blog?.posts ?? [];
  }

  return {
    blogs,
    update,
    isDownloading,
    findPost,
    getPostsByBlog,
  };
});

async function updatePosts(blogs: Ref<Blog[]>, isDownloading: Ref<boolean>) {
  isDownloading.value = true;
  blogs.value = await getBlogFeeds();
  isDownloading.value = false;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/stores/aritcles-store.ts
git commit -m "feat: articles store holds Blog[], adds helper methods"
```

---

## Task 6: Update sidebar-store.ts

**Files:**
- Modify: `src/stores/sidebar-store.ts`

- [ ] **Step 1: Update blogNavs to be dynamic**

Replace `blogNavs` computed property:

```typescript
const blogNavs = computed<Detail[]>(() => {
  return articlesStore.blogs.map((blog) => ({
    title: blog.name,
    icon: blog.icon,
    path: `/blog/${blog.slug}`,
    children: blog.posts.map((post) => ({
      name: post.title,
      path: `/blog/${blog.slug}/${post.id}`,
    })),
  }));
});
```

- [ ] **Step 2: Commit**

```bash
git add src/stores/sidebar-store.ts
git commit -m "feat: sidebar dynamically builds nav from blogs"
```

---

## Task 7: Update AllPosts.vue

**Files:**
- Modify: `src/pages/blog/AllPosts.vue`

- [ ] **Step 1: Update posts computed**

Replace posts computed (around line 79):

```typescript
const posts = computed(() => {
  if (articlesStore.isDownloading) return [];
  return articlesStore.getPostsByBlog(blogSite.value);
});
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/blog/AllPosts.vue
git commit -m "feat: AllPosts uses grouped blog posts"
```

---

## Task 8: Update Blog.vue

**Files:**
- Modify: `src/pages/blog/Blog.vue`

- [ ] **Step 1: Update post computed**

Replace post computed (around line 97):

```typescript
const post = computed(() => {
  const foundPost = articlesStore.findPost(
    route.params.site as string,
    route.params.id as string
  );
  if (!foundPost) return;

  const content = new DOMParser().parseFromString(foundPost.content, "text/html");
  // ... rest of the code stays the same
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/blog/Blog.vue
git commit -m "feat: Blog page finds post from grouped structure"
```

---

## Task 9: Verify and Build

**Files:**
- (No file changes)

- [ ] **Step 1: Run TypeScript check**

```bash
cd frontend && npm run build
```

- [ ] **Step 2: Fix any type errors**

- [ ] **Step 3: Commit any fixes**

```bash
git add .
git commit -m "fix: resolve type errors from blog grouping refactor"
```

---

## Plan Summary

| Task | Description |
|------|-------------|
| 1 | Add `Blog` interface, remove `blogSite` from `Post` |
| 2 | Update `medium.ts` to return `Blog` |
| 3 | Update `hashnode.ts` to return `Blog` |
| 4 | Update `downloader.ts` to return `Blog[]` |
| 5 | Update `articles-store.ts` to hold `Blog[]` |
| 6 | Update `sidebar-store.ts` to be dynamic |
| 7 | Update `AllPosts.vue` to use grouped posts |
| 8 | Update `Blog.vue` to use grouped structure |
| 9 | Verify build passes |