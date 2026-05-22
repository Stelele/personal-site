package main

import (
	"crypto/md5"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"sort"
	"strings"
	"sync"
	"time"

	"golang.org/x/net/html"
)

type Post struct {
	ID         string `json:"id"`
	Title      string `json:"title"`
	Subtitle   string `json:"subtitle,omitempty"`
	Date       string `json:"publishDate"`
	Summary    string `json:"summary,omitempty"`
	CoverImage string `json:"coverImage,omitempty"`
	URL        string `json:"url"`
	Content    string `json:"content"`
	Tags       []string `json:"tags,omitempty"`
}

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

type feedCache struct {
	posts  []Post
	loaded bool
	mu     sync.RWMutex
}

var (
	mediumCache   = feedCache{}
	hashnodeCache = feedCache{}
)

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

var httpClient = &http.Client{Timeout: 30 * time.Second}

type GitHubFile struct {
	Name        string `json:"name"`
	DownloadURL string `json:"download_url"`
}

func getRssFeed(url string) (string, error) {
	response, err := http.Get(url)
	if err != nil {
		return "", err
	}
	defer response.Body.Close()

	var sb strings.Builder
	_, err = io.Copy(&sb, response.Body)
	if err != nil {
		log.Println("Error:", err)
		return "", err
	}

	return sb.String(), nil
}

func getMediumFeed() ([]Post, error) {
	mediumCache.mu.RLock()
	if mediumCache.loaded {
		defer mediumCache.mu.RUnlock()
		return mediumCache.posts, nil
	}
	mediumCache.mu.RUnlock()

	mediumCache.mu.Lock()
	defer mediumCache.mu.Unlock()

	if mediumCache.loaded {
		return mediumCache.posts, nil
	}

	posts, err := fetchAllPostsFromGitHub()
	if err != nil {
		return nil, err
	}

	mediumCache.posts = posts
	mediumCache.loaded = true
	return posts, nil
}

func getHashnodeFeed() ([]Post, error) {
	log.Println("Fetching hashnode file list from GitHub")
	apiURL := "https://api.github.com/repos/Stelele/hashnode-blog-backups/contents"
	resp, err := httpClient.Get(apiURL)
	if err != nil {
		log.Printf("Error fetching file list: %v", err)
		return nil, err
	}
	defer resp.Body.Close()
	log.Printf("Got response from GitHub, status: %s", resp.Status)

	var files []GitHubFile
	if err := json.NewDecoder(resp.Body).Decode(&files); err != nil {
		log.Printf("Error decoding file list: %v", err)
		return nil, err
	}
	log.Printf("Found %d files in repo", len(files))

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
			log.Printf("Fetching file: %s", file.Name)

			post, err := fetchAndParseHashnodePost(file)
			if err != nil {
				log.Printf("Error fetching %s: %v", file.DownloadURL, err)
				return
			}

			mu.Lock()
			posts = append(posts, post)
			mu.Unlock()
			log.Printf("Parsed file: %s, title: %s", file.Name, post.Title)
		}(file)
	}

	wg.Wait()
	log.Printf("Finished parsing all files, total posts: %d", len(posts))

	sort.Slice(posts, func(i, j int) bool {
		return posts[i].Date > posts[j].Date
	})

	return posts, nil
}

func fetchAllPostsFromGitHub() ([]Post, error) {
	apiURL := "https://api.github.com/repos/Stelele/medium-blogs-backup/contents"
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
		go func(downloadURL string) {
			defer wg.Done()

			post, err := fetchAndParsePost(downloadURL)
			if err != nil {
				log.Printf("Error fetching %s: %v", downloadURL, err)
				return
			}

			mu.Lock()
			posts = append(posts, post)
			mu.Unlock()
		}(file.DownloadURL)
	}

	wg.Wait()

	sort.Slice(posts, func(i, j int) bool {
		return posts[i].Date > posts[j].Date
	})

	return posts, nil
}

