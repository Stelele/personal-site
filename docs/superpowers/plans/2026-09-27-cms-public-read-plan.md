# CMS Public Read & Typed Content — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make published CMS content anonymously readable over HTTP, and fix three content-typing gaps that block the projects section and the 30-post archive import.

**Architecture:** Additive only. A nullable `contentType` on `Blog`, a nullable `canonicalUrl` on `Post`, and `publishedOn` accepted on the post commands land as one EF migration with no backfill. Three `.AllowAnonymous()` endpoints under `/public/*` return dedicated DTOs that physically cannot return a draft or an internal field. CORS moves from a hardcoded `WithOrigins("*")` to `Cors:AllowedOrigins` in configuration, with a startup guard that refuses to boot in Production if it is empty or contains a wildcard.

**Tech Stack:** .NET 10, EF Core 9.0.11 (SQLite), MediatR 14, FluentValidation 12, xunit 2.9.3, Moq 4.20.72

**Spec:** `docs/superpowers/specs/2026-09-27-cms-consolidation-design.md` §5.0–5.5, and `2026-09-27-projects-section-design.md` §3.1

**Repo:** this plan works in `~/Documents/code-projects/cms-system`. Do **not** start it in `personal-site`.

---

## Scope

| In | Out |
|---|---|
| `contentType` on `Blog` — **the blocker** | `Project : Post` entity (projects spec) |
| `publishedOn` on post create/update commands | `Blog.Kind` discriminator (projects spec) |
| `canonicalUrl` on `Post` | Deleting the Go backend (migration spec) |
| `PublicBlogResponse` / `PublicPostResponse` DTOs | The importer itself (migration spec) |
| Public queries with `IsPublished` baked into `Where` | The CMS admin UI project form (projects spec) |
| `/public/blogs`, `/public/blogs/{id}/posts`, `/public/posts/slug/{slug}` | |
| `Cors:AllowedOrigins` config + Production startup guard | |

**Known limitation, accepted:** `Blog` has no `IsPublished` column, so `GET /public/blogs` returns **every** blog. All four existing blogs are intended public, and the three project blogs will be too. Revisit only if a blog is ever created for private notes — that is when a publish flag on `Blog` becomes worth adding.

---

## File Structure

```
CREATE  backend/Tests/TestDb.cs                              temp-SQLite fixture for handler tests
CREATE  backend/Domain/Blogs/BlogContentType.cs              the two legal values + default
CREATE  backend/Api/CorsOriginPolicy.cs                      CORS resolution + Production guard
CREATE  backend/Api/Endpoints/Public/PublicEndpoints.cs       the 3 anonymous endpoints
CREATE  backend/Application/Blogs/GetPublicBlogsQuery.cs     + handler
CREATE  backend/Application/Posts/GetPublicPostsByBlogQuery.cs   + handler
CREATE  backend/Application/Posts/GetPublicPostBySlugQuery.cs    + handler
CREATE  backend/Application/DTOs/PublicBlogResponse.cs
CREATE  backend/Application/DTOs/PublicPostResponse.cs
CREATE  backend/Infrastructure/Infrastructure/Migrations/*_AddPublicContentFields.cs

MODIFY  backend/Domain/Blogs/Blog.cs                         + ContentType, Create() param
MODIFY  backend/Domain/Posts/Post.cs                         + CanonicalUrl, Create() param
MODIFY  backend/Infrastructure/Models/BlogEntity.cs          configure ContentType
MODIFY  backend/Infrastructure/Models/PostEntity.cs          configure CanonicalUrl
MODIFY  backend/Application/Posts/CreatePostCommand.cs        + PublishedOn, CanonicalUrl
MODIFY  backend/Application/Posts/UpdatePostCommand.cs        + PublishedOn, CanonicalUrl
MODIFY  backend/Application/Posts/CreatePostCommandHandler.cs honour both
MODIFY  backend/Application/Posts/UpdatePostCommandHandler.cs honour both
MODIFY  backend/Application/DTOs/PostResponse.cs             + CanonicalUrl
MODIFY  backend/Api/DependancyInjection.cs                   CORS from config + guard, MapPublicEndpoints
MODIFY  backend/Api/Tags.cs                                  + EndpointTags.Public
MODIFY  backend/Host/appsettings.json                        "Cors": { "AllowedOrigins": [] }
MODIFY  backend/Host/appsettings.Development.json            + localhost:5173
MODIFY  backend/Tests/Tests.csproj                           + ProjectReference to Api
```

---

### Task 0: Test fixture and the Api project reference

Handler tests need a real `CmsDbContext`. `CmsDbContext` takes an `IPublisher`
(MediatR 14), and the CORS guard lives in `Api`, which `Tests` does not yet
reference. Both are prerequisites for every later task.

**Files:**
- Create: `backend/Tests/TestDb.cs`
- Modify: `backend/Tests/Tests.csproj`

- [ ] **Step 1: Add the Api project reference to Tests**

In `backend/Tests/Tests.csproj`, inside the existing second `<ItemGroup>` that
holds the `ProjectReference` entries, add one line after
`..\Domain\Domain.csproj`:

```xml
    <ProjectReference Include="..\Api\Api.csproj" />
```

- [ ] **Step 2: Create the test fixture**

Create `backend/Tests/TestDb.cs`:

```csharp
using Domain.Blogs;
using Domain.Posts;
using Infrastructure.Models;
using MediatR;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace Tests;

/// <summary>
/// A real CmsDbContext over a throwaway SQLite file. Uses EnsureCreated rather
/// than Migrate so tests exercise the current model without depending on
/// migration history.
/// </summary>
public sealed class TestDb : IDisposable
{
    private readonly string _dir;

    public CmsDbContext Db { get; }

    public TestDb()
    {
        _dir = Path.Combine(Path.GetTempPath(), "cms-tests", Guid.NewGuid().ToString());
        Directory.CreateDirectory(_dir);

        var options = new DbContextOptionsBuilder<CmsDbContext>()
            .UseSqlite($"Data Source={Path.Combine(_dir, "test.db")}")
            .Options;

        Db = new CmsDbContext(options, Mock.Of<IPublisher>());
        Db.Database.EnsureCreated();
    }

    /// <summary>
    /// Gained its contentType parameter in Task 1, once Blog.Create accepted one.
    /// </summary>
    public Blog SeedBlog(string name, string slug)
    {
        var blog = Blog.Create(name, slug, $"{name} description", "i-heroicons-book-open");
        Db.Blogs.Add(blog);
        Db.SaveChanges();
        return blog;
    }

    public Post SeedPost(
        Blog blog,
        string title,
        string slug,
        bool isPublished = true,
        string? content = "Body text",
        string tag = "general",
        DateTimeOffset? publishedOn = null)
    {
        var post = Post.Create(blog.Id, title, slug, content, $"{title} brief", tag);
        if (isPublished)
        {
            post.Publish();
            if (publishedOn.HasValue)
                post.PublishedOn = publishedOn.Value;
        }

        Db.Posts.Add(post);
        Db.SaveChanges();
        return post;
    }

    public void Dispose()
    {
        Db.Dispose();
        SqliteConnection.ClearAllPools();
        if (Directory.Exists(_dir))
            Directory.Delete(_dir, true);
    }
}
```

- [ ] **Step 3: Add a smoke test that the fixture works**

Create `backend/Tests/TestDbFixtureTests.cs`:

