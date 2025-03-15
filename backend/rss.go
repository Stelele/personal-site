package main

import (
	"io"
	"log"
	"net/http"
	"strings"
)


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