func fetchAndParsePost(downloadURL string) (Post, error) {
	resp, err := httpClient.Get(downloadURL)
	if err != nil {
		return Post{}, err
	}
	defer resp.Body.Close()

	doc, err := html.Parse(resp.Body)
	if err != nil {
		return Post{}, err
	}

	var post Post
	post.URL = downloadURL

	var findMeta func(*html.Node, *html.Node) // node, parent

	findMeta = func(n *html.Node, parent *html.Node) {
		if n.Type == html.ElementNode {
			switch n.Data {
			case "title":
				if n.FirstChild != nil {
					post.Title = n.FirstChild.Data
					// Generate ID from title (same as frontend's generateTitleHash)
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
						// Get href from parent <a>
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
	post.ID = generateTitleHash(file.Name)

	// Extract date from filename (e.g., 2024-05-18.html)
	post.Date = extractDateFromFilename(file.Name)

	var canonicalURL string

	var findElements func(*html.Node)
	findElements = func(n *html.Node) {
		if n.Type == html.ElementNode {
			switch n.Data {
			case "link":
				if getAttr(n, "rel") == "canonical" {
					canonicalURL = getAttr(n, "href")
				}
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

	// Use canonical URL if found, otherwise fallback to GitHub blob URL
	if canonicalURL != "" {
		post.URL = canonicalURL
	} else {
		post.URL = fmt.Sprintf("https://github.com/Stelele/hashnode-blog-backups/blob/main/%s", file.Name)
	}

	return post, nil
}

func getAttr(n *html.Node, key string) string {
	for _, attr := range n.Attr {
		if attr.Key == key {
			return attr.Val
		}
	}
	return ""
}

func getTextContent(n *html.Node) string {
	var sb strings.Builder
	var traverse func(*html.Node)
	traverse = func(node *html.Node) {
		if node.Type == html.TextNode {
			sb.WriteString(node.Data)
		}
		for c := node.FirstChild; c != nil; c = c.NextSibling {
			traverse(c)
		}
	}
	traverse(n)
	return sb.String()
}

func findFirstImg(n *html.Node) *html.Node {
	if n.Type == html.ElementNode && n.Data == "img" {
		return n
	}
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		if found := findFirstImg(c); found != nil {
			return found
		}
	}
	return nil
}

func renderNodeFrom(start *html.Node, sb *strings.Builder) {
	for c := start; c != nil; c = c.NextSibling {
		renderNodeToBuilder(c, sb)
	}
}

func renderNodeToBuilder(n *html.Node, sb *strings.Builder) {
	if n.Type == html.TextNode {
		sb.WriteString(n.Data)
	} else if n.Type == html.ElementNode {
		sb.WriteString("<")
		sb.WriteString(n.Data)
		for _, attr := range n.Attr {
			sb.WriteString(" ")
			sb.WriteString(attr.Key)
			sb.WriteString("=\"")
			sb.WriteString(attr.Val)
			sb.WriteString("\"")
		}
		sb.WriteString(">")
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			renderNodeToBuilder(c, sb)
		}
		sb.WriteString("</")
		sb.WriteString(n.Data)
		sb.WriteString(">")
	}
}

func removeContentBeforeFirstImg(content string) string {
	idx := strings.Index(content, "<img")
	if idx == -1 {
		return content
	}

	endIdx := strings.Index(content[idx:], ">")
	if endIdx == -1 {
		return content
	}
	endIdx += idx + 1

	return content[endIdx:]
}

func extractDateFromFilename(filename string) string {
	re := regexp.MustCompile(`(\d{4}-\d{2}-\d{2})\.html`)
	matches := re.FindStringSubmatch(filename)
	if len(matches) > 1 {
		return matches[1] + "T00:00:00.000Z"
	}
	return time.Now().Format(time.RFC3339)
}

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

func extractProseContent(n *html.Node) string {
	var sb strings.Builder

	// Clean and render the prose div content
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		renderCleanNode(c, &sb)
	}

	return sb.String()
}

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

func extractTagFromLink(n *html.Node) string {
	href := getAttr(n, "href")
	if strings.HasPrefix(href, "/tag/") {
		return strings.TrimPrefix(href, "/tag/")
	}
	return ""
}

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

func hasClassPrefix(n *html.Node, prefix string) bool {
	for _, attr := range n.Attr {
		if attr.Key == "class" && strings.HasPrefix(attr.Val, prefix) {
			return true
		}
	}
	return false
}

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

func generateTitleHash(title string) string {
	// Simple hash: take first 6 characters of base64-encoded title
	hash := fmt.Sprintf("%x", md5.Sum([]byte(title)))
	if len(hash) > 6 {
		return hash[:6]
	}
	return hash
}
