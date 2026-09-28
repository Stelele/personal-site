# Projects Section — Design Spec (rev 2)

**Date:** 2026-09-27
**Supersedes:** rev 1 of this spec (the TypeScript data-file design)
**Sibling spec:** `2026-09-27-cms-consolidation-design.md`

> **What changed in rev 2.** Rev 1 put all project content in
> `src/data/projects.ts` — 53 records, 10 descriptions, 3 category intros,
> hand-typed `lastPushedAt` per repo, and a discriminated union to keep it honest.
>
> The user asked for **a mini-article for every project** — what it does, why it
> was made, current state, concepts worked on — and for that content to live in
> the CMS as **one source of truth**. That is a different and better design: it
> makes the content editable in a web UI instead of a code editor, and it moves
> the structure from TypeScript types into a typed C# entity where the compiler
> enforces it.
>
> Almost everything in rev 1's §5 (the data model), §10.1 (blurbs) and §5.2
> (derived status) is deleted. The roster and the curation decisions survive.

---

## 1. Goal

```
53 mini-articles, one source of truth, in the CMS.

  /projects/game-dev   17 project articles
  /projects/graphics    9 project articles
  /projects/business-case  27 project articles
  /projects            the manifesto + category index

Each article answers, from the actual source code where the README does not:
  · what it does
  · why it was made
  · what state it's in now
  · what concepts were worked on or learnt
```

### 1.1 Scope, honestly

The original request was "a bunch of missing sections". This spec does **one**.
`/blog` and `/books` (8 routes between them) remain `WorkInProgress.vue`
afterwards. That was a deliberate scoping choice — projects first, because it is
the section the evidence can fill almost entirely without asking him anything —
but the underlying complaint is only partly addressed.

Worth noting for whoever sequences the work: **`/blog` is close to free.** It
renders every post already in the CMS plus the two archives, needing one new page
and no new content. Highest remaining value per unit of effort on the site.

### 1.2 It is a net increase in authored content

Rev 1 replaced four Giphy placeholders with 53 records. Rev 2 replaces them with
53 *articles*. That is the trade the user asked for and it is worth naming: this
is the largest single content item across both specs, and it is only tractable
because the content is derivable from source code — many repos are already cloned
locally, and the rest can be cloned.

---

## 2. Decisions

| # | Decision | Choice | Why |
|---|---|---|---|
| 1 | Where project content lives | **The CMS.** Nothing about a project lives in two places | Asked for explicitly. Also puts prose in an editor instead of a code file |
| 2 | Data structure | **`Project : Post`**, typed C# inheritance | Rev 1's alternative was a `metadata` JSON column. Rejected: a free-form blob loses type information, validates nothing, and cannot be refactored safely — for a core domain concept that is the wrong trade |
| 3 | Category representation | **One blog per category** — the blog *is* the category | `Project` already inherits `BlogId`. The three category intros become `Blog.Description`, editable in the CMS. `/projects/game-dev` becomes a blog query. The sidebar already groups by blog |
| 4 | Write boundary | **`Blog.Kind` discriminator**; post endpoints reject project blogs, project endpoints reject standard blogs | Asked for. Complementary, not conditional — a blog is one or the other, and which endpoint may write into it is determined by `Kind` |
| 5 | Listing vs article payload | Separate `ProjectSummaryResponse` (no `content`) and `ProjectResponse` (full) | 53 articles in one payload is ~150KB for a card grid. A DTO boundary means the listing physically cannot render a body it was not sent |
| 6 | `status` | Computed **server-side** in `ProjectResponse` | In rev 1 it was derived in TypeScript from a hand-typed date. Now that the date is a typed CMS column, the derivation belongs with the data. The frontend stops computing it and cannot get it wrong |
| 7 | Manifesto placement | **Into the `projects` blog**, not `special` | One place for all project content. Breaks the `special`-blog pattern used by `why-i-blog`; accepted for coherence |
| 8 | Admin UI | New project editor form | Asked for and accepted. Inheritance saves the markdown editor, publish toggle, file attachments and cover image — not the form for the typed fields |
| 9 | Sequencing | CMS work first; frontend work can start against a typed interface | See §9 |

---

## 3. What the CMS already gives us

Verified against `~/Documents/code-projects/cms-system`, 2026-09-27.