```csharp
using Domain.Blogs;

namespace Tests;

public class TestDbFixtureTests
{
    [Fact]
    public void SeedBlog_PersistsAndLoadsBack()
    {
        using var db = new TestDb();
        var seeded = db.SeedBlog("Game Dev Projects", "game-dev");

        var loaded = db.Db.Blogs.Single();

        Assert.Equal(seeded.Id, loaded.Id);
        Assert.Equal("game-dev", loaded.Slug);
    }

    [Fact]
    public void SeedPost_PersistsPublishedFlagAndDate()
    {
        using var db = new TestDb();
        var blog = db.SeedBlog("Blog", "blog");
        var when = new DateTimeOffset(2024, 5, 18, 0, 0, 0, TimeSpan.Zero);

        var post = db.SeedPost(blog, "A Post", "a-post", isPublished: true, publishedOn: when);

        var loaded = db.Db.Posts.Single();
        Assert.True(loaded.IsPublished);
        Assert.Equal(when, loaded.PublishedOn);
    }
}
```

- [ ] **Step 4: Run the tests**

Run: `cd backend && dotnet test`
Expected: PASS — 37 total (35 pre-existing + 2 new). The fixture compiles as
written; no later-task dependency has leaked into it.

- [ ] **Step 5: Commit**

```bash
git add backend/Tests/TestDb.cs backend/Tests/TestDbFixtureTests.cs backend/Tests/Tests.csproj
git commit -m "test: add TestDb fixture over throwaway SQLite

Handler tests need a real CmsDbContext, which takes a MediatR IPublisher.
Also references the Api project so the CORS guard is testable."
```

---

### Task 1: `contentType` on Blog — the blocker

Without this, any post imported as HTML renders escaped, because
`frontend/src/helpers/blogs/cms.ts` hardcodes `contentType: 'markdown'` and
`usePostRenderer.ts` builds `new MarkdownIt()` with no `{ html: true }`.

Nullable, defaulting to markdown, so **no existing blog changes behaviour and no
backfill is required.**

**Files:**
- Create: `backend/Domain/Blogs/BlogContentType.cs`
- Modify: `backend/Domain/Blogs/Blog.cs`
- Modify: `backend/Infrastructure/Models/BlogEntity.cs`
- Modify: `backend/Tests/TestDb.cs`
- Test: `backend/Tests/BlogContentTypeTests.cs`

- [ ] **Step 1: Write the failing test**

Create `backend/Tests/BlogContentTypeTests.cs`:

```csharp
using Domain.Blogs;

namespace Tests;

public class BlogContentTypeTests
{
    [Fact]
    public void Create_WithoutContentType_StoresNull()
    {
        var blog = Blog.Create("Test", "test", "desc", "i-heroicons-book-open");

        Assert.Null(blog.ContentType);
    }

    [Fact]
    public void Create_WithHtml_StoresHtml()
    {
        var blog = Blog.Create("Archive", "archive", "desc", "i-heroicons-book-open", BlogContentType.Html);

        Assert.Equal(BlogContentType.Html, blog.ContentType);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("MARKDOWN")]
    [InlineData("restructuredtext")]
    public void Create_WithInvalidContentType_Throws(string invalid)
    {
        Assert.Throws<ArgumentException>(
            () => Blog.Create("Test", "test", "desc", "i-heroicons-book-open", invalid));
    }

    [Fact]
    public void OrDefault_NullYieldsMarkdown()
    {
        Assert.Equal(BlogContentType.Markdown, BlogContentType.OrDefault(null));
    }

    [Theory]
    [InlineData(null, BlogContentType.Markdown)]
    [InlineData("", BlogContentType.Markdown)]
    [InlineData("   ", BlogContentType.Markdown)]
    [InlineData("bogus", BlogContentType.Markdown)]
    [InlineData("html", BlogContentType.Html)]
    [InlineData("markdown", BlogContentType.Markdown)]
    public void OrDefault_MapsEveryInputToALegalValue(string? input, string expected)
    {
        Assert.Equal(expected, BlogContentType.OrDefault(input));
    }

    [Fact]
    public void ContentType_RoundTripsThroughTheDatabase()
    {
        using var db = new TestDb();
        db.SeedBlog("Graphics", "graphics", BlogContentType.Html);

        // Without this, Single() returns the tracked instance just saved and the
        // assertion never reaches SQLite.
        db.Db.ChangeTracker.Clear();

        Assert.Equal(BlogContentType.Html, db.Db.Blogs.Single().ContentType);
    }
}
```

The last test needs a seed helper that can set the value, so `TestDb` gains the
parameter now — it is part of the test, not part of the implementation.

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && dotnet test --filter BlogContentTypeTests`
Expected: **BUILD FAILURE** — `'BlogContentType' does not exist` and
`'Blog' does not contain a definition for 'ContentType'`.

- [ ] **Step 3: Create the content-type constants**

Create `backend/Domain/Blogs/BlogContentType.cs`:

```csharp
namespace Domain.Blogs;

/// <summary>
/// The content kinds the renderer knows how to display. Kept as string constants
/// rather than an enum because the wire contract is already these literals — the
/// frontend's Blog type is `'html' | 'markdown'` — and a serialisation change
/// would be a needless risk for a two-value set. The closed set is enforced at the
/// write boundary by <see cref="Blog.Create"/>, which throws when
/// <see cref="IsValid"/> fails, and at the read boundary by <see cref="OrDefault"/>,
/// which coerces anything else to <see cref="Default"/>.
/// </summary>
public static class BlogContentType
{
    public const string Markdown = "markdown";
    public const string Html = "html";

    public const string Default = Markdown;

    public static bool IsValid(string? value) =>
        value is null || value is Markdown or Html;

    /// <summary>
    /// Maps any input to one of the two legal values, coercing null and anything
    /// unrecognised to <see cref="Default"/>. A public read path calls this, so no
    /// third value can reach the wire even if a row somehow holds one.
    /// </summary>
    public static string OrDefault(string? value) =>
        value is Markdown or Html ? value : Default;
}
```

- [ ] **Step 4: Extend the seed helper**

In `backend/Tests/TestDb.cs`, replace `SeedBlog` with:

```csharp
    public Blog SeedBlog(string name, string slug, string? contentType = null)
    {
        var blog = Blog.Create(name, slug, $"{name} description", "i-heroicons-book-open", contentType);
        Db.Blogs.Add(blog);
        Db.SaveChanges();
        return blog;
    }
```

- [ ] **Step 5: Add the property to Blog**

In `backend/Domain/Blogs/Blog.cs`, add the property after `Icon`:

```csharp
    public string Icon { get; set; } = "i-heroicons-book-open";

    /// <summary>
    /// One of <see cref="BlogContentType"/>. Null means markdown, which is what
    /// every pre-existing blog already is.
    /// </summary>
    public string? ContentType { get; set; }
```

And change the factory signature to accept it. Replace the existing `Create`
method with:

```csharp
    public static Blog Create(
        string name,
        string slug,
        string description,
        string icon,
        string? contentType = null)
    {
        if (!BlogContentType.IsValid(contentType))
            throw new ArgumentException(
                $"'{contentType}' is not a valid content type.", nameof(contentType));

        return new Blog
        {
            Id = Guid.NewGuid(),
            Name = name,
            Slug = slug,
            Description = description,
            Icon = icon,
            ContentType = contentType
        };
    }
