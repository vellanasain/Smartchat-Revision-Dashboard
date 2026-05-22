package main

import (
	"log"
	"net/http"

	"website-revision-system/go-api/internal/config"
	"website-revision-system/go-api/internal/db"
	"website-revision-system/go-api/internal/httpapi"
	"website-revision-system/go-api/internal/repository"
)

func main() {
	cfg := config.Load()
	conn, err := db.Open(cfg)
	if err != nil {
		log.Fatal(err)
	}
	defer conn.Close()

	repo := repository.New(conn)
	handler := httpapi.New(cfg, repo)

	log.Printf("Go API listening on http://%s", cfg.HTTPAddr)
	if err := http.ListenAndServe(cfg.HTTPAddr, handler.Routes()); err != nil {
		log.Fatal(err)
	}
}
