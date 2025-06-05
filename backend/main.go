package main

import (
	"encoding/json"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/gorilla/mux"
)

func main() {
	r := mux.NewRouter()

	r.Use(addResponseHeaders)

	r.HandleFunc("/feed", handleGetRssFeed).Methods("GET")
	r.HandleFunc("/medium-posts", handleGetMediumPosts).Methods("GET")

	srv := &http.Server{
		Handler:      r,
		Addr:         "localhost:3000",
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
	}

	log.Println("Starting Server at: http://localhost:3000")
	log.Fatal(srv.ListenAndServe())
}

func handleGetRssFeed(w http.ResponseWriter, r *http.Request) {
	params := r.URL.Query()

	escapedFeedUrl := params.Get("url")
	if escapedFeedUrl == "" {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	feedUrl, err := url.QueryUnescape(escapedFeedUrl)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(err)
		return
	}

	feed, err := getRssFeed(feedUrl)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(err)
		return
	}

	w.Write([]byte(feed))
}

func handleGetMediumPosts(w http.ResponseWriter, r *http.Request) {
	params := r.URL.Query()

	page := params.Get("page")
	if page == "" {
		page = strconv.FormatInt(time.Now().UnixMilli(), 10)
	}

	feed, err := getMediumFeed(page)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(err)
		return
	}

	w.Write([]byte(feed))
}

func addResponseHeaders(next http.Handler) http.Handler {
	// CORS Stuff
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("origin")
		if !isOriginAuthorised(origin) {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

		w.Header().Add("Content-Type", "application/json")

		next.ServeHTTP(w, r)
	})
}

func isOriginAuthorised(origin string) bool {
	switch origin {
	case "http://localhost:5173":
		return true
	case "https://anglican.masvingo.org":
		return true
	case "https://giftmugweni.com":
		return true
	default:
		return false
	}
}