```

- [ ] **Step 6: Map it in EF**

In `backend/Infrastructure/Models/BlogEntity.cs`, add inside `Configure`, after
the `Icon` configuration:

```csharp
        builder.Property(b => b.ContentType)
            .IsRequired(false)
            .HasMaxLength(16);
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `cd backend && dotnet test --filter BlogContentTypeTests`
Expected: PASS — 14 cases (4 `Fact` + the 4-row invalid theory + the 6-row `OrDefault` theory).

- [ ] **Step 8: Run the full suite**

Run: `cd backend && dotnet test`
Expected: PASS — 51 total (35 pre-existing + 2 from Task 0 + 14 from Task 1).

- [ ] **Step 9: Commit**

```bash
git add backend/Domain/Blogs/BlogContentType.cs backend/Domain/Blogs/Blog.cs \
        backend/Infrastructure/Models/BlogEntity.cs backend/Tests/TestDb.cs \
        backend/Tests/BlogContentTypeTests.cs
git commit -m "feat: add nullable ContentType to Blog

Nullable so no existing blog changes behaviour and no backfill is needed.
Null means markdown, which is what every current blog already is. The
frontend hardcodes contentType 'markdown' for CMS blogs while
usePostRenderer builds MarkdownIt with no { html: true }, so imported
HTML articles would otherwise render with every tag escaped."
```

---

### Task 2: `publishedOn` and `canonicalUrl` on the post commands

Today `publishedOn` exists on `Post` and `PostResponse` but on **no command**, so
every post created through the API is stamped "now" and the original date cannot
be set. `canonicalUrl` does not exist at all.

**Files:**
- Modify: `backend/Domain/Posts/Post.cs`
- Modify: `backend/Application/Posts/CreatePostCommand.cs`
- Modify: `backend/Application/Posts/UpdatePostCommand.cs`
- Modify: `backend/Application/Posts/CreatePostCommandHandler.cs`
- Modify: `backend/Application/Posts/UpdatePostCommandHandler.cs`
- Modify: `backend/Infrastructure/Models/PostEntity.cs`
- Modify: `backend/Application/DTOs/PostResponse.cs`
- Test: `backend/Tests/PostCommandFieldsTests.cs`

- [ ] **Step 1: Write the failing test**

Create `backend/Tests/PostCommandFieldsTests.cs`:

```csharp
using Application.Posts;

namespace Tests;

public class PostCommandFieldsTests
{
    [Fact]
    public async Task Create_WithPublishedOn_StoresTheSuppliedDate()
    {
        using var db = new TestDb();
        var blog = db.SeedBlog("Archive", "archive", "html");
        var when = new DateTimeOffset(2023, 4, 1, 0, 0, 0, TimeSpan.Zero);

        var handler = new CreatePostCommandHandler(db.Db, db.FileReferenceService());
        var id = await handler.Handle(
            new CreatePostCommand(blog.Id, "A Post", "a-post", "Body", "Brief",
                                 "general", null, isPublished: true, publishedOn: when),
            CancellationToken.None);

        var post = db.Db.Posts.Single(p => p.Id == id);
        Assert.True(post.IsPublished);
        Assert.Equal(when, post.PublishedOn);
    }

    [Fact]
    public async Task Create_WithoutPublishedOn_DefaultsToNow()
    {
        using var db = new TestDb();
        var blog = db.SeedBlog("Archive", "archive", "html");
        var before = DateTimeOffset.UtcNow.AddSeconds(-2);

        var handler = new CreatePostCommandHandler(db.Db, db.FileReferenceService());
        var id = await handler.Handle(
            new CreatePostCommand(blog.Id, "A Post", "a-post", "Body", "Brief",
                                 "general", null, isPublished: true, publishedOn: null),
            CancellationToken.None);

        var post = db.Db.Posts.Single(p => p.Id == id);
        Assert.NotNull(post.PublishedOn);
        Assert.True(post.PublishedOn > before);
    }

    [Fact]
    public async Task Create_WithCanonicalUrl_StoresIt()
    {
        using var db = new TestDb();
        var blog = db.SeedBlog("Archive", "archive", "html");
        const string canonical = "https://hashnode.dev/@gift/post";

        var handler = new CreatePostCommandHandler(db.Db, db.FileReferenceService());
        var id = await handler.Handle(
            new CreatePostCommand(blog.Id, "A Post", "a-post", "Body", "Brief",
                                 "general", null, isPublished: true,
                                 publishedOn: null, canonicalUrl: canonical),
            CancellationToken.None);

        Assert.Equal(canonical, db.Db.Posts.Single(p => p.Id == id).CanonicalUrl);
    }

    [Fact]
    public async Task Update_WithPublishedOn_OverwritesThePublishDate()
    {
        using var db = new TestDb();
        var blog = db.SeedBlog("Archive", "archive", "html");
        var seeded = db.SeedPost(blog, "Old", "old", isPublished: true);
        var when = new DateTimeOffset(2020, 1, 15, 0, 0, 0, TimeSpan.Zero);

        var handler = new UpdatePostCommandHandler(db.Db, db.FileReferenceService());
        var ok = await handler.Handle(
            new UpdatePostCommand(blog.Id, seeded.Id, "Old", "old", "Body", "Brief",
                                 "general", null, isPublished: true,
                                 publishedOn: when, canonicalUrl: null),
            CancellationToken.None);

        Assert.True(ok);
        Assert.Equal(when, db.Db.Posts.Single(p => p.Id == seeded.Id).PublishedOn);
    }

    [Fact]
    public void CreatePostCommandValidator_RejectsCanonicalUrlThatIsNotHttp()
    {
        var command = new CreatePostCommand(Guid.NewGuid(), "T", "t", "Body", null,
                                            "general", null, true, null, "javascript:alert(1)");

        var failures = new CreatePostCommandValidator().Validate(command);

        Assert.Contains(failures, f => f.PropertyName == nameof(CreatePostCommand.CanonicalUrl));
    }
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && dotnet test --filter PostCommandFieldsTests`
Expected: **BUILD FAILURE** — no `PublishedOn` or `CanonicalUrl` on the commands,
and no `CanonicalUrl` on `Post`.

- [ ] **Step 3: Add `CanonicalUrl` to the domain**

In `backend/Domain/Posts/Post.cs`, add after `CoverImageUrl`:

```csharp
    /// <summary>
    /// The post's original location, when it was imported from somewhere else.
    /// Drives the SEO canonical link and the "view original" affordance.
    /// </summary>
    public string? CanonicalUrl { get; set; }
```

And extend the factory. Replace the existing `Create` method with:

```csharp
    public static Post Create(
        Guid blogId,
        string title,
        string slug,
        string content,
        string? description,
        string tag,
        string? coverImageUrl = null,
        string? canonicalUrl = null)
    {
        return new Post
        {
            Id = Guid.NewGuid(),
            BlogId = blogId,
            Title = title,
            Slug = slug,
            Content = content,
            Description = description,
            Tag = tag,
            CoverImageUrl = coverImageUrl,
            CanonicalUrl = canonicalUrl
        };
    }

    /// <summary>
    /// Overrides the publish date. <see cref="Publish"/> always stamps UtcNow, so
    /// importing an archive has to be able to correct it afterwards.
    /// </summary>
    public void SetPublishedOn(DateTimeOffset publishedOn) => PublishedOn = publishedOn;
```

- [ ] **Step 4: Extend both commands**

In `backend/Application/Posts/CreatePostCommand.cs`, replace the record
declaration with:

```csharp
public record CreatePostCommand(
    Guid BlogId,
    string Title,
    string Slug,
    string Content,
    string? Description,
    string Tag,
    string? CoverImageUrl,
    bool IsPublished,
    DateTimeOffset? PublishedOn = null,
    string? CanonicalUrl = null
) : ICommand<Guid>;
```

