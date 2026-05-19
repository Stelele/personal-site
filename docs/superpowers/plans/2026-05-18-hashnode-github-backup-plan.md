# Hashnode GitHub Backup Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Hashnode GraphQL API integration with GitHub backup repository parsing, following the same pattern as Medium implementation.

**Architecture:** Backend fetches HTML files from GitHub API, parses them server-side using Go's html parser, extracts post metadata and content, returns clean JSON to frontend. Frontend calls new `/hashnode-posts` endpoint and wraps response in Blog format.

**Tech Stack:** Go (backend), Vue 3 + TypeScript (frontend), GitHub REST API, Go html parser

---

## File Structure

**Backend files to modify:**
- `backend/feeds.go` - Add `getHashnodeFeed()` function and HTML parsing helpers
- `backend/main.go` - Add `/hashnode-posts` endpoint handler

**Frontend files to modify:**
- `frontend/src/helpers/blogs/hashnode.ts` - Update to call backend API instead of GraphQL

**No changes needed:**
- `backend/main.go` handler registration only
- `frontend/src/helpers/downloader.ts` - Already handles multiple blog sources
- `frontend/src/helpers/type.ts` - Blog/Post interfaces already support this
- `frontend/src/stores/aritcles-store.ts` - Already stores Blog[]
- `frontend/src/pages/blog/Blog.vue` - Already renders HTML content

---

### Task 1: Backend - Add Hashnode Post Struct and GitHub File Struct

**Files:**
- Modify: `backend/feeds.go`

- [ ] **Step 1: Add HashnodePost struct to feeds.go**

Add after the existing `Post` struct (around line 24):

```go
type HashnodePost struct {
	Title      string
	Subtitle   string
	Date       string
	Summary    string
	CoverImage string
	URL        string
	Content    string
	Tags       []string
}
```

- [ ] **Step 2: Commit the change**

```bash
cd /home/gift/Documents/code-projects/personal-site/backend
git add feeds.go
git commit -m "refactor: add HashnodePost struct for backup parsing"
```

---

### Task 2: Backend - Add getHashnodeFeed Function

**Files:**
- Modify: `backend/feeds.go`

- [ ] **Step 1: Add getHashnodeFeed function after getMediumFeed**

Add this function after the `getMediumFeed()` function (around line 80):

```go
func getHashnodeFeed() ([]Post, error) {
	apiURL := "https://api.github.com/repos/Stelele/hashnode-blog-backups/contents"
	resp, err := httpClient.Get(apiURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var files []GitHubFile
	if err := json.NewDecoder(resp.Body).Decode(&files); err != nil {
		return nil, err
	}

	var wg sync.WaitGroup
	var mu sync.Mutex
	posts := make([]Post, 0, len(files))

	for _, file := range files {
		if !strings.HasSuffix(file.Name, ".html") {
			continue
		}

		wg.Add(1)
		go func(file GitHubFile) {
			defer wg.Done()

			post, err := fetchAndParseHashnodePost(file)
			if err != nil {
				log.Printf("Error fetching %s: %v", file.DownloadURL, err)
				return
			}

			mu.Lock()
			posts = append(posts, post)
			mu.Unlock()
		}(file)
	}

	wg.Wait()

	sort.Slice(posts, func(i, j int) bool {
		return posts[i].Date > posts[j].Date
	})

	return posts, nil
}
```

- [ ] **Step 2: Commit the change**

```bash
cd /home/gift/Documents/code-projects/personal-site/backend
git add feeds.go
git commit -m "feat: add getHashnodeFeed function skeleton"
```

---

### Task 3: Backend - Add fetchAndParseHashnodePost Function

**Files:**
- Modify: `backend/feeds.go`

- [ ] **Step 1: Add fetchAndParseHashnodePost function**

Add this function after `fetchAndParsePost` (around line 198):

```go
func fetchAndParseHashnodePost(file GitHubFile) (Post, error) {
	resp, err := httpClient.Get(file.DownloadURL)
	if err != nil {
		return Post{}, err
	}
	defer resp.Body.Close()

	doc, err := html.Parse(resp.Body)
	if err != nil {
		return Post{}, err
	}

	var post Post
	post.URL = file.DownloadURL
	
	// Extract date from filename (e.g., 2024-05-18.html)
	post.Date = extractDateFromFilename(file.Name)

	var findElements func(*html.Node)
	findElements = func(n *html.Node) {
		if n.Type == html.ElementNode {
			switch n.Data {
			case "h1":
				if hasClassPrefix(n, "text-2xl") {
					post.Title = getTextContent(n)
				}
			case "img":
				if post.CoverImage == "" {
					post.CoverImage = extractCDNImageURL(n)
				}
			case "div":
				if hasClassPrefix(n, "prose") {
					post.Content = extractProseContent(n)
					if post.Summary == "" {
						post.Summary = extractFirstParagraph(n)
					}
				}
				if hasClass(n, "flex") && hasClass(n, "flex-wrap") && hasClass(n, "items-center") && hasClass(n, "gap-2") {
					post.Tags = append(post.Tags, extractTagsFromDiv(n)...)
				}
			case "a":
				if hasClass(n, "inline-flex") && hasClass(n, "items-center") && hasClass(n, "gap-1.5") {
					tag := extractTagFromLink(n)
					if tag != "" {
						post.Tags = append(post.Tags, tag)
					}
				}
			}
		}

		for c := n.FirstChild; c != nil; c = c.NextSibling {
			findElements(c)
		}
	}

	findElements(doc)

	// Construct GitHub blob URL
	post.URL = fmt.Sprintf("https://github.com/Stelele/hashnode-blog-backups/blob/main/%s", file.Name)

	return post, nil
}
```

