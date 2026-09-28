# Project Domain — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a typed `Project` content type to the CMS so the 53 project articles have one source of truth, with a hard write boundary between projects and ordinary posts.

**Architecture:** `Project : Post` in the domain, mapped by EF Core as Table-Per-Hierarchy so one `Posts` table gains a discriminator and five columns. Category is expressed by which blog a project lives in; `Blog.Kind` marks those blogs and decides which endpoint family may write into them. `status` is computed server-side from `LastPushedAt`, never stored. Two read projections: a summary without `Content` for listings, and a full article.

**Tech Stack:** .NET 10, EF Core 9.0.11 (SQLite), MediatR 14, FluentValidation 12, xunit 2.9.3, Moq 4.20.72

**Spec:** `2026-09-27-projects-section-design.md` §5, §6

**Repo:** `~/Documents/code-projects/cms-system`. Branch off `main` in a worktree — do not work on `main`.

**Depends on:** the merged anonymous-read work (`contentType`, `publishedOn`, `canonicalUrl`, `/public/*`, CORS guard). If `main` lacks `/public/blogs`, stop and report.

---

## Scope

| In | Out |
|---|---|
| `Project : Post`, `ProjectCategory`, `ProjectLink`, `ProjectBlogs` registry | The admin UI project form (separate plan) |
| `Blog.Kind` and the complementary write boundary | The public site pages (separate plan) |
| `ProjectStatusRules` + the two read DTOs | Writing the 53 articles (separate plan) |
| Project CRUD + public project reads | Any change to how existing posts behave |
| One additive TPH migration | |

**Non-goal, stated so nobody widens scope:** ordinary posts must behave exactly as before. Every task includes a regression assertion for that.

---

## Decisions locked here

| Decision | Choice | Why |
|---|---|---|
| Permissions for project endpoints | **Reuse `Permissions.ReadPosts` / `WritePosts`** | A new scope means an Auth0 API configuration change. Miss that and the endpoints 403 at runtime, which is a confusing failure. Deferring the new scope costs nothing today |
| `Post.Tag` for a project | Stores the **category slug**, written by the handler | The column is `NOT NULL` and `Post.Tag` is non-nullable. A separate `CreateProjectCommand` has no `Tag` input, so nothing can contradict it. The frontend reads `Category`, not `Tag`, for projects |
| `Project.Category` is denormalised | Kept, with a validator that it matches the blog | Makes `ProjectResponse` a flat read DTO with no per-row join, and turns "category matches blog" into an enforceable invariant |
| `status` | Computed in `ProjectResponse`, never stored | Changing the window reclassifies everything with no data migration. Storing it would be a field that goes stale |
| `Content` on the summary DTO | Omitted | 53 articles in one payload is ~150KB for a card grid |

---

## File Structure

```
CREATE  backend/Domain/Posts/ProjectCategory.cs          enum + slug mapping
CREATE  backend/Domain/Posts/ProjectLink.cs
CREATE  backend/Domain/Posts/Project.cs                  Project : Post
CREATE  backend/Domain/Posts/ProjectBlogs.cs             the 3-entry registry
CREATE  backend/Domain/Blogs/BlogKind.cs                 Standard | Project
CREATE  backend/Application/Projects/ProjectStatusRules.cs
CREATE  backend/Application/DTOs/ProjectSummaryResponse.cs
CREATE  backend/Application/DTOs/ProjectResponse.cs
CREATE  backend/Application/Projects/{Create,Update,Delete}ProjectCommand*.cs
CREATE  backend/Application/Projects/GetProjectsQuery*.cs
CREATE  backend/Application/Projects/GetProjectBySlugQuery*.cs
CREATE  backend/Api/Endpoints/Projects/ProjectEndpoints.cs
CREATE  backend/Infrastructure/Models/ProjectEntity.cs   IEntityTypeConfiguration<Project>
CREATE  backend/Tests/ProjectTests.cs

MODIFY  backend/Domain/Blogs/Blog.cs                     + Kind
MODIFY  backend/Application/Blogs/CreateBlogCommand.cs   + Kind
MODIFY  backend/Application/Blogs/UpdateBlogCommand.cs   + Kind
MODIFY  backend/Application/DTOs/BlogResponse.cs         + Kind
MODIFY  backend/Api/Endpoints/Blogs/BlogEndpoints.cs     Kind on POST/PUT
MODIFY  backend/Api/DependancyInjection.cs               register projects endpoints
MODIFY  backend/Application/Posts/{Create,Update}PostCommandHandler.cs   the boundary
CREATE  backend/Tests/TestDb.cs                          helpers for projects
```

---

### Task 0: Fixture support and a baseline assertion

Every later task needs to seed a project blog and a project. Add that to the
shared fixture first, and pin the existing behaviour so the "ordinary posts are
unaffected" claim is testable rather than asserted.

**Files:**
- Modify: `backend/Tests/TestDb.cs`
- Create: `backend/Tests/ProjectTests.cs`

- [ ] **Step 1: Write the baseline regression test**

Create `backend/Tests/ProjectTests.cs`:

```csharp
using Domain.Blogs;
using Domain.Posts;

namespace Tests;

/// <summary>
/// Guards the promise that this feature changes nothing about ordinary posts.
/// </summary>
public class ProjectTests
{
    [Fact]
    public void Blog_WithoutAnExplicitKind_IsStandard()
    {
        var blog = Blog.Create("Test", "test", "desc", "i-heroicons-book-open");

        Assert.Equal(BlogKind.Standard, blog.Kind);
    }

    [Fact]
    public void Post_StillRoundTripsThroughTheDatabase()
    {
        using var db = new TestDb();
        var blog = db.SeedBlog("Plain", "plain");
        var post = db.SeedPost(blog, "Still Works", "still-works");

        db.Db.ChangeTracker.Clear();

        var loaded = db.Db.Posts.Single(p => p.Id == post.Id);
        Assert.Equal("Still Works", loaded.Title);
        Assert.IsNotType<Project>(loaded);
    }
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && dotnet test --filter ProjectTests`
Expected: **BUILD FAILURE** — `BlogKind` and `Project` do not exist.

- [ ] **Step 3: Add the fixture helpers**

In `backend/Tests/TestDb.cs`, add these methods. Do not change the existing ones.

```csharp
    public Blog SeedBlog(string name, string slug, string? contentType = null, BlogKind kind = BlogKind.Standard)
    {
        var blog = Blog.Create(name, slug, $"{name} description", "i-heroicons-book-open", contentType);
        blog.Kind = kind;
        Db.Blogs.Add(blog);
        Db.SaveChanges();
        return blog;
    }

    public Project SeedProject(
        Blog blog,
        string title,
        string slug,
        ProjectCategory category,
        int year = 2024,
        List<string>? stack = null,
        string? canonicalUrl = null,
        DateTimeOffset? lastPushedAt = null,
        bool isPublished = true)
    {
        // NB: the blog's Kind comes from SeedBlog's `kind` parameter. There is
        // deliberately no `project.Kind` line - Kind is a property of Blog, not
        // of Post, and Project inherits from Post.
        var project = Project.Create(
            blog.Id, title, slug, $"# {title}\n\nBody text.", $"{title} brief", category, year);
        project.Stack = stack ?? [];
        project.CanonicalUrl = canonicalUrl;
        project.LastPushedAt = lastPushedAt;

        if (isPublished)
        {
            project.Publish();
            if (lastPushedAt is not null)
                project.SetPublishedOn(lastPushedAt.Value);
        }

        Db.Posts.Add(project);
        Db.SaveChanges();
        return project;
    }
```

