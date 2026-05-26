package repository

import (
	"context"
	"fmt"
)

type CreateRevisionProjectInput struct {
	ConversationID   *int64  `json:"conversation_id"`
	ClientName       string  `json:"client_name"`
	TemporaryDomain  string  `json:"temporary_domain"`
	OfficialDomain   string  `json:"official_domain"`
	AdminPelunasanID int64   `json:"admin_pelunasan_id"`
	WebExecutorID    *int64  `json:"web_executor_id"`
	AssignedWebID    *int64  `json:"assigned_web_id"`
	PackageName      string  `json:"package_name"`
	PaymentStatus    string  `json:"payment_status"`
	RemainingPayment float64 `json:"remaining_payment"`
	ActiveUntil      *string `json:"active_until"`
	Notes            string  `json:"notes"`
}

type UpdateRevisionProjectInput struct {
	WebExecutorID        *int64   `json:"web_executor_id"`
	AssignedWebID        *int64   `json:"assigned_web_id"`
	PaymentStatus        *string  `json:"payment_status"`
	RemainingPayment     *float64 `json:"remaining_payment"`
	CurrentRevisionNo    *int     `json:"current_revision_no"`
	CurrentRevisionStage *string  `json:"current_revision_stage"`
	CurrentWorkStatus    *string  `json:"current_work_status"`
	IsCompleted          *bool    `json:"is_completed"`
	Notes                *string  `json:"notes"`
}

type CreateCycleInput struct {
	RevisionNo                               int `json:"revision_no"`
	RevisionLabel, RevisionStage, WorkStatus string
	AssignedWebID                            *int64 `json:"assigned_web_id"`
	Notes                                    string `json:"notes"`
}

type PaymentInput struct {
	ProjectID                                   int64   `json:"project_id"`
	Amount                                      float64 `json:"amount"`
	PaymentType, PaymentStatus, PaymentProofURL string
	DetectedByAI                                bool `json:"detected_by_ai"`
	PaidAt, ActiveUntil                         *string
}

func (r *Repository) CreateRevisionProject(ctx context.Context, in CreateRevisionProjectInput) (int64, error) {
	if in.ClientName == "" {
		return 0, fmt.Errorf("client_name is required")
	}
	assigned := in.WebExecutorID
	if in.AssignedWebID != nil {
		assigned = in.AssignedWebID
	}
	var conv any = nil
	if in.ConversationID != nil {
		conv = *in.ConversationID
	}
	res, err := r.db.ExecContext(ctx, `INSERT INTO revision_projects (conversation_id, client_name, temporary_domain, official_domain, admin_pelunasan_id, web_executor_id, package_name, payment_status, remaining_payment, active_until, current_revision_no, current_revision_stage, current_work_status, total_free_revision_used, is_completed, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, '--', 'done', 0, 0, ?)`, conv, in.ClientName, in.TemporaryDomain, in.OfficialDomain, in.AdminPelunasanID, assigned, in.PackageName, defaultPayment(in.PaymentStatus), in.RemainingPayment, in.ActiveUntil, in.Notes)
	if err != nil {
		return 0, err
	}
	id, _ := res.LastInsertId()
	_, _ = r.db.ExecContext(ctx, `INSERT INTO revision_cycles (project_id, revision_no, revision_label, revision_stage, work_status, assigned_web_id, started_at, completed_at, notes) VALUES (?,0,'R0','--','done',?,NOW(),NOW(),?)`, id, assigned, "R0 auto-created")
	return id, nil
}

func defaultPayment(v string) string {
	switch v {
	case "partial_paid", "paid", "overdue":
		return v
	default:
		return "unpaid"
	}
}