- [ ] **Step 2: Commit the change**

```bash
cd /home/gift/Documents/code-projects/personal-site/backend
git add feeds.go
git commit -m "feat: add fetchAndParseHashnodePost function"
```

---

### Task 4: Backend - Add Helper Functions for Hashnode Parsing

**Files:**
- Modify: `backend/feeds.go`

- [ ] **Step 1: Add extractDateFromFilename helper**

Add after the existing helper functions (around line 278):

```go
func extractDateFromFilename(filename string) string {
	re := regexp.MustCompile(`(\d{4}-\d{2}-\d{2})\.html`)
	matches := re.FindStringSubmatch(filename)
	if len(matches) > 1 {
		return matches[1] + "T00:00:00.000Z"
	}
	return time.Now().Format(time.RFC3339)
}
```

- [ ] **Step 2: Add extractCDNImageURL helper**

```go
func extractCDNImageURL(n *html.Node) string {
	srcset := getAttr(n, "srcset")
	if srcset == "" {
		return getAttr(n, "src")
	}

	// Extract first URL from srcset
	re := regexp.MustCompile(`url=([^&\s]+)`)
	matches := re.FindStringSubmatch(srcset)
	if len(matches) > 1 {
		decoded, err := url.QueryUnescape(matches[1])
		if err == nil {
			return decoded
		}
	}

	return getAttr(n, "src")
}
```

- [ ] **Step 3: Add extractProseContent helper**

```go
func extractProseContent(n *html.Node) string {
	var sb strings.Builder
	
	// Clean and render the prose div content
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		renderCleanNode(c, &sb)
	}

	return sb.String()
}
```

- [ ] **Step 4: Add extractFirstParagraph helper**

```go
func extractFirstParagraph(n *html.Node) string {
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		if c.Type == html.ElementNode && c.Data == "p" {
			text := getTextContent(c)
			if len(text) > 200 {
				return text[:200] + "..."
			}
			return text
		}
	}
	return ""
}
```

- [ ] **Step 5: Add extractTagsFromDiv helper**

```go
func extractTagsFromDiv(n *html.Node) []string {
	var tags []string
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		if c.Type == html.ElementNode && c.Data == "a" {
			tag := extractTagFromLink(c)
			if tag != "" {
				tags = append(tags, tag)
			}
		}
	}
	return tags
}
```

- [ ] **Step 6: Add extractTagFromLink helper**

```go
func extractTagFromLink(n *html.Node) string {
	href := getAttr(n, "href")
	if strings.HasPrefix(href, "/tag/") {
		return strings.TrimPrefix(href, "/tag/")
	}
	return ""
}
```

- [ ] **Step 7: Add renderCleanNode helper**

```go
func renderCleanNode(n *html.Node, sb *strings.Builder) {
	if n.Type == html.TextNode {
		sb.WriteString(n.Data)
	} else if n.Type == html.ElementNode {
		// Skip certain Hashnode-specific elements
		if n.Data == "aside" || n.Data == "nav" {
			return
		}

		sb.WriteString("<")
		sb.WriteString(n.Data)
		
		// Filter attributes
		for _, attr := range n.Attr {
			// Skip Hashnode-specific attributes
			if attr.Key == "data-nimg" || 
			   strings.HasPrefix(attr.Key, "data-darkreader") ||
			   strings.HasPrefix(attr.Val, "--darkreader") {
				continue
			}
			
			// Clean classes - remove Hashnode-specific ones
			if attr.Key == "class" {
				attr.Val = cleanClasses(attr.Val)
				if attr.Val == "" {
					continue
				}
			}
			
			sb.WriteString(" ")
			sb.WriteString(attr.Key)
			sb.WriteString("=\"")
			sb.WriteString(attr.Val)
			sb.WriteString("\"")
		}
		sb.WriteString(">")
		
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			renderCleanNode(c, sb)
		}
		
		sb.WriteString("</")
		sb.WriteString(n.Data)
		sb.WriteString(">")
	}
}
```