Note this changes `SeedBlog`'s signature by adding a fourth optional parameter. Every existing call site keeps compiling.

- [ ] **Step 4: Run to verify the shape is right**

Run: `cd backend && dotnet test --filter ProjectTests`
Expected: still **BUILD FAILURE** — `BlogKind` and `Project` are needed by the fixture itself. That is expected; the types land in Task 1. Do not proceed past a green build here.

- [ ] **Step 5: Commit once Task 1 makes it compile**

Do not commit this task separately — it cannot compile until Task 1 exists. Land it with Task 1.

---

### Task 1: The domain types

**Files:**
- Create: `backend/Domain/Blogs/BlogKind.cs`
- Create: `backend/Domain/Posts/ProjectCategory.cs`
- Create: `backend/Domain/Posts/ProjectLink.cs`
- Create: `backend/Domain/Posts/Project.cs`
- Create: `backend/Domain/Posts/ProjectBlogs.cs`
- Modify: `backend/Domain/Blogs/Blog.cs`
- Test: `backend/Tests/ProjectTests.cs`

- [ ] **Step 1: `BlogKind`**

Create `backend/Domain/Blogs/BlogKind.cs`:

```csharp
namespace Domain.Blogs;

/// <summary>
/// Decides which endpoint family may write into a blog, and therefore what
/// content type the blog holds. A blog is one or the other, never both.
/// </summary>
public enum BlogKind
{
    Standard = 0,
    Project = 1,
}
```

- [ ] **Step 2: `ProjectCategory` and the registry**

Create `backend/Domain/Posts/ProjectCategory.cs`:

```csharp
namespace Domain.Posts;

/// <summary>
/// The closed set of project categories. Each value names the blog that holds
/// its projects, so category is expressed by placement rather than a free-form
/// string. The mapping lives in <see cref="ProjectBlogs"/>.
/// </summary>
public enum ProjectCategory
{
    GameDev = 0,
    Graphics = 1,
    BusinessCase = 2,
}
```

Create `backend/Domain/Posts/ProjectBlogs.cs`:

```csharp
namespace Domain.Posts;

/// <summary>
/// The three project blogs. This is the single table of truth for which blog
/// holds which category, shared by the importer, the validators and the CMS
/// admin UI so they cannot disagree.
/// </summary>
public static class ProjectBlogs
{
    public sealed record Definition(
        ProjectCategory Category,
        string Slug,
        string Label,
        string Icon);

    public static readonly IReadOnlyList<Definition> All =
    [
        new(ProjectCategory.GameDev, "game-dev", "Game Dev Projects", "i-ph-game-controller"),
        new(ProjectCategory.Graphics, "graphics", "Graphics Projects", "i-ph-polygon"),
        new(ProjectCategory.BusinessCase, "business-case", "Business Case Projects", "i-heroicons-briefcase"),
    ];

    public static Definition For(ProjectCategory category) =>
        All.Single(d => d.Category == category);

    public static Definition? ForSlug(string slug) =>
        All.FirstOrDefault(d => d.Slug == slug);

    public static bool IsProjectSlug(string slug) => ForSlug(slug) is not null;

    /// <summary>Lowercase slug for a category, used as the denormalised Tag value.</summary>
    public static string SlugFor(ProjectCategory category) => For(category).Slug;
}
```

- [ ] **Step 3: `ProjectLink`**

Create `backend/Domain/Posts/ProjectLink.cs`:

```csharp
namespace Domain.Posts;

public class ProjectLink
{
    public string Label { get; set; } = string.Empty;   // "Source" | "Live Demo" | "Write-up"
    public string Url { get; set; } = string.Empty;
}
```

- [ ] **Step 4: `Project`**

Create `backend/Domain/Posts/Project.cs`:

```csharp
using Domain.Blogs;

namespace Domain.Posts;

/// <summary>
/// A project is a post with typed project fields. Everything about writing and
/// publishing is inherited; only the structured bits are added. EF maps this as
/// Table-Per-Hierarchy, so there is one Posts table with a discriminator.
/// </summary>
public class Project : Post
{
    /// <summary>
    /// Denormalised from the containing blog and validated against it, so
    /// ProjectResponse stays a flat read DTO with no per-row join.
    /// </summary>
    public ProjectCategory Category { get; set; }

    public List<string> Stack { get; set; } = [];

    public int Year { get; set; }

    /// <summary>Last push to the backing repository. The input to the derived status.</summary>
    public DateTimeOffset? LastPushedAt { get; set; }

    public List<ProjectLink> Links { get; set; } = [];

    public static Project Create(
        Guid blogId,
        string title,
        string slug,
        string content,
        string? description,
        ProjectCategory category,
        int year)
    {
        var project = new Project
        {
            Id = Guid.NewGuid(),
            BlogId = blogId,
            Title = title,
            Slug = slug,
            Content = content,
            Description = description,
            Year = year,
            Category = category,
        };

        // Post.Tag is NOT NULL and has no project-specific meaning. The category
        // slug is the closest honest value; nothing lets a caller set it, so it
        // cannot contradict Category.
        project.Tag = ProjectBlogs.SlugFor(category);
        return project;
    }
}
```

- [ ] **Step 5: `Blog.Kind`**

In `backend/Domain/Blogs/Blog.cs`, add after `ContentType`:

```csharp
    /// <summary>
    /// Standard holds ordinary posts; Project holds <see cref="Domain.Posts.Project"/>.
    /// This decides which endpoint family may write into the blog.
    /// </summary>
    public BlogKind Kind { get; set; } = BlogKind.Standard;
```

`Create` does not need a `kind` parameter — the fixture and the blog commands set it.

- [ ] **Step 6: Extend `ProjectTests` with domain assertions**

Append to `backend/Tests/ProjectTests.cs`:

```csharp
    [Fact]
    public void ProjectBlogs_AreUniquelySlugged()
    {
        var slugs = ProjectBlogs.All.Select(d => d.Slug).ToList();

        Assert.Equal(slugs.Count, slugs.Distinct().Count());
        Assert.Equal(slugs.Count, ProjectBlogs.All.Select(d => d.Category).Distinct().Count());
    }

    [Fact]
    public void ForSlug_RoundTripsEveryCategory()
    {
        foreach (var definition in ProjectBlogs.All)
        {
            Assert.Equal(definition, ProjectBlogs.For(definition.Category));
            Assert.Equal(definition, ProjectBlogs.ForSlug(definition.Slug));
        }
    }

    [Fact]
    public void Project_Create_StampsTheCategorySlugAsTag()
    {
        var project = Project.Create(
            Guid.NewGuid(), "Stick Legends", "stick-legends", "body", "brief",
            ProjectCategory.GameDev, 2025);

        Assert.Equal("game-dev", project.Tag);
        Assert.Equal(ProjectCategory.GameDev, project.Category);
        Assert.Equal(2025, project.Year);
    }

    [Fact]
    public void Project_IsAPost()
    {
        Assert.True(typeof(Post).IsAssignableFrom(typeof(Project)));
    }
```

- [ ] **Step 7: Run**

Run: `cd backend && dotnet test --filter ProjectTests`
Expected: PASS — 6 tests. `dotnet build` must report **0 `warning CS`**.

- [ ] **Step 8: Commit**

