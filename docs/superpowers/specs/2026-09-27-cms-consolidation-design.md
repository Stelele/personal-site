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

607 lines in `feeds.go`, 155 in `cms.go`, 122 in `main.go` — **884 total**.

| File | Lines | Role |
|---|---|---|
| `feeds.go` | 607 | ~470 scrapers, ~137 dead (`getRssFeed`, `fetchAllPostsFromGitHub`) |
| `cms.go` | 155 | all of it secret custody (`getCmsToken` + proxy) |
| `main.go` | 122 | routing, CORS, static config |

Secret custody lives in `cms.go`, not `feeds.go`. The scrapers are 53% of the
backend by line count and ~100% of its fragility.

**Cost.** 54 of 146 commits (37%) touch `backend/` or `.github/workflows/deploy.yml`.

> Corrected framing, found in adversarial review: "8 of the last 15 commits are
> deploy fixes" overstates a chronic tax. Those 8 landed in **a single burst on
> 2026-05-22** (`c3611b0`, `f4dbc4e`, `4585c35`, `4d7429c`, `3d60fc8`, `6b3d195`),
> plus one `.gitignore` newline on 2026-07-31. The Go deploy has been stable for
> four months. The 37% lifetime figure is real; the *recurrence* claim is not.
> What that actually justifies: the deploy pipeline is **untested and
> undocumented**, so the next time it breaks it will break expensively. Deleting
> the service removes that exposure; so would documenting it, at a fraction of the
> cost of this migration.

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

### 3.2.1 The unexplained external origin — RESOLVED, no external consumers

```go
// backend/main.go:111-120
func isOriginAuthorised(origin string) bool {
    switch origin {
    case "http://localhost:5173":         return true
    case "https://anglican.masvingo.org": return true   // ← ???
        case "https://giftmugweni.com":       return true
```

`https://anglican.masvingo.org` was a third-party site, deliberately
CORS-allowlisted against this API, called by nothing in this repository.
**Resolved 2026-09-27. The Go backend has no consumers other than this site's own
frontend.** Evidence:

| Call path | Verdict | How |
|---|---|---|
| Browser | **Disproven** | `anglican.masvingo.org` is a Vite/Vue SPA — single 481,017-byte bundle, **0 dynamic imports**, no lazy chunks, service worker 404. Grepped for `giftmugweni`, `api.giftmugweni`, `/medium-posts`, `/hashnode-posts`, `/cms/blogs`, `/feed` → zero hits. External hosts it actually calls: `fetchrss.com`, `leafletjs.com`, `vuejs.org`, `img.daisyui.com`, `www.facebook.com`. |
| Server-side | **Ruled out** | Direct confirmation from the user, who has knowledge of that DigitalOcean app. |
| CORS entry | **Fossil** | CORS is a browser-only mechanism; a server-to-server call ignores `isOriginAuthorised` entirely. The entry therefore only ever mattered to a browser caller, and the current browser bundle makes none. |

The browser negative is trustworthy because Vite inlines `import.meta.env.VITE_*`
at build time — verified by dumping the CMS admin bundle, where
`https://api-cms.giftmugweni.com` appears as a literal string in the compiled JS.
A `VITE_API_URL` aimed at this backend would be visible in the anglican bundle. It
is not, and that bundle is the whole application.

**Consequences:**

- No consumer-migration work. No compatibility shim. No pre-work.
- `api.giftmugweni.com` may be retired at cutover (§3.2.2).
- The observer backend once proposed for this purpose is **dropped**. It existed
  to settle an uncertainty that is now settled by better evidence. A 60-line
  service kept alive for weeks to detect a caller that provably does not exist
  is a worse trade than deleting the 607 lines outright.

> If a future caller appears, the fix is to point it at `/public/*` — which
> exists after this migration. Nothing needs to be kept alive for that.

### 3.2.2 `api.giftmugweni.com` loses its only backend

After step 7 the Go service is gone and that hostname has nothing behind it, so
it will return **502** rather than 404. The spec previously claimed no infra work
was needed; that is true for *adding* endpoints but not for *retiring* a host.

Decide explicitly, and record it:

| Option | Action | Notes |
|---|---|---|
| Retire it | Remove the DNS record | **Chosen.** §3.2.1 confirms nothing external uses the API, so there is no consumer to migrate. A removed record returns NXDOMAIN, which is a clearer signal to a future caller than a 502 |
| Repoint the hostname | Point `api.giftmugweni.com` at the CMS | Only needed if some client still targets that name. Nothing does |
| Leave it 502 | Do nothing | Rejected — a live hostname that looks broken |

Also remove the `https://anglican.masvingo.org` case from `isOriginAuthorised` in
the same change, since `main.go` is deleted outright.

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

### 5.0 `contentType` on the blog — BLOCKER, found in adversarial review

The original draft of this spec missed this entirely, and it would have shipped a
broken archive.

```
helpers/blogs/cms.ts:50       contentType: 'markdown'   ← hardcoded for EVERY CMS blog
helpers/blogs/hashnode.ts:43  contentType: 'html'
helpers/blogs/medium.ts       (sets none → Blog.vue:63 falls back to 'html')
composables/usePostRenderer.ts:8   new MarkdownIt()     ← no { html: true }
```

`Blog.vue:63` reads `blog?.contentType ?? "html"`. Medium and Hashnode render as
HTML today **only because those two helper modules exist and set it**. The moment
those posts become CMS blogs, `cms.ts` stamps them `'markdown'`, and
markdown-it's default `html: false` **escapes every tag** — the entire 30-post
archive renders as literal `<p>…</p>` source. No error, no warning, just a site
full of angle brackets.

Fix: add a nullable `contentType` to the CMS `Blog` model, defaulting to
`"markdown"`. The importer sets `"html"` on the two archive blogs.
`PublicBlogResponse` carries it; `cms.ts` reads it instead of hardcoding.

> Alternative considered and rejected: `new MarkdownIt({ html: true })`. One line
> instead of a schema change, and `augmentedContent` DOMPurify-sanitizes the
> output anyway (`usePostRenderer.ts:107`). Rejected because it silently changes
> the HTML posture of *every* markdown post on the site, including the ones he
> writes in the CMS, to solve a problem scoped to two legacy blogs. A per-blog
> field makes the exception explicit and visible in data.

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

> **Caveat, from adversarial review.** `_redirects` does reach production — Vite
> copies `frontend/public/` into `dist/`, and `rm -r out/*` does not match
> dotfiles so the clone's `.git` survives for the push. But the SPA fallback
> serves `404.html` **with HTTP status 404**, which means deep links like
> `/blog/medium/<id>` are *already* returning 404 to crawlers today. So "search
> rankings survive" is weaker than this spec claimed: those URLs may already be
> soft-404'd and the rankings may already be lost. The redirects still protect
> bookmarks and any residual equity, and fixing the status code (a real
> `_redirects` catch-all → `/index.html 200`, or a Cloudflare Pages
> `not_found_handling` setting) is a separate one-line improvement worth taking
> while the file is being written.

### 6.4 Importer fidelity risks

Found in adversarial review. All three are "the importer runs green and the
content is quietly wrong", which is the worst failure mode available.

```
RISK 1 — slug collision / silent under-import
  feeds.go:600  generateTitleHash = FIRST 6 HEX CHARS of md5
  16.7M space. Medium hashes the title, Hashnode the filename.
  Birthday collision across 30 posts ≈ 3e-5 — low, but the failure is
  not a crash: the colliding slug makes GET /posts/slug/{slug} return
  200, so the importer SKIPS a post it never created (§6 step 3).
  Idempotency-by-slug turns a collision into silent data loss.

  MITIGATE: the importer must not treat "already exists" as proof it
  imported that post. Record (slug → source filename) in its own report
  and fail if a slug is claimed by two different source files. Also
  assert global slug uniqueness across BOTH repos before writing.

RISK 2 — Hashnode cover image is probably the wrong image
  feeds.go:333  case "img" fires for the FIRST <img> in document order
                with CoverImage == "" — whatever renders first on the
                page (logo, avatar, banner), not the cover.
  feeds.go:463  extractCDNImageURL regexes `url=([^&\s]+)` on srcset —
                that is Medium's miro-proxy parameter format. Hashnode
                srcset holds plain https://cdn.hashnode.com/... URLs, so
                the regex misses and it silently falls back to src.

  MITIGATE: verify against the real backup HTML before trusting it. If
  the first <img> is not the cover, select by srcset/alt heuristics
  inside the importer rather than fixing feeds.go — the parsers are
  throwaway after this.

RISK 3 — Medium canonicalUrl defaults to a raw GitHub URL
  feeds.go:249  post.URL = file.DownloadURL
  It is only overwritten at :289-291 if the <time class="dt-published">
  node's parent is an <a>. If the backup HTML does not wrap it that way,
  canonicalUrl stays as a raw.githubusercontent.com URL — and §5.2 wires
  that value into BOTH the SEO <link rel="canonical"> and the visible
  "View original article" link. Publishing a GitHub raw URL as canonical
  is worse than publishing none.

  MITIGATE: validate that every imported canonicalUrl matches
  /^https:\/\/(hashnode\.dev|medium\.com)\// and fail the post
  otherwise. Do not assume the happy path the QA checklist in §10
  asserts.
```

