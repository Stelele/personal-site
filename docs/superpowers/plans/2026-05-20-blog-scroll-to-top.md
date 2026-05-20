# Blog Scroll-to-Top Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add route-level scroll-to-top behavior for blog post pages, preserving browser back/forward scroll restoration.

**Architecture:** Add `scrollToTop` meta property to the blog post route and implement a `scrollBehavior` function in the Vue Router configuration that checks for this meta property and scrolls to top only when navigating to marked routes (not when using browser back/forward).

**Tech Stack:** Vue Router 4, TypeScript

---

### Task 1: Add scrollBehavior to Router Configuration

**Files:**
- Modify: `frontend/src/routes/index.ts`

- [ ] **Step 1: Add scrollBehavior function to router**

Add the `scrollBehavior` function to the `createRouter` call:

```typescript
const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    if (to.meta.scrollToTop) {
      return { top: 0, left: 0 }
    }
    return { top: 0, left: 0 }
  },
})
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/index.ts
git commit -m "feat: add scrollBehavior to router for scroll-to-top support"
```

### Task 2: Add scrollToTop Meta to Blog Post Route

**Files:**
- Modify: `frontend/src/routes/index.ts`

- [ ] **Step 1: Add meta property to blog post route**

Modify the `/blog/:site/:id` route to include the `scrollToTop` meta:

```typescript
{
  path: "/blog/:site/:id",
  component: Blog,
  meta: { scrollToTop: true }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/index.ts
git commit -m "feat: enable scroll-to-top for blog post pages"
```

### Task 3: Test Scroll Behavior

**Files:**
- None (manual testing)

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Test blog post navigation**

1. Navigate to `/blog/:site` (e.g., `/blog/medium`)
2. Scroll down the page
3. Click on a blog post link
4. Verify: Page loads at the top (scroll position = 0)

- [ ] **Step 3: Test browser back button**

1. After viewing a blog post, click browser back button
2. Verify: Returns to the blog listing at the previous scroll position

- [ ] **Step 4: Test other routes**

1. Navigate to `/`, `/cv`, `/projects`, `/books`
2. Verify: No change in scroll behavior from before

- [ ] **Step 5: Verify in dev tools**

Open browser dev tools console and run:
```javascript
window.scrollY
```
After clicking a blog post, verify it returns `0`.

---

## Verification Checklist

- [ ] Blog post pages scroll to top on navigation
- [ ] Browser back/forward buttons restore scroll position
- [ ] Other routes unchanged
- [ ] TypeScript compiles without errors
- [ ] All commits have descriptive messages
