# Projects Section — Design Spec

**Date:** 2026-09-27
**Scope:** `/projects` (manifesto) + `/projects/:type` (3 category pages)
**Out of scope:** `/blog` landing, `/books` (7 genres + "Why I read books"), `WorkInProgess.vue` itself

---

## 1. Goal

```
TODAY                              AFTER
──────────────────────────────────────────────────────────────────────────────
/projects          ┌────────┐      /projects          manifesto prose (CMS) +
                  │  WIP   │  →                     3 category index cards
/projects/:type    └────────┘      /projects/:type    featured cards + archive
  3 routes, 1 WIP  (x3)           4 routes, all real
```

Fill the four dead `/projects*` routes using evidence already published in the
`Stelele` GitHub account — **105 public repos** with descriptions, languages and
push dates — plus the local READMEs and opencode session history.

Every one of the 105 repos is accounted for in §10.2. The split is
**53 shown / 52 excluded**, and the accounting must total 105.

---

## 2. Decisions

| # | Decision | Choice | Why |
|---|---|---|---|
| 1 | Project data source | Curated TS file | Exactly **1 of 80** repos inspected carries GitHub topics (`shader-land`). Descriptions unreliable — `fountain-of-life` and `images-to-spritesheet` still have untouched Vite-template READMEs. Category assignment and blurb are editorial and must be hand-written regardless. |
| 2 | Manifesto prose location | CMS `special` blog post | Existing `WhyIBlog.vue` precedent. Gets the CMS editor, cover image, article SEO. |
| 3 | Project entry depth | Full card — blurb, stack, links, optional image | Matches existing `CV.vue` depth. |
| 4 | Volume | Featured + full archive per category | 10 hand-written descriptions; 53 browsable. 53 equal cards is too much copy and reads as a dump. |
| 5 | Page architecture | Option A — generic page + typed registry | One layout, registry-driven. B/C buy flexibility nobody asked for. |
| 6 | `status` field | **Derived** from `lastPushedAt`, 365-day window | Removes a hand-maintained field that would be wrong on day one. |
| 7 | Type safety | Fix 3 pre-existing errors, wire `vue-tsc -b` into `npm run build` | Without it the discriminated union enforces nothing. |
| 8 | Store error handling | `try/catch/finally` in `updatePosts` | Pre-existing infinite-skeleton bug; a new page should not inherit it. |

---

## 3. Current state

Three live problems to fix as part of this work:

```
PROBLEM 1 — duplicate route names  (Vue Router keys on name; collision warns)
  /projects         name:"Projects"
  /projects/:type   name:"Projects"      ← same name

PROBLEM 2 — no type checking in CI or build
  package.json  "build": "vite build --mode production"
  AGENTS.md     claims vue-tsc runs first            ← documentation is wrong
  npx vue-tsc -b  →  3 errors (below)

PROBLEM 3 — unbounded loading state
  App.vue onBeforeMount → articlesStore.update()
    → updatePosts()  isDownloading = true
    → await getBlogFeeds()          ← no try/catch in downloader.ts:7
    → isDownloading = false         ← never reached on rejection
  RESULT: backend/CMS down ⇒ skeleton spins forever, site-wide
```

### 3.1 The three type errors

| File | Line | Code | Problem |
|---|---|---|---|
| `src/components/PageSearch.vue` | 35:32 | TS2345 | `NavigationMenuItem` not assignable to `TreeItem` — Nuxt UI v4 type drift |
| `src/composables/usePlyrAudio.ts` | 1:48 | TS6133 | `onMounted` imported, never read |
| `src/routes/index.ts` | 86:3 | TS2322 | `Element \| null` not assignable to `HTMLElement \| null` |

All are one-line fixes. The `routes/index.ts` one is in `getContentArea()`,
which already filters on `el.tagName === 'DIV'` — narrow the `Element[]` to
`HTMLElement[]` rather than casting.

---

## 4. Architecture

