package httpapi

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"website-revision-system/go-api/internal/repository"
)

func (h *Handler) listRevisionProjects(w http.ResponseWriter, r *http.Request) {
	items, err := h.repo.ListRevisionProjects(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	role, uid := authContext(r)
	filtered := make([]repository.RevisionProject, 0, len(items))
	for _, item := range items {
		if repository.CanViewProject(role, uid, item.WebExecutorID) {
			filtered = append(filtered, item)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": filtered})
}

func (h *Handler) getRevisionProject(w http.ResponseWriter, r *http.Request) {
	id := repository.ParseIntParam(r.PathValue("id"))
	item, err := h.repo.GetRevisionProject(r.Context(), id)
	if err != nil {
		if err == sql.ErrNoRows {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
			return
		}
		writeError(w, err)
		return
	}
	role, uid := authContext(r)
	if !repository.CanViewProject(role, uid, item.WebExecutorID) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
		return
	}
	writeJSON(w, http.StatusOK, item)
}

func (h *Handler) createRevisionProject(w http.ResponseWriter, r *http.Request) {
	if err := requireRole(r, repository.RoleAdmin); err != nil {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}
	var in repository.CreateRevisionProjectInput
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	id, err := h.repo.CreateRevisionProject(r.Context(), in)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"id": id})
}

func (h *Handler) patchRevisionProject(w http.ResponseWriter, r *http.Request) {
	id := repository.ParseIntParam(r.PathValue("id"))
	role, uid := authContext(r)
	var in repository.UpdateRevisionProjectInput
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	if role == repository.RoleWeb {
		item, err := h.repo.GetRevisionProject(r.Context(), id)
		if err != nil {
			writeError(w, err)
			return
		}
		if !repository.CanViewProject(role, uid, item.WebExecutorID) {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
			return
		}
		if in.CurrentWorkStatus == nil || in.CurrentRevisionNo != nil || in.CurrentRevisionStage != nil || in.PaymentStatus != nil || in.RemainingPayment != nil || in.WebExecutorID != nil {
			writeJSON(w, http.StatusForbidden, map[string]string{"error": "tim_web can only update current_work_status"})
			return
		}
	} else if role != repository.RoleAdmin {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
		return
	}
	if err := h.repo.UpdateRevisionProject(r.Context(), id, in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *Handler) createCycle(w http.ResponseWriter, r *http.Request) {
	if err := requireRole(r, repository.RoleAdmin); err != nil {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}
	projectID := repository.ParseIntParam(r.PathValue("id"))
	var in repository.CreateCycleInput
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	if err := h.repo.CreateCycle(r.Context(), projectID, in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"ok": true})
}

func (h *Handler) patchCycleStage(w http.ResponseWriter, r *http.Request) {
	if err := requireRole(r, repository.RoleAdmin); err != nil {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}
	id := repository.ParseIntParam(r.PathValue("id"))
	var in struct {
		Stage string `json:"stage"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	if err := h.repo.UpdateCycleStage(r.Context(), id, in.Stage); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *Handler) patchCycleWorkStatus(w http.ResponseWriter, r *http.Request) {
	role, _ := authContext(r)
	if role != repository.RoleAdmin && role != repository.RoleWeb {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
		return
	}
	id := repository.ParseIntParam(r.PathValue("id"))
	var in struct {
		WorkStatus string `json:"work_status"`
	}
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	if err := h.repo.UpdateCycleWorkStatus(r.Context(), id, in.WorkStatus); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true})
}

func (h *Handler) createPaymentTransaction(w http.ResponseWriter, r *http.Request) {
	if err := requireRole(r, repository.RoleAdmin); err != nil {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
		return
	}
	var in repository.PaymentInput
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	if err := h.repo.CreatePayment(r.Context(), in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"ok": true})
}

func (h *Handler) dashboardStats(w http.ResponseWriter, r *http.Request) {
	items, err := h.repo.ListRevisionProjects(r.Context())
	if err != nil {
		writeError(w, err)
		return
	}
	role, uid := authContext(r)
	stats := repository.DashboardStats{}
	for _, it := range items {
		if !repository.CanViewProject(role, uid, it.WebExecutorID) {
			continue
		}
		stats.TotalProjects++
		if it.WebExecutorID != nil && *it.WebExecutorID == uid {
			stats.AssignedProjects++
		}
		if it.IsCompleted {
			stats.Completed++
		}
		if it.PaymentStatus == "unpaid" || it.PaymentStatus == "overdue" {
			stats.Unpaid++
		}
	}
	writeJSON(w, http.StatusOK, stats)
}

func authContext(r *http.Request) (string, int64) {
	return r.Header.Get("X-User-Role"), repository.ParseIntParam(r.Header.Get("X-User-Id"))
}

func requireRole(r *http.Request, role string) error {
	current, _ := authContext(r)
	if current != role {
		return fmt.Errorf("role %s required", role)
	}
	return nil
}

func decodeJSON(r *http.Request, v any) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(v); err != nil {
		return err
	}
	if dec.More() {
		return errors.New("invalid JSON payload")
	}
	return nil
}

func (h *Handler) notImplemented(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusNotImplemented, map[string]any{"error": "endpoint scaffolded for incremental migration", "implemented": false})
}
