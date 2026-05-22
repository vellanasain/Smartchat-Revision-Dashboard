package httpapi

import (
	"encoding/json"
	"net/http"

	"website-revision-system/go-api/internal/config"
	"website-revision-system/go-api/internal/repository"
)

type Handler struct {
	cfg  config.Config
	repo *repository.Repository
}

func New(cfg config.Config, repo *repository.Repository) *Handler {
	return &Handler{cfg: cfg, repo: repo}
}

func (h *Handler) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", h.health)
	mux.HandleFunc("GET /api/revisions", h.revisions)
	mux.HandleFunc("GET /api/users/marketing", h.marketingUsers)
	mux.HandleFunc("GET /api/users/website", h.websiteUsers)
	mux.HandleFunc("GET /api/debug/logs", h.logs)
	mux.HandleFunc("GET /api/revisions/create-bootstrap", h.createBootstrap)
	mux.HandleFunc("GET /api/revisions/{id}/detail-bootstrap", h.detailBootstrap)
	return h.cors(mux)
}

func (h *Handler) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *Handler) revisions(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	result, err := h.repo.ListRevisions(r.Context(), repository.ListRevisionsParams{
		Query:       query.Get("q"),
		Filter:      query.Get("filter"),
		MarketingID: repository.ParseIntParam(query.Get("marketing_id")),
		WebID:       repository.ParseIntParam(query.Get("web_id")),
		Page:        int(repository.ParseIntParam(query.Get("page"))),
		PerPage:     int(repository.ParseIntParam(query.Get("per_page"))),
	})
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) marketingUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.repo.MarketingUsers(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, users)
}



func (h *Handler) createBootstrap(w http.ResponseWriter, r *http.Request) {
	result, err := h.repo.CreateBootstrap(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) detailBootstrap(w http.ResponseWriter, r *http.Request) {
	id := repository.ParseIntParam(r.PathValue("id"))
	result, err := h.repo.DetailBootstrap(r.Context(), id)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h *Handler) websiteUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.repo.WebsiteUsers(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, users)
}

func (h *Handler) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, err error) {
	writeJSON(w, http.StatusInternalServerError, map[string]string{"error": err.Error()})
}