```
NEW
frontend/src/
├── data/
│   └── projects.ts                    PROJECT_CATEGORIES + PROJECTS + 3 selectors
├── components/projects/
│   ├── ProjectCard.vue                props: project: FeaturedProject
│   └── ProjectArchiveList.vue         props: projects: ArchiveProject[]
└── pages/projects/
    ├── ProjectsManifesto.vue          /projects
    └── ProjectsByType.vue             /projects/:type

MODIFIED
frontend/src/routes/index.ts            new components + fix duplicate route name
frontend/src/stores/aritcles-store.ts  try/catch/finally (§3, problem 3)
frontend/package.json                   "build": "vue-tsc -b && vite build --mode production"
frontend/AGENTS.md                      add src/data/ to Project Structure; correct build description
```

`src/helpers/type.ts` gains the interfaces, next to the existing `Blog` / `Post`.

Category data and its selectors live in **one** file, not two, so there is a
single place to add a project.

---

## 5. Data model

```ts
// src/helpers/type.ts

export interface ProjectCategory {
  slug: "business-case" | "graphics" | "game-dev";
  label: string;        // "Game Dev Projects"   — sidebar
  shortLabel: string;   // "Game Dev"            — breadcrumb, section header
  icon: string;         // "i-ph-game-controller"
  intro: string;        // 2–3 sentences, per category
  accent: "primary" | "secondary" | "tertiary";
}

export interface ProjectLink {
  label: string;        // "Source" | "Live Demo" | "Write-up"
  url: string;
}

export type ProjectStatus = "active" | "archived";

interface ProjectBase {
  id: string;                          // "stick-legends" — key + anchor
  title: string;
  category: ProjectCategory["slug"];
  blurb: string;                       // one line — the archive row
  stack: string[];
  year: number;
  lastPushedAt: string;                // ISO date, from GitHub
  links: ProjectLink[];                // always ≥ 1, always includes Source
  coverImage?: string;                 // optional; expect none at launch
}

export interface FeaturedProject extends ProjectBase {
  featured: true;
  description: string;                 // 2–3 sentences — REQUIRED
}

export interface ArchiveProject extends ProjectBase {
  featured: false;
}

export type Project = FeaturedProject | ArchiveProject;
```

### 5.1 Why the discriminated union

`featured: true` without a `description` **does not compile**. This turns
"featured entries get real write-ups" from a convention that quietly rots into
a build failure. Depends on decision #7 — without `vue-tsc` in the build, this
is decorative.

### 5.2 Derived status

```ts
const ACTIVE_WINDOW_DAYS = 365;

function deriveStatus(lastPushedAt: string): ProjectStatus {
  const cutoff = Date.now() - ACTIVE_WINDOW_DAYS * 86_400_000;
  const pushed = new Date(lastPushedAt).getTime();
  return Number.isNaN(pushed) || pushed < cutoff ? "archived" : "active";
}

const RAW_PROJECTS: Project[] = [ /* …53 records… */ ];

export const PROJECTS: Project[] = RAW_PROJECTS.map((p) => ({
  ...p,
  status: deriveStatus(p.lastPushedAt),
}));
```

- Unparseable date → `"archived"`. Fails closed; never claims "active".
- Change `ACTIVE_WINDOW_DAYS` and every project reclassifies on next build.
- **Caveat:** `pushedAt` counts pushes to *any* branch, so one drive-by commit
  to an old repo flips it to `active`. It is still a fact, not a claim.

### 5.3 Selectors

```ts
projectsByCategory(slug: string): Project[]          // all, year desc
featuredProjects(slug: string): FeaturedProject[]
archiveProjects(slug: string): ArchiveProject[]
```

### 5.4 Registry

`PROJECT_CATEGORIES` is the single source for page header, intro, icon, accent
**and** the sidebar's Projects children. Nav and page cannot disagree.

| slug | label | shortLabel | icon | accent |
|---|---|---|---|---|
| `game-dev` | Game Dev Projects | Game Dev | `i-ph-game-controller` | primary |
| `graphics` | Graphics Projects | Graphics | `i-ph-polygon` | secondary |
| `business-case` | Business Case Projects | Business Case | `i-heroicons-briefcase` | tertiary |

`accent` is applied in exactly two places, both via `@nuxt/ui` `color` props
rather than custom CSS: the page-header icon, and the featured-card status chip
(`active` only — `archived` is always neutral `gray`, so the chip reads as
"still being worked on" and never as a quality judgement).

`/projects` ("Why I do projects") stays a hand-written entry in
`sidebar-store.ts` — it is not a category.

---

## 6. Components & layout