Add this rule to the existing `CreatePostCommandValidator` constructor, after the
`Tag` rule:

```csharp
        RuleFor(x => x.CanonicalUrl)
            .Must(BeAbsoluteHttpUrl)
            .When(x => !string.IsNullOrEmpty(x.CanonicalUrl))
            .WithMessage("CanonicalUrl must be an absolute http or https URL.");
```

Add this private helper inside the validator class:

```csharp
    private static bool BeAbsoluteHttpUrl(string? value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri)
        && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
```

In `backend/Application/Posts/UpdatePostCommand.cs`, replace the record
declaration with:

```csharp
public record UpdatePostCommand(
    Guid BlogId,
    Guid Id,
    string Title,
    string Slug,
    string Content,
    string? Description,
    string Tag,
    string? CoverImageUrl,
    bool IsPublished,
    DateTimeOffset? PublishedOn = null,
    string? CanonicalUrl = null
) : ICommand<bool>;
```

And add the identical `CanonicalUrl` rule plus the same private helper to
`UpdatePostCommandValidator`.

- [ ] **Step 5: Honour both fields in the create handler**

In `backend/Application/Posts/CreatePostCommandHandler.cs`, replace the
`Post.Create` call and the publish block with:

```csharp
        var post = Post.Create(
            request.BlogId,
            request.Title,
            request.Slug,
            request.Content,
            request.Description,
            request.Tag,
            request.CoverImageUrl,
            request.CanonicalUrl);

        if (request.IsPublished)
        {
            post.Publish();

            // Publish() stamps UtcNow; an explicit date is an archive import
            // correcting it, so it has to win.
            if (request.PublishedOn.HasValue)
                post.SetPublishedOn(request.PublishedOn.Value);
        }
```

- [ ] **Step 6: Honour both fields in the update handler**

In `backend/Application/Posts/UpdatePostCommandHandler.cs`, add
`post.CanonicalUrl = request.CanonicalUrl;` to the field assignment block, and
replace the publish block with:

```csharp
        if (request.IsPublished && !post.IsPublished)
        {
            post.Publish();

            if (request.PublishedOn.HasValue)
                post.SetPublishedOn(request.PublishedOn.Value);
        }
        else if (!request.IsPublished && post.IsPublished)
        {
            post.Unpublish();
        }
        else if (request.IsPublished && request.PublishedOn.HasValue)
        {
            // Already published, but the date is being corrected.
            post.SetPublishedOn(request.PublishedOn.Value);
        }
```

- [ ] **Step 7: Map it in EF and expose it on the response**

In `backend/Infrastructure/Models/PostEntity.cs`, add after the `CoverImageUrl`
configuration:

```csharp
        builder.Property(b => b.CanonicalUrl)
            .IsRequired(false)
            .HasMaxLength(2048);
```

In `backend/Application/DTOs/PostResponse.cs`, replace the record declaration
and factory with:

```csharp
public record PostResponse(
    Guid Id,
    Guid BlogId,
    string Title,
    string Slug,
    string Content,
    string? Description,
    string Tag,
    string? CoverImageUrl,
    DateTimeOffset? PublishedOn,
    string? CanonicalUrl,
    bool IsPublished,
    DateTimeOffset CreatedOn,
    DateTimeOffset UpdatedOn
)
{
    public static PostResponse FromDomain(Post post) =>
        new(post.Id, post.BlogId, post.Title, post.Slug, post.Content, post.Description,
            post.Tag, post.CoverImageUrl, post.PublishedOn, post.CanonicalUrl,
            post.IsPublished, post.CreatedOn, post.UpdatedOn);
}
```

- [ ] **Step 8: Run the tests**

Run: `cd backend && dotnet test`
Expected: PASS — 56 total (35 pre-existing + 21 added by Tasks 0-2).

- [ ] **Step 9: Commit**

```bash
git add backend/Domain/Posts/Post.cs backend/Application/Posts/ \
        backend/Infrastructure/Models/PostEntity.cs \
        backend/Application/DTOs/PostResponse.cs backend/Tests/PostCommandFieldsTests.cs
git commit -m "feat: accept publishedOn and canonicalUrl on the post commands

publishedOn existed on Post and PostResponse but on no command, so every
post created through the API was stamped now and an archive import
could not preserve original dates. Publish() always writes UtcNow, so
SetPublishedOn is the explicit correction path.

canonicalUrl is new and is validated as an absolute http(s) URL, so a
raw.githubusercontent.com fallback can never become an SEO canonical."
```

---

### Task 3: The EF migration

One additive migration covers Tasks 1 and 2.

**Files:**
- Create: `backend/Infrastructure/Infrastructure/Migrations/<timestamp>_AddPublicContentFields.cs`

- [ ] **Step 1: Install the EF CLI if it is missing**

Run: `dotnet ef --version`
If that reports the command is not found:

```bash
dotnet tool install --global dotnet-ef --version 9.*
```

Expect a version starting with 9, matching EF Core 9.0.11.

- [ ] **Step 2: Generate the migration**

Run from `backend/`:

```bash
dotnet ef migrations add AddPublicContentFields \
  --project Infrastructure \
  --startup-project Infrastructure \
  --output-dir Infrastructure/Migrations
```

`--output-dir Infrastructure/Migrations` is **required**. The existing
migrations live in `backend/Infrastructure/Infrastructure/Migrations/`, which is
not the default location, and omitting the flag creates a second migrations
folder that the runtime will never load.

- [ ] **Step 3: Verify the migration is additive only**

Run: `grep -nE 'name: "(DropColumn|DropTable|AlterColumn|RenameColumn)"' Infrastructure/Infrastructure/Migrations/*_AddPublicContentFields.cs`
Expected: **no output.** Every operation must be `AddColumn` and a `CreateIndex`
at most.

- [ ] **Step 4: Verify the columns it created**

Run: `grep -nE 'name: "(ContentType|CanonicalUrl)"' Infrastructure/Infrastructure/Migrations/*_AddPublicContentFields.cs`
Expected: exactly two matches, both `AddColumn`, both `nullable: true`.

- [ ] **Step 5: Confirm the schema applies cleanly**

Run: `cd backend && dotnet test --filter TestDbFixtureTests`
Expected: PASS. `TestDb` uses `EnsureCreated`, not `Migrate`, so this proves the
model is valid; apply the migration itself in Task 8.

- [ ] **Step 6: Commit**

```bash
git add backend/Infrastructure/Infrastructure/Migrations/
git commit -m "feat: add AddPublicContentFields migration

Additive only: nullable ContentType on Blogs, nullable CanonicalUrl on
Posts. No backfill, so existing rows are untouched and every existing
blog keeps behaving as markdown."
```

---

### Task 4: The public DTOs

The point of these is that they **cannot** return a draft or an internal field,
because the field is not in the record.

**Files:**
- Create: `backend/Application/DTOs/PublicBlogResponse.cs`
- Create: `backend/Application/DTOs/PublicPostResponse.cs`
- Test: `backend/Tests/PublicDtoTests.cs`

- [ ] **Step 1: Write the failing test**

Create `backend/Tests/PublicDtoTests.cs`:

```csharp
using Application.DTOs;
using Domain.Blogs;

namespace Tests;

public class PublicDtoTests
{
    [Fact]
    public void PublicBlogResponse_ResolvesNullContentTypeToMarkdown()
    {
        var blog = Blog.Create("Test", "test", "desc", "i-heroicons-book-open");

        Assert.Equal("markdown", PublicBlogResponse.FromDomain(blog).ContentType);
    }

    [Fact]
    public void PublicBlogResponse_PreservesHtml()
    {
        var blog = Blog.Create("Archive", "archive", "desc", "i-heroicons-book-open", "html");

        Assert.Equal("html", PublicBlogResponse.FromDomain(blog).ContentType);
    }

    [Fact]
    public void PublicPostResponse_ExposesNoInternalFields()
    {
        var exposed = typeof(PublicPostResponse)
            .GetProperties()
            .Select(p => p.Name)
            .ToHashSet();

        Assert.DoesNotContain("IsPublished", exposed);
        Assert.DoesNotContain("CreatedOn", exposed);
        Assert.DoesNotContain("UpdatedOn", exposed);
    }

    [Fact]
    public void PublicBlogResponse_ExposesNoInternalFields()
    {
        var exposed = typeof(PublicBlogResponse)
            .GetProperties()
            .Select(p => p.Name)
            .ToHashSet();

        Assert.DoesNotContain("CreatedOn", exposed);
        Assert.DoesNotContain("UpdatedOn", exposed);
    }
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && dotnet test --filter PublicDtoTests`
Expected: **BUILD FAILURE** — `'PublicBlogResponse' does not exist`.

- [ ] **Step 3: Create `PublicBlogResponse`**

Create `backend/Application/DTOs/PublicBlogResponse.cs`:

```csharp
using Domain.Blogs;

namespace Application.DTOs;

/// <summary>
/// The anonymous projection of a blog. Deliberately omits CreatedOn and
/// UpdatedOn: a field that is not on the record cannot be serialised, which is
/// the only durable way to keep internal bookkeeping off a public endpoint.
/// </summary>
public record PublicBlogResponse(
    Guid Id,
    string Name,
    string Slug,
    string Description,
    string Icon,
    string ContentType
)
{
    public static PublicBlogResponse FromDomain(Blog blog) =>
        new(blog.Id,
            blog.Name,
            blog.Slug,
            blog.Description,
            blog.Icon,
            BlogContentType.OrDefault(blog.ContentType));
}
```

- [ ] **Step 4: Create `PublicPostResponse`**

Create `backend/Application/DTOs/PublicPostResponse.cs`:

```csharp
using Domain.Posts;

namespace Application.DTOs;

/// <summary>
/// The anonymous projection of a post. Only ever produced by a query that
/// filters IsPublished, so reaching a draft requires a code change rather than a
/// missed parameter.
/// </summary>
public record PublicPostResponse(
    Guid Id,
    Guid BlogId,
    string Title,
    string Slug,
    string Content,
    string? Description,
    string Tag,
    string? CoverImageUrl,
    DateTimeOffset? PublishedOn,
    string? CanonicalUrl
)
{
    public static PublicPostResponse FromDomain(Post post) =>
        new(post.Id,
            post.BlogId,
            post.Title,
            post.Slug,
            post.Content,
            post.Description,
            post.Tag,
            post.CoverImageUrl,
            post.PublishedOn,
            post.CanonicalUrl);
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `cd backend && dotnet test --filter PublicDtoTests`
Expected: PASS — 4 tests.

- [ ] **Step 6: Commit**

```bash
git add backend/Application/DTOs/PublicBlogResponse.cs \
        backend/Application/DTOs/PublicPostResponse.cs backend/Tests/PublicDtoTests.cs
git commit -m "feat: add PublicBlogResponse and PublicPostResponse

Separate records rather than reusing PostResponse so a future field added
to the internal DTO cannot silently appear on a public endpoint. The tests
assert the omission so a later edit that re-adds one fails the build."
```

---

### Task 5: Public queries with `IsPublished` in the `Where` clause

`GetPostsByBlogQuery` already accepts `isPublished?` as a filter parameter. If
the public endpoints reuse it, draft-safety depends on a handler remembering to
pass `true`. These queries are separate so the filter is not optional.

**Files:**
- Create: `backend/Application/Blogs/GetPublicBlogsQuery.cs`
- Create: `backend/Application/Posts/GetPublicPostsByBlogQuery.cs`
- Create: `backend/Application/Posts/GetPublicPostBySlugQuery.cs`
- Test: `backend/Tests/PublicQueryTests.cs`

- [ ] **Step 1: Write the failing test**

Create `backend/Tests/PublicQueryTests.cs`:

```csharp
using Application.Blogs;
using Application.Posts;

namespace Tests;

public class PublicQueryTests
{
    [Fact]
    public async Task GetPublicPostsByBlog_ExcludesDrafts()
    {
        using var db = new TestDb();
        var blog = db.SeedBlog("Archive", "archive", "html");
        db.SeedPost(blog, "Live", "live", isPublished: true);
        db.SeedPost(blog, "Draft", "draft", isPublished: false);

        var result = await new GetPublicPostsByBlogQueryHandler(db.Db)
            .Handle(new GetPublicPostsByBlogQuery(blog.Id), CancellationToken.None);

        var only = Assert.Single(result);
        Assert.Equal("live", only.Slug);
    }

