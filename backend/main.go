package main

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/mux"
)

func main() {
	r := mux.NewRouter()

	r.HandleFunc("/feed", handleGetFeed).Methods("GET")

	srv := &http.Server{
		Handler: r,
		Addr: "localhost:3000",
		WriteTimeout: 15 * time.Second,
		ReadTimeout: 15 * time.Second,
	}

	log.Println("Starting Server at: http://localhost:3000")
	log.Fatal(srv.ListenAndServe())
}

func handleGetFeed(w http.ResponseWriter, r *http.Request) {
	addResponseHeaders(&w)

	params := r.URL.Query()

	feedUrl := params.Get("url")
	if feedUrl == "" {
		w.WriteHeader(http.StatusNotFound)
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

func addResponseHeaders(w *http.ResponseWriter) {
	// CORS Stuff
	(*w).Header().Set("Access-Control-Allow-Origin", "*")
	(*w).Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
	(*w).Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

	(*w).Header().Add("Content-Type", "application/json")
}