- [ ] **Step 8: Add cleanClasses helper**

```go
func cleanClasses(classStr string) string {
	classes := strings.Fields(classStr)
	cleaned := make([]string, 0, len(classes))
	
	for _, class := range classes {
		// Keep prose, hljs, and utility classes
		if strings.HasPrefix(class, "prose") ||
		   strings.HasPrefix(class, "hljs") ||
		   strings.HasPrefix(class, "fa-") ||
		   class == "copy-code-button" ||
		   class == "copy-icon" ||
		   class == "check-icon" {
			cleaned = append(cleaned, class)
		}
	}
	
	return strings.Join(cleaned, " ")
}
```

- [ ] **Step 9: Add hasClassPrefix helper**

```go
func hasClassPrefix(n *html.Node, prefix string) bool {
	for _, attr := range n.Attr {
		if attr.Key == "class" && strings.HasPrefix(attr.Val, prefix) {
			return true
		}
	}
	return false
}
```

- [ ] **Step 10: Add hasClass helper**

```go
func hasClass(n *html.Node, class string) bool {
	for _, attr := range n.Attr {
		if attr.Key == "class" {
			classes := strings.Fields(attr.Val)
			for _, c := range classes {
				if c == class {
					return true
				}
			}
		}
	}
	return false
}
```

- [ ] **Step 11: Add import for url package**

Update the imports at the top of feeds.go to include:

```go
import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"net/url"  // Add this line
	"regexp"   // Add this line
	"sort"
	"strings"
	"sync"
	"time"

	"golang.org/x/net/html"
)
```

- [ ] **Step 12: Commit the change**

```bash
cd /home/gift/Documents/code-projects/personal-site/backend
git add feeds.go
git commit -m "feat: add helper functions for Hashnode HTML parsing"
```

---

### Task 5: Backend - Add handleGetHashnodePosts Handler

**Files:**
- Modify: `backend/main.go`

- [ ] **Step 1: Add handler function**

Add after `handleGetMediumPosts` (around line 73):

```go
func handleGetHashnodePosts(w http.ResponseWriter, r *http.Request) {
	posts, err := getHashnodeFeed()
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(posts)
}
```

- [ ] **Step 2: Register the route**

Update the route registration in `main()` (around line 22):

```go
r.HandleFunc("/feed", handleGetRssFeed).Methods("GET")
r.HandleFunc("/medium-posts", handleGetMediumPosts).Methods("GET")
r.HandleFunc("/hashnode-posts", handleGetHashnodePosts).Methods("GET")  // Add this line
r.HandleFunc("/cms/blogs", handleGetCmsBlogs).Methods("GET")
r.HandleFunc("/cms/blogs/{blogId}/posts", handleGetCmsPosts).Methods("GET")
```

- [ ] **Step 3: Commit the change**

```bash
cd /home/gift/Documents/code-projects/personal-site/backend
git add main.go
git commit -m "feat: add /hashnode-posts endpoint handler"
```

---

### Task 6: Backend - Build and Test

**Files:**
- `backend/`

- [ ] **Step 1: Build the backend**

```bash
cd /home/gift/Documents/code-projects/personal-site/backend
go build -o bin/server .
```

Expected: No compilation errors

- [ ] **Step 2: Run the backend**

```bash
cd /home/gift/Documents/code-projects/personal-site/backend
./bin/server
```

Expected: Server starts on localhost:3000

- [ ] **Step 3: Test the endpoint**

In a new terminal:

```bash
curl -s http://localhost:3000/hashnode-posts | jq '.[0] | {title, date, tags}'
```

Expected: JSON response with at least one post showing title, date, and tags

- [ ] **Step 4: Stop the backend**

```bash
pkill -f "./bin/server"
```

- [ ] **Step 5: Commit if everything works**

```bash
cd /home/gift/Documents/code-projects/personal-site/backend
git add .
git commit -m "test: verify hashnode endpoint works"
```

---

### Task 7: Frontend - Update hashnode.ts

**Files:**
- Modify: `frontend/src/helpers/blogs/hashnode.ts`

- [ ] **Step 1: Replace getHashNodePosts function**

Replace the entire `getHashNodePosts()` function (lines 4-44) with:

```typescript
async function getHashNodePosts(): Promise<Post[]> {
  return await fetch(`${import.meta.env.VITE_PRIV_API_URL}/hashnode-posts`).then((r) => r.json());
}
```

- [ ] **Step 2: Update getHashNodeFeed to use new structure**

Replace the `getHashNodeFeed()` function (lines 46-72) with:

```typescript
export async function getHashNodeFeed(): Promise<Blog> {
  const posts = await getHashNodePosts();

  return {
    id: "hashnode",
    name: "Hashnode Blog",
    description: "Exploring web development, JavaScript, programming concepts, and software engineering insights.",
    slug: "hashnode",
    icon: "i-simple-icons:hashnode",
    posts: posts,
    contentType: 'html',
  };
}
```

