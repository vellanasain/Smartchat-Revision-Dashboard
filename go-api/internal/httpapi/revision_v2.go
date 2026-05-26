package httpapi

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"website-revision-system/go-api/internal/repository"
)

func (h *Handler) listRevisionProjects(w http.ResponseWriter, r *http.Request) {
	items, err := h.repo.ListRevisionProjects(r.Context())
	if err != nil { writeError(w, err); return }
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) getRevisionProject(w http.ResponseWriter, r *http.Request) {
	id := repository.ParseIntParam(r.PathValue("id"))
	item, err := h.repo.GetRevisionProject(r.Context(), id)
	if err != nil {
		if err == sql.ErrNoRows { writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"}); return }
		writeError(w, err); return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *Handler) notImplemented(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusNotImplemented, map[string]any{"error": "endpoint scaffolded for React+Go migration", "implemented": false})
}

func decodeJSON(r *http.Request, v any) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(v)
}
