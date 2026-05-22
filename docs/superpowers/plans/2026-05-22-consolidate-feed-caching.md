# Consolidate Feed Caching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate duplicated caching and GitHub fetch logic between Medium and Hashnode feed functions into reusable helpers.

**Architecture:** Extract common patterns into `getCachedFeed()` helper for cache management and `fetchGitHubRepoPosts()` for GitHub API fetching. Each feed (Medium, Hashnode) gets its own cache instance but shares the same fetch/caching logic.

**Tech Stack:** Go, gorilla/mux, sync package for mutexes, golang.org/x/net/html for parsing

---

## File Structure

**Modify:**
- `backend/feeds.go` — Main refactoring target
  - Replace `postsCache` with `feedCache` (rename)
  - Add `mediumCache` and `hashnodeCache` instances
  - Add `getCachedFeed()` helper function
  - Add `fetchGitHubRepoPosts()` generic fetcher
  - Refactor `fetchAndParsePost` → `parseMediumPost`
  - Refactor `fetchAndParseHashnodePost` → `parseHashnodePost`
  - Update `getMediumFeed()` and `getHashnodeFeed()` to use new helpers

**No new files** — keeping changes contained to existing `feeds.go`

---

### Task 1: Rename Cache Structure

**Files:**
- Modify: `backend/feeds.go:43-50`

- [ ] **Step 1: Rename postsCache to feedCache and create separate instances**

Replace lines 43-50:
```go
type feedCache struct {
	posts  []Post
	loaded bool
	mu     sync.RWMutex
}

var (
	mediumCache   = feedCache{}
	hashnodeCache = feedCache{}
)
```

Remove the old `var cache postsCache` line.

- [ ] **Step 2: Commit**

```bash
git add backend/feeds.go
git commit -m "refactor: split cache into separate medium and hashnode instances"
```

---

### Task 2: Add getCachedFeed Helper

**Files:**
- Modify: `backend/feeds.go` — add after the cache struct definition

- [ ] **Step 1: Add the unified cache helper function**

Add after the cache variable declarations:
```go
func getCachedFeed(cache *feedCache, fetchFunc func() ([]Post, error)) ([]Post, error) {
	cache.mu.RLock()
	if cache.loaded {
		defer cache.mu.RUnlock()
		return cache.posts, nil
	}
	cache.mu.RUnlock()

	cache.mu.Lock()
	defer cache.mu.Unlock()
	if cache.loaded {
		return cache.posts, nil
	}

	posts, err := fetchFunc()
	if err != nil {
		return nil, err
	}
	cache.posts = posts
	cache.loaded = true
	return posts, nil
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/feeds.go
git commit -m "refactor: extract getCachedFeed helper for DRY cache pattern"
```

---

### Task 3: Add fetchGitHubRepoPosts Generic Fetcher

**Files:**
- Modify: `backend/feeds.go` — add after getCachedFeed

- [ ] **Step 1: Add the generic GitHub fetcher function**

Add after `getCachedFeed`:
```go
func fetchGitHubRepoPosts(
	apiURL string,
	parseFunc func(content []byte, file GitHubFile) (Post, error),
	logPrefix string,
) ([]Post, error) {
	log.Printf("[%s] Fetching file list from GitHub", logPrefix)
	resp, err := httpClient.Get(apiURL)
	if err != nil {
		log.Printf("[%s] Error fetching file list: %v", logPrefix, err)
		return nil, err
	}
	defer resp.Body.Close()
	log.Printf("[%s] Got response from GitHub, status: %s", logPrefix, resp.Status)

	var files []GitHubFile
	if err := json.NewDecoder(resp.Body).Decode(&files); err != nil {
		log.Printf("[%s] Error decoding file list: %v", logPrefix, err)
		return nil, err
	}
	log.Printf("[%s] Found %d files in repo", logPrefix, len(files))

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
			log.Printf("[%s] Fetching file: %s", logPrefix, file.Name)

			resp, err := httpClient.Get(file.DownloadURL)
			if err != nil {
				log.Printf("[%s] Error fetching %s: %v", logPrefix, file.DownloadURL, err)
				return
			}
			defer resp.Body.Close()

			content, err := io.ReadAll(resp.Body)
			if err != nil {
				log.Printf("[%s] Error reading %s: %v", logPrefix, file.DownloadURL, err)
				return
			}

			post, err := parseFunc(content, file)
			if err != nil {
				log.Printf("[%s] Error parsing %s: %v", logPrefix, file.Name, err)
				return
			}

			mu.Lock()
			posts = append(posts, post)
			mu.Unlock()
			log.Printf("[%s] Parsed file: %s, title: %s", logPrefix, file.Name, post.Title)
		}(file)
	}

	wg.Wait()
	log.Printf("[%s] Finished parsing all files, total posts: %d", logPrefix, len(posts))

	sort.Slice(posts, func(i, j int) bool {
		return posts[i].Date > posts[j].Date
	})

	return posts, nil
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/feeds.go
git commit -m "feat: add fetchGitHubRepoPosts generic fetcher with concurrent parsing"
```

---

### Task 4: Refactor parseMediumPost Parser

**Files:**
- Modify: `backend/feeds.go:201-270` (current `fetchAndParsePost`)

- [ ] **Step 1: Create parseMediumPost function**