func (r *Repository) UpdateRevisionProject(ctx context.Context, id int64, in UpdateRevisionProjectInput) error {
	item, err := r.GetRevisionProject(ctx, id)
	if err != nil {
		return err
	}
	if in.CurrentRevisionNo != nil {
		if err := ValidateRevisionNo(*in.CurrentRevisionNo); err != nil {
			return err
		}
		if *in.CurrentRevisionNo > item.CurrentRevisionNo+1 {
			return fmt.Errorf("current_revision_no cannot jump")
		}
		item.CurrentRevisionNo = *in.CurrentRevisionNo
	}
	if in.CurrentRevisionStage != nil {
		if err := ValidateStageTransition(item.CurrentRevisionNo, item.CurrentRevisionStage, *in.CurrentRevisionStage); err != nil {
			return err
		}
		item.CurrentRevisionStage = *in.CurrentRevisionStage
	}
	if in.CurrentWorkStatus != nil {
		if err := ValidateWorkTransition(item.CurrentRevisionNo, item.CurrentRevisionStage, item.CurrentWorkStatus, *in.CurrentWorkStatus); err != nil {
			return err
		}
		item.CurrentWorkStatus = *in.CurrentWorkStatus
	}
	if in.WebExecutorID != nil {
		item.WebExecutorID = in.WebExecutorID
	}
	if in.AssignedWebID != nil {
		item.WebExecutorID = in.AssignedWebID
	}
	if in.PaymentStatus != nil {
		item.PaymentStatus = *in.PaymentStatus
	}
	if in.RemainingPayment != nil {
		item.RemainingPayment = *in.RemainingPayment
	}
	if in.IsCompleted != nil {
		item.IsCompleted = *in.IsCompleted
	}
	notes := ""
	if in.Notes != nil {
		notes = *in.Notes
	}
	_, err = r.db.ExecContext(ctx, `UPDATE revision_projects SET web_executor_id=?, payment_status=?, remaining_payment=?, current_revision_no=?, current_revision_stage=?, current_work_status=?, is_completed=?, notes=COALESCE(NULLIF(?,''),notes), updated_at=NOW() WHERE id=?`, item.WebExecutorID, item.PaymentStatus, item.RemainingPayment, item.CurrentRevisionNo, item.CurrentRevisionStage, item.CurrentWorkStatus, item.IsCompleted, notes, id)
	return err
}

func (r *Repository) CreateCycle(ctx context.Context, projectID int64, in CreateCycleInput) error {
	if err := ValidateRevisionNo(in.RevisionNo); err != nil {
		return err
	}
	if err := ValidateStageForRevision(in.RevisionNo, in.RevisionStage); err != nil {
		return err
	}
	if err := ValidateWorkForRevision(in.RevisionNo, in.WorkStatus); err != nil {
		return err
	}
	_, err := r.db.ExecContext(ctx, `INSERT INTO revision_cycles (project_id, revision_no, revision_label, revision_stage, work_status, assigned_web_id, started_at, notes) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)`, projectID, in.RevisionNo, in.RevisionLabel, in.RevisionStage, in.WorkStatus, in.AssignedWebID, in.Notes)
	return err
}
func (r *Repository) UpdateCycleStage(ctx context.Context, id int64, stage string) error {
	var no int
	var current string
	if err := r.db.QueryRowContext(ctx, `SELECT revision_no, revision_stage FROM revision_cycles WHERE id=?`, id).Scan(&no, &current); err != nil {
		return err
	}
	if err := ValidateStageTransition(no, current, stage); err != nil {
		return err
	}
	_, err := r.db.ExecContext(ctx, `UPDATE revision_cycles SET revision_stage=?, updated_at=NOW() WHERE id=?`, stage, id)
	return err
}
func (r *Repository) UpdateCycleWorkStatus(ctx context.Context, id int64, work string) error {
	var no int
	var stage, current string
	if err := r.db.QueryRowContext(ctx, `SELECT revision_no, revision_stage, work_status FROM revision_cycles WHERE id=?`, id).Scan(&no, &stage, &current); err != nil {
		return err
	}
	if err := ValidateWorkTransition(no, stage, current, work); err != nil {
		return err
	}
	_, err := r.db.ExecContext(ctx, `UPDATE revision_cycles SET work_status=?, completed_at=CASE WHEN ?='done' THEN NOW() ELSE completed_at END, updated_at=NOW() WHERE id=?`, work, work, id)
	return err
}
func (r *Repository) CreatePayment(ctx context.Context, in PaymentInput) error {
	_, err := r.db.ExecContext(ctx, `INSERT INTO payment_transactions (project_id, amount, payment_type, payment_status, payment_proof_url, detected_by_ai, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?)`, in.ProjectID, in.Amount, in.PaymentType, in.PaymentStatus, in.PaymentProofURL, in.DetectedByAI, in.PaidAt)
	return err
}
func (r *Repository) EnqueueJob(ctx context.Context, projectID int64, jobType string, payload string) error {
	_, err := r.db.ExecContext(ctx, `INSERT INTO automation_jobs (project_id, job_type, payload_json, status, retry_count) VALUES (?, ?, ?, 'queued', 0)`, projectID, jobType, payload)
	return err
}
