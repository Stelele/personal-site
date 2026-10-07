# AGENTS.md - Development Guidelines for Personal Site

## Shared conventions

Cross-project decisions, code style, stack choices, testing expectations and workflow live
in the hivemind board. **Read `core/INDEX.md` before coding**, then only the 2-3 core files
it points at for the work in hand.

The board is a private repo. If it is not checked out on this machine yet:

    mkdir -p ~/Documents/code-projects
    git clone git@github.com:Stelele/hivemind.git ~/Documents/code-projects/hivemind

Then either of these updates it — adjust the path if you cloned it elsewhere:

    ~/Documents/code-projects/hivemind/hm pull        # the board CLI
    git -C ~/Documents/code-projects/hivemind pull    # plain git

Board: https://github.com/Stelele/hivemind — 33 ratified rules, each with an ADR
recording why and what it costs.

Everything below is specific to this project.

## Project Overview

Personal portfolio website with a blog and a projects section.

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

## Props Definition

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

## Error Handling

- Use try/catch for async operations
- Log errors appropriately for debugging
- Handle API failures gracefully with user feedback

## SEO

- Use `@unhead/vue` for SEO meta tags
- Use `useSeoMeta` composable in page components

```typescript
useSeoMeta({
  title: "Page Title",
  description: "Page description",
});
```

## Breadcrumbs

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

## Linting

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