```
/projects/game-dev
┌──────────────────────────────────────────────────────────┐
│ Home › Projects › Game Dev                    UBreadcrumb │
│ Game Dev Projects                            UPageHeader  │
│ <intro — from the registry's `intro` field>               │
│ ────────────────────────────────────────────────────────  │
│ FEATURED                                                  │
│ ┌────────────────────┐ ┌────────────────────┐             │
│ │ [coverImage]       │ │ [coverImage]       │  optional  │
│ │ Stick Legends  ●   │ │ Go ASCII  ●        │             │
│ │ blurb, one line    │ │ blurb, one line    │             │
│ │ 2–3 sentence desc… │ │ 2–3 sentence desc… │             │
│ │ [TS] [Go]          │ │ [Go]               │  UBadge    │
│ │ 2025   Source ↗    │ │ 2025   Source ↗    │            │
│ └────────────────────┘ └────────────────────┘             │
│ ────────────────────────────────────────────────────────  │
│ ARCHIVE · 14                                              │
│ Combat Gods              TypeScript        2024      ↗    │
│ Handmade Combat Gods     TypeScript        2024      ↗    │
│ 1-BIT Jam #4             TypeScript        2024      ↗    │
└──────────────────────────────────────────────────────────┘
```

| Component | Responsibility | Logic? |
|---|---|---|
| `ProjectsByType.vue` | `route.params.type` → registry lookup; header, featured grid, archive | route read only |
| `ProjectCard.vue` | `UCard` + cover, status chip, blurb, description, stack badges, link buttons | none |
| `ProjectArchiveList.vue` | one compact row per project; whole row is the link | none |
| `ProjectsManifesto.vue` | CMS post + 3 category index cards | store read only |

All deciding lives in `projects.ts`. The page components are dumb prop-driven
renderers — nothing in them is worth a unit test, and the logic is all in one
testable file.

### 6.1 Reused as-is (matching existing usage)

`UBreadcrumb` with explicit `items` (per AGENTS.md — never auto-generated from
routes), `UPageHeader` (as in `CV.vue` and `AllPosts.vue`), `UCard variant="subtle"`,
`UBadge variant="soft" color="primary"`, `useSeoMeta` per page, `PostSkeleton`
for the CMS loading state, `usePostRenderer` for markdown → sanitized HTML.

### 6.2 Deliberately not reused

- **`UBlogPost`** (used in `AllPosts.vue`) — built around `:to` for internal
  routing plus a date badge. Project cards link *out* to GitHub and show a year.
  Wrong shape.
- **`Giphy.vue`** — the WIP placeholder is removed for `/projects`. The file
  stays in the codebase; `/books` and `/blog` still use it.

### 6.3 Routes

```
BEFORE                                    AFTER
──────────────────────────────────────     ───────────────────────────────────
/projects        name:"Projects"  WIP      /projects        name:"Projects"
                                          component: ProjectsManifesto

/projects/:type  name:"Projects"  WIP ⚠    /projects/:type  name:"ProjectsByType"
                                          component: ProjectsByType
```

`/books`, `/blog`, and all other routes are untouched.

---

## 7. Data flow

```
/projects  (manifesto)                /projects/:type
─────────────────────────────         ──────────────────────────────
CMS "special" blog                    src/data/projects.ts  (bundled, sync)
  ↓ App.vue onBeforeMount                ↓
    → articlesStore.update()           PROJECT_CATEGORIES[route.params.type]
      ← ONE global fetch, exists           ↓
        already                           featuredProjects() / archiveProjects()
  ↓
findPostBySlug("special",                    ↓
              "why-i-projects")        render
  ↓
usePostRenderer
  (md → DOMPurify → v-html)
  ↓
UCard + 3 category index cards
```

No new fetching. `special` is already in the hardcoded slug list at
`src/helpers/blogs/cms.ts:12`, so a post added under it is picked up with zero
backend work.

### 7.1 Store error handling (decision #8)

```ts
async function updatePosts(blogs: Ref<Blog[]>, isDownloading: Ref<boolean>) {
  isDownloading.value = true;
  try {
    blogs.value = await getBlogFeeds();
  } catch (error) {
    console.error("Failed to load blog feeds", error);
    blogs.value = [];
  } finally {
    isDownloading.value = false;
  }
}
```