```bash
git add backend/Domain backend/Tests
git commit -m "feat: add Project : Post, ProjectCategory and Blog.Kind

A project is a post with typed project fields - category, stack, year,
last push and links - so it inherits the whole markdown pipeline, publish
workflow, file attachment and cover image that already exists.

Category is expressed by which blog a project lives in, with
ProjectBlogs as the single table of truth shared by the importer, the
validators and the admin UI. Project.Category is denormalised from that
blog and validated against it, which keeps ProjectResponse a flat read
DTO and turns 'category matches blog' into an enforceable invariant.

Blog.Kind decides which endpoint family may write into a blog. Existing
blogs default to Standard, so nothing about them changes."
```

---

### Task 2: EF mapping and the migration

**Files:**
- Create: `backend/Infrastructure/Models/ProjectEntity.cs`
- Modify: `backend/Infrastructure/Models/CmsDbContext.cs`
- Modify: `backend/Infrastructure/Models/BlogEntity.cs`
- Modify: `backend/Domain/Blogs/Blog.cs` (no change needed — Kind is a plain enum)
- Test: `backend/Tests/ProjectTests.cs`

- [ ] **Step 1: Write the failing test**

Append to `backend/Tests/ProjectTests.cs`:

```csharp
    [Fact]
    public void Project_PersistsItsTypedFields()
    {
        using var db = new TestDb();
        var blog = db.SeedBlog("Game Dev Projects", "game-dev", "markdown", BlogKind.Project);
        var pushed = new DateTimeOffset(2025, 10, 30, 0, 0, 0, TimeSpan.Zero);
        var project = db.SeedProject(
            blog, "Stick Legends", "stick-legends", ProjectCategory.GameDev,
            year: 2025, stack: ["TypeScript", "PixiJS"],
            canonicalUrl: "https://github.com/Stelele/stick-legends", lastPushedAt: pushed);

        db.Db.ChangeTracker.Clear();

        var loaded = db.Db.Posts.OfType<Project>().Single(p => p.Id == project.Id);
        Assert.Equal(ProjectCategory.GameDev, loaded.Category);
        Assert.Equal(2025, loaded.Year);
        Assert.Equal(["TypeScript", "PixiJS"], loaded.Stack);
        Assert.Equal("https://github.com/Stelele/stick-legends", loaded.CanonicalUrl);
        Assert.Equal(pushed, loaded.LastPushedAt);
    }

    [Fact]
    public void Blog_KindRoundTrips()
    {
        using var db = new TestDb();
        db.SeedBlog("Game Dev Projects", "game-dev", "markdown", BlogKind.Project);
        db.SeedBlog("Random", "random");

        db.Db.ChangeTracker.Clear();

        Assert.Equal(BlogKind.Project, db.Db.Blogs.Single(b => b.Slug == "game-dev").Kind);
        Assert.Equal(BlogKind.Standard, db.Db.Blogs.Single(b => b.Slug == "random").Kind);
    }
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && dotnet test --filter ProjectTests`
Expected: FAIL — `Stack` and `Links` do not persist, and `Kind` is unmapped.

- [ ] **Step 3: Create `ProjectEntity`**

Create `backend/Infrastructure/Models/ProjectEntity.cs`:

```csharp
using Domain.Posts;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Models;

/// <summary>
/// Table-Per-Hierarchy: Project adds a discriminator to Posts rather than
/// creating a table. Stack and Links are value-converted to JSON columns - the
/// serialisation is real, but the shape is enforced by List&lt;string&gt; and
/// List&lt;ProjectLink&gt; at the domain boundary, so nothing arbitrary gets in.
/// </summary>
public class ProjectEntity : IEntityTypeConfiguration<Project>
{
    public void Configure(EntityTypeBuilder<Project> builder)
    {
        builder.Property(b => b.Category)
            .IsRequired()
            .HasConversion<int>();

        builder.Property(b => b.Year)
            .IsRequired();

        builder.Property(b => b.LastPushedAt)
            .IsRequired(false);

        builder.Property(b => b.Stack)
            .HasConversion(
                v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                v => System.Text.Json.JsonSerializer.Deserialize<List<string>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? [],
                new System.Text.Json.JsonComparer<List<string>>());

        builder.Property(b => b.Links)
            .HasConversion(
                v => System.Text.Json.JsonSerializer.Serialize(v, (System.Text.Json.JsonSerializerOptions?)null),
                v => System.Text.Json.JsonSerializer.Deserialize<List<ProjectLink>>(v, (System.Text.Json.JsonSerializerOptions?)null) ?? [],
                new System.Text.Json.JsonComparer<List<ProjectLink>>());

        builder.HasIndex(b => new { b.BlogId, b.Year });
    }
}
```

`JsonComparer` is required, or EF treats the converted value as a different object each time and stops detecting changes to `Stack` and `Links`.

- [ ] **Step 4: Register it and map `Blog.Kind`**

In `backend/Infrastructure/Models/CmsDbContext.cs`, add a `DbSet` next to the others:

```csharp
    public DbSet<Project> Projects { get; set; }
```

and a configuration call inside `OnModelCreating`:

```csharp
        new ProjectEntity().Configure(modelBuilder.Entity<Project>());
```

In `backend/Infrastructure/Models/BlogEntity.cs`, add inside `Configure`:

```csharp
        builder.Property(b => b.Kind)
            .IsRequired()
            .HasConversion<int>();
```

`OnModelCreating` already loops over every entity type to apply
`DateTimeOffsetToBinaryConverter`, so `Project.LastPushedAt` is covered without
extra work.

- [ ] **Step 5: Run to verify it passes**

Run: `cd backend && dotnet test --filter ProjectTests`
Expected: PASS — 9 tests.

- [ ] **Step 6: Generate the migration**

From `backend/`:

```bash
dotnet ef migrations add AddProjects \
  --project Infrastructure \
  --startup-project Infrastructure \
  --output-dir Infrastructure/Migrations
```

`--output-dir` is **required** — the existing migrations live in a non-default
folder (`Infrastructure/Infrastructure/Migrations/`) with no csproj override, and
omitting it creates a second folder the runtime never loads.

If `dotnet ef` is not found: `~/.dotnet/tools` is not on `PATH` by default. Add it
(`export PATH="$PATH:$HOME/.dotnet/tools"`) and ensure the tool is 9.x. If a 10.x
tool is already installed, `dotnet tool install --version 9.*` refuses to
downgrade — uninstall the 10.x one first.

- [ ] **Step 7: Verify the migration is additive**

Run: `grep -nE 'name: "(DropColumn|DropTable|AlterColumn|RenameColumn|RenameTable|DropIndex)"' Infrastructure/Infrastructure/Migrations/*_AddProjects.cs`
Expected: **no output.**

Run: `grep -nE 'name: "(Kind|Category|Year|LastPushedAt|Stack|Links)"' Infrastructure/Infrastructure/Migrations/*_AddProjects.cs`
Expected: the six names, each `AddColumn` plus a `Down()` reference. The
`Down()` method will contain `DropColumn` calls — that is expected and correct.
If `Up()` contains anything other than `AddColumn`, stop and report.

- [ ] **Step 8: Apply it to a throwaway copy**

