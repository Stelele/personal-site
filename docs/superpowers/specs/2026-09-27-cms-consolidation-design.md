# CMS Consolidation — Design Spec

**Date:** 2026-09-27
**Goal:** Make the CMS the single content path. Delete the Go backend.
**Repos touched:** `personal-site` (Go + Vue), `cms-system` (C#)
**Infra touched:** none — see §3.2
**Sibling spec:** `2026-09-27-projects-section-design.md`

---

## 1. Goal

```
TWO CONTENT PATHS TODAY                  ONE CONTENT PATH AFTER
──────────────────────────────────       ──────────────────────────────────
  Hashnode ─manual─► git backup ─┐        CMS ──► /public/* ──► browser
  Medium   ─manual─► git backup ─┤
                                   ├──► Go ──► browser            Go deleted
  CMS ──localhost──► Go proxy ────┘
```

The user writes **only in the CMS** (confirmed 2026-09-27). Hashnode and Medium
are frozen archives: 18 Medium + 12 Hashnode HTML files, manually pushed
2026-03-08 and 2026-05-20, with no GitHub Actions in either repo.

So the second content path no longer serves a purpose — it only costs
maintenance. This spec deletes it.

---

## 2. Decisions

| # | Decision | Choice | Why |
|---|---|---|---|
| 1 | Anonymous read path | 3 `.AllowAnonymous()` endpoints on the CMS | All 8 read endpoints currently require a scope. The Go proxy exists only to hold the Auth0 client secret. |
| 2 | 30 legacy posts | Import into the CMS, full content | Full content keeps the archive on his domain. Stubs bounce readers back out. |
| 3 | Importer form | One-shot CLI reusing the Go parsers | The parsers work today. Reused verbatim, they do their last job and leave. Porting them to C# makes them permanent — the opposite of the goal. |
| 4 | `publishedOn` gap | Add optional `publishedOn` to post commands | The CMS API cannot set a publication date at all today. Without it all 30 imports collapse to today's date and `downloader.ts` sorts them into one pile. |
| 5 | CORS | `Cors:AllowedOrigins` from config, dev override in `appsettings.Development.json`, startup guard in Production | A hardcoded `localhost:5173` in the production allowlist is a real exposure — any page on that port can read the CMS. No `*` fallback anywhere. |
| 6 | URL preservation | Importer emits `frontend/public/_redirects` | Every imported post gets a new CMS GUID, so all 30 `/blog/:site/:id` URLs change. 30 static rules beat a runtime table. |
| 7 | Canonical URL | Add nullable `canonicalUrl` to the post model | Without it the same 30 articles are indexed on two domains with no canonical signal. |
| 8 | Sequencing | Spec both projects-section and migration now, execute separately | Migration touches prod deploys and wants a maintenance window. |

---

## 3. Current state

### 3.1 The backend

```
ENDPOINT                CALLED BY                    VERDICT
──────────────────────────────────────────────────────────────────────
/feed?url=              (nothing)                    DEAD
/medium-posts           helpers/blogs/medium.ts      ETL
/hashnode-posts         helpers/blogs/hashnode.ts    ETL
/cms/blogs              (nothing)                    DEAD
/cms/blogs/{id}/posts   helpers/blogs/cms.ts         secret custody
──────────────────────────────────────────────────────────────────────
feeds.go:145 getRssFeed                  only serves /feed → dead
feeds.go:182 fetchAllPostsFromGitHub     never called; getMediumFeed
                                         minus the cache, 58 dup lines
```

607 lines: ~470 scrapers, ~70 dead, ~70 secret custody.

**Cost.** 54 of 146 commits (37%) touch `backend/` or `.github/workflows/deploy.yml`.
8 of the last 15 are `strip_components` / service-path fixes.

**Four defects found:**

| # | Defect | Evidence |
|---|---|---|
| 1 | Scrapers keyed to another site's CSS | `hasClassPrefix(n, "text-2xl")` (Hashnode title), `data-nimg` / `data-darkreader` / `--darkreader` scrubbing, `p-summary` / `graf--subtitle` / `e-content` (Medium internals). A Hashnode redesign silently blanks titles and cover images — no error. |
| 2 | Cache never expires | `feeds.go:46` — `if cache.loaded { return cache.posts }`. No TTL. A newly pushed backup is invisible until systemd restarts. In-memory, so every restart re-downloads all 30 files. |
| 3 | `extractDateFromFilename` fails open | `feeds.go:457` returns `time.Now()` on a filename miss — a renamed file gets today's date instead of erroring. |
| 4 | No error handling anywhere | `downloader.ts:7` `getBlogFeeds()` has no `try/catch`; a rejection leaves `isDownloading === true` permanently. |

### 3.2 Hosting — no infra work required

```
giftmugweni.com         → 2a06:98c1:3120::6    Cloudflare → static frontend
api.giftmugweni.com     → 2a06:98c1:3120::6    Cloudflare → Go service
api-cms.giftmugweni.com → 2606:4700:3036::ac43  Cloudflare → CMS (Docker)
cms.giftmugweni.com     → no DNS record        (Auth0 audience identifier only)

GET https://api-cms.giftmugweni.com/blogs   → 401
GET https://api-cms.giftmugweni.com/scalar → 302
```

**The CMS is already public, already on its own Cloudflare-fronted domain, with a
real certificate.** No nginx change, no cert change, no droplet reconfiguration.

> Correction on record: `backend/.env` locally contains
> `CMS_API_URL=https://localhost:56512` (a `dotnet run` dev port with a
> self-signed `localhost+1.pem`). That is a **local dev override only**.
> Production receives `CMS_API_URL` from the `CMS_API_URL` GitHub secret via
> `deploy.yml`. Do not "fix" the local file — it is correct for its purpose.

Admin UI: `https://stelele.github.io/cms-system-frontend-build/` — **200, live**,
and its deployed bundle calls `https://api-cms.giftmugweni.com`. This origin must
be in the CORS allowlist, because the admin UI performs browser-side writes.

### 3.3 The CMS authorization gap

```
18 endpoints total · 8 reads · ALL 18 have .RequireAuthorization() · 0 AllowAnonymous

MapGet("/blogs")                       → ReadBlogs        MapPost("/blogs")        → WriteBlogs
MapGet("/blogs/{id}")                  → ReadBlogs        MapPut("/blogs/{id}")    → WriteBlogs
MapGet("/blogs/{blogId}/posts")        → ReadPosts        MapDelete("/blogs/{id}") → WriteBlogs
MapGet("/blogs/{blogId}/posts/{id}")   → ReadPosts        MapPost  / Put / Delete posts → WritePosts
MapGet("/posts/slug/{slug}")           → ReadPosts        MapGet("/tags")          → ReadPosts
MapGet("/files/{id}")                  → ReadFiles        MapPost("/files/upload") → WriteFiles
MapGet("/posts/{postId}/files")        → ReadFiles        MapPost("/summarize")    → Summarize
                                        MapDelete("/files/{id}")               → WriteFiles
```

`AddPermission` uses `p.RequireAuthenticatedUser()`, so existing policies cannot
be reused for anonymous access. A separate public path is required.

### 3.4 The `publishedOn` gap

```csharp
CreatePostCommand { blogId, title, slug, content, description?, tag, coverImageUrl, isPublished }
UpdatePostCommand { blogId, id,  title, slug, content, description?, tag, coverImageUrl, isPublished }
PostResponse      { …, publishedOn, … }        // response only
```

**There is no way to set a post's publication date through the CMS API.** Every
post is stamped "now". Harmless for new writing, fatal for an archive:
`downloader.ts:19` sorts every blog by `publishDate` desc, so all 30 imports
would land in one arbitrarily-ordered pile dated today.

---

## 4. Target architecture

```
  30 archived posts ──one-shot importer──► CMS (Docker, api-cms.giftmugweni.com)
                                              │
                                              │  /public/blogs                    anonymous
                                              │  /public/blogs/{id}/posts         published-only
                                              │  /public/posts/slug/{slug}        PublicPostResponse
                                              ▼
  browser ──► api-cms.giftmugweni.com/public/* ──► JSON
                       │
  Cloudflare Pages ◄──┤
  static frontend      │
                       │
  Go service: DELETED ─┘
```

---

## 5. `cms-system` changes

### 5.1 `publishedOn` on the post commands

Optional, defaults to now. Every existing caller is unaffected.

```csharp
public sealed record CreatePostCommand(
    Guid BlogId, string Title, string Slug, string Content,
    string? Description, string Tag, string? CoverImageUrl,
    bool IsPublished, DateTimeOffset? PublishedOn = null);
```

Handler: `post.PublishedOn = command.PublishedOn ?? DateTimeOffset.UtcNow;`

### 5.2 `canonicalUrl` on the post

Nullable column, threaded through `UpdatePostCommand`, `PostResponse` and
`PublicPostResponse`. Feeds `usePostRenderer`'s existing `showCanonical` branch
(`usePostRenderer.ts:58`, which fires when `post.link` starts with `https://`).

Frontend: `cms.ts` sets `link: post.canonicalUrl ?? post.slug`, so
`findPostBySlug` keeps working for normal posts and the canonical branch fires
for imported ones.

### 5.3 Three anonymous endpoints

```
GET /public/blogs                    → PublicBlogResponse[]
GET /public/blogs/{id:guid}/posts    → PublicPostResponse[]
GET /public/posts/slug/{slug}       → PublicPostResponse
```

`.AllowAnonymous()`. No scope check.

**A dedicated query, not a reused one.** `GetPostsByBlogQuery` already accepts
`isPublished?` as a filter parameter — reusing it would make draft-safety depend
on a handler remembering to pass `true`. Instead:

```csharp
// IsPublished is baked into the Where clause, not a parameter
public sealed record GetPublicPostsQuery(Guid BlogId) : IRequest<PublicPostResponse[]>;
```

### 5.4 `PublicPostResponse` as a real boundary

```csharp
public sealed record PublicPostResponse(
    Guid Id, Guid BlogId, string Title, string Slug, string Content,
    string? Description, string Tag, string? CoverImageUrl,
    DateTimeOffset? PublishedOn, string? CanonicalUrl);
// deliberately absent: IsPublished, CreatedOn, UpdatedOn
```

A field that is not in the DTO cannot leak, even if a future caller reuses the
endpoint. This is the reason the DTO is separate from `PostResponse` rather than
a reuse of it.

`PublicBlogResponse`: `id, name, slug, description, icon` — no `createdOn` / `updatedOn`.

### 5.5 CORS — configurable, guarded

```jsonc
// backend/Host/appsettings.json            ← safe base
"Cors": { "AllowedOrigins": [] }           // empty = allow nothing

// backend/Host/appsettings.Development.json   ← dev only; replaces the array
"Cors": { "AllowedOrigins": [ "http://localhost:5173" ] }

// production: injected as container env vars
Cors__AllowedOrigins__0=https://giftmugweni.com
Cors__AllowedOrigins__1=https://stelele.github.io
```

ASP.NET loads `appsettings.{Environment}.json` only when that environment is
active, and **arrays are replaced, not merged** — so the dev override cannot leak
into production even by accident. No `localhost` appears in production config.

Startup guard in `DependancyInjection.AddApi`:

```csharp
if (builder.Environment.IsProduction())
{
    var origins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
    if (origins.Length == 0)
        throw new InvalidOperationException("Cors:AllowedOrigins is empty in Production.");
    if (origins.Any(o => o.Contains('*')))
        throw new InvalidOperationException("Wildcard CORS origin is not permitted in Production.");
}
```

A misconfigured deploy **crashes at boot** rather than quietly serving `*`.
There is no `*` fallback path anywhere in the code.

---

## 6. Importer

`backend/cmd/import/main.go` — temporary. Lives until the import is verified,
then is deleted with the rest of `backend/`.

```
1. mint Auth0 M2M token                    reuse getCmsToken()      (cms.go)
2. resolve archive blogs                   GET /blogs → find-or-create
                                          slugs "hashnode" / "medium"
3. per .html in the two backup repos:
     download                             reuse fetchGitHubRepoPosts()
     parse                                reuse parseMediumPost / parseHashnodePost
     skip if already imported             GET /posts/slug/{slug} → 200 ⇒ skip
     upload cover bytes → R2               POST /files/upload           → fileId
     create post                           POST /blogs/{id}/posts
                                            title, slug, content, description,
                                            tag, coverImageUrl, isPublished: true,
                                            publishedOn  ← original Date
                                            canonicalUrl ← original URL
     attach cover to post                  POST /files/{fileId}/posts/{postId}
4. write frontend/public/_redirects        30 old-id → new-id rules
5. report created / skipped / failed; exit non-zero if any failed
```

### 6.1 Field mapping

| Go `Post` | CMS field | Note |
|---|---|---|
| `Title` | `title` | |
| `ID` | `slug` | md5 prefix — already stable per parser |
| `Content` | `content` | already cleaned HTML; `renderCleanNode` output is reused as-is |
| `Summary` | `description` | |
| `Tags[0]` | `tag` | fallback `"uncategorized"` when empty |
| `CoverImage` | `coverImageUrl` | via R2 upload, **not** hotlinked |
| `Date` | `publishedOn` | §5.1 |
| `URL` | `canonicalUrl` | §5.2 |
| — | `isPublished` | `true` |

### 6.2 Why these four properties

**Idempotent.** The parsers already emit a stable id (md5 of title for Medium,
md5 of filename for Hashnode). That becomes the slug, so a re-run skips
anything already present. A failure halfway through is recovered by running it
again — no cleanup step.

**Per-post non-fatal.** One unparseable file must not abort the other 29.
Errors are collected, reported at the end, and reflected in the exit code.

**Cover images re-uploaded, not hotlinked.** Hashnode covers are extracted from
a CDN `srcset`; Medium covers are relative paths into Medium's CDN. Both rot.
Downloading the bytes and pushing them through `/files/upload` into R2 is what
the file-attachment API exists for, and it makes the archive self-contained.

**Blog slugs preserved.** New CMS blogs are created with slugs `hashnode` and
`medium` so `/blog/hashnode/...` and `/blog/medium/...` keep their meaning.
Blog *ids* and the sidebar entries stay stable because the frontend already
derives sidebar links from blog slugs (`sidebar-store.ts:20`).

### 6.3 The two GUIDs problem

`AllPosts.vue:9` links to `/blog/${blogSite}/${post.id}` and `Blog.vue`
resolves via `findPost(blogSlug, postId)`, where `id` is the CMS GUID
(`cms.ts:27`). Imported posts receive new GUIDs, so **all 30 URLs change**.

`backend/cmd/import` writes `frontend/public/_redirects`:

```
/blog/hashnode/a1b2c3   /blog/hashnode/8f3e-4c1a-…   301
/blog/medium/f4e5d6     /blog/medium/2b7c-9e05-…     301
… 30 rules
```

Cloudflare Pages serves `_redirects` ahead of the SPA `404.html` fallback that
`deploy.yml` sets up via `cp index.html 404.html`, so existing links, bookmarks
and search rankings survive. 30 static lines beat a runtime redirect table.

---

## 7. `personal-site` changes

| Change | Detail |
|---|---|
| `helpers/downloader.ts` | `getBlogFeeds()` collapses from `Promise.all` over 3 sources to one CMS call |
| `helpers/blogs/cms.ts` | drop the hardcoded `slugs: ["progamming", "walking", "random", "special"]` list (line 12) — fetch all public blogs. Set `link: post.canonicalUrl ?? post.slug` |
| `helpers/blogs/medium.ts` | **deleted** |
| `helpers/blogs/hashnode.ts` | **deleted** |
| `services/cms/index.ts` | drop the `VITE_PRIV_API_URL` prefix; point at the public base. No token, no secret, no token cache |
| `frontend/.env` | remove `VITE_PRIV_API_URL` and the unused `VITE_CMS_URL`; one `VITE_CMS_URL=https://api-cms.giftmugweni.com` |
| `.github/workflows/deploy.yml` | delete the entire `backend` job — build, scp, systemd, `strip_components`, service file, `.env` heredoc. Also drop the `backend` paths-filter |
| `backend/collection.http` | **deleted** with `backend/` |
| `frontend/public/_redirects` | **new** — 30 rules from the importer |
| `backend/` | **deleted** after the importer is verified |

`VITE_CMS_URL` is currently dead config: it is set in `deploy.yml`'s `sed` and in
`frontend/.env`, but `CmsService` reads `VITE_PRIV_API_URL`. Confirmed by grep —
no reference anywhere in `frontend/src`.

---

## 8. Order and rollback

```
STEP                              REPO            REVERSIBLE?
────────────────────────────────   ────────────    ──────────────────────────
1. publishedOn, canonicalUrl,      cms-system     additive
   public endpoints, DTO,
   query, CORS config + guard
2. deploy the CMS                  infra          additive
3. importer --dry-run              personal-site   no side effects
4. importer (real run)             personal-site   idempotent, re-runnable
5. ship generated _redirects       personal-site   additive
6. frontend repoint + delete       personal-site   git revert
   medium/hashnode helpers
7. delete backend/ + the           personal-site   ← the cutover
   backend job in deploy.yml                      git revert
```

Steps 1–6 are additive or revertible. The old Go service keeps serving through
step 6; cutover happens only after the CMS-served site is verified good.

`medium-blogs-backup` and `hashnode-blog-backups` are **not** deleted. They remain
the source archive and the importer's input.

---

## 9. Edge cases

| Case | Behaviour |
|---|---|
| CMS blog has no posts | Empty list — `AllPosts.vue` already renders nothing; `UBlogPosts` handles it |
| Import re-run | `GET /posts/slug/{slug}` returns 200 ⇒ skip. No duplicates |
| Cover image 404s on the source CDN | Log, create the post with `coverImageUrl = null`, count as a warning not a failure — content is more valuable than its thumbnail |
| One file fails to parse | Collected and reported; the other 29 proceed; exit code non-zero |
| R2 upload fails | Post created without a cover; reported. Re-run attaches it (slug check finds the post, cover path re-runs) |
| Draft post in the CMS | Invisible to `/public/*` — filtered in the `Where` clause, not by the handler |
| A field is added to `PostResponse` later | Cannot leak: `PublicPostResponse` is a separate DTO |
| CORS misconfigured in production | App throws at startup, does not boot |
| CMS unreachable | `getBlogFeeds()` rejects — **the §3.1 defect 4 `try/catch` fix from the projects spec must land first**, or the site shows a permanent skeleton |

> The last row is a real ordering constraint. The projects spec already fixes
> `updatePosts` with `try/catch/finally`; apply that fix **before** step 6, or
> inline during it.

---

## 10. Verification

```
GATE                              CHECK
──────────────────────────────   ───────────────────────────────────────────
dotnet build --configuration Release    clean
dotnet test  --configuration Release    all pass (CI already runs this)
vue-tsc -b                             0 errors
npm run lint / format:check            clean
npm run build                          succeeds

importer --dry-run                     reports 30 would-create, 0 duplicates
importer (real)                        created + skipped + failed == 30 total
POST /blogs (anonymous)                200
POST /blogs (anonymous) for a draft    404 — the draft-safety assertion

browser QA                             all 30 imported posts render
                                       dates are the ORIGINAL dates, not today
                                       cover images load from R2
                                       tags present
                                       canonical <link> points at hashnode/medium
  /blog/hashnode/<old md5>             redirects to the new GUID
  /blog/medium/<old md5>               redirects to the new GUID
  /projects, /cv, /why-i-blog         unaffected
  admin UI @ stelele.github.io         login, create + edit + publish a post
  CORS from an unlisted origin         blocked
```

---

## 11. Out of scope / follow-ups

| Item | Note |
|---|---|
| `GET /scalar` is publicly reachable (302) | Publishes the OpenAPI document. Low risk for a content API, but it is endpoint-surface disclosure. Disabling in Production is a one-liner. Not in this spec. |
| `frontend/.env` is git-tracked and contains `VITE_CMS_AUTH0_CLIENT_SECRET` | 27 chars vs the real 64-char secret in untracked `backend/.env` — a stale placeholder, not a live credential. But `VITE_*` vars are inlined into the public JS bundle regardless. Should be deleted and `.env*` gitignored. In the projects spec's §12; still not done. |
| The `progamming` slug typo | Existing CMS blog slug, referenced only in `cms.ts:12`, which this spec removes. The blog itself keeps its typo'd slug — renaming it would break any existing URLs. |
| 30 archived posts have no edit UI for dates | Solved by §5.1. |
| `build-your-own-x` fork is his stated learning philosophy | Referenced in the manifesto (projects spec §10.4) as evidence. It is a fork, so it stays out of the projects roster. |
| Projects section spec | Separate spec, separate execution window. Its `try/catch` fix is a prerequisite for step 6 here (§9). |

## 12. Open items

Each has a stated default, so this spec is implementable as written.

1. **`canonicalUrl` — confirmed needed?** §5.2 is included because without it
   30 articles are duplicate content with no canonical signal. Cheap to omit,
   but the duplicate-content cost is permanent.
2. **Two archive blogs vs one.** §6.2 creates `hashnode` and `medium` separately
   to preserve `/blog/hashnode/…` and `/blog/medium/…`. A single `archive` blog
   is simpler but breaks both URL families and merges two distinct reading
   lists. **Default: two.**
3. **`/scalar` in Production** — leave public, or disable. **Default: leave.**
4. **Admin UI origin is `https://stelele.github.io`.** Confirmed live (200) and
   confirmed to be the origin calling `api-cms`. If that Pages deployment is
   retired later, the allowlist entry becomes dead config.
