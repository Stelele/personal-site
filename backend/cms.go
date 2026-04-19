package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/mux"
)

type CmsToken struct {
	AccessToken string    `json:"access_token"`
	TokenType   string    `json:"token_type"`
	ExpiresAt   time.Time `json:"expires_at"`
}

var (
	cmsToken     *CmsToken
	cmsTokenLock sync.Mutex
)

func getCmsToken() (string, error) {
	cmsTokenLock.Lock()
	defer cmsTokenLock.Unlock()

	if cmsToken != nil && time.Now().Add(1*time.Hour).Before(cmsToken.ExpiresAt) {
		return cmsToken.AccessToken, nil
	}

	domain := os.Getenv("CMS_AUTH0_DOMAIN")
	clientID := os.Getenv("CMS_AUTH0_CLIENT_ID")
	clientSecret := os.Getenv("CMS_AUTH0_CLIENT_SECRET")
	audience := os.Getenv("CMS_AUTH0_AUDIENCE")

	if domain == "" || clientID == "" || clientSecret == "" || audience == "" {
		return "", fmt.Errorf("CMS_AUTH0 environment variables not set")
	}

	tokenURL := fmt.Sprintf("https://%s/oauth/token", domain)
	body := fmt.Sprintf(`{
		"grant_type": "client_credentials",
		"client_id": "%s",
		"client_secret": "%s",
		"audience": "%s"
	}`, clientID, clientSecret, audience)

	req, err := http.NewRequest("POST", tokenURL, strings.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("failed to create token request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to request token: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("token request failed with status %d: %s", resp.StatusCode, string(bodyBytes))
	}

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
		TokenType   string `json:"token_type"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return "", fmt.Errorf("failed to decode token response: %w", err)
	}

	expiresAt := time.Now().Add(time.Duration(tokenResp.ExpiresIn) * time.Second)
	cmsToken = &CmsToken{
		AccessToken: tokenResp.AccessToken,
		TokenType:   tokenResp.TokenType,
		ExpiresAt:   expiresAt,
	}

	log.Printf("CMS token fetched, expires at %s", expiresAt)
	return cmsToken.AccessToken, nil
}

func proxyCmsRequest(path string, queryParams string) (*http.Response, error) {
	token, err := getCmsToken()
	if err != nil {
		return nil, fmt.Errorf("failed to get CMS token: %w", err)
	}

	cmsAPIURL := os.Getenv("CMS_API_URL")
	if cmsAPIURL == "" {
		return nil, fmt.Errorf("CMS_API_URL not set")
	}

	url := cmsAPIURL + path
	if queryParams != "" {
		url += "?" + queryParams
	}

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create CMS request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
	req.Header.Set("Accept", "application/json")

	return httpClient.Do(req)
}

func handleGetCmsBlogs(w http.ResponseWriter, r *http.Request) {
	queryParams := r.URL.Query().Encode()

	resp, err := proxyCmsRequest("/blogs", queryParams)
	if err != nil {
		log.Printf("Error proxying to CMS /blogs: %v", err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

func handleGetCmsPosts(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	blogID := vars["blogId"]

	queryParams := r.URL.Query().Encode()

	path := fmt.Sprintf("/blogs/%s/posts", blogID)
	resp, err := proxyCmsRequest(path, queryParams)
	if err != nil {
		log.Printf("Error proxying to CMS %s: %v", path, err)
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}