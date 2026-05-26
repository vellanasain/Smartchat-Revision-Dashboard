package repository

import "time"

type RevisionProject struct {
	ID                    int64      `json:"id"`
	ConversationID        int64      `json:"conversation_id"`
	ClientName            string     `json:"client_name"`
	TemporaryDomain       string     `json:"temporary_domain"`
	OfficialDomain        string     `json:"official_domain"`
	AdminPelunasanID      int64      `json:"admin_pelunasan_id"`
	WebExecutorID         *int64     `json:"web_executor_id"`
	PaymentStatus         string     `json:"payment_status"`
	RemainingPayment      float64    `json:"remaining_payment"`
	ActiveUntil           *time.Time `json:"active_until"`
	CurrentRevisionNo     int        `json:"current_revision_no"`
	CurrentRevisionStage  string     `json:"current_revision_stage"`
	CurrentWorkStatus     string     `json:"current_work_status"`
	TotalFreeRevisionUsed int        `json:"total_free_revision_used"`
	IsCompleted           bool       `json:"is_completed"`
	CreatedAt             time.Time  `json:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at"`
}

type RevisionProjectListParams struct {
	RevisionStage     string
	WorkStatus        string
	PaymentStatus     string
	AssignedWebID     int64
	CurrentRevisionNo int
	ActiveOnly        bool
	Search            string
	SortBy            string
	SortDir           string
	Page              int
	PerPage           int
	Role              string
	ActorUserID       int64
}

type RevisionProjectListResult struct {
	Items      []RevisionProject `json:"items"`
	Page       int               `json:"current_page"`
	PerPage    int               `json:"per_page"`
	Total      int64             `json:"total"`
	TotalPages int               `json:"total_pages"`
	SortBy     string            `json:"sort_by"`
	SortDir    string            `json:"sort_dir"`
}

type RevisionCycle struct {
	ID            int64      `json:"id"`
	ProjectID     int64      `json:"project_id"`
	RevisionNo    int        `json:"revision_no"`
	RevisionLabel string     `json:"revision_label"`
	RevisionStage string     `json:"revision_stage"`
	WorkStatus    string     `json:"work_status"`
	AssignedWebID *int64     `json:"assigned_web_id"`
	StartedAt     *time.Time `json:"started_at"`
	CompletedAt   *time.Time `json:"completed_at"`
	Notes         string     `json:"notes"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type PaymentTransaction struct {
	ID              int64      `json:"id"`
	ProjectID       int64      `json:"project_id"`
	Amount          float64    `json:"amount"`
	PaymentType     string     `json:"payment_type"`
	PaymentStatus   string     `json:"payment_status"`
	PaymentProofURL string     `json:"payment_proof_url"`
	DetectedByAI    bool       `json:"detected_by_ai"`
	PaidAt          *time.Time `json:"paid_at"`
	CreatedAt       time.Time  `json:"created_at"`
}

type DashboardStats struct {
	TotalProjects    int64 `json:"total_projects"`
	AssignedProjects int64 `json:"assigned_projects"`
	Completed        int64 `json:"completed"`
	Unpaid           int64 `json:"unpaid"`
}
