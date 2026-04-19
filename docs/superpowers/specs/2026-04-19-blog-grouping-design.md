# Blog Grouping Design

## Problem

Currently, blog posts are fetched from multiple sources (Medium, Hashnode, CMS), flattened into a single array in `downloader.ts`, then regrouped in `sidebar-store.ts` by checking `post.blogSite`. This is:
- Artificially complex (flatten then regroup)
- Hardcoded to only two blog sources (medium, hashnode)
- Makes adding new blog sources tedious

## Solution

Return posts already grouped by blog from the data layer. Each blog source returns its own metadata (name, slug, icon) alongside its posts.

## Data Types

```typescript
// In type.ts
export interface Blog {
  id: string;
  name: string;       // Display name (e.g., "Medium Blog")
  slug: string;       // URL segment (e.g., "medium")
  icon: string;       // Nuxt UI icon (e.g., "i-simple-icons:medium")
  posts: Post[];
}

export interface Post {
  id: string;
  title: string;
  brief: string;
  link: string;
  coverImage?: string;
  publishDate: string;
  updateDate: string;
  tags: string[];
  content: string;
  // removed blogSite - now derived from parent Blog
}
```

## Changes by File

### type.ts
- Add `Blog` interface
- Remove `blogSite` from `Post` interface

### medium.ts
- Return `Blog` instead of `Post[]`:
```typescript
export async function getMediumFeed(): Promise<Blog> {
  return {
    id: "medium",
    name: "Medium Blog",
    slug: "medium", 
    icon: "i-simple-icons:medium",
    posts: // ... transform to Post[]
  };
}
```

### hashnode.ts
- Return `Blog` instead of `Post[]`, pulling metadata from GraphQL response

### downloader.ts
- Return `Blog[]` (already grouped)
- Fetch all sources in parallel
- Sort posts within each blog by date (descending)
- Sort blogs by their latest post date (optional)

### articles-store.ts
- Hold `Blog[]` instead of `Post[]`
- Update computed properties and methods accordingly

### AllPosts.vue
- Find blog by slug from store
- Use blog's posts directly

### Blog.vue
- Find post from grouped structure using blog slug + post id

### sidebar-store.ts
- Build navigation dynamically from `articlesStore.blogs`
- No hardcoded blog sources

## CMS Integration

CMS already returns blog metadata (name, slug). Transform each CMS blog into a `Blog` object with its posts, treating CMS blogs the same as external feeds.