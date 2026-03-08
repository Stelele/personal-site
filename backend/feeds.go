package main

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"golang.org/x/net/html"
)

type Post struct {
	Title      string `json:"title"`
	Subtitle   string `json:"subtitle,omitempty"`
	Date       string `json:"date"`
	Summary    string `json:"summary,omitempty"`
	CoverImage string `json:"coverImage,omitempty"`
	URL        string `json:"url"`
	Content    string `json:"content"`
}

type postsCache struct {
	posts  []Post
	loaded bool
	mu     sync.RWMutex
}

var cache postsCache
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

	posts, err := fetchAllPostsFromGitHub()
	if err != nil {
		return nil, err
	}

	cache.posts = posts
	cache.loaded = true
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
						renderNodeToBuilder(n, contentBuilder)
						post.Content = contentBuilder.String()
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
			case "img":
				if post.CoverImage == "" {
					post.CoverImage = getAttr(n, "src")
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