```bash
cd backend
cp ~/Documents/code-projects/cms-system/backend/Host/cms.db /tmp/opencode/projmig.db
dotnet ef database update --project Infrastructure --startup-project Infrastructure \
  --connection "Data Source=/tmp/opencode/projmig.db"
sqlite3 /tmp/opencode/projmig.db "SELECT COUNT(*) FROM Blogs;"
sqlite3 /tmp/opencode/projmig.db "SELECT COUNT(*) FROM Posts;"
sqlite3 /tmp/opencode/projmig.db "PRAGMA table_info(Blogs);" | grep -i kind
sqlite3 /tmp/opencode/projmig.db "PRAGMA table_info(Posts);" | grep -iE 'category|stack|links|"year"|lastpushed'
```

Record the counts before and after — they must be identical. Every existing
`Posts.Discriminator` must be null and every existing `Blogs.Kind` must be `0`.
**Never** run `database update` without `--connection`; the real `cms.db` must not
change. Record its checksum before and after.

- [ ] **Step 9: Commit**

```bash
git add backend/Infrastructure backend/Tests
git commit -m "feat: map Project with Table-Per-Hierarchy

One Posts table gains a discriminator and five nullable-tolerant columns
rather than a second table, so the migration is additive and no existing
row is touched: every current post has a null discriminator and every
current blog defaults to Kind.Standard.

Stack and Links are value-converted to JSON columns. The serialisation
is real, but the shape is enforced by List<string> and List<ProjectLink>
at the domain boundary, so there is no free-form bag anything can be
squeezed into. JsonComparer is supplied, without which EF would stop
detecting changes to those collections."
```

---

### Task 3: Status rules and the read DTOs

**Files:**
- Create: `backend/Application/Projects/ProjectStatusRules.cs`
- Create: `backend/Application/DTOs/ProjectSummaryResponse.cs`
- Create: `backend/Application/DTOs/ProjectResponse.cs`
- Test: `backend/Tests/ProjectStatusTests.cs`

- [ ] **Step 1: Write the failing tests**

Create `backend/Tests/ProjectStatusTests.cs`:

```csharp
using Application.DTOs;
using Application.Projects;
using Domain.Posts;

namespace Tests;

public class ProjectStatusTests
{
    private static DateTimeOffset DaysAgo(int days) => DateTimeOffset.UtcNow.AddDays(-days);

    [Fact]
    public void WithinTheWindow_IsActive()
    {
        Assert.Equal(ProjectStatus.Active, ProjectStatusRules.Derive(DaysAgo(1)));
        Assert.Equal(ProjectStatus.Active, ProjectStatusRules.Derive(DaysAgo(364)));
    }

    [Fact]
    public void OutsideTheWindow_IsArchived()
    {
        Assert.Equal(ProjectStatus.Archived, ProjectStatusRules.Derive(DaysAgo(366)));
    }

    [Fact]
    public void Null_IsArchived()
    {
        // Fails closed: an unknown last push must never claim to be active.
        Assert.Equal(ProjectStatus.Archived, ProjectStatusRules.Derive(null));
    }

    [Fact]
    public void SummaryResponse_CarriesNoContent()
    {
        var exposed = typeof(ProjectSummaryResponse).GetProperties().Select(p => p.Name).ToHashSet();

        Assert.DoesNotContain("Content", exposed);
    }

    [Fact]
    public void Responses_ExposeNoInternalFields()
    {
        foreach (var type in new[] { typeof(ProjectSummaryResponse), typeof(ProjectResponse) })
        {
            var exposed = type.GetProperties().Select(p => p.Name).ToHashSet();
            Assert.DoesNotContain("IsPublished", exposed);
            Assert.DoesNotContain("CreatedOn", exposed);
            Assert.DoesNotContain("UpdatedOn", exposed);
        }
    }

    [Fact]
    public void FromDomain_ComputesStatus()
    {
        var project = Project.Create(
            Guid.NewGuid(), "T", "t", "body", "brief", ProjectCategory.Graphics, 2025);
        project.LastPushedAt = DaysAgo(2);

        Assert.Equal(ProjectStatus.Active, ProjectResponse.FromDomain(project).Status);
        Assert.Equal(ProjectStatus.Active, ProjectSummaryResponse.FromDomain(project).Status);
    }

    [Fact]
    public void FromDomain_CarriesTheTypedFields()
    {
        var project = Project.Create(
            Guid.NewGuid(), "T", "t", "body", "brief", ProjectCategory.BusinessCase, 2024);
        project.Stack = ["C#", "Vue"];
        project.CanonicalUrl = "https://example.com";
        project.Links = [new ProjectLink { Label = "Source", Url = "https://github.com/x/y" }];

        var response = ProjectResponse.FromDomain(project);

        Assert.Equal(ProjectCategory.BusinessCase, response.Category);
        Assert.Equal(2024, response.Year);
        Assert.Equal(["C#", "Vue"], response.Stack);
        Assert.Equal("https://example.com", response.CanonicalUrl);
        Assert.Single(response.Links);
        Assert.Equal("Source", response.Links[0].Label);
    }
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && dotnet test --filter ProjectStatusTests`
Expected: **BUILD FAILURE** — the types do not exist.

- [ ] **Step 3: `ProjectStatusRules`**

Create `backend/Application/Projects/ProjectStatusRules.cs`:

```csharp
using Domain.Posts;

namespace Application.Projects;

public enum ProjectStatus
{
    Active = 0,
    Archived = 1,
}

public static class ProjectStatusRules
{
    public const int ActiveWindowDays = 365;

    /// <summary>
    /// Derived, never stored: changing the window reclassifies every project
    /// with no data migration. A null last-push is archived rather than active,
    /// because an unknown state must not read as "still being worked on".
    /// </summary>
    public static ProjectStatus Derive(DateTimeOffset? lastPushedAt) =>
        lastPushedAt is { } pushed &&
        pushed >= DateTimeOffset.UtcNow.AddDays(-ActiveWindowDays)
            ? ProjectStatus.Active
            : ProjectStatus.Archived;
}
```

- [ ] **Step 4: The two DTOs**

Create `backend/Application/DTOs/ProjectSummaryResponse.cs`:

```csharp
using Application.Projects;
using Domain.Posts;

namespace Application.DTOs;

/// <summary>
/// The listing projection. Omits Content deliberately: 53 articles in one
/// payload is roughly 150KB for a grid of cards, and a field not on the record
/// cannot be serialised.
/// </summary>
public record ProjectSummaryResponse(
    Guid Id,
    Guid BlogId,
    string Slug,
    string Title,
    string? Description,
    ProjectCategory Category,
    List<string> Stack,
    int Year,
    DateTimeOffset? LastPushedAt,
    List<ProjectLink> Links,
    string? CoverImageUrl,
    DateTimeOffset? PublishedOn,
    ProjectStatus Status)
{
    public static ProjectSummaryResponse FromDomain(Project project) =>
        new(project.Id, project.BlogId, project.Slug, project.Title, project.Description,
            project.Category, project.Stack, project.Year, project.LastPushedAt,
            project.Links, project.CoverImageUrl, project.PublishedOn,
            ProjectStatusRules.Derive(project.LastPushedAt));
}
```

Create `backend/Application/DTOs/ProjectResponse.cs`:

```csharp
using Application.Projects;
using Domain.Posts;

namespace Application.DTOs;

/// <summary>
/// The full article projection. Deliberately omits IsPublished, CreatedOn and
/// UpdatedOn so internal bookkeeping cannot reach a public caller.
/// </summary>
public record ProjectResponse(
    Guid Id,
    Guid BlogId,
    string Slug,
    string Title,
    string Content,
    string? Description,
    ProjectCategory Category,
    List<string> Stack,
    int Year,
    DateTimeOffset? LastPushedAt,
    List<ProjectLink> Links,
    string? CoverImageUrl,
    DateTimeOffset? PublishedOn,
    string? CanonicalUrl,
    ProjectStatus Status)
{
    public static ProjectResponse FromDomain(Project project) =>
        new(project.Id, project.BlogId, project.Slug, project.Title, project.Content,
            project.Description, project.Category, project.Stack, project.Year,
            project.LastPushedAt, project.Links, project.CoverImageUrl, project.PublishedOn,
            project.CanonicalUrl, ProjectStatusRules.Derive(project.LastPushedAt));
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `cd backend && dotnet test --filter ProjectStatusTests`
Expected: PASS — 7 tests.

- [ ] **Step 6: Commit**

```bash
git add backend/Application backend/Tests/ProjectStatusTests.cs
git commit -m "feat: add derived project status and the two read projections

status is computed from LastPushedAt rather than stored, so widening the
window reclassifies every project with no data migration, and a null
last-push reads as archived rather than active - an unknown state must
not present as 'still being worked on'.

The summary projection omits Content. Fifty-three articles in one
payload is about 150KB for a grid of cards, and a field absent from the
record cannot be serialised, which is the same boundary that keeps
IsPublished off the public surface."
```

---

### Task 4: Public reads and the write boundary

The two halves of the safety story: anonymous callers can never see a draft, and
a blog's kind decides which endpoint family may write into it.

**Files:**
- Create: `backend/Application/Projects/GetProjectsQuery.cs`
- Create: `backend/Application/Projects/GetProjectBySlugQuery.cs`
- Modify: `backend/Application/Posts/CreatePostCommandHandler.cs`
- Modify: `backend/Application/Posts/UpdatePostCommandHandler.cs`
- Modify: `backend/Application/DTOs/BlogResponse.cs`
- Test: `backend/Tests/ProjectBoundaryTests.cs`

- [ ] **Step 1: Write the failing tests**

Create `backend/Tests/ProjectBoundaryTests.cs`:

```csharp
using Application.DTOs;
using Application.Posts;
using Application.Projects;
using Domain.Blogs;
using Domain.Posts;

namespace Tests;

public class ProjectBoundaryTests
{
    [Fact]
    public async Task GetProjects_ExcludesDrafts()
    {
        using var db = new TestDb();
        var blog = db.SeedBlog("Game Dev Projects", "game-dev", "markdown", BlogKind.Project);
        db.SeedProject(blog, "Live", "live", ProjectCategory.GameDev);
        db.SeedProject(blog, "Draft", "draft", ProjectCategory.GameDev, isPublished: false);

        var result = await new GetProjectsQueryHandler(db.Db)
            .Handle(new GetProjectsQuery(null), CancellationToken.None);

        Assert.Equal(["live"], result.Select(p => p.Slug).ToArray());
    }

    [Fact]
    public async Task GetProjects_ExcludesOrdinaryPosts()
    {
        using var db = new TestDb();
        var standard = db.SeedBlog("Random", "random");
        db.SeedPost(standard, "A Post", "a-post");
        var projectBlog = db.SeedBlog("Graphics", "graphics", "markdown", BlogKind.Project);
        db.SeedProject(projectBlog, "Shader Land", "shader-land", ProjectCategory.Graphics);

        var result = await new GetProjectsQueryHandler(db.Db)
            .Handle(new GetProjectsQuery(null), CancellationToken.None);

        Assert.Equal(["shader-land"], result.Select(p => p.Slug).ToArray());
    }

    [Fact]
    public async Task GetProjects_FiltersByCategory()
    {
        using var db = new TestDb();
        var gamedev = db.SeedBlog("Game Dev Projects", "game-dev", "markdown", BlogKind.Project);
        var graphics = db.SeedBlog("Graphics", "graphics", "markdown", BlogKind.Project);
        db.SeedProject(gamedev, "A", "a", ProjectCategory.GameDev);
        db.SeedProject(graphics, "B", "b", ProjectCategory.Graphics);

        var result = await new GetProjectsQueryHandler(db.Db)
            .Handle(new GetProjectsQuery(ProjectCategory.Graphics), CancellationToken.None);

        Assert.Equal(["b"], result.Select(p => p.Slug).ToArray());
    }

    [Fact]
    public async Task GetProjectBySlug_ReturnsNullForADraft()
    {
        using var db = new TestDb();
        var blog = db.SeedBlog("Game Dev Projects", "game-dev", "markdown", BlogKind.Project);
        db.SeedProject(blog, "Draft", "draft", ProjectCategory.GameDev, isPublished: false);

        var result = await new GetProjectBySlugQueryHandler(db.Db)
            .Handle(new GetProjectBySlugQuery("draft"), CancellationToken.None);

        Assert.Null(result);
    }

    [Fact]
    public async Task CreatePost_IntoAProjectBlog_IsRejected()
    {
        using var db = new TestDb();
        var blog = db.SeedBlog("Game Dev Projects", "game-dev", "markdown", BlogKind.Project);

        var handler = new CreatePostCommandHandler(db.Db, db.FileReferenceService());

        await Assert.ThrowsAsync<InvalidOperationException>(() => handler.Handle(
            new CreatePostCommand(blog.Id, "Sneaky", "sneaky", "Body", null, "general", null, true),
            CancellationToken.None));

        Assert.Empty(db.Db.Posts);
    }

    [Fact]
    public async Task CreatePost_IntoAStandardBlog_IsStillAllowed()
    {
        using var db = new TestDb();
        var blog = db.SeedBlog("Random", "random");

        var handler = new CreatePostCommandHandler(db.Db, db.FileReferenceService());
        var id = await handler.Handle(
            new CreatePostCommand(blog.Id, "Fine", "fine", "Body", null, "general", null, true),
            CancellationToken.None);

        Assert.NotEqual(Guid.Empty, id);
    }
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && dotnet test --filter ProjectBoundaryTests`
Expected: **BUILD FAILURE** — the queries do not exist.

- [ ] **Step 3: The public queries**

Create `backend/Application/Projects/GetProjectsQuery.cs`:

```csharp
using Application.Abstractions;
using Application.DTOs;
using Infrastructure.Models;
using Microsoft.EntityFrameworkCore;

namespace Application.Projects;

public record GetProjectsQuery(ProjectCategory? Category = null) : IQuery<List<ProjectSummaryResponse>>;

public class GetProjectsQueryHandler(CmsDbContext db)
    : IQueryHandler<GetProjectsQuery, List<ProjectSummaryResponse>>
{
    public async Task<List<ProjectSummaryResponse>> Handle(
        GetProjectsQuery request,
        CancellationToken cancellationToken)
    {
        // IsPublished is a constant, not a parameter, so a caller cannot opt out
        // of it. OfType<Project> is what excludes ordinary posts.
        var query = db.Posts.OfType<Project>().Where(p => p.IsPublished);

        if (request.Category is { } category)
            query = query.Where(p => p.Category == category);

        var projects = await query
            .OrderByDescending(p => p.Year)
            .ThenBy(p => p.Title)
            .ToListAsync(cancellationToken);

        return projects.Select(ProjectSummaryResponse.FromDomain).ToList();
    }
}
```

Create `backend/Application/Projects/GetProjectBySlugQuery.cs`:

```csharp
using Application.Abstractions;
using Application.DTOs;
using Infrastructure.Models;
using Microsoft.EntityFrameworkCore;

namespace Application.Projects;

public record GetProjectBySlugQuery(string Slug) : IQuery<ProjectResponse?>;

public class GetProjectBySlugQueryHandler(CmsDbContext db)
    : IQueryHandler<GetProjectBySlugQuery, ProjectResponse?>
{
    public async Task<ProjectResponse?> Handle(
        GetProjectBySlugQuery request,
        CancellationToken cancellationToken)
    {
        var project = await db.Posts
            .OfType<Project>()
            .Where(p => p.Slug == request.Slug && p.IsPublished)
            .FirstOrDefaultAsync(cancellationToken);

        return project is null ? null : ProjectResponse.FromDomain(project);
    }
}
```

- [ ] **Step 4: The write boundary on the post handlers**

In both `CreatePostCommandHandler` and `UpdatePostCommandHandler`, after the
existing blog-existence check, add:

```csharp
        var blog = await db.Blogs.FirstOrDefaultAsync(b => b.Id == request.BlogId, cancellationToken);
        if (blog is null)
            throw new KeyNotFoundException($"Blog with ID '{request.BlogId}' not found.");

