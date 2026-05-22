package repository

import "time"

type User struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
	Role string `json:"role"`
}

type RevisionListItem struct {
	GroupID          int64      `json:"group_id"`
	RevisionID       *int64     `json:"revision_id"`
	ConversationID   int64      `json:"conversation_id"`
	Domain           string     `json:"domain"`
	ClientName       string     `json:"client_name"`
	MarketingName    string     `json:"marketing_name"`
	WebName          string     `json:"web_name"`
	RevisionLabel    string     `json:"revision_label"`
	RevisionHelper   string     `json:"revision_helper"`
	RemainingPayment *int64     `json:"remaining_payment"`
	PaymentLabel     string     `json:"payment_label"`
	PaymentClass     string     `json:"payment_class"`
	ActivePeriod     string     `json:"active_period"`
	UpdatedAt        *time.Time `json:"updated_at"`
}

type RevisionStats struct {
	Total           int64 `json:"total"`
	Unpaid          int64 `json:"unpaid"`
	ProcessRevision int64 `json:"process_revision"`
	RevisionDone    int64 `json:"revision_done"`
}

type ListRevisionsParams struct {
	Query       string
	Filter      string
	MarketingID int64
	WebID       int64
	Page        int
	PerPage     int
}

type ListRevisionsResult struct {
	Items      []RevisionListItem `json:"items"`
	Stats      RevisionStats      `json:"stats"`
	Page       int                `json:"page"`
	PerPage    int                `json:"per_page"`
	TotalItems int64              `json:"total_items"`
	TotalPages int                `json:"total_pages"`
}
