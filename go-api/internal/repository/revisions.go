package repository

import (
	"context"
	"database/sql"
	"math"
	"strconv"
	"strings"
)

func (r *Repository) ListRevisions(ctx context.Context, params ListRevisionsParams) (ListRevisionsResult, error) {
	if params.Filter == "" {
		params.Filter = "all"
	}
	if params.Page < 1 {
		params.Page = 1
	}
	if params.PerPage < 1 || params.PerPage > 100 {
		params.PerPage = 12
	}

	where, args := revisionWhere(params)
	total, err := r.countGroups(ctx, where, args)
	if err != nil {
		return ListRevisionsResult{}, err
	}

	stats, err := r.Stats(ctx)
	if err != nil {
		return ListRevisionsResult{}, err
	}

	query := `
SELECT
	rg.id,
	rg.conversation_id,
	rg.domain,
	rg.updated_at,
	c.name,
	c.notes,
	m.name,
	w.name,
	ui.is_50_paid,
	ui.is_paid,
	ui.is_rev_0_done,
	ui.is_rev_1_done,
	ui.is_rev_2_done,
	ui.is_rev_3_done,
	ui.monthly_bill,
	ui.domain,
	dr.id
FROM revision_groups rg
JOIN conversations c ON c.id = rg.conversation_id
LEFT JOIN users m ON m.id = c.user_id
LEFT JOIN users w ON w.id = c.tim_design_id
LEFT JOIN user_infos ui ON ui.conversation_id = c.id
LEFT JOIN (
	SELECT r1.id, r1.revision_group_id, r1.jenis
	FROM revisions r1
	JOIN (
		SELECT revision_group_id, MAX(jenis) AS max_jenis
		FROM revisions
		GROUP BY revision_group_id
	) latest ON latest.revision_group_id = r1.revision_group_id AND latest.max_jenis = r1.jenis
) dr ON dr.revision_group_id = rg.id
` + where + `
ORDER BY rg.updated_at DESC
LIMIT ? OFFSET ?`

	args = append(args, params.PerPage, (params.Page-1)*params.PerPage)
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return ListRevisionsResult{}, err
	}
	defer rows.Close()

	items := []RevisionListItem{}
	for rows.Next() {
		var row revisionRow
		if err := rows.Scan(
			&row.GroupID,
			&row.ConversationID,
			&row.Domain,
			&row.UpdatedAt,
			&row.ClientName,
			&row.Notes,
			&row.MarketingName,
			&row.WebName,
			&row.Is50Paid,
			&row.IsPaid,
			&row.IsRev0Done,
			&row.IsRev1Done,
			&row.IsRev2Done,
			&row.IsRev3Done,
			&row.MonthlyBill,
			&row.UserInfoDomain,
			&row.RevisionID,
		); err != nil {
			return ListRevisionsResult{}, err
		}
		items = append(items, row.toItem())
	}

	totalPages := int(math.Ceil(float64(total) / float64(params.PerPage)))
	return ListRevisionsResult{
		Items:      items,
		Stats:      stats,
		Page:       params.Page,
		PerPage:    params.PerPage,
		TotalItems: total,
		TotalPages: totalPages,
	}, rows.Err()
}