Touches shared code. On failure the store lands empty and `isDownloading` goes
false, so pages render their not-found/empty states instead of spinning
forever. Fixes the whole site, not just `/projects`.

---

## 8. Edge cases

| Case | Behaviour |
|---|---|
| `/projects/nonsense` (unknown `:type`) | Friendly card listing the 3 real categories. Not a silent blank page, not a redirect. |
| `why-i-projects` not yet in CMS | "Still being written" + the 3 category cards. `usePostRenderer` already exposes `isNotFound`. |
| Backend / CMS down | Store lands empty via §7.1 ⇒ same "still being written" state. No infinite skeleton. |
| Category has 0 featured | Featured section omitted entirely — no empty heading. |
| Category has 0 archive | Archive section omitted entirely. |
| Empty `stack` | Badge row hidden. |
| Empty `links` | Link row hidden. (`links` is typed non-optional; the guard is for hand-edited data.) |
| Unparseable `lastPushedAt` | `deriveStatus` → `"archived"`. |
| Markdown contains `<audio>` | `usePostRenderer` already preserves it — inherited, not re-implemented. |

---

## 9. Type safety (decision #7)

Fix the three errors in §3.1, then:

```json
"build": "vue-tsc -b && vite build --mode production"
```

This makes AGENTS.md's documented build behaviour true and gates deploys on
types. Also correct the `Build Commands` block in `frontend/AGENTS.md`, which
already claims this behaviour but is wrong.

---

## 10. Content plan

### 10.1 Ownership

| Author | Deliverable |
|---|---|
| Agent, user edits | 3 category `intro` strings, labels, icons, accents |
| Agent, user edits | 53 project records: id, title, category, blurb, stack, year, `lastPushedAt`, links, `featured` |
| Agent, user edits | 10 × `description` (2–3 sentences, featured only) |
| Agent, user pastes | ~500-word `why-i-projects` markdown for the CMS `special` blog |
| Agent | Per-category `useSeoMeta` copy (title, description, OG, Twitter) |
| **User decides** | The 3 category intros are his voice — expect to rewrite |
| **User verifies** | The 10 descriptions are synthesis of README + code + session history — correct anything that misrepresents intent |
| **User confirms** | The featured picks in §10.3 |

### 10.2 Roster — 53 of 105 shown

**Game Dev — 17**

`stick-legends` · `gameboy-emulator` · `1-bit-jam-4` · `combat-gods` ·
`handmade-combat-gods` · `web-game-engine` · `godot-pong` · `pixijs-pong` ·
`pixijs-breakout` · `pixijs-flappy-bird` · `pixijs-games-template` ·
`learn-pixi-js` · `flappy-bird` · `ping-pong` · `breakout` · `js-ping-pong` ·
`raylib-playground`

**Graphics — 9**

`shader-land` ★1 · `article-11-code` · `webgpu-shader-art` · `web-gpu-first-app` ·
`blog-webgpu-hello-world` · `webgpu-template` · `images-to-spritesheet` ·
`manim-animations` · `go-ascii-renderer`

**Business Case — 27**

`cms-system` · `erpnext-dashboard` ★2 · `class-booking-system` · `point-of-sale` ·
`fountain-of-life` · `nbi-website` · `voice-generation-site` · `frappe-pesepay` ·
`pesepay` · `hotspot-cafe-config` · `frappe-radiusdesk` ·
`erpnext-cashbook-reconciliation` · `stock-reconciliation` ★1 ·
`erpnext-point-of-sale-expenses` · `erpnext-market-survey` ·
`awesome_restaurant` · `awesome_dashboard_scripts` · `awesome-butchery` ·
`holdings-operations-management` · `background-changer` · `nbi-satellite` ·
`nbi-satellite-2` · `document-convertor` · `quickbooks-excel-uploader` ·
`pause-audio` · `whatsapp-church-bus-bookings` · `frappe-self-host`

#### Excluded — 52

