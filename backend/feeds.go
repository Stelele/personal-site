package main

import (
	"bytes"
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

func getMediumFeed(page string) (string, error) {
	url := "https://medium.com/_/graphql"
	var payload = []byte(`{
    "operationName": "UserStreamOverview",
    "query": "`+ mediumQuery +`",
    "variables": {
      "userId": "giftmugweni",
      "pagingOptions": {
          "limit": 10,
          "page": null,
          "source": null,
          "to": "`+ page +`",
          "ignoredIds":null
      }
    }
  }`)

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(payload))
	if err != nil {
		log.Println("Error creating request:", err)
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Println("Error making request:", err)
		return "", err
	}
	defer resp.Body.Close()
	
	var sb strings.Builder
    _, err = io.Copy(&sb, resp.Body)
    if err != nil {
        log.Println("Error:", err)
        return "", err
    }

    return sb.String(), nil
}

