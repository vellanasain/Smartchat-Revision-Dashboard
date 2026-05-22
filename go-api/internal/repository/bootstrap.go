package repository

import (
	"context"
	"database/sql"
	"fmt"
)

func (r *Repository) CreateBootstrap(ctx context.Context) (CreateBootstrapResult, error) {
	marketing, err := r.MarketingUsers(ctx)
	if err != nil {
		return CreateBootstrapResult{}, err
	}
	website, err := r.WebsiteUsers(ctx)
	if err != nil {
		return CreateBootstrapResult{}, err
	}

	ids := "0"
	for _, u := range marketing {
		ids += fmt.Sprintf(",%d", u.ID)
	}
	rows, err := r.db.QueryContext(ctx, `
SELECT DISTINCT user_id, name
FROM conversations
WHERE name IS NOT NULL AND name <> '' AND user_id IN (`+ids+`)
ORDER BY name`)
	if err != nil {
		return CreateBootstrapResult{}, err
	}
	defer rows.Close()

	clients := []map[string]any{}
	for rows.Next() {
		var userID sql.NullInt64
		var name sql.NullString
		if err := rows.Scan(&userID, &name); err != nil {
			return CreateBootstrapResult{}, err
		}
		clients = append(clients, map[string]any{"name": name.String, "marketing_id": userID.Int64})
	}

	return CreateBootstrapResult{
		CSRFToken:      "",
		MarketingUsers: marketing,
		WebsiteUsers:   website,
		Clients:        clients,
		Defaults: map[string]string{
			"domain": "", "user_id": "", "nama": "", "tim_design_id": "", "sisa_pelunasan": "",
		},
		Error: "",
	}, rows.Err()
}

func (r *Repository) DetailBootstrap(ctx context.Context, id int64) (DetailBootstrapResult, error) {
	result, err := r.ListRevisions(ctx, ListRevisionsParams{Page: 1, PerPage: 1})
	if err != nil {
		return DetailBootstrapResult{}, err
	}
	_ = result

	row := r.db.QueryRowContext(ctx, `
SELECT r.id, rg.domain, c.name, m.name, w.name,
COALESCE(c.sisa_pelunasan, 0),
CASE WHEN COALESCE(ui.is_paid,0)=1 THEN 'Lunas' WHEN COALESCE(ui.is_50_paid,0)=1 THEN '50% Lunas' ELSE 'Belum Lunas' END,
COALESCE(DATE_FORMAT(c.tanggal_pelunasan, '%d/%m/%Y'), '-'),
COALESCE(ui.package,''), COALESCE(ui.monthly_bill,''), COALESCE(ui.domain,'')
FROM revisions r
JOIN revision_groups rg ON rg.id = r.revision_group_id
JOIN conversations c ON c.id = r.conversation_id
LEFT JOIN users m ON m.id = c.user_id
LEFT JOIN users w ON w.id = c.tim_design_id
LEFT JOIN user_infos ui ON ui.conversation_id = c.id
WHERE r.id = ?`, id)
	var revID int64
	var domain, client, marketing, web string
	var sisa int64
	var status, tanggal, pkg, biaya, domainResmi string
	if err := row.Scan(&revID, &domain, &client, &marketing, &web, &sisa, &status, &tanggal, &pkg, &biaya, &domainResmi); err != nil {
		return DetailBootstrapResult{}, err
	}

	wfRows, err := r.db.QueryContext(ctx, `SELECT jenis, COALESCE(response,''), COALESCE(notes,''), COALESCE(is_answered,0), COALESCE(is_collecting,0) FROM revisions WHERE revision_group_id = (SELECT revision_group_id FROM revisions WHERE id = ?)`, id)
	if err != nil { return DetailBootstrapResult{}, err }
	defer wfRows.Close()
	rowsMap := map[int]DetailBootstrapRow{}
	for wfRows.Next() {
		var jenis int
		var stage, note string
		var ans, coll int
		if err := wfRows.Scan(&jenis, &stage, &note, &ans, &coll); err != nil { return DetailBootstrapResult{}, err }
		work := ""
		if ans == 1 { work = "done" } else if coll == 1 { work = "on_process" }
		label := "Website sudah jadi"
		if jenis > 0 { label = fmt.Sprintf("Revisi %d", jenis) }
		rowsMap[jenis] = DetailBootstrapRow{Jenis: jenis, Label: label, Stage: stage, Work: work, Note: note}
	}
	rows := []DetailBootstrapRow{}
	for i:=0;i<=3;i++ { if v,ok:=rowsMap[i]; ok { rows=append(rows,v) } else { label:="Website sudah jadi"; if i>0 {label=fmt.Sprintf("Revisi %d",i)}; rows=append(rows,DetailBootstrapRow{Jenis:i,Label:label}) } }

	return DetailBootstrapResult{
		CSRFToken:  "",
		RevisionID: revID,
		Domain:     domain,
		ProjectInfo: map[string]string{"domain_sementara": domain, "nama_klien": client, "tim_marketing": marketing, "tim_web": web, "sisa_pelunasan": fmt.Sprintf("Rp %d", sisa), "status_pembayaran": status, "tanggal_pelunasan": tanggal},
		ProjectNotes: map[string]string{"package_website": pkg, "biaya": biaya, "domain_resmi": domainResmi},
		Rows: rows,
		Options: map[string][]OptionItem{"stages": {{Value:"",Label:"--"},{Value:"waiting_client_data",Label:"Waiting Client Data"},{Value:"ready_to_revision",Label:"Ready to Revision"}}, "work": {{Value:"",Label:"--"},{Value:"not_started",Label:"Not Started"},{Value:"on_process",Label:"On Progress"},{Value:"done",Label:"Done"}}, "work_r0": {{Value:"",Label:"--"},{Value:"done",Label:"Done"}}},
	}, nil
}
