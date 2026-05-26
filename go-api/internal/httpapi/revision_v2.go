package httpapi

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"website-revision-system/go-api/internal/repository"
)

func buildListParams(r *http.Request, role string, uid int64) repository.RevisionProjectListParams {
	query := r.URL.Query()
	return repository.RevisionProjectListParams{
		RevisionStage:     query.Get("revision_stage"),
		WorkStatus:        query.Get("work_status"),
		PaymentStatus:     query.Get("payment_status"),
		AssignedWebID:     repository.ParseIntParam(query.Get("assigned_web_id")),
		CurrentRevisionNo: int(repository.ParseIntParam(query.Get("current_revision_no"))),
		ActiveOnly:        query.Get("active_only") == "1" || query.Get("active_only") == "true",
		Search:            query.Get("search"),
		SortBy:            query.Get("sort_by"),
		SortDir:           query.Get("sort_dir"),
		Page:              int(repository.ParseIntParam(query.Get("page"))),
		PerPage:           int(repository.ParseIntParam(query.Get("per_page"))),
		Role:              role,
		ActorUserID:       uid,
	}
}

func (h *Handler) listRevisionProjects(w http.ResponseWriter, r *http.Request) {
	role, uid := authContext(r)
	result, err := h.repo.ListRevisionProjects(r.Context(), buildListParams(r, role, uid))
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
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

func (h *Handler) listProjectCycles(w http.ResponseWriter, r *http.Request) {
	projectID := repository.ParseIntParam(r.PathValue("id"))
	project, err := h.repo.GetRevisionProject(r.Context(), projectID)
	if err != nil {
		if err == sql.ErrNoRows {
			writeJSON(w, http.StatusNotFound, map[string]string{"error": "not found"})
			return
		}
		writeError(w, err)
		return
	}
	role, uid := authContext(r)
	if !repository.CanViewProject(role, uid, project.WebExecutorID) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "forbidden"})
		return
	}
	cycles, err := h.repo.ListCyclesByProject(r.Context(), projectID)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"project_id": projectID, "items": cycles})
}

// ... existing mutation handlers unchanged
func (h *Handler) createRevisionProject(w http.ResponseWriter, r *http.Request) { /* unchanged */
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
func (h *Handler) patchRevisionProject(w http.ResponseWriter, r *http.Request) { /* unchanged */
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
	pid := repository.ParseIntParam(r.PathValue("id"))
	var in repository.CreateCycleInput
	if err := decodeJSON(r, &in); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	if err := h.repo.CreateCycle(r.Context(), pid, in); err != nil {
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
	role, uid := authContext(r)
	params := buildListParams(r, role, uid)
	params.Page, params.PerPage = 1, 500
	list, err := h.repo.ListRevisionProjects(r.Context(), params)
	if err != nil {
		writeError(w, err)
		return
	}
	stats := repository.DashboardStats{}
	for _, it := range list.Items {
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
