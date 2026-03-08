# AGENTS.md - Development Guidelines for Personal Site

## Project Overview

This is a Vue 3 + TypeScript + Vite personal portfolio website using TailwindCSS v4, Pinia for state management, and @nuxt/ui component library.

## Build Commands

```bash
# Development
npm run dev              # Start Vite dev server

# Build
npm run build            # Run vue-tsc type check, then Vite production build
npm run preview          # Preview production build locally

# Type Checking (via build)
vue-tsc -b              # Run TypeScript compiler in build mode
```

### Running a Single Test

**No test framework is currently installed.** To add tests:

```bash
# Install Vitest (recommended for Vue)
npm install -D vitest @vue/test-utils jsdom

# Run tests
npm run test            # Add to package.json: "test": "vitest"
npm run test:run        # Run tests once (CI mode): "test:run": "vitest run"
```

## Code Style Guidelines

### TypeScript

- **Strict mode enabled** - All TypeScript compiler strict checks are on
- Use explicit types for function parameters and return types when not inferrable
- Use `interface` for object shapes, `type` for unions/aliases
- Enable `strict: true` in tsconfig - do not disable strict checks

### Vue 3 Composition API

- Use `<script setup lang="ts">` syntax for all components
- Use `defineProps` and `defineEmits` with generic type parameters
- Prefer composition functions over mixins
- Use `ref()` for primitives, `reactive()` for objects (or `ref()` with objects)

### Imports

Order imports consistently:
1. Vue/stdlib imports (vue, vue-router, pinia)
2. External library imports (@nuxt/ui, highlight.js, moment)
3. Internal absolute imports (@/, @/components, @/stores, @/helpers)

```typescript
// Good import order
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import { defineStore } from "pinia";
import { Post } from "@/helpers/type";
import Timeline from "@/components/timeline/Timeline.vue";
```

### Naming Conventions

- **Components**: PascalCase (e.g., `Timeline.vue`, `CodeBlock.vue`)
- **Files**: camelCase for utilities/stores, PascalCase for components
- **Variables/functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Interfaces/Types**: PascalCase with descriptive names (e.g., `RssFeedItem`)
- **Store names**: PascalCase with "Store" suffix (e.g., `ArticlesStore`)

### Path Aliases

The `@/` alias maps to `src/`. Always use `@/` for internal imports:

```typescript
// Good
import { useArticlesStore } from "@/stores/aritcles-store";

// Avoid
import { useArticlesStore } from "../stores/aritcles-store";
```

### Vue Component Structure

Follow this order in `.vue` files:
1. `<template>` - Template first
2. `<script setup lang="ts">` - Script with setup
3. `<style>` - Scoped styles (if needed)

```vue
<template>
  <div class="...">
    <!-- Template content -->
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from "vue";
import ComponentName from "@/components/ComponentName.vue";

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// Component logic
</script>

<style scoped>
/* Scoped CSS if needed */
</style>
```

### Props Definition

Use `withDefaults` for optional props with default values:

```typescript
export interface Prop {
  label?: string;
  icon?: string;
}

const props = withDefaults(defineProps<Prop>(), {
  label: "",
  icon: "",
});
```

### Error Handling

- Use try/catch for async operations
- Log errors appropriately for debugging
- Handle API failures gracefully with user feedback

### CSS/TailwindCSS

- Use TailwindCSS utility classes for styling
- Prefer semantic class names when possible
- Use TailwindCSS v4 syntax (no need for `tailwind.config.js`)
- Use `@apply` sparingly in `<style>` blocks

### State Management (Pinia)

- Use `defineStore` with composition API style (function syntax)
- Name stores with "Store" suffix
- Keep stores focused on single responsibility

```typescript
export const useArticlesStore = defineStore("ArticlesStore", () => {
  const posts = ref<Post[]>([]);
  
  function update() {
    // Store logic
  }
  
  return { posts, update };
});
```

### Vue Router

- Define routes in `src/routes/index.ts`
- Use lazy loading for route components when appropriate

### SEO

- Use `@unhead/vue` for SEO meta tags
- Use `useSeoMeta` composable in page components

```typescript
useSeoMeta({
  title: "Page Title",
  description: "Page description",
});
```

### Breadcrumbs

Use `UBreadcrumb` component from `@nuxt/ui` for page navigation. Breadcrumbs should be explicit - pass items directly rather than auto-generating from routes.

**Import:**
```typescript
import type { BreadcrumbItem } from "@nuxt/ui";
```

**Usage:**
```typescript
const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  return [
    { label: "Home", to: "/" },
    { label: "Blog", to: "/blog" },
    { label: "Article Title" }, // Last item has no link (current page)
  ];
});
```

```vue
<template>
  <UBreadcrumb :items="breadcrumbItems" class="mb-4" />
</template>
```

**Breadcrumb Structure by Page Type:**

| Page Type | Items |
|-----------|-------|
| Home page | None needed |
| Listing page (e.g., AllPosts) | Home → Listing |
| Detail page (e.g., Blog) | Home → Listing → Item |

### Linting

ESLint and Prettier are configured. Run these commands:

```bash
# Format code with Prettier
npm run format              # Format all source files
npm run format:check       # Check formatting without fixing

# Lint with ESLint
npm run lint               # Run ESLint
npm run lint:fix           # Fix ESLint issues automatically
```

## Project Structure

```
src/
├── components/          # Reusable Vue components
│   └── timeline/       # Timeline-related components
├── pages/              # Page components (route views)
│   ├── home/           # Home page sections
│   └── blog/           # Blog pages
├── stores/             # Pinia stores
├── helpers/            # Utility functions and types
│   └── blogs/          # Blog API helpers
├── routes/             # Vue Router configuration
├── style.css           # Global styles
├── main.ts             # App entry point
└── App.vue             # Root component
```

## Environment Variables

- `.env` - Default environment variables
- `.env.local` - Local overrides (not committed to git)
- Use `import.meta.env` to access in code

## Common Tasks

### Adding a New Page
1. Create component in `src/pages/`
2. Add route in `src/routes/index.ts`
3. Add navigation link in store (`sidebar-store.ts`)

### Adding a New Store
1. Create file in `src/stores/`
2. Use `defineStore` with composition API
3. Import and use in components

### Adding a New Component
1. Create `.vue` file in appropriate location
2. Use PascalCase naming
3. Export interfaces for props if complex

## Dependencies

Key dependencies to be aware of:
- **Vue 3.5** - Frontend framework
- **Pinia** - State management
- **Vue Router** - Routing
- **@nuxt/ui** - UI component library
- **TailwindCSS v4** - Styling
- **highlight.js** - Code syntax highlighting
- **moment** - Date manipulation
- **@unhead/vue** - SEO head management
