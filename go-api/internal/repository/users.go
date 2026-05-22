package repository

import (
	"context"
	"strings"
)

var MarketingNames = []string{
	"Ayu", "Iin", "Ikmah", "Aulia", "Zaqia", "Bella", "Reni", "Sevya", "Wiwin", "Tika", "Ingka", "Cindi",
	"ptasainovasi", "pteksadigital", "Dea", "Ika", "Sekar", "Okti", "Neneng", "Vika", "EbyB", "Ifah",
	"Yesi", "Andini", "Yovanti", "Imelia", "Zalfa",
}

func (r *Repository) MarketingUsers(ctx context.Context) ([]User, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, name, role FROM users WHERE LOWER(name) IN (`+placeholders(len(MarketingNames))+`)`, lowerList(MarketingNames)...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	byName := map[string]User{}
	for rows.Next() {
		var user User
		if err := rows.Scan(&user.ID, &user.Name, &user.Role); err != nil {
			return nil, err
		}
		byName[strings.ToLower(user.Name)] = user
	}

	users := make([]User, 0, len(byName))
	for _, name := range MarketingNames {
		if user, ok := byName[strings.ToLower(name)]; ok {
			users = append(users, user)
		}
	}
	return users, rows.Err()
}

func (r *Repository) WebsiteUsers(ctx context.Context) ([]User, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, name, role FROM users WHERE role = 'website' ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var user User
		if err := rows.Scan(&user.ID, &user.Name, &user.Role); err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	return users, rows.Err()
}

func placeholders(count int) string {
	if count <= 0 {
		return "NULL"
	}
	items := make([]string, count)
	for i := range items {
		items[i] = "?"
	}
	return strings.Join(items, ",")
}

func lowerList(values []string) []any {
	out := make([]any, 0, len(values))
	for _, value := range values {
		out = append(out, strings.ToLower(value))
	}
	return out
}