```
Domain/Posts/Post.cs
  Guid BlogId · Title · Slug · Content(markdown) · Description?
  string Tag              ← ONE required string, validator: NotEmpty()
  CoverImageUrl? · PublishedOn? · IsPublished · ICollection<FileItem>
  : Base (Id, CreatedOn, UpdatedOn, domain events)

Infrastructure/Models/PostEntity.cs
  class PostEntity : IEntityTypeConfiguration<Post>   ← NOT a separate class
Infrastructure/Models/CmsDbContext.cs
  DbSet<Post> Posts;  modelBuilder.Entity<Post>()    ← domain entity IS the EF entity
  builder.HasIndex(b => new { b.BlogId, b.Slug }).IsUnique()
  DateTimeOffsetToBinaryConverter applied to all DateTimeOffset properties
```

Two findings that make rev 2 cheap:

**There is no separate persistence layer.** `PostEntity` is a fluent
*configuration* for the domain `Post`; handlers query `db.Posts` directly. So
`Project : Post` is a plain domain change, and EF Core's default
**Table-Per-Hierarchy** gives one `Posts` table with a discriminator plus nullable
project columns — **one migration, no data backfill, existing posts untouched.**

**Slugs are unique per blog, not globally** (`HasIndex(new { BlogId, Slug })`).
That narrows the collision risk flagged in the migration spec's §6.4.

### 3.1 What the CMS cannot hold today

| Need | Blocker | Resolution |
|---|---|---|
| Structured project fields | No metadata field; `Tag` is one required string | `Project : Post` adds typed columns |
| Per-blog content kind | No `contentType`; `cms.ts:50` hardcodes `'markdown'` and `usePostRenderer.ts:8` builds `MarkdownIt()` with no `{html: true}` | **Migration spec §5.0** — nullable `contentType` on `Blog`. Blocks this spec too |
| Set a publication date | `publishedOn` is on the response but on no command | **Migration spec §5.1** |
| Store a canonical URL | No field | **Migration spec §5.2** |
| Read anything anonymously | 18 endpoints, 18 `RequireAuthorization`, 0 `AllowAnonymous` | **Migration spec §5.3–5.4** |

**This spec depends on the migration spec's CMS work.** Not on its sequencing or
its deletion of the Go backend — only on the CMS-side additions. See §9.

---

## 4. Target architecture

```
                        CMS  (api-cms.giftmugweni.com)
                        ────────────────────────────────────────────────
  Blog "game-dev"       name "Game Dev Projects"   icon i-ph-game-controller
     Kind = Project     description = <category intro>
     └── 17 × Project : Post
           Content (markdown mini-article)
           Description (one-line blurb, the archive row)
           Stack[] · Year · LastPushedAt · Links[] · CoverImageUrl
           PublishedOn · IsPublished · Files → R2
           + "why-i-projects"          ← the manifesto

  Blog "graphics"       9 × Project
  Blog "business-case"  27 × Project
  Blog "special"        "why-i-blog"

                        ▼  GET /public/projects          → ProjectSummaryResponse[]
                        ▼  GET /public/projects/{slug}   → ProjectResponse
  frontend  ────────────┴── Cloudflare Pages, static
  TypeScript
  ────────────
  routes/index.ts                  /projects · /projects/:type · /projects/:type/:slug
  stores/projects-store.ts         fetches + caches the CMS project list
  components/ArticleView.vue       SHARED with Blog.vue (§7.4)
  components/projects/*            ProjectCard · ProjectArchiveList · ProjectHeader
  stores/sidebar-store.ts          category labels/icons/paths only — no content
```

**Nothing in TypeScript holds project content.** The only project-adjacent data
left in the frontend is route chrome: which category slug maps to which label,
icon and path.

---

## 5. `cms-system` — domain and data

### 5.1 `Project`

```csharp
public enum ProjectCategory { GameDev, Graphics, BusinessCase }   // see §5.2

public class ProjectLink
{
    public string Label { get; set; } = string.Empty;   // "Source" | "Live Demo" | "Write-up"
    public string Url   { get; set; } = string.Empty;
}

public class Project : Post
{
    public ProjectCategory Category { get; set; }
    public List<string> Stack { get; set; } = [];
    public int Year { get; set; }
    public DateTimeOffset? LastPushedAt { get; set; }
    public List<ProjectLink> Links { get; set; } = [];
}
```

Inherits everything: slug, title, content, description, cover image, publish
dates, file attachments, domain events. `Tag` is **not** used by a project —
`Category` replaces it (see §5.4).