---

## 7. `personal-site` changes

| Change | Detail |
|---|---|
| `helpers/downloader.ts` | `getBlogFeeds()` collapses from `Promise.all` over 3 sources to one CMS call |
| `helpers/blogs/cms.ts` | drop the hardcoded `slugs: ["progamming", "walking", "random", "special"]` list (line 9) — fetch all public blogs. Set `link: post.canonicalUrl ?? post.slug`. **Read `contentType` from the blog instead of hardcoding `'markdown'` — see §5.0, this is a blocker** |
| `helpers/blogs/medium.ts` | **deleted** |
| `helpers/blogs/hashnode.ts` | **deleted** |
| `services/cms/index.ts` | drop the `VITE_PRIV_API_URL` prefix; point at the public base. No token, no secret, no token cache |
| `frontend/.env` | remove `VITE_PRIV_API_URL` and the unused `VITE_CMS_URL`; one `VITE_CMS_URL=https://api-cms.giftmugweni.com` |
| `frontend/.env.local` | **also needs updating.** Untracked, holds `VITE_PRIV_API_URL=http://localhost:3000`. After `backend/` is deleted, `npm run dev` fails. Vite precedence means it also *overrides* `.env.production`, so a local `npm run build` currently tests the wrong host — a trap worth clearing now |
| `.github/workflows/deploy.yml` | delete the entire `backend` job — build, scp, systemd, `strip_components`, service file, `.env` heredoc. Also drop the `backend` paths-filter. **And fix the frontend job's `sed`:** it currently substitutes `{{CMS_URL}}` → `https://api.giftmugweni.com/cms`, which is the Go proxy being deleted. Without this, prod `VITE_CMS_URL` points at a dead host even though `frontend/.env` was corrected |
| `backend/collection.http` | **deleted** with `backend/` |
| `frontend/public/_redirects` | **new** — 30 rules from the importer |
| `backend/` | **deleted** after the importer is verified |
| DNS | retire the `api.giftmugweni.com` record per §3.2.2, after §3.2.1 is resolved |

`VITE_CMS_URL` is currently dead config: it is set in `deploy.yml`'s `sed` and in
`frontend/.env`, but `CmsService` reads `VITE_PRIV_API_URL`. Confirmed by grep —
no reference anywhere in `frontend/src`.

---

## 8. Order and rollback

```
STEP                              REPO            REVERSIBLE?
────────────────────────────────   ────────────    ──────────────────────────
1. publishedOn, canonicalUrl,      cms-system     additive
   contentType on Blog, public
   endpoints, DTO, query,
   CORS config + guard
2. deploy the CMS                  infra          additive
3. importer --dry-run              personal-site   no side effects
4. importer (real run)             personal-site   idempotent, re-runnable
5. ship generated _redirects       personal-site   additive
6. frontend repoint + delete       personal-site   git revert
   medium/hashnode helpers
7. delete backend/ + the           personal-site   ← the cutover
   backend job in deploy.yml                      git revert
8. retire api.giftmugweni.com DNS  infra          re-add the record
```

Steps 1–6 are additive or revertible. The old Go service keeps serving through
step 6; cutover happens only after the CMS-served site is verified good.

There is **no step 0 and no gate.** §3.2.1 is resolved. The migration cannot be
blocked by a consumer, because there is no consumer.

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
| The `progamming` slug typo | Existing CMS blog slug, referenced only in `cms.ts:9`, which this spec removes. The blog itself keeps its typo'd slug — renaming it would break any existing URLs. |
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
