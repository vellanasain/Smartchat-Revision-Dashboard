package repository

import (
	"context"
	"database/sql"
)

func (r *Repository) ListRevisionProjects(ctx context.Context) ([]RevisionProject, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, conversation_id, client_name, COALESCE(temporary_domain,''), COALESCE(official_domain,''), admin_pelunasan_id, web_executor_id, payment_status, remaining_payment, active_until, current_revision_no, current_revision_stage, current_work_status, total_free_revision_used, is_completed, created_at, updated_at FROM revision_projects ORDER BY updated_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []RevisionProject{}
	for rows.Next() {
		var item RevisionProject
		var web sql.NullInt64
		var active sql.NullTime
		if err := rows.Scan(&item.ID, &item.ConversationID, &item.ClientName, &item.TemporaryDomain, &item.OfficialDomain, &item.AdminPelunasanID, &web, &item.PaymentStatus, &item.RemainingPayment, &active, &item.CurrentRevisionNo, &item.CurrentRevisionStage, &item.CurrentWorkStatus, &item.TotalFreeRevisionUsed, &item.IsCompleted, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		if web.Valid {
			v := web.Int64
			item.WebExecutorID = &v
		}
		if active.Valid {
			t := active.Time
			item.ActiveUntil = &t
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *Repository) GetRevisionProject(ctx context.Context, id int64) (RevisionProject, error) {
	var item RevisionProject
	var web sql.NullInt64
	var active sql.NullTime
	err := r.db.QueryRowContext(ctx, `SELECT id, conversation_id, client_name, COALESCE(temporary_domain,''), COALESCE(official_domain,''), admin_pelunasan_id, web_executor_id, payment_status, remaining_payment, active_until, current_revision_no, current_revision_stage, current_work_status, total_free_revision_used, is_completed, created_at, updated_at FROM revision_projects WHERE id = ?`, id).Scan(&item.ID, &item.ConversationID, &item.ClientName, &item.TemporaryDomain, &item.OfficialDomain, &item.AdminPelunasanID, &web, &item.PaymentStatus, &item.RemainingPayment, &active, &item.CurrentRevisionNo, &item.CurrentRevisionStage, &item.CurrentWorkStatus, &item.TotalFreeRevisionUsed, &item.IsCompleted, &item.CreatedAt, &item.UpdatedAt)
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
