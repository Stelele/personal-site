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

	r.HandleFunc("/feed", handleGetRssFeed).Methods("GET")
	r.HandleFunc("/medium-posts", handleGetMediumPosts).Methods("GET")

	srv := &http.Server{
		Handler: r,
		Addr: "localhost:3000",
		WriteTimeout: 15 * time.Second,
		ReadTimeout: 15 * time.Second,
	}

	log.Println("Starting Server at: http://localhost:3000")
	log.Fatal(srv.ListenAndServe())
}

func handleGetRssFeed(w http.ResponseWriter, r *http.Request) {
	addResponseHeaders(&w)

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
	addResponseHeaders(&w)

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

func addResponseHeaders(w *http.ResponseWriter) {
	// CORS Stuff
	
	(*w).Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
	(*w).Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	(*w).Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

	(*w).Header().Add("Content-Type", "application/json")
}