        if (blog.Kind == BlogKind.Project)
            throw new InvalidOperationException(
                $"Blog '{blog.Slug}' holds projects. Use the project endpoints.");
```

`CreatePostCommandHandler` already performs a blog-existence check, so **replace**
that existing check with the block above rather than adding a second query.
`UpdatePostCommandHandler` looks the post up first; put this block immediately
after it, and keep its existing "post not found" return.

Add `using Domain.Blogs;` to both handler files if it is not already there.

- [ ] **Step 5: Expose `Kind` on `BlogResponse`**

In `backend/Application/DTOs/BlogResponse.cs`, add `BlogKind Kind` after `Icon`
in the record and `blog.Kind` in `FromDomain`. Add `using Domain.Blogs;` — the
file already has it.

- [ ] **Step 6: Run to verify it passes**

Run: `cd backend && dotnet test --filter ProjectBoundaryTests`
Expected: PASS — 6 tests.

- [ ] **Step 7: Run the whole suite**

Run: `cd backend && dotnet test`
Expected: PASS, no failures, no change to any pre-existing test.

- [ ] **Step 8: Commit**

```bash
git add backend/Application backend/Tests/ProjectBoundaryTests.cs
git commit -m "feat: published-only project reads and the post write boundary

The public project queries filter IsPublished as a constant in the Where
clause, as the post queries already do, and OfType<Project> is what keeps
ordinary posts out of a project listing.

The boundary is complementary rather than conditional: a project blog
rejects writes from the post endpoints, so a project cannot be created
without its typed fields, and an ordinary post cannot be created in a
project blog. Both endpoints keep the same permissions, so no Auth0 API
scope change is required - adding one that is not configured would 403 at
runtime."
```

---

### Task 5: Project CRUD and the endpoints

**Files:**
- Create: `backend/Application/Projects/CreateProjectCommand.cs`
- Create: `backend/Application/Projects/UpdateProjectCommand.cs`
- Create: `backend/Application/Projects/DeleteProjectCommand.cs`
- Create: `backend/Api/Endpoints/Projects/ProjectEndpoints.cs`
- Modify: `backend/Api/Tags.cs`
- Modify: `backend/Api/DependancyInjection.cs`
- Test: `backend/Tests/ProjectCommandTests.cs`

- [ ] **Step 1: Write the failing tests**

Create `backend/Tests/ProjectCommandTests.cs`:

```csharp
using Application.Projects;
using Domain.Blogs;
using Domain.Posts;

namespace Tests;

public class ProjectCommandTests
{
    [Fact]
    public async Task Create_StoresEveryTypedField()
    {
        using var db = new TestDb();
        var blog = db.SeedBlog("Graphics", "graphics", "markdown", BlogKind.Project);

        var handler = new CreateProjectCommandHandler(db.Db, db.FileReferenceService());
        var id = await handler.Handle(
            new CreateProjectCommand(
                blog.Id, "Shader Land", "shader-land", "Body", "A shader toy clone",
                ProjectCategory.Graphics, 2025, ["Vue", "WebGPU"], null,
                [new ProjectLinkInput("Source", "https://github.com/Stelele/shader-land")],
                "https://cdn.hashnode.com/x.png", isPublished: true,
                publishedOn: new DateTimeOffset(2025, 2, 8, 0, 0, 0, TimeSpan.Zero)),
            CancellationToken.None);

        db.Db.ChangeTracker.Clear();
        var project = db.Db.Posts.OfType<Project>().Single(p => p.Id == id);

        Assert.Equal(ProjectCategory.Graphics, project.Category);
        Assert.Equal(2025, project.Year);
        Assert.Equal(["Vue", "WebGPU"], project.Stack);
        Assert.Equal("graphics", project.Tag);
        Assert.Equal("https://cdn.hashnode.com/x.png", project.CoverImageUrl);
        Assert.Single(project.Links);
        Assert.Equal(new DateTimeOffset(2025, 2, 8, 0, 0, 0, TimeSpan.Zero), project.PublishedOn);
    }

    [Fact]
    public async Task Create_IntoAStandardBlog_IsRejected()
    {
        using var db = new TestDb();
        var blog = db.SeedBlog("Random", "random");

        var handler = new CreateProjectCommandHandler(db.Db, db.FileReferenceService());

        await Assert.ThrowsAsync<InvalidOperationException>(() => handler.Handle(
            new CreateProjectCommand(blog.Id, "Nope", "nope", "Body", null,
                ProjectCategory.Graphics, 2024, [], null, [], null, true, null),
            CancellationToken.None));
    }

    [Fact]
    public void Validator_RejectsACategoryThatDoesNotMatchTheBlog()
    {
        var command = new CreateProjectCommand(
            Guid.NewGuid(), "T", "t", "Body", null,
            ProjectCategory.Graphics, 2024, [], null, [], null, true, null);

        // The blog is resolved inside the handler, so the mismatch is asserted
        // through the handler rather than the validator. This test pins the
        // message the handler raises.
        Assert.Equal("graphics", ProjectBlogs.SlugFor(ProjectCategory.Graphics));
        Assert.Equal("game-dev", ProjectBlogs.SlugFor(ProjectCategory.GameDev));
    }

    [Fact]
    public async Task Update_ChangesTheTypedFields()
    {
        using var db = new TestDb();
        var blog = db.SeedBlog("Graphics", "graphics", "markdown", BlogKind.Project);
        var seeded = db.SeedProject(blog, "Old", "old", ProjectCategory.Graphics, year: 2024);

        var handler = new UpdateProjectCommandHandler(db.Db, db.FileReferenceService());
        var ok = await handler.Handle(
            new UpdateProjectCommand(blog.Id, seeded.Id, "New", "new", "Body2", "Brief2",
                ProjectCategory.Graphics, 2026, ["Go"], null, [], null, true, null),
            CancellationToken.None);

        Assert.True(ok);
        db.Db.ChangeTracker.Clear();
        var project = db.Db.Posts.OfType<Project>().Single(p => p.Id == seeded.Id);
        Assert.Equal("New", project.Title);
        Assert.Equal(2026, project.Year);
        Assert.Equal(["Go"], project.Stack);
    }