| Group | n | Repos |
|---|---|---|
| Forks | 3 | `erpnext` · `agriculture` · `build-your-own-x` |
| **Secrets** | 1 | `hotspot-droplet-backup` — its own description reads *"contains secrets - never make public"*. Must never appear on the site. |
| Deploy artifacts | 6 | `personal-site-build` · `cms-system-frontend-build` · `fountain-of-life-build` · `nbi-site-build` · `voice-generation-site-built` · `njeremoto-dashboard-build` |
| Superseded / personal | 7 | `personal-site` (this site) · `personal-blog-portfolio` (2023 Astro) · `dotfiles` · `lazy-vim-config` · `multi-agent-opencode-swarm` · `medium-blogs-backup` · `hashnode-blog-backups` |
| Bootcamp / scratch | 8 | `zaio-week3-react` · `zaio-week3-rest-api` · `zaio-week3-nodejs` · `zaio-week4-node-js-api` · `zaio-first-project` · `test-react` · `gifts-blog` · `youtube-transcript-downloder-scripts` |
| UCT coursework | 19 | `CSC3022F-ML-Assignment-1/2/3` · `CSC3022F-Assignment-2/3` · `CSC3022-Assignment-1` · `EEE4120F-YODA` · `EEE4120F-Pracs` · `EEE4120-Prac-4` · `EEE4114F-PROJECT` · `EEE3096S-Mini-Project` · `eee3096s-wp3` · `eee3096s_consolidation` · `eee3096S-prac3-preprac` · `csc2002s_assignment1/2/3` · `csc2002-assignment1` · `csc2001-assignment2` |
| Student era / hackathon | 2 | `FirabaseTryout` · `FirewallHackathon` (2019 Allan Gray hackathon) |
| Junk | 2 | `test- ` · `FirewallHackathon2` (description: `"asdfa"`) |
| Unclassifiable | 4 | `pets` · `distinctstore.pos` · `papi_iot` · `raspberrypi-infragram-camera` |

**53 + 52 = 105.** Any repo not in this table is a bug in the roster.

> **Counting note.** `gh repo list Stelele` (REST) reports 105 public repos and is
> the authoritative list. The GraphQL `repositories` connection silently caps at
> 80 for this account, omitting 25 — all coursework, personal repos, build
> artifacts, and `hotspot-droplet-backup`. Topics could only be verified on the
> 80 GraphQL exposes, but all 25 omitted repos are excluded on other grounds, so
> decision #1 is unaffected. Do not use GraphQL to enumerate this account.

Coursework is excluded on principle, not taste: 19 auto-generated assignment
repos would dominate the archive and bury the self-directed work that actually
says something. `csc2001-assignment2` and `csc2002-assignment1` are the
strongest of the set (AVL vs BST benchmarks) and would be reasonable
archive entries if he wants his academic work represented.

#### The 4 unclassifiable repos

None of these has a usable description, so no honest blurb can be written
without input. **Default: excluded.**

| Repo | Date | Lang | Note |
|---|---|---|---|
| `pets` | 2025-02-24 | Go | No description. |
| `distinctstore.pos` | 2025-03-03 | JS | No description. |
| `papi_iot` | 2024-12-07 | Python | No description. |
| `raspberrypi-infragram-camera` ★1 | 2021-11-06 | CSS | *"Raspberry Pi Based Infragram Camera for Agricultural Applications"* — has a real description and a star, but is a 2021 UCT-era hardware project. **Recommend: Graphics, archived.** Reversible with one word. |

### 10.3 Featured picks — 10

| Category | Project | lastPushedAt | Derived status | Why |
|---|---|---|---|---|
| Game Dev | `stick-legends` | 2025-10-30 | active | The one still being chased; own description admits it |
| Game Dev | `1-bit-jam-4` | 2024-10-03 | archived | Shipped under a real jam deadline, public itch.io page |
| Game Dev | `combat-gods` | 2024-12-13 | archived | Pairs with `handmade-combat-gods` as a before/after |
| Graphics | `shader-land` | 2025-02-08 | archived | Flagship WebGPU work, ★1 |
| Graphics | `go-ascii-renderer` | 2025-10-18 | active | 3 working programs, best README in the account |
| Graphics | `manim-animations` | 2025-04-02 | archived | Different medium — shows range |
| Business | `cms-system` | 2026-08-04 | active | Powers *this very site* |
| Business | `erpnext-dashboard` | 2026-08-18 | active | Most-starred, full product, real tech-stack doc |
| Business | `class-booking-system` | 2026-09-26 | active | Real client, real money via PesePay/Ecocash |
| Business | `fountain-of-life` | 2026-08-16 | active | Non-commercial work — shows range |