`Project.Create(...)` mirrors `Post.Create(...)` and takes the project fields.
`ProjectStatus` is **not** a stored column; it is computed (§5.8).

### 5.2 Category comes from the blog, so why an enum?

Decision #3 makes the blog the category, which raises the obvious question: if
`BlogId` already implies the category, is `Project.Category` redundant?

**It is kept, deliberately, as a denormalised read field.** Three reasons:

1. `ProjectResponse` is a flat DTO consumed by a paginated listing. Resolving the
   blog per project to fill one field is a needless join on the hot path.
2. It makes `Blog.Kind` and `Project.Category` mutually assertable — a validation
   rule that a project's category matches its blog's slug. That is exactly the
   kind of invariant a closed enum can enforce and a string cannot.
3. It is how the archive-query endpoint filters without joining.

The validator is the enforcement point, not the database:

```csharp
RuleFor(x => x.Category)
    .IsInEnum()
    .Must((cmd, cat) => ProjectBlogs.SlugFor(cat) == BlogSlugFor(cmd.BlogId))
    .WithMessage("Project.Category must match the blog it is created in.");
```

`ProjectBlogs` is a small static registry — the three slugs, their labels, icons
and the enum mapping — so the frontend, the CMS and the importer all agree on one
table of three rows.

### 5.3 EF configuration

```csharp
// Infrastructure/Models/ProjectEntity.cs   ← matches the existing naming pattern
public class ProjectEntity : IEntityTypeConfiguration<Project>
{
    public void Configure(EntityTypeBuilder<Project> builder)
    {
        builder.Property(b => b.Category).IsRequired();
        builder.Property(b => b.Year).IsRequired();
        builder.Property(b => b.LastPushedAt).IsRequired(false);
        builder.Property(b => b.Stack).HasConversion(
            v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
            v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? []);
        builder.Property(b => b.Links).HasConversion(
            v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
            v => JsonSerializer.Deserialize<List<ProjectLink>>(v, (JsonSerializerOptions?)null) ?? []);

        builder.HasIndex(b => new { b.BlogId, b.Year }).IsDescending(false, true);
    }
}
```

`Stack` and `Links` are value-converted to JSON **columns**, not free-form
`metadata`. The difference matters and is the whole point of decision #2: the
value is serialised, but the *shape* is enforced by `List<string>` and
`List<ProjectLink>` at the domain and command boundary, so nothing arbitrary can
get in. There is no `metadata` bag to read at runtime and no way to store a
category as a typo.

`CmsDbContext` gains `DbSet<Project> Projects` and a
`modelBuilder.Entity<Project>()` configuration call. TPH is the default, so the
existing `Posts` table gains a discriminator plus five nullable/required columns.

`CmsDbContext.OnModelCreating` already applies `DateTimeOffsetToBinaryConverter`
by reflecting over entity CLR types, so `LastPushedAt` is covered automatically.
That loop runs over `modelBuilder.Model.GetEntityTypes()`, which will include
`Project` once it is in the model — no extra work.

**One EF migration.** Additive. No existing row is touched: a discriminator is
null for every current post, so they all remain `Post`.

### 5.4 `Blog.Kind` — the write boundary

```csharp
public enum BlogKind { Standard = 0, Project = 1 }

public class Blog : Base
{
    // ...existing...
    public BlogKind Kind { get; set; } = BlogKind.Standard;
}
```

Complementary validation, not a conditional skip:

```
CreatePostCommand / UpdatePostCommand / DeletePostCommand
  → resolve BlogId; reject if blog.Kind == Project

CreateProjectCommand / UpdateProjectCommand / DeleteProjectCommand
  → resolve BlogId; reject if blog.Kind != Project
```

A blog is `Standard` **or** `Project`, never both, and `Kind` alone determines
which endpoint family may write into it. Consequences:

- You cannot create a bare `Post` in `game-dev` — no row with a project slug and
  no stack/year.
- You cannot create a `Project` in `medium` — no project in an archive blog.
- A project cannot be written through the post endpoint, so its typed fields
  cannot be skipped.

The same rule is enforced in the UI (§6): the post editor routes are not
registered for `Kind == Project` blogs, and the project editor is not registered
for `Standard` ones. The UI is not the security boundary — the validators are —
but a UI that offers the wrong form is a UI that produces the wrong data.

`Tag` is relaxed for projects only:

```csharp
RuleFor(x => x.Tag).NotEmpty().When(cmd => IsStandardBlog(cmd.BlogId));
```

Without this, a project would be forced to duplicate its category into `Tag` —
two fields that must agree, and therefore a bug waiting to happen.

### 5.5 DTOs

```csharp
public sealed record ProjectSummaryResponse(
    Guid Id, Guid BlogId, string Slug, string Title,
    string? Description, ProjectCategory Category,
    List<string> Stack, int Year, DateTimeOffset? LastPushedAt,
    List<ProjectLink> Links, string? CoverImageUrl,
    DateTimeOffset? PublishedOn, ProjectStatus Status);
// deliberately absent: Content

public sealed record ProjectResponse(
    Guid Id, Guid BlogId, string Slug, string Title,
    string Content, string? Description, ProjectCategory Category,
    List<string> Stack, int Year, DateTimeOffset? LastPushedAt,
    List<ProjectLink> Links, string? CoverImageUrl,
    DateTimeOffset? PublishedOn, ProjectStatus Status);

public enum ProjectStatus { Active, Archived }
```

`ProjectSummaryResponse` omits `Content` — that is the payload decision (#5).
`PublicProjectResponse` is unnecessary: `ProjectResponse` is already a boundary
DTO that excludes `IsPublished`, `CreatedOn` and `UpdatedOn` by construction.

Both expose `FromDomain(Project)` static factories, matching `PostResponse.FromDomain`.

### 5.6 `status` computed server-side

```csharp
public static class ProjectStatusRules
{
    public const int ActiveWindowDays = 365;

    public static ProjectStatus Derive(DateTimeOffset? lastPushedAt) =>
        lastPushedAt is { } pushed &&
        pushed >= DateTimeOffset.UtcNow.AddDays(-ActiveWindowDays)
            ? ProjectStatus.Active
            : ProjectStatus.Archived;
}
```

- Null or absent → `Archived`. Fails closed; never claims `Active`.
- Unparseable input cannot reach here — the column is typed.
- Changing the window reclassifies everything, with no data migration.
- **Known limitation, stated honestly:** `LastPushedAt` is still entered by hand,
  and the user pushes often — 17 of the 53 roster repos moved in the last 90 days.
  So the field goes stale within about a year and nothing warns him. In rev 1 this
  was a silent decay in TypeScript; in rev 2 it is a visible column in a CMS form
  he opens when he updates a project. A throwaway `gh`/`jq` refresh script (§8.3)
  is the cheap fix. This spec does not automate it.

### 5.7 Handlers and endpoints

```
Application/Projects/
  CreateProjectCommand.cs  + Handler   (validates Kind + Category match)
  UpdateProjectCommand.cs  + Handler
  DeleteProjectCommand.cs  + Handler
  GetProjectsQuery.cs      + Handler   (optional: BlogId filter, published-only)
  GetProjectBySlugQuery.cs + Handler
  ProjectResponse.cs · ProjectSummaryResponse.cs · ProjectLink.cs

Api/Endpoints/Projects/ProjectEndpoints.cs
  MapGet    /projects                      → ProjectSummaryResponse[]
  MapGet    /projects/{slug}               → ProjectResponse
  MapPost   /projects                      CreateProjectCommand
  MapPut    /projects/{id}                 UpdateProjectCommand
  MapDelete /projects/{id}                 DeleteProjectCommand
```

Public mirrors, `.AllowAnonymous()`, mirroring §5.3–5.4 of the migration spec:

```
  MapGet /public/projects                  → ProjectSummaryResponse[]
  MapGet /public/projects/{slug}           → ProjectResponse
```

Both hard-filter `IsPublished` in the `Where` clause — the same rule as
`GetPublicPostsQuery`, not a parameter a handler can forget.

The listing endpoint supports `?category=game-dev` and `?year=2025`; both map to
`Where` clauses. The frontend fetches once and filters client-side, because
53 records in `ProjectSummaryResponse` form is small.

### 5.8 Blog seed data

```
Blog "game-dev"        Kind=Project  name "Game Dev Projects"        icon i-ph-game-controller
Blog "graphics"        Kind=Project  name "Graphics Projects"         icon i-ph-polygon
Blog "business-case"   Kind=Project  name "Business Case Projects"    icon i-heroicons-briefcase
```

`description` is the category intro, editable in the CMS. Created by the
importer (§8) or by hand — either way once, not per post.

---

## 6. `cms-system` — admin UI

Inheritance saves the markdown editor, the publish toggle, file attachment and
cover-image upload. It does **not** save the form for the typed fields. New work in
`cms-system/frontend`:

```
1. Project editor form        Title · Slug · Content(markdown) · Description
                              Category (select, 3 options) · Stack (tag input)
                              Year (number) · LastPushedAt (date) ·
                              Links (repeatable label+url) · CoverImage
2. Project list view          reuses the post list; adds Stack/Year/Status columns
3. Blog form gains `Kind`     Project blogs are not offered a plain-post editor
4. Route guards               post editor routes reject Kind==Project blogs and
                              vice versa — mirroring the API validators, not
                              replacing them
```

Roughly the metadata form plus three wiring changes. The markdown editing
experience, which is the part that actually matters for writing 53 articles, is
inherited unchanged.

---

## 7. `personal-site` — frontend

### 7.1 Routes

```
BEFORE                                    AFTER
──────────────────────────────────────     ─────────────────────────────────────
/projects        name:"Projects"  WIP      /projects          name:"Projects"
                                          component: ProjectsIndex.vue
/project/:type    name:"Projects"  WIP ⚠   /projects/:type    name:"ProjectCategory"
                                          component: ProjectCategory.vue
                                          /projects/:type/:slug  name:"Project"
                                          component: ProjectArticle.vue
```

Also fixes the live duplicate-route-name bug: `/projects` and `/projects/:type`
are both currently `name: "Projects"`, which Vue Router treats as a key collision.

`WorkInProgess.vue` is retained — `/books` and `/blog` still use it.

### 7.2 Store

New `stores/projects-store.ts`: fetches `ProjectSummaryResponse[]` once, exposes
`byCategory`, `featured(slug)`, `archive(slug)`, `find(slug)`, and
`isDownloading`. Separate from `articlesStore` because the two have different
sources, lifetimes and failure modes — a CMS project outage should not put a
skeleton on the blog pages.

### 7.3 Components

| Component | Renders |
|---|---|
| `ProjectsIndex.vue` | Manifesto (`findPostBySlug(blogSlugOf("game-dev"), "why-i-projects")`) + 3 category index cards with counts |
| `ProjectCategory.vue` | Blog header (name, description, icon from the CMS blog) + featured grid + archive |
| `ProjectCard.vue` | `UCard`, optional cover, status chip, blurb, stack badges, year, links |
| `ProjectArchiveList.vue` | One row per project: title · stack · year · external icon |
| `ProjectArticle.vue` | `ArticleView` + project header block (stack, year, state, links) |
| `ArticleView.vue` | **Shared with `Blog.vue`** — see §7.4 |

`status` arrives from the server and is rendered as a chip. Per decision #2 in
rev 1, `active` uses the category accent and `archived` is always neutral grey, so
the chip reads as "still being worked on" and never as a quality judgement.

### 7.4 `ArticleView` extraction

A project article is structurally identical to a blog post: breadcrumb, title,
date, cover, prose, code highlighting, images, audio, SEO, JSON-LD. The only
differences are the project header block and the breadcrumb trail.

So `ArticleView.vue` is extracted from `Blog.vue` and both consume it, rather than
copy-pasting a post page into a second one. `usePostRenderer` is reused unchanged.

### 7.5 Deleted from rev 1

```
src/data/projects.ts                    the 53-record data file
src/data/project-categories.ts          never existed (folded in rev 1)
ProjectInput / Project / FeaturedProject / ArchiveProject   the discriminated union
featured: true | false                  replaced by Blog membership + curation order
deriveStatus() in TypeScript            moved server-side (§5.6)
```

### 7.6 Also in scope — the rev 1 shared-code fixes

Unchanged from rev 1 and still required:

| Fix | Why |
|---|---|
| `try/catch/finally` in `updatePosts` | A rejection currently leaves `isDownloading === true` forever — a permanent site-wide skeleton. **Also a prerequisite for the migration cutover** |
| 3 pre-existing `vue-tsc` errors | `PageSearch.vue:35`, `usePlyrAudio.ts:1`, `routes/index.ts:86` |
| `"build": "vue-tsc -b && vite build --mode production"` | Without it, no type in either spec is actually enforced |
| `sidebar-store.ts` reads category labels/icons from a shared table | Otherwise nav and page drift |

---

## 8. The 53 mini-articles

### 8.1 What each article contains

A consistent structure, so 53 articles read as one body of work rather than 53
unrelated pages:

```markdown
# <Title>

<One-paragraph blurb — this is also the card's Description.>

## What it does
## Why I made it
## Where it's at now
## What I learned          ← the part a README cannot supply

**Stack:** TypeScript · PixiJS      **Year:** 2025      **State:** active
```

"What I learned" is the section the user cannot get from the code. Everything
else is derivable.

### 8.2 Who writes what

| Author | Deliverable |
|---|---|
| Agent | 53 drafts assembled from source: README where it is real, `package.json`/`.csproj`/`go.mod` for the stack, entry points and route tables for "what it does", commit history for "where it's at now" |
| Agent | Flags each article where intent had to be inferred, and asks rather than inventing |
| **User** | Rewrites "What I learned" — the intent a repository cannot record |
| **User** | Corrects "Why I made it" wherever the draft guessed |
| **User** | Confirms or changes the roster (§8.4) |
| Importer | Creates the 53 `Project` rows with typed fields, then the articles are edited in the CMS UI |

The split matters: a plausible-sounding invented rationale is worse than an empty
section, because he will not remember which parts were guesses.

### 8.3 A refresh script for `LastPushedAt`

~20 lines of `gh` + `jq`, throwaway, not committed. It prints the current
`pushedAt` for every repo in the roster so the CMS column can be updated in one
pass. This is the answer to §5.6's staleness problem, and it is deliberately not
a build-time GitHub fetch — that would reintroduce the network dependency rev 1
was right to reject.

### 8.4 Roster — 53 of 105 shown

Unchanged from rev 1 §10.2. Every one of the 105 public repos is accounted for,
and the split must total 105.

**Game Dev — 17** · `stick-legends` `gameboy-emulator` `1-bit-jam-4` `combat-gods`
`handmade-combat-gods` `web-game-engine` `godot-pong` `pixijs-pong` `pixijs-breakout`
`pixijs-flappy-bird` `pixijs-games-template` `learn-pixi-js` `flappy-bird` `ping-pong`
`breakout` `js-ping-pong` `raylib-playground`

**Graphics — 9** · `shader-land`★1 `article-11-code` `webgpu-shader-art`
`web-gpu-first-app` `blog-webgpu-hello-world` `webgpu-template`
`images-to-spritesheet` `manim-animations` `go-ascii-renderer`

**Business Case — 27** · `cms-system` `erpnext-dashboard`★2 `class-booking-system`
`point-of-sale` `fountain-of-life` `nbi-website` `voice-generation-site` `frappe-pesepay`
`pesepay` `hotspot-cafe-config` `frappe-radiusdesk` `erpnext-cashbook-reconciliation`
`stock-reconciliation`★1 `erpnext-point-of-sale-expenses` `erpnext-market-survey`
`awesome_restaurant` `awesome_dashboard_scripts` `awesome-butchery`
`holdings-operations-management` `background-changer` `nbi-satellite` `nbi-satellite-2`
`document-convertor` `quickbooks-excel-uploader` `pause-audio`
`whatsapp-church-bus-bookings` `frappe-self-host`

**Excluded — 52.** Forks (3) · secrets (1, `hotspot-droplet-backup` — its own
description says *"contains secrets - never make public"*) · deploy artifacts (6) ·
superseded/personal (7) · bootcamp/scratch (8) · UCT coursework (19) ·
student-era/hackathon (2) · junk (2) · unclassifiable (4: `pets`,
`distinctstore.pos`, `papi_iot`, `raspberrypi-infragram-camera`★1 — **default
excluded**, recommend Graphics).

Curation stands as decided in rev 1: 19 auto-generated assignment repos excluded
on principle, because they would dominate the archive and bury the self-directed
work. That is a judgement call, and it is his to reverse — `csc2001-assignment2`
and `csc2002-assignment1` (AVL vs BST benchmarks) are the two worth adding back if
he wants his degree work represented.

**Featured vs archive** survives as a curation concept, but is no longer a
type-level distinction. It becomes an explicit ordering on the listing — the
first N by a hand-set `featured` order in the admin UI, or simply the most recent
by year. Simplest: **archive is everything, ordered by year desc; the first 3–4
per category are additionally surfaced as cards.** No new field.

---

## 9. Sequencing

```
CAN START NOW — frontend only, no CMS dependency
  · duplicate route name fix                    routes/index.ts
  · try/catch/finally in updatePosts            aritcles-store.ts
  · the 3 vue-tsc errors + vue-tsc in the build package.json
  · sidebar-store category wiring               sidebar-store.ts
  · ArticleView.vue extraction from Blog.vue
  · ProjectCard / ProjectArchiveList / project
    page shells, written against a typed
    ProjectSummaryResponse interface

BLOCKED — needs the CMS first
  · Project entity, EF migration, Blog.Kind, DTOs, handlers,
    endpoints, public reads                     cms-system
  · the project editor form                     cms-system/frontend
  · the 53 Project rows and their articles      importer
  · anything that loads real project content    frontend

SHARED WITH THE MIGRATION SPEC
  · contentType on Blog          ← without it, articles cannot render
  · publishedOn, canonicalUrl    ← archive and SEO
  · the anonymous read path      ← 18/18 endpoints currently require auth
  · the updatePosts try/catch    ← a prerequisite for the migration cutover
```

This spec does **not** depend on the migration deleting the Go backend. It
depends only on the CMS-side additions. They can be built in either order, and
the shared work should be done once.

---

## 10. Verification

```
CMS                                    FRONTEND
────────────────────────────────────   ─────────────────────────────────────────
dotnet build --configuration Release   npx vue-tsc -b          0 errors
dotnet test  --configuration Release   npm run lint            clean
one migration, additive, no data      npm run format:check    clean
  backfill on existing posts           npm run build           succeeds

dotnet ef migrations has-pending-     throwaway script
  changes → False                      · 53 projects, 3 per
                                         project blog category
POST /blogs anonymous                   matches its blog
POST /blogs anonymous on a draft       no duplicate slugs
POST /posts into a project blog        no Project row with a
  → 400 (the boundary)                   null/empty Stack
POST /projects into a standard        status matches the 365-day
  blog → 400 (the boundary)             rule for every row
GET /public/projects                   every one of 53 articles
  excludes drafts                       renders with code blocks
GET /public/projects/{slug}           no escaped HTML (contentType)
  excludes drafts                     stack badges, year, links
Project.Category mismatch              canonical points at the source
  → validation error                  404 for an unknown :type and
                                         an unknown :slug
                                      /blog/* and /cv unaffected
                                      375px, no horizontal scroll
                                      dark + light
```

---

## 11. Out of scope / follow-ups

| Item | Note |
|---|---|
| `/blog` landing | Still `WorkInProgress.vue`. One new page, no new content — see §1.1 |
| `/books` + 7 genres | Still `WorkInProgress.vue`. GitHub cannot supply book opinions; needs direct input |
| Cover images for projects | No screenshots can be sourced. Cards render image-less until files are added to the CMS, which supports it natively via `CoverImageUrl` + `Files` → R2 |
| Automated `LastPushedAt` | §8.3 refresh script, run by hand |
| `featured` ordering | Archive ordered by year desc; the top 3–4 per category are surfaced as cards. No new field (§8.4) |
| Go backend deletion | Migration spec, not this one. This spec does not touch it |
| `frontend/.env` tracked with a `VITE_CMS_AUTH0_CLIENT_SECRET` | 27 chars vs the real 64-char secret — a stale placeholder, not a live credential. But `VITE_*` vars are inlined into the public bundle. Should be deleted and `.env*` gitignored. **Unrelated cleanup** |

## 12. Open items

Each has a stated default, so this spec is implementable as written.

1. **The 4 unclassifiable repos** — `pets`, `distinctstore.pos`, `papi_iot`,
   `raspberrypi-infragram-camera`★1. Default excluded; recommend Graphics for the
   last. Name a category to include.
2. **Roster corrections** — any project in the wrong category, or an exclusion to
   reverse. Cheap now, expensive after 53 articles are written against it.
3. **UCT coursework (19 repos)** — default excluded on principle. Reversible.
4. **`Project.Category` as a denormalised field** (§5.2). Kept deliberately for
   queryability and the blog-match invariant. If it reads as redundant, delete it
   and resolve the category from `BlogId` in the DTO mapping — the validator
   invariant goes with it.
5. **Build order between the two specs** — the shared CMS work
   (`contentType`, `publishedOn`, `canonicalUrl`, anonymous reads) should be done
   once. Whether that lands as part of the migration or as separate CMS work
   before it is a scheduling choice, not a design one.
