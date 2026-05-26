package repository

import (
	"context"
	"database/sql"
	"fmt"
	"math"
	"strings"
)

func (r *Repository) ListRevisionProjects(ctx context.Context, p RevisionProjectListParams) (RevisionProjectListResult, error) {
	if p.Page < 1 {
		p.Page = 1
	}
	if p.PerPage < 1 || p.PerPage > 100 {
		p.PerPage = 20
	}
	if p.SortBy == "" {
		p.SortBy = "updated_at"
	}
	if p.SortDir != "asc" {
		p.SortDir = "desc"
	}

	where, args := revisionProjectWhere(p)
	var total int64
	countQ := `SELECT COUNT(*) FROM revision_projects rp ` + where
	if err := r.db.QueryRowContext(ctx, countQ, args...).Scan(&total); err != nil {
		return RevisionProjectListResult{}, err
	}

	sortMap := map[string]string{"updated_at": "rp.updated_at", "created_at": "rp.created_at", "active_until": "rp.active_until", "current_revision_no": "rp.current_revision_no", "client_name": "rp.client_name"}
	sortCol, ok := sortMap[p.SortBy]
	if !ok {
		sortCol = "rp.updated_at"
		p.SortBy = "updated_at"
	}
	q := `SELECT id, conversation_id, client_name, COALESCE(temporary_domain,''), COALESCE(official_domain,''), admin_pelunasan_id, web_executor_id, payment_status, remaining_payment, active_until, current_revision_no, current_revision_stage, current_work_status, total_free_revision_used, is_completed, created_at, updated_at FROM revision_projects rp ` + where + ` ORDER BY ` + sortCol + ` ` + strings.ToUpper(p.SortDir) + ` LIMIT ? OFFSET ?`
	args = append(args, p.PerPage, (p.Page-1)*p.PerPage)
	rows, err := r.db.QueryContext(ctx, q, args...)
	if err != nil {
		return RevisionProjectListResult{}, err
	}
	defer rows.Close()
	items := []RevisionProject{}
	for rows.Next() {
		it, err := scanProject(rows)
		if err != nil {
			return RevisionProjectListResult{}, err
		}
		items = append(items, it)
	}
	pages := int(math.Ceil(float64(total) / float64(p.PerPage)))
	return RevisionProjectListResult{Items: items, Page: p.Page, PerPage: p.PerPage, Total: total, TotalPages: pages, SortBy: p.SortBy, SortDir: p.SortDir}, rows.Err()
}

func revisionProjectWhere(p RevisionProjectListParams) (string, []any) {
	clauses := []string{"1=1"}
	args := []any{}
	if p.Role == RoleWeb {
		clauses = append(clauses, "rp.web_executor_id = ?")
		args = append(args, p.ActorUserID)
	}
	if p.RevisionStage != "" {
		clauses = append(clauses, "rp.current_revision_stage = ?")
		args = append(args, p.RevisionStage)
	}
	if p.WorkStatus != "" {
		clauses = append(clauses, "rp.current_work_status = ?")
		args = append(args, p.WorkStatus)
	}
	if p.PaymentStatus != "" {
		clauses = append(clauses, "rp.payment_status = ?")
		args = append(args, p.PaymentStatus)
	}
	if p.AssignedWebID > 0 {
		clauses = append(clauses, "rp.web_executor_id = ?")
		args = append(args, p.AssignedWebID)
	}
	if p.CurrentRevisionNo >= 0 {
		clauses = append(clauses, "rp.current_revision_no = ?")
		args = append(args, p.CurrentRevisionNo)
	}
	if p.ActiveOnly {
		clauses = append(clauses, "rp.is_completed = 0")
	}
	if s := strings.TrimSpace(strings.ToLower(p.Search)); s != "" {
		like := "%" + s + "%"
		clauses = append(clauses, "(LOWER(rp.temporary_domain) LIKE ? OR LOWER(rp.official_domain) LIKE ? OR LOWER(rp.client_name) LIKE ?)")
		args = append(args, like, like, like)
	}
	return "WHERE " + strings.Join(clauses, " AND "), args
}

func scanProject(scanner interface{ Scan(dest ...any) error }) (RevisionProject, error) {
	var item RevisionProject
	var web sql.NullInt64
	var active sql.NullTime
	err := scanner.Scan(&item.ID, &item.ConversationID, &item.ClientName, &item.TemporaryDomain, &item.OfficialDomain, &item.AdminPelunasanID, &web, &item.PaymentStatus, &item.RemainingPayment, &active, &item.CurrentRevisionNo, &item.CurrentRevisionStage, &item.CurrentWorkStatus, &item.TotalFreeRevisionUsed, &item.IsCompleted, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		return item, err
	}
	if web.Valid {
		v := web.Int64
		item.WebExecutorID = &v
	}
	if active.Valid {
		t := active.Time
		item.ActiveUntil = &t
	}
	return item, nil
}

func (r *Repository) GetRevisionProject(ctx context.Context, id int64) (RevisionProject, error) {
	row := r.db.QueryRowContext(ctx, `SELECT id, conversation_id, client_name, COALESCE(temporary_domain,''), COALESCE(official_domain,''), admin_pelunasan_id, web_executor_id, payment_status, remaining_payment, active_until, current_revision_no, current_revision_stage, current_work_status, total_free_revision_used, is_completed, created_at, updated_at FROM revision_projects WHERE id = ?`, id)
	return scanProject(row)
}

func (r *Repository) ListCyclesByProject(ctx context.Context, projectID int64) ([]RevisionCycle, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, project_id, revision_no, revision_label, revision_stage, work_status, assigned_web_id, started_at, completed_at, COALESCE(notes,''), created_at, updated_at FROM revision_cycles WHERE project_id=? ORDER BY revision_no ASC`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []RevisionCycle{}
	for rows.Next() {
		var it RevisionCycle
		var web sql.NullInt64
		var st, ct sql.NullTime
		if err := rows.Scan(&it.ID, &it.ProjectID, &it.RevisionNo, &it.RevisionLabel, &it.RevisionStage, &it.WorkStatus, &web, &st, &ct, &it.Notes, &it.CreatedAt, &it.UpdatedAt); err != nil {
			return nil, err
		}
		if web.Valid {
			v := web.Int64
			it.AssignedWebID = &v
		}
		if st.Valid {
			t := st.Time
			it.StartedAt = &t
		}
		if ct.Valid {
			t := ct.Time
			it.CompletedAt = &t
		}
		out = append(out, it)
	}
	if len(out) == 0 {
		for i := 0; i <= 4; i++ {
			out = append(out, RevisionCycle{ProjectID: projectID, RevisionNo: i, RevisionLabel: fmt.Sprintf("R%d", i), RevisionStage: "--", WorkStatus: "--"})
		}
	}
	return out, rows.Err()
}