Resulting mix: 6 `active`, 4 `archived`. Honest rather than flattering.

### 10.4 Manifesto direction

The `why-i-projects` post is built on a thesis the GitHub account already
argues for, not on generic "I love to learn" copy:

```
  LEARN BY REBUILDING              →  build-your-own-x
                                   →  combat-gods → handmade-combat-gods
                                   →  gameboy-emulator

  GO DEEP, NOT WIDE                →  web-gpu-first-app → blog-webgpu-hello-world
                                       → webgpu-template → shader-land
                                   →  learn-pixi-js → pixijs-* → raylib-playground

  THEN SHIP IT FOR SOMEONE         →  cms-system (this site)
                                   →  erpnext-dashboard, class-booking-system
                                   →  ERPNext self-hosting + PesePay/Ecocash
```

Draft delivered as a paste-ready markdown block. **Not** written to the
production CMS — the user pastes it into the `special` blog admin UI.

### 10.5 Cover images

`coverImage` is typed optional and **expected to be empty at launch.** No
screenshots can be sourced, and generated placeholder art would look worse than
no art. Cards render image-less until files are dropped into
`public/assets/projects/`. The field exists so that is a one-file change, not a
refactor.

---

## 11. Verification

No test framework is installed, and none is added. The meaningful assertions
are compile-time or one-shot invariants.

```
GATE                              CHECK
──────────────────────────────   ───────────────────────────────────────────
npx vue-tsc -b                    0 errors (after §3.1 fixes)
npm run lint                      clean
npm run format:check              clean
npm run build                     succeeds (now type-gated)
throwaway node script             every category ≥ 1 project
                                  every project.category is a valid slug
                                  no duplicate ids
                                  every featured has a non-empty description
                                  PROJECTS.length === 53
                                  every slug is unique across all 53
                                  none of the 52 excluded names appears
browser QA (chrome-devtools)      4 routes render populated
                                  /projects/nonsense → friendly card
                                  unknown CMS post → "still being written"
                                  empty-stack / empty-links guards
                                  status chips match the 365-day rule
                                  375px width, no horizontal scroll
                                  dark + light mode
```

The invariant script is throwaway — not committed. The invariants cannot rot,
because TypeScript and the build gate catch them.

---

## 12. Out of scope / follow-ups

| Item | Note |
|---|---|
| `/blog` landing page | Still `WorkInProgress.vue`. Separate spec. |
| `/books` + 7 genres + "Why I read books" | Still `WorkInProgress.vue`. Separate spec. GitHub cannot supply book opinions — needs direct input. |
| `frontend/.env` is git-tracked and contains `VITE_CMS_AUTH0_CLIENT_SECRET` | 27 chars vs the real 64-char secret in untracked `backend/.env`, so it looks like a stale placeholder. `VITE_*` vars are inlined into the public JS bundle regardless. Should be deleted and `.env*` gitignored. **Unrelated cleanup — not in this spec.** |
| `hotspot-droplet-backup` | Confirmed private / never-public. Excluded from the roster. |
| `Giphy.vue` | Kept; still used by `/books` and `/blog`. |
| UCT coursework (19 repos) | Excluded on principle, §10.2. If he wants his academic work represented, `csc2001-assignment2` and `csc2002-assignment1` are the two worth adding. Separate decision, not this spec. |

## 13. Open items for the user

Each has a stated default, so the spec is implementable as written without an
answer — these are reversals, not blockers.

1. **The 4 unclassifiable repos** — `pets`, `distinctstore.pos`, `papi_iot`,
   `raspberrypi-infragram-camera`. Default excluded; recommend Graphics for the
   last one. Name a category to include.
2. **Roster corrections** — any project in the wrong category, or any exclusion
   that should be reversed. Cheap now, expensive after the copy is written.
3. **The three type-error fixes** are in shared files (`PageSearch.vue`,
   `usePlyrAudio.ts`, `routes/index.ts`) and the store change touches shared
   code. Flagged for explicit review.
4. **`vue-tsc -b` in the build script** means type errors now block deploys.
   Confirmed the 3 known errors are the complete set as of 2026-09-27; anything
   introduced later will fail the build rather than ship.