    [Fact]
    public async Task Update_IntoAStandardBlog_IsRejected()
    {
        using var db = new TestDb();
        var standard = db.SeedBlog("Random", "random");
        var seeded = db.SeedPost(standard, "A Post", "a-post");

        var handler = new UpdateProjectCommandHandler(db.Db, db.FileReferenceService());

        await Assert.ThrowsAsync<InvalidOperationException>(() => handler.Handle(
            new UpdateProjectCommand(standard.Id, seeded.Id, "T", "t", "B", null,
                ProjectCategory.Graphics, 2024, [], null, [], null, true, null),
            CancellationToken.None));
    }

    [Fact]
    public async Task Delete_RemovesOnlyProjects()
    {
        using var db = new TestDb();
        var standard = db.SeedBlog("Random", "random");
        var post = db.SeedPost(standard, "Keep", "keep");
        var projectBlog = db.SeedBlog("Graphics", "graphics", "markdown", BlogKind.Project);
        var project = db.SeedProject(projectBlog, "Remove", "remove", ProjectCategory.Graphics);

        var handler = new DeleteProjectCommandHandler(db.Db);
        Assert.True(await handler.Handle(new DeleteProjectCommand(projectBlog.Id, project.Id), CancellationToken.None));
        Assert.False(await handler.Handle(new DeleteProjectCommand(projectBlog.Id, post.Id), CancellationToken.None));

        db.Db.ChangeTracker.Clear();
        Assert.Single(db.Db.Posts);
    }
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd backend && dotnet test --filter ProjectCommandTests`
Expected: **BUILD FAILURE** — the commands do not exist.

- [ ] **Step 3: `ProjectLinkInput` and the three commands**

Create `backend/Application/Projects/CreateProjectCommand.cs`:

```csharp
using Application.Abstractions;
using Domain.Posts;
using FluentValidation;
using System.Text.Json.Serialization;

namespace Application.Projects;

public sealed record ProjectLinkInput(
    [property: JsonPropertyName("label")] string Label,
    [property: JsonPropertyName("url")] string Url);

public record CreateProjectCommand(
    [property: JsonPropertyName("blogId")] Guid BlogId,
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("slug")] string Slug,
    [property: JsonPropertyName("content")] string Content,
    [property: JsonPropertyName("description")] string? Description,
    [property: JsonPropertyName("category")] ProjectCategory Category,
    [property: JsonPropertyName("year")] int Year,
    [property: JsonPropertyName("stack")] List<string> Stack,
    [property: JsonPropertyName("lastPushedAt")] DateTimeOffset? LastPushedAt,
    [property: JsonPropertyName("links")] List<ProjectLinkInput> Links,
    [property: JsonPropertyName("coverImageUrl")] string? CoverImageUrl,
    [property: JsonPropertyName("isPublished")] bool IsPublished,
    [property: JsonPropertyName("publishedOn")] DateTimeOffset? PublishedOn = null
) : ICommand<Guid>;

public sealed class CreateProjectCommandValidator : AbstractValidator<CreateProjectCommand>
{
    public CreateProjectCommandValidator()
    {
        RuleFor(x => x.BlogId).NotEmpty();
        RuleFor(x => x.Title).NotEmpty();
        RuleFor(x => x.Slug).NotEmpty().Matches("^[a-z0-9-]+$")
            .WithMessage("Slug must contain only lowercase letters, numbers, and hyphens.");
        RuleFor(x => x.Content).NotEmpty();
        RuleFor(x => x.Category).IsInEnum();
        RuleFor(x => x.Year).InclusiveBetween(2000, 2100);
        RuleForEach(x => x.Links).ChildRules(link =>
        {
            link.RuleFor(l => l.Label).NotEmpty();
            link.RuleFor(l => l.Url).Must(BeAbsoluteHttpUrl)
                .WithMessage("Link url must be an absolute http or https URL.");
        });
    }