- [ ] **Step 3: Clean up unused imports**

Remove the `HashnodeFeed` and `HashnodePost` imports since they're no longer needed. Update line 2:

```typescript
import { Blog, Post } from "@/helpers/type";
```

- [ ] **Step 4: Commit the change**

```bash
cd /home/gift/Documents/code-projects/personal-site/frontend
git add src/helpers/blogs/hashnode.ts
git commit -m "feat: update hashnode.ts to use GitHub backup API"
```

---

### Task 8: Frontend - Type Check and Build

**Files:**
- `frontend/`

- [ ] **Step 1: Run type check**

```bash
cd /home/gift/Documents/code-projects/personal-site/frontend
npm run build
```

Expected: No TypeScript errors

- [ ] **Step 2: Start dev server**

```bash
cd /home/gift/Documents/code-projects/personal-site/frontend
npm run dev
```

- [ ] **Step 3: Test in browser**

Navigate to:
- `http://localhost:5173/blog/hashnode` - Should show Hashnode blog posts
- Click on a post - Should render content correctly

- [ ] **Step 4: Stop dev server**

```bash
# Press Ctrl+C in the dev server terminal
```

- [ ] **Step 5: Commit if everything works**

```bash
cd /home/gift/Documents/code-projects/personal-site/frontend
git add .
git commit -m "test: verify frontend integration works"
```

---

### Task 9: Integration Testing

**Files:**
- Full application

- [ ] **Step 1: Start backend**

```bash
cd /home/gift/Documents/code-projects/personal-site/backend
./bin/server &
```

- [ ] **Step 2: Start frontend**

```bash
cd /home/gift/Documents/code-projects/personal-site/frontend
npm run dev &
```

- [ ] **Step 3: Test blog listing page**

Navigate to `http://localhost:5173/blog` and verify:
- Hashnode blog appears in the list
- Posts are sorted by date (newest first)
- Cover images load correctly
- Tags display properly

- [ ] **Step 4: Test individual post page**

Click on a Hashnode post and verify:
- Title displays correctly
- Date formats properly
- Content renders with proper styling
- Images are centered and sized correctly
- "View original article" link points to GitHub backup

- [ ] **Step 5: Test SEO meta tags**

Check browser dev tools → Elements → `<head>` for:
- Correct `<title>` tag
- Meta description populated
- Open Graph tags present

- [ ] **Step 6: Stop servers**

```bash
pkill -f "npm run dev"
pkill -f "./bin/server"
```

- [ ] **Step 7: Commit final changes**

```bash
cd /home/gift/Documents/code-projects/personal-site
git add .
git commit -m "test: integration testing complete"
```

---

### Task 10: Cleanup and Final Commit

**Files:**
- Full repository

- [ ] **Step 1: Run linter on backend**

```bash
cd /home/gift/Documents/code-projects/personal-site/backend
go fmt ./...
go vet ./...
```

- [ ] **Step 2: Run formatter on frontend**

```bash
cd /home/gift/Documents/code-projects/personal-site/frontend
npm run format
```

- [ ] **Step 3: Run linter on frontend**

```bash
cd /home/gift/Documents/code-projects/personal-site/frontend
npm run lint
```

- [ ] **Step 4: Make final commit with all changes**

```bash
cd /home/gift/Documents/code-projects/personal-site
git add .
git commit -m "feat: migrate hashnode from GraphQL API to GitHub backup

- Backend parses HTML files from hashnode-blog-backups repo
- Extracts title, date, cover image, content, brief, and tags
- Cleans Hashnode-specific attributes while preserving prose-compatible HTML
- Frontend calls /hashnode-posts endpoint
- Maintains same Blog interface as Medium implementation"
```

---

## Testing Checklist

After implementation, verify:

- [ ] Backend compiles without errors
- [ ] `/hashnode-posts` endpoint returns valid JSON
- [ ] Posts are sorted by date (newest first)
- [ ] Each post has: title, date, coverImage, content, brief, tags, url
- [ ] Cover images load from Hashnode CDN
- [ ] Content renders correctly in Blog.vue
- [ ] Tags display properly
- [ ] No console errors in browser
- [ ] SEO meta tags populate correctly
- [ ] Original article link points to GitHub backup

---

## Rollback Plan

If issues occur:

1. **Backend issues:** Revert `backend/feeds.go` and `backend/main.go` changes
2. **Frontend issues:** Revert `frontend/src/helpers/blogs/hashnode.ts` changes
3. **Restore GraphQL:** The old `hashnode.ts` implementation can be restored from git history

```bash
git revert HEAD~5..HEAD  # Adjust commit range as needed
```