    [Fact]
    public async Task GetPublicPostBySlug_ReturnsNullForADraft()
    {
        using var db = new TestDb();
        var blog = db.SeedBlog("Archive", "archive", "html");
        db.SeedPost(blog, "Draft", "draft", isPublished: false);

        var result = await new GetPublicPostBySlugQueryHandler(db.Db)
            .Handle(new GetPublicPostBySlugQuery("draft"), CancellationToken.None);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetPublicPostBySlug_ReturnsAPublishedPost()
    {
        using var db = new TestDb();
        var blog = db.SeedBlog("Archive", "archive", "html");
        db.SeedPost(blog, "Live", "live", isPublished: true);

        var result = await new GetPublicPostBySlugQueryHandler(db.Db)
            .Handle(new GetPublicPostBySlugQuery("live"), CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal("Live", result.Title);
    }

    [Fact]
    public async Task GetPublicPostsByBlog_OrdersNewestFirst()
    {
        using var db = new TestDb();
        var blog = db.SeedBlog("Archive", "archive", "html");
        db.SeedPost(blog, "Older", "older", publishedOn: new DateTimeOffset(2020, 1, 1, 0, 0, 0, TimeSpan.Zero));
        db.SeedPost(blog, "Newer", "newer", publishedOn: new DateTimeOffset(2024, 1, 1, 0, 0, 0, TimeSpan.Zero));

        var result = await new GetPublicPostsByBlogQueryHandler(db.Db)
            .Handle(new GetPublicPostsByBlogQuery(blog.Id), CancellationToken.None);

        Assert.Equal(["newer", "older"], result.Select(p => p.Slug).ToArray());
    }

    [Fact]
    public async Task GetPublicBlogs_FiltersBySlug()
    {
        using var db = new TestDb();
        db.SeedBlog("Game Dev Projects", "game-dev");
        db.SeedBlog("Graphics Projects", "graphics");

        var result = await new GetPublicBlogsQueryHandler(db.Db)
            .Handle(new GetPublicBlogsQuery(["graphics"]), CancellationToken.None);

        var only = Assert.Single(result);
        Assert.Equal("graphics", only.Slug);
    }
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && dotnet test --filter PublicQueryTests`
Expected: **BUILD FAILURE** — the query and handler types do not exist.

- [ ] **Step 3: Create the blogs query**

Create `backend/Application/Blogs/GetPublicBlogsQuery.cs`:

```csharp
using Application.Abstractions;
using Application.DTOs;
using Infrastructure.Models;
using Microsoft.EntityFrameworkCore;

namespace Application.Blogs;

public record GetPublicBlogsQuery(string[]? Slugs = null) : IQuery<List<PublicBlogResponse>>;

public class GetPublicBlogsQueryHandler(CmsDbContext db) : IQueryHandler<GetPublicBlogsQuery, List<PublicBlogResponse>>
{
    public async Task<List<PublicBlogResponse>> Handle(
        GetPublicBlogsQuery request,
        CancellationToken cancellationToken)
    {
        var query = db.Blogs.AsQueryable();

        if (request.Slugs is { Length: > 0 })
            query = query.Where(b => request.Slugs.Contains(b.Slug));

        var blogs = await query
            .OrderBy(b => b.Name)
            .ToListAsync(cancellationToken);

        return blogs.Select(PublicBlogResponse.FromDomain).ToList();
    }
}
```

- [ ] **Step 4: Create the posts-by-blog query**

Create `backend/Application/Posts/GetPublicPostsByBlogQuery.cs`:

```csharp
using Application.Abstractions;
using Application.DTOs;
using Infrastructure.Models;
using Microsoft.EntityFrameworkCore;

namespace Application.Posts;

public record GetPublicPostsByBlogQuery(Guid BlogId) : IQuery<List<PublicPostResponse>>;

public class GetPublicPostsByBlogQueryHandler(CmsDbContext db)
    : IQueryHandler<GetPublicPostsByBlogQuery, List<PublicPostResponse>>
{
    public async Task<List<PublicPostResponse>> Handle(
        GetPublicPostsByBlogQuery request,
        CancellationToken cancellationToken)
    {
        // IsPublished is a constant in the Where clause, not a parameter. A
        // caller cannot opt out of it.
        var posts = await db.Posts
            .Where(p => p.BlogId == request.BlogId && p.IsPublished)
            .OrderByDescending(p => p.PublishedOn)
            .ToListAsync(cancellationToken);

        return posts.Select(PublicPostResponse.FromDomain).ToList();
    }
}
```

- [ ] **Step 5: Create the post-by-slug query**

Create `backend/Application/Posts/GetPublicPostBySlugQuery.cs`:

```csharp
using Application.Abstractions;
using Application.DTOs;
using Infrastructure.Models;
using Microsoft.EntityFrameworkCore;

namespace Application.Posts;

public record GetPublicPostBySlugQuery(string Slug) : IQuery<PublicPostResponse?>;

public class GetPublicPostBySlugQueryHandler(CmsDbContext db)
    : IQueryHandler<GetPublicPostBySlugQuery, PublicPostResponse?>
{
    public async Task<PublicPostResponse?> Handle(
        GetPublicPostBySlugQuery request,
        CancellationToken cancellationToken)
    {
        var post = await db.Posts
            .Where(p => p.Slug == request.Slug && p.IsPublished)
            .FirstOrDefaultAsync(cancellationToken);

        return post is null ? null : PublicPostResponse.FromDomain(post);
    }
}
```

- [ ] **Step 6: Run to verify it passes**

Run: `cd backend && dotnet test --filter PublicQueryTests`
Expected: PASS — 65 total, including the two draft-exclusion assertions.

- [ ] **Step 7: Commit**

```bash
git add backend/Application/Blogs/GetPublicBlogsQuery.cs \
        backend/Application/Posts/GetPublicPostsByBlogQuery.cs \
        backend/Application/Posts/GetPublicPostBySlugQuery.cs \
        backend/Tests/PublicQueryTests.cs
git commit -m "feat: add published-only public queries

Separate from GetPostsByBlogQuery, which takes isPublished as an optional
filter parameter. Reusing it would make draft-safety depend on a handler
remembering to pass true. Here IsPublished is a constant in the Where
clause, so leaking a draft takes a code change."
```

---

### Task 6: The anonymous endpoints

**Files:**
- Create: `backend/Api/Endpoints/Public/PublicEndpoints.cs`
- Modify: `backend/Api/Tags.cs`
- Modify: `backend/Api/DependancyInjection.cs`

- [ ] **Step 1: Add the endpoint tag**

In `backend/Api/Tags.cs`, add one line to the `EndpointTags` class:

```csharp
    public const string Public = "Public";
```

- [ ] **Step 2: Create the endpoints**

Create `backend/Api/Endpoints/Public/PublicEndpoints.cs`:

```csharp
using Application.Blogs;
using Application.DTOs;
using Application.Posts;
using MediatR;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Api.Endpoints.Public;

public static class PublicEndpoints
{
    /// <summary>
    /// Anonymous read surface for published content. Every endpoint here returns
    /// a Public* DTO, which structurally cannot carry IsPublished, CreatedOn or
    /// UpdatedOn, and every underlying query filters IsPublished in its Where
    /// clause.
    /// </summary>
    public static WebApplication MapPublicEndpoints(this WebApplication app)
    {
        app.MapGet("/public/blogs", async (IMediator mediator, [FromQuery] string[]? slugs = null) =>
        {
            var blogs = await mediator.Send(new GetPublicBlogsQuery(slugs));
            return Results.Ok(blogs);
        })
        .WithName("GetPublicBlogs")
        .WithDisplayName("GetPublicBlogs")
        .Produces<List<PublicBlogResponse>>(StatusCodes.Status200OK)
        .WithTags(EndpointTags.Public)
        .AllowAnonymous();

        app.MapGet("/public/blogs/{id:guid}/posts", async (Guid id, IMediator mediator) =>
        {
            var posts = await mediator.Send(new GetPublicPostsByBlogQuery(id));
            return Results.Ok(posts);
        })
        .WithName("GetPublicPostsByBlog")
        .WithDisplayName("GetPublicPostsByBlog")
        .Produces<List<PublicPostResponse>>(StatusCodes.Status200OK)
        .WithTags(EndpointTags.Public)
        .AllowAnonymous();

        app.MapGet("/public/posts/slug/{slug}", async (string slug, IMediator mediator) =>
        {
            var post = await mediator.Send(new GetPublicPostBySlugQuery(slug));
            return post is not null ? Results.Ok(post) : Results.NotFound();
        })
        .WithName("GetPublicPostBySlug")
        .WithDisplayName("GetPublicPostBySlug")
        .Produces<PublicPostResponse>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status404NotFound)
        .WithTags(EndpointTags.Public)
        .AllowAnonymous();

        return app;
    }
}
```

- [ ] **Step 3: Register the endpoint group**

In `backend/Api/DependancyInjection.cs`, add the using at the top with the
others:

```csharp
using Api.Endpoints.Public;
```

Then add `.MapPublicEndpoints()` to the chain in `MapApi`, so it reads:

```csharp
        app
            .MapBlogsEndpoints()
            .MapPostsEndpoints()
            .MapTagsEndpoints()
            .MapFileEndpoints()
            .MapSummarizeEndpoints()
            .MapPublicEndpoints();
```

- [ ] **Step 4: Build to verify it compiles**

Run: `cd backend && dotnet build`
Expected: BUILD SUCCEEDED, 0 warnings.

- [ ] **Step 5: Run the full test suite**

Run: `cd backend && dotnet test`
Expected: PASS, 65 total.

- [ ] **Step 6: Commit**

```bash
git add backend/Api/Endpoints/Public/PublicEndpoints.cs backend/Api/Tags.cs \
        backend/Api/DependancyInjection.cs
git commit -m "feat: add anonymous /public read endpoints

AllowAnonymous, unlike all 18 existing endpoints which carry
RequireAuthorization. The public site needs to read published content
without an Auth0 client secret in the browser."
```

---

### Task 7: CORS from configuration, with a Production guard

Today the policy is `WithOrigins("*")`. That is acceptable while every endpoint
is authenticated and unacceptable once anonymous reads exist. The allowlist moves
to configuration, the `localhost:5173` entry is isolated to the Development
environment, and Production refuses to boot on a bad value.

**Files:**
- Create: `backend/Api/CorsOriginPolicy.cs`
- Modify: `backend/Api/DependancyInjection.cs`
- Modify: `backend/Host/appsettings.json`
- Modify: `backend/Host/appsettings.Development.json`
- Test: `backend/Tests/CorsOriginPolicyTests.cs`

- [ ] **Step 1: Write the failing test**

Create `backend/Tests/CorsOriginPolicyTests.cs`:

```csharp
using Api;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace Tests;

public class CorsOriginPolicyTests
{
    private static IConfiguration Config(params string[] origins) =>
        new ConfigurationBuilder()
            .AddInMemoryCollection(
                origins.Select((o, i) => new KeyValuePair<string, string?>(
                    $"Cors:AllowedOrigins[{i}]", o)))
            .Build();

    private sealed record FakeEnvironment(string EnvironmentName) : IHostEnvironment
    {
        public string ApplicationName { get; set; } = "cms";
        public string ContentRootPath { get; set; } = ".";
        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } =
            new Microsoft.Extensions.FileProviders.NullFileProvider();
    }

    [Fact]
    public void Production_WithNoOrigins_Throws()
    {
        var ex = Assert.Throws<InvalidOperationException>(
            () => CorsOriginPolicy.Resolve(Config(), new FakeEnvironment("Production")));

        Assert.Contains("Production", ex.Message);
    }

    [Fact]
    public void Production_WithWildcard_Throws()
    {
        Assert.Throws<InvalidOperationException>(
            () => CorsOriginPolicy.Resolve(
                Config("https://giftmugweni.com", "*"),
                new FakeEnvironment("Production")));
    }

    [Fact]
    public void Production_WithAValidOrigin_ReturnsIt()
    {
        var origins = CorsOriginPolicy.Resolve(
            Config("https://giftmugweni.com", "https://stelele.github.io"),
            new FakeEnvironment("Production"));

        Assert.Equal(["https://giftmugweni.com", "https://stelele.github.io"], origins);
    }

    [Fact]
    public void Development_WithNoOrigins_IsAllowed()
    {
        var origins = CorsOriginPolicy.Resolve(Config(), new FakeEnvironment("Development"));

        Assert.Empty(origins);
    }

    [Fact]
    public void AnyEnvironment_WithABlankEntry_Throws()
    {
        Assert.Throws<InvalidOperationException>(
            () => CorsOriginPolicy.Resolve(Config("   "), new FakeEnvironment("Development")));
    }
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && dotnet test --filter CorsOriginPolicyTests`
Expected: **BUILD FAILURE** — `'CorsOriginPolicy' does not exist`.

- [ ] **Step 3: Create the policy resolver**

Create `backend/Api/CorsOriginPolicy.cs`:

```csharp
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace Api;

/// <summary>
/// Resolves the CORS allowlist from configuration and refuses to let a bad
/// Production value through. There is deliberately no wildcard fallback: a
/// misconfigured deploy must fail at boot, not serve every origin.
/// </summary>
public static class CorsOriginPolicy
{
    public const string SectionName = "Cors";
    public const string OriginsKey = "AllowedOrigins";
    public const string PolicyName = "AllowFrontend";

    public static string[] Resolve(IConfiguration configuration, IHostEnvironment environment)
    {
        var origins = configuration
            .GetSection($"{SectionName}:{OriginsKey}")
            .Get<string[]>() ?? [];

        if (origins.Any(string.IsNullOrWhiteSpace))
            throw new InvalidOperationException(
                $"{SectionName}:{OriginsKey} contains a blank entry.");

        if (!environment.IsProduction())
            return origins;

        if (origins.Length == 0)
            throw new InvalidOperationException(
                $"{SectionName}:{OriginsKey} is empty in Production. Set it with container "
                + "environment variables, for example Cors__AllowedOrigins__0=https://giftmugweni.com.");

        if (origins.Any(o => o.Contains('*')))
            throw new InvalidOperationException(
                $"{SectionName}:{OriginsKey} contains a wildcard origin, which is not permitted in Production.");

        return origins;
    }
}
```

- [ ] **Step 4: Write the configuration**

In `backend/Host/appsettings.json`, add a top-level `"Cors"` key as a sibling of
`"Logging"`, `"AllowedHosts"`, `"ConnectionStrings"`, `"Auth0"`, `"Groq"`,
`"MediatR"`, `"R2"` and `"FileCleanup"`:

```json
  "Cors": {
    "AllowedOrigins": []
  },
```

An empty array is the safe base: nothing is allowed until an environment supplies
the list. Production supplies it as container environment variables:

```
Cors__AllowedOrigins__0=https://giftmugweni.com
Cors__AllowedOrigins__1=https://stelele.github.io
```

In `backend/Host/appsettings.Development.json`, add a sibling `"Cors"` key:

```json
  "Cors": {
    "AllowedOrigins": [ "http://localhost:5173" ]
  },
```

ASP.NET loads `appsettings.Development.json` only when that environment is
active, and arrays are **replaced** rather than merged, so the dev entry cannot
leak into Production.

- [ ] **Step 5: Wire the policy into DI**

In `backend/Api/DependancyInjection.cs`, delete the entire existing
`builder.Services.AddCors(options => { ... })` block, and replace it with:

```csharp
        var allowedOrigins = CorsOriginPolicy.Resolve(
            builder.Configuration, builder.Environment);

        builder.Services.AddCors(options =>
        {
            options.AddPolicy(CorsOriginPolicy.PolicyName, policy =>
            {
                if (allowedOrigins.Length > 0)
                    policy.WithOrigins(allowedOrigins);

                policy
                    .AllowAnyHeader()
                    .AllowAnyMethod();
            });
        });
```

Also replace the middleware call at the top of `MapApi`, so it uses the constant:

```csharp
        app.UseCors(CorsOriginPolicy.PolicyName);
```

- [ ] **Step 6: Run to verify it passes**

Run: `cd backend && dotnet test --filter CorsOriginPolicyTests`
Expected: PASS — 5 tests.

- [ ] **Step 7: Run everything**

Run: `cd backend && dotnet test`
Expected: PASS, 70 total.

- [ ] **Step 8: Commit**

```bash
git add backend/Api/CorsOriginPolicy.cs backend/Api/DependancyInjection.cs \
        backend/Host/appsettings.json backend/Host/appsettings.Development.json \
        backend/Tests/CorsOriginPolicyTests.cs
git commit -m "feat: move CORS allowlist to configuration with a Production guard

Was WithOrigins(\"*\"), which was survivable while every endpoint required
auth and is not survivable now that public reads exist. Production throws
at startup if Cors:AllowedOrigins is empty or contains a wildcard, so a
misconfigured deploy fails at boot instead of serving every origin. The
localhost:5173 entry lives only in appsettings.Development.json, and
ASP.NET replaces rather than merges arrays, so it cannot leak upward."
```

---

### Task 8: Verify the migration against a real database and the surface end to end

Tasks 1–7 are unit-level. This task proves the migration applies to a database
that already has data, and that the endpoints answer over HTTP.

**Files:** none — verification only

- [ ] **Step 1: Back up the local database**

Run: `cd backend/Host && cp cms.db "cms.db.bak.$(date +%Y%m%d%H%M%S)"`
Expected: a timestamped copy. If `cms.db` does not exist, skip to Step 3.

- [ ] **Step 2: Apply the migration locally**

Run: `cd backend && dotnet ef database update --project Infrastructure --startup-project Infrastructure`
Expected:
```
Applying migration '20260927..._AddPublicContentFields'.
Done.
```

- [ ] **Step 3: Confirm existing rows survived**

Run:
```bash
cd backend/Host
sqlite3 cms.db "SELECT COUNT(*) AS blogs FROM Blogs;"
sqlite3 cms.db "SELECT COUNT(*) AS posts FROM Posts;"
sqlite3 cms.db "PRAGMA table_info(Blogs);" | grep -i contenttype
sqlite3 cms.db "PRAGMA table_info(Posts);" | grep -i canonicalurl
```
Expected: non-zero blog and post counts, unchanged from before, plus one row per
new column. Every existing `ContentType` should be `NULL`, which resolves to
markdown.

- [ ] **Step 4: Start the CMS**

Run: `cd backend && dotnet run --project Host/Host.csproj`
Expected: listening on `https://localhost:56512`. In a separate shell:

- [ ] **Step 5: The public endpoint answers without a token**

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://localhost:56512/public/blogs -k
```
Expected: `200`.

If it returns `401`, the `.AllowAnonymous()` is missing — re-check Task 6 Step 2.

- [ ] **Step 6: Drafts are not returned**

```bash
# note a draft post id from the local database first
sqlite3 backend/Host/cms.db "SELECT id FROM Posts WHERE IsPublished = 0 LIMIT 1;"
```
Then confirm no returned slug matches it:

```bash
curl -s -k https://localhost:56512/public/blogs | python3 -c \
  "import json,sys; print([b['slug'] for b in json.load(sys.stdin)])"
```

- [ ] **Step 7: The OpenAPI document lists the new endpoints**

```bash
curl -s -k https://localhost:56512/openapi/v1.json | python3 -c \
  "import json,sys; d=json.load(sys.stdin); [print(p) for p in sorted(d['paths']) if p.startswith('/public')]"
```
Expected:
```
/public/blogs
/public/blogs/{id}/posts
/public/posts/slug/{slug}
```

- [ ] **Step 8: Confirm CORS refuses an unlisted origin in Development**

```bash
curl -s -o /dev/null -D - -k -H "Origin: https://evil.example" \
  https://localhost:56512/public/blogs | grep -i 'access-control-allow-origin' || echo "no CORS header — correct"
```
Expected: `no CORS header — correct`.

Then confirm the allowed one still gets a header:

```bash
curl -s -o /dev/null -D - -k -H "Origin: http://localhost:5173" \
  https://localhost:56512/public/blogs | grep -i 'access-control-allow-origin'
```
Expected: `Access-Control-Allow-Origin: http://localhost:5173`.

- [ ] **Step 9: Stop the server and restore if needed**

`Ctrl+C` the running CMS. If Step 1 created a backup and you want the original
data back:

```bash
cd backend/Host && cp cms.db.bak.<timestamp> cms.db
```

- [ ] **Step 10: Run the full gate**

```bash
cd backend && dotnet build --configuration Release && dotnet test --configuration Release --no-build
```
Expected: BUILD SUCCEEDED, 26 tests PASS. This is the same command CI runs.

- [ ] **Step 11: Commit only if something needed fixing during verification**

There is nothing to commit if all checks passed. The migration was already
committed in Task 3. If verification surfaced a fix:

```bash
git add -A
git commit -m "fix: correct public read surface found during end-to-end verification"
```

---

## Follow-ups, deliberately not in this plan

| Item | Why not here |
|---|---|
| Delete the Go backend | Migration spec, separate execution window |
| `Project : Post`, `Blog.Kind`, the admin UI form | Projects spec |
| Regenerate `personal-site/frontend/src/services/cms/schema.ts` | Belongs to the consumer repo, once the frontend is cut over. Run `npx openapi-typescript <cms>/openapi/v1.json -o src/services/cms/schema.ts` from `personal-site/frontend` |
| Narrow the `Url` on a `Post` to reject non-HTTP | Validators already reject a non-absolute `CanonicalUrl`; the stored `Url` is R2-generated, so no new rule is warranted |
| Add `IsPublished` to `Blog` | Only worth it if a private blog is ever needed. See Scope |

---

## Self-review

**Spec coverage** — every section of migration spec §5 has a task:

| Spec section | Task |
|---|---|
| §5.0 `contentType` on `Blog` (the blocker) | 1, 3 |
| §5.1 `publishedOn` on the post commands | 2, 3 |
| §5.2 `canonicalUrl` | 2, 3 |
| §5.3 three anonymous endpoints | 4, 5, 6 |
| §5.4 dedicated query, `IsPublished` in `Where` | 5 |
| §5.5 `PublicPostResponse` / `PublicBlogResponse` | 4 |
| CORS config + Production guard | 7 |
| Verification | 8 |

**Test count** — the suite starts at **35 pre-existing tests** (verified in the
worktree on 2026-09-27: `Passed! - Failed: 0, Passed: 35`). This plan adds
Task 0 (2) + Task 1 (14) + Task 2 (5) + Task 4 (4) + Task 5 (5) + Task 7 (5) =
**35 new**, for **70 total**. Tasks 3, 6 and 8 add no unit tests: the migration is
verified end to end, and the endpoint registration is a compile-time concern.

Running totals asserted in the plan: 37 after Task 0, 51 after Task 1, 56 after
Task 2, 60 after Task 4, 65 after Task 5, 70 after Task 7.

**Type consistency** — `BlogContentType` is used by `Blog.Create`, `PublicBlogResponse`, and the `BlogEntity` config; `SetPublishedOn` is defined in `Post` and called by both handlers; `CorsOriginPolicy.PolicyName` is used by both the `AddCors` registration and the `UseCors` call.

**Correction made after a code-quality review.** The plan originally wrote
`new CreatePostCommandHandler(db.Db, Mock.Of<FileReferenceService>())`. That throws at
runtime: `FileReferenceService` has a primary constructor `(CmsDbContext, IR2StorageService)`
and `ReconcilePostFilesAsync` is not `virtual`, so Moq cannot build it. All four sites now use
`db.FileReferenceService()`, the real instance over a mocked `IR2StorageService` added to
`TestDb` in Task 0. Its body only queries the database and reads `r2.PublicBucketUrl`, so no
network call occurs in tests.

**What the Task 0 tests do and do not prove.** Clearing the change tracker genuinely fixes a
real vacuity — `Single()` had been returning the instance just saved, so nothing reached
SQLite. But the suggested proof that "removing the `DateTimeOffsetToBinaryConverter` breaks the
test" **does not hold**: it was tried and the test still passes. EF Core's SQLite provider
stores `DateTimeOffset` as TEXT that preserves the instant, and `DateTimeOffset` equality
compares instants rather than offsets, so converter loss is invisible to that assertion. The
converter exists to make in-SQL *ordering and comparison* of `DateTimeOffset` work; that is
exercised by the `OrderByDescending(p => p.PublishedOn)` in Task 5, not by a round-trip
equality check. Do not treat Task 0 as covering converter behaviour.