func (r *Repository) Stats(ctx context.Context) (RevisionStats, error) {
	var stats RevisionStats
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM revision_groups`).Scan(&stats.Total); err != nil {
		return stats, err
	}
	if err := r.db.QueryRowContext(ctx, `
SELECT COUNT(*)
FROM revision_groups rg
JOIN conversations c ON c.id = rg.conversation_id
JOIN user_infos ui ON ui.conversation_id = c.id
WHERE (ui.is_50_paid = 0 OR ui.is_50_paid IS NULL)
  AND (ui.is_paid = 0 OR ui.is_paid IS NULL)`).Scan(&stats.Unpaid); err != nil {
		return stats, err
	}
	if err := r.db.QueryRowContext(ctx, `SELECT COUNT(DISTINCT revision_group_id) FROM revisions WHERE jenis > 0 AND is_answered = 0`).Scan(&stats.ProcessRevision); err != nil {
		return stats, err
	}
	if err := r.db.QueryRowContext(ctx, `
SELECT COUNT(*)
FROM revision_groups rg
JOIN conversations c ON c.id = rg.conversation_id
JOIN user_infos ui ON ui.conversation_id = c.id
WHERE ui.is_rev_1_done = 1 OR ui.is_rev_2_done = 1 OR ui.is_rev_3_done = 1`).Scan(&stats.RevisionDone); err != nil {
		return stats, err
	}
	return stats, nil
}

func (r *Repository) countGroups(ctx context.Context, where string, args []any) (int64, error) {
	var total int64
	err := r.db.QueryRowContext(ctx, `
SELECT COUNT(DISTINCT rg.id)
FROM revision_groups rg
JOIN conversations c ON c.id = rg.conversation_id
LEFT JOIN users m ON m.id = c.user_id
LEFT JOIN users w ON w.id = c.tim_design_id
LEFT JOIN user_infos ui ON ui.conversation_id = c.id
`+where, args...).Scan(&total)
	return total, err
}

func revisionWhere(params ListRevisionsParams) (string, []any) {
	clauses := []string{"1=1"}
	args := []any{}

	if params.Query != "" {
		for _, term := range strings.Fields(strings.ToLower(params.Query)) {
			like := "%" + term + "%"
			clauses = append(clauses, `(LOWER(rg.domain) LIKE ? OR LOWER(c.name) LIKE ? OR LOWER(c.notes) LIKE ? OR LOWER(m.name) LIKE ? OR LOWER(w.name) LIKE ?)`)
			args = append(args, like, like, like, like, like)
		}
	}

	if params.MarketingID > 0 {
		clauses = append(clauses, "c.user_id = ?")
		args = append(args, params.MarketingID)
	}
	if params.WebID > 0 {
		clauses = append(clauses, "c.tim_design_id = ?")
		args = append(args, params.WebID)
	}

	switch params.Filter {
	case "process_revision":
		clauses = append(clauses, `EXISTS (SELECT 1 FROM revisions r WHERE r.revision_group_id = rg.id AND r.jenis > 0 AND r.is_answered = 0)`)
	case "unpaid":
		clauses = append(clauses, `(ui.is_50_paid = 0 OR ui.is_50_paid IS NULL) AND (ui.is_paid = 0 OR ui.is_paid IS NULL)`)
	case "revision_done":
		clauses = append(clauses, `(ui.is_rev_1_done = 1 OR ui.is_rev_2_done = 1 OR ui.is_rev_3_done = 1)`)
	}

	return "WHERE " + strings.Join(clauses, " AND "), args
}

func ParseIntParam(value string) int64 {
	n, _ := strconv.ParseInt(value, 10, 64)
	return n
}

type revisionRow struct {
	GroupID        int64
	ConversationID int64
	Domain         string
	UpdatedAt      sql.NullTime
	ClientName     sql.NullString
	Notes          sql.NullString
	MarketingName  sql.NullString
	WebName        sql.NullString
	Is50Paid       sql.NullInt64
	IsPaid         sql.NullInt64
	IsRev0Done     sql.NullInt64
	IsRev1Done     sql.NullInt64
	IsRev2Done     sql.NullInt64
	IsRev3Done     sql.NullInt64
	MonthlyBill    sql.NullInt64
	UserInfoDomain sql.NullString
	RevisionID     sql.NullInt64
}

func (r revisionRow) toItem() RevisionListItem {
	label, helper := revisionCode(r)
	paymentLabel, paymentClass := paymentState(r)
	var revisionID *int64
	if r.RevisionID.Valid {
		revisionID = &r.RevisionID.Int64
	}
	var remaining *int64
	if r.MonthlyBill.Valid {
		remaining = &r.MonthlyBill.Int64
	} else if parsed, ok := notesAmount(r.Notes); ok {
		remaining = &parsed
	}
	var updatedAt *sql.NullTime
	_ = updatedAt

	item := RevisionListItem{
		GroupID:          r.GroupID,
		RevisionID:       revisionID,
		ConversationID:   r.ConversationID,
		Domain:           r.Domain,
		ClientName:       nullString(r.ClientName),
		MarketingName:    nullString(r.MarketingName),
		WebName:          nullString(r.WebName),
		RevisionLabel:    label,
		RevisionHelper:   helper,
		RemainingPayment: remaining,
		PaymentLabel:     paymentLabel,
		PaymentClass:     paymentClass,
		ActivePeriod:     "-",
	}
	if r.UpdatedAt.Valid {
		item.UpdatedAt = &r.UpdatedAt.Time
	}
	return item
}

func revisionCode(r revisionRow) (string, string) {
	values := []sql.NullInt64{r.IsRev0Done, r.IsRev1Done, r.IsRev2Done, r.IsRev3Done}
	for i, value := range values {
		if !value.Valid || value.Int64 != 1 {
			if i == 0 {
				return "R0", "Website belum selesai"
			}
			return "R" + strconv.Itoa(i), "Proses revisi " + strconv.Itoa(i)
		}
	}
	return "R3", "Revisi 3 done"
}

func paymentState(r revisionRow) (string, string) {
	if r.IsPaid.Valid && r.IsPaid.Int64 == 1 {
		return "Lunas", "paid"
	}
	if r.Is50Paid.Valid && r.Is50Paid.Int64 == 1 {
		return "50% Lunas", "half-paid"
	}
	return "Belum Lunas", "unpaid"
}

func nullString(value sql.NullString) string {
	if value.Valid {
		return value.String
	}
	return ""
}

func notesAmount(value sql.NullString) (int64, bool) {
	if !value.Valid || strings.TrimSpace(value.String) == "" {
		return 0, false
	}

	firstLine := strings.Split(strings.ReplaceAll(value.String, "\r\n", "\n"), "\n")[0]
	parts := strings.Fields(firstLine)
	numbers := []string{}
	for _, part := range parts {
		clean := strings.Trim(part, " \t")
		if isSimpleNumber(clean) {
			numbers = append(numbers, clean)
		}
	}
	if len(numbers) < 2 {
		return 0, false
	}

	raw := strings.NewReplacer(".", "", ",", "").Replace(numbers[1])
	amount, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || amount <= 0 {
		return 0, false
	}
	if amount < 10000 {
		amount *= 1000
	}
	return amount, true
}

func isSimpleNumber(value string) bool {
	if value == "" {
		return false
	}
	for _, char := range value {
		if (char < '0' || char > '9') && char != '.' && char != ',' {
			return false
		}
	}
	return true
}