Replace `fetchAndParsePost` function with:
```go
func parseMediumPost(content []byte, file GitHubFile) (Post, error) {
	doc, err := html.Parse(bytes.NewReader(content))
	if err != nil {
		return Post{}, err
	}

	var post Post
	post.URL = file.DownloadURL

	var findMeta func(*html.Node, *html.Node) // node, parent

	findMeta = func(n *html.Node, parent *html.Node) {
		if n.Type == html.ElementNode {
			switch n.Data {
			case "title":
				if n.FirstChild != nil {
					post.Title = n.FirstChild.Data
					post.ID = generateTitleHash(post.Title)
				}
			case "section":
				for _, attr := range n.Attr {
					if attr.Key == "data-field" && attr.Val == "subtitle" {
						post.Subtitle = getTextContent(n)
					}
					if attr.Key == "class" && attr.Val == "p-summary" {
						post.Summary = getTextContent(n)
					}
					if attr.Key == "class" && attr.Val == "e-content" {
						contentBuilder := &strings.Builder{}
						firstImg := findFirstImg(n)
						if firstImg != nil {
							post.CoverImage = getAttr(firstImg, "src")
						}
						renderNodeToBuilder(n, contentBuilder)
						post.Content = removeContentBeforeFirstImg(contentBuilder.String())
					}
				}
			case "h4":
				for _, attr := range n.Attr {
					if attr.Key == "class" && strings.Contains(attr.Val, "graf--subtitle") {
						post.Subtitle = getTextContent(n)
					}
				}
			case "time":
				for _, attr := range n.Attr {
					if attr.Key == "class" && attr.Val == "dt-published" {
						post.Date = getAttr(n, "datetime")
						if parent != nil && parent.Data == "a" {
							post.URL = getAttr(parent, "href")
						}
					}
				}
			}
		}

		for c := n.FirstChild; c != nil; c = c.NextSibling {
			findMeta(c, n)
		}
	}

	findMeta(doc, nil)

	return post, nil
}
```

Add `import "bytes"` at the top of the file if not present.

- [ ] **Step 2: Commit**

```bash
git add backend/feeds.go
git commit -m "refactor: extract parseMediumPost parser function"
```

---

### Task 5: Refactor parseHashnodePost Parser

**Files:**
- Modify: `backend/feeds.go:274-342` (current `fetchAndParseHashnodePost`)

- [ ] **Step 1: Rename and update parseHashnodePost signature**

Update the function signature from:
```go
func fetchAndParseHashnodePost(file GitHubFile) (Post, error)
```

To:
```go
func parseHashnodePost(content []byte, file GitHubFile) (Post, error)
```

Update the function body to use `html.Parse(bytes.NewReader(content))` instead of fetching from `file.DownloadURL`.

The rest of the parsing logic stays the same.

- [ ] **Step 2: Commit**

```bash
git add backend/feeds.go
git commit -m "refactor: rename fetchAndParseHashnodePost to parseHashnodePost"
```

---

### Task 6: Update getMediumFeed to Use Helpers

**Files:**
- Modify: `backend/feeds.go:74-97`

- [ ] **Step 1: Replace getMediumFeed implementation**

Replace the entire function with:
```go
func getMediumFeed() ([]Post, error) {
	return getCachedFeed(&mediumCache, func() ([]Post, error) {
		return fetchGitHubRepoPosts(
			"https://api.github.com/repos/Stelele/medium-blogs-backup/contents",
			parseMediumPost,
			"Medium",
		)
	})
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/feeds.go
git commit -m "refactor: getMediumFeed uses unified cache and fetch helpers"
```

---

### Task 7: Update getHashnodeFeed to Use Helpers

**Files:**
- Modify: `backend/feeds.go:99-153`

- [ ] **Step 1: Replace getHashnodeFeed implementation**

Replace the entire function with:
```go
func getHashnodeFeed() ([]Post, error) {
	return getCachedFeed(&hashnodeCache, func() ([]Post, error) {
		return fetchGitHubRepoPosts(
			"https://api.github.com/repos/Stelele/hashnode-blog-backups/contents",
			parseHashnodePost,
			"Hashnode",
		)
	})
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/feeds.go
git commit -m "refactor: getHashnodeFeed uses unified cache and fetch helpers"
```

---

### Task 8: Verify and Test

**Files:**
- Test: Manual API testing via curl or browser

- [ ] **Step 1: Start the server (air should auto-reload)**

```bash
cd backend
# air should already be running, watch for reload logs
```

- [ ] **Step 2: Test Medium endpoint**

```bash
curl http://localhost:3000/medium-posts | jq 'length'
# Expected: Returns number of Medium posts (should be > 0)
```

- [ ] **Step 3: Test Hashnode endpoint**

```bash
curl http://localhost:3000/hashnode-posts | jq 'length'
# Expected: Returns number of Hashnode posts (should be > 0)
```

- [ ] **Step 4: Test caching (second request should be instant)**

```bash
time curl http://localhost:3000/hashnode-posts > /dev/null
# First call: ~2-5 seconds (fetches from GitHub)
# Second call: < 100ms (cached)
```

- [ ] **Step 5: Check logs confirm caching behavior**

Look for logs showing fetch only happens once per endpoint.

---

### Task 9: Final Cleanup Commit

**Files:**
- Modify: `backend/feeds.go`

- [ ] **Step 1: Remove any unused helper functions**

Check if these functions are still used:
- `getRssFeed` — used by `/feed` endpoint, keep if needed
- Any other helpers only used by removed code

- [ ] **Step 2: Final commit**

```bash
git add backend/feeds.go
git commit -m "chore: clean up unused functions after refactoring"
```

---

## Summary

**Total commits:** 7-9
**Lines changed:** ~100 (net reduction due to DRY)
**Key wins:**
- Eliminated duplicate cache pattern
- Eliminated duplicate GitHub fetch logic
- Separate caches per feed (correct semantics)
- Easier to add new feed sources in future