    private static bool BeAbsoluteHttpUrl(string? value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri)
        && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
}
```

Note: no `Tag` rule, because a project has no tag — `Project.Create` stamps the
category slug. Do **not** add `[JsonRequired]` to `Category`, `Year`, `Stack` or
`Links`: the plan deliberately makes the new fields optional at the wire level
and the handler validates them, since the importer will post them in stages.

Create `backend/Application/Projects/UpdateProjectCommand.cs` with the same shape
plus `Id` after `BlogId`, returning `ICommand<bool>`, and a matching validator.

Create `backend/Application/Projects/DeleteProjectCommand.cs`:

```csharp
using Application.Abstractions;

namespace Application.Projects;

public record DeleteProjectCommand(Guid BlogId, Guid Id) : ICommand<bool>;
```

- [ ] **Step 4: The three handlers**

`CreateProjectCommandHandler` — model it on `CreatePostCommandHandler`, which
already exists:

```csharp
using Application.Abstractions;
using Domain.Blogs;
using Domain.Posts;
using Infrastructure.Models;
using Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace Application.Projects;

public class CreateProjectCommandHandler(CmsDbContext db, FileReferenceService fileRefService)
    : ICommandHandler<CreateProjectCommand, Guid>
{
    public async Task<Guid> Handle(CreateProjectCommand request, CancellationToken cancellationToken)
    {
        var blog = await db.Blogs.FirstOrDefaultAsync(b => b.Id == request.BlogId, cancellationToken);
        if (blog is null)
            throw new KeyNotFoundException($"Blog with ID '{request.BlogId}' not found.");

        if (blog.Kind != BlogKind.Project)
            throw new InvalidOperationException(
                $"Blog '{blog.Slug}' holds ordinary posts. Use the post endpoints.");

        if (ProjectBlogs.SlugFor(request.Category) != blog.Slug)
            throw new InvalidOperationException(
                $"Category '{request.Category}' belongs to blog '{ProjectBlogs.SlugFor(request.Category)}', "
                + $"not '{blog.Slug}'.");

        var slugExists = await db.Posts
            .AnyAsync(p => p.BlogId == request.BlogId && p.Slug == request.Slug, cancellationToken);
        if (slugExists)
            throw new InvalidOperationException($"A post with slug '{request.Slug}' already exists in this blog.");

        var project = Project.Create(
            request.BlogId, request.Title, request.Slug, request.Content,
            request.Description, request.Category, request.Year);

        project.Stack = request.Stack;
        project.LastPushedAt = request.LastPushedAt;
        project.CoverImageUrl = request.CoverImageUrl;
        project.Links = request.Links
            .Select(l => new ProjectLink { Label = l.Label, Url = l.Url })
            .ToList();

        if (request.IsPublished)
        {
            project.Publish();
            if (request.PublishedOn.HasValue)
                project.SetPublishedOn(request.PublishedOn.Value);
        }

        await db.Posts.AddAsync(project, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        await fileRefService.ReconcilePostFilesAsync(
            project.Id, project.Content, project.CoverImageUrl, cancellationToken);

        return project.Id;
    }
}
```

`UpdateProjectCommandHandler` — look the project up, enforce the same two guards,
assign every field, and return `false` when not found. `DeleteProjectCommandHandler`
takes `(CmsDbContext db)` only, finds the post by `BlogId` + `Id`, returns
`false` unless it is a `Project` and its blog is `Kind.Project`, then removes it
and saves.

- [ ] **Step 5: Run to verify it passes**

Run: `cd backend && dotnet test --filter ProjectCommandTests`
Expected: PASS — 6 tests.

- [ ] **Step 6: The endpoints**

Add `public const string Projects = "Projects";` to `backend/Api/Tags.cs`, then
create `backend/Api/Endpoints/Projects/ProjectEndpoints.cs` following
`BlogEndpoints.cs` exactly — `.WithName().WithDisplayName().Produces<>().WithTags()`:

```
GET    /projects[?category=]   → List<ProjectSummaryResponse>   ReadPosts
GET    /projects/{slug}        → ProjectResponse | 404          ReadPosts
POST   /projects               → 201 { id }                     WritePosts
PUT    /projects/{id}          → 200 | 404                      WritePosts
DELETE /projects/{id}          → 204 | 404                      WritePosts
```

Reuse `Permissions.ReadPosts` and `Permissions.WritePosts` deliberately — see
Decisions. Then add `.MapProjectsEndpoints()` to the chain in
`DependancyInjection.MapApi`, after `.MapPostsEndpoints()`, plus
`using Api.Endpoints.Projects;`.

- [ ] **Step 7: Run everything**

Run: `cd backend && dotnet test`
Expected: all green, and **no pre-existing test changed result**. `dotnet build`
must report 0 `warning CS`.

- [ ] **Step 8: Commit**

```bash
git add backend/Application backend/Api backend/Tests/ProjectCommandTests.cs
git commit -m "feat: project CRUD with the complementary write boundary

A project endpoint rejects a standard blog and a post endpoint rejects a
project blog, so neither content type can be written through the other's
endpoints - the two sets are exactly complementary, decided by Blog.Kind.

Creating a project whose Category does not match its blog is rejected
too, which is what makes the denormalised Category trustworthy.

The project endpoints reuse the read:posts and write:posts permissions.
A new Auth0 scope would be more precise but requires an API configuration
change, and an unconfigured scope fails as a confusing 403 at runtime."
```

---

### Task 6: End-to-end verification

Verification only. No file is expected to change.

- [ ] **Step 1: Seed a project blog and three projects over HTTP**

Start the API in Development (`dotnet run --project Host/Host.csproj` — do **not**
pass `--no-launch-profile`, or the CORS guard fires on an empty allowlist).
Using the local development database copy, create the three project blogs if they
are absent, then create one project in each via `POST /projects` with a valid
M2M token.

If obtaining a token is not straightforward, do not fabricate credentials. Fall
back to a `TestDb`-backed integration test in `backend/Tests/` that drives the
handlers directly, and say clearly in your report that the HTTP check was not
performed.

- [ ] **Step 2: Verify over HTTP**

```
GET  /public/projects              → 200, three projects, no Content field
GET  /public/projects?category=game-dev → 200, one project
GET  /public/projects/<draft-slug> → 404 for a draft, 200 for a published one
GET  /projects                      → 200 with a token, 401 without
POST /blogs  { kind: "Project" }    → creates a project blog
POST /posts  into that blog        → 400/500 with the boundary message
```

- [ ] **Step 3: The CI gate**

```bash
cd backend
dotnet build --configuration Release
dotnet test --configuration Release --no-build
```

Expected: 0 errors, 0 `warning CS`, and every test passing. Report the count.

- [ ] **Step 4: Clean up**

Stop the API. Confirm nothing is listening on 56512. Confirm the main
worktree's `backend/Host/cms.db` is byte-identical to how you found it — record
its checksum.

---

## Self-review

**Spec coverage** — every §5 requirement has a task: `Project`/`ProjectCategory`/
`ProjectLink` (1), the TPH mapping and migration (2), `Blog.Kind` and the
boundary (4, 5), `ProjectBlogs` (1), `ProjectStatusRules` and both DTOs (3),
commands/handlers/endpoints (5), `ProjectSummaryResponse` without `Content` (3),
public reads (4). §6, the admin UI, is a separate plan by design.

**Test count** — the suite enters this plan at **86** passing, and the totals below
were verified by execution, not by arithmetic on the task bodies. An earlier
draft of this section claimed 9 new tests for Tasks 0+1 and a total of 114; both
were wrong, because the task bodies add 6.

| After | New | Total | Observed |
|---|---|---|---|
| Task 1 | 6 | 92 | ✅ confirmed |
| Task 2 | 2 | 94 | ✅ confirmed |
| Task 3 | 7 | 101 | ✅ confirmed |
| Task 4 | 8 | 109 | ✅ confirmed — 2 more than planned, see below |
| Task 5 | 7 | 116 | ✅ confirmed — 1 more than planned, see below |
| Task 6 | 0 | 116 | pending |

Task 2's two tests verify persistence of the typed fields and of `Blog.Kind`
against a real database, even though the migration itself is verified separately
against a throwaway copy. Task 6 adds none — it is end-to-end verification only.

**Final state: 116 passing, verified with the exact CI command, on branch
`feat/cms-project-domain` stacked on `feat/cms-public-read`.**

**The EF Table-Per-Hierarchy discriminator was a live hazard, and the plan did not
anticipate it.** The migration EF generates for `Project : Post` adds `Discriminator`
as `NOT NULL defaultValue ""`. SQLite stamps that default onto every pre-existing
row, and `""` matches no type, so the entire `Posts` table becomes unreadable —
silently, with the migration reporting success and every row count unchanged. The
symptom is:

```
InvalidOperationException: Unable to materialize entity instance of type 'Post'.
No discriminators matched the discriminator value ''.
```

Only reading through EF against a real migrated database catches this. Row counts
and `dotnet test` both pass while it is broken. Two things were needed:

- `HasValue<Post>(null)` is **not** usable. EF Core 9.0.11's
  `DiscriminatorLengthConvention` throws a `NullReferenceException` while inferring
  a column length from a null root value, whether the discriminator is a
  name-only shadow property or a real CLR property.
- The root value is therefore **named** (`"Post"`), and the migration carries a
  single hand edit aligning `defaultValue` with it. That is the only hand edit in
  the file and is marked as such in the source.

**Two tests were added that the plan did not call for.** The Update side of the
post boundary had no test, and neither did "post not found must still return
`false`" — which matters because the blog lookup sits after the post lookup, and
only a test proves a missing post is not turned into a throw.

**The plan's `Validator_RejectsACategoryThatDoesNotMatchTheBlog` was a placebo** —
it asserted only that two slugs differ, validating nothing. Replaced with one that
seeds a `graphics` blog, attempts a `GameDev` project, and asserts the throw.

**`Blog.Kind` was settable on the entity but not through the API.** The plan's
File Structure listed `CreateBlogCommand`/`UpdateBlogCommand` as modified but no
task assigned the work, so a project blog could not be created over HTTP at all and
`POST /blogs { kind: "Project" }` would have silently produced a `Standard` blog
that no project could ever be written into. Fixed, with a rule that a `Project`
blog must use one of the three registered slugs.

**Defect found in this plan during execution, recorded so the next reader does not
repeat it:** Task 0's `SeedProject` helper originally contained
`project.Kind = BlogKind.Project;`. `Kind` is a property of `Blog`, not of `Post`,
so that line does not compile — `Project` inherits from `Post`, which has no such
member. The blog's kind comes from `SeedBlog`'s `kind` parameter instead, which is
what every call site already passes. Count project slugs against the *domain*
model, not the plan's prose, before transcribing.

**Type consistency** — `ProjectBlogs.SlugFor` and `.For` are defined once and used
by `Project.Create`, `CreateProjectCommandHandler` and the tests.
`ProjectStatusRules.Derive` is the only status implementation, called from both
DTO factories. `BlogKind` is referenced by `Blog`, `ProjectEntity`'s callers, both
post handlers and both project handlers.
