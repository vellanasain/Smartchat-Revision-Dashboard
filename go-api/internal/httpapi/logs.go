package httpapi

import (
	"bufio"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
)

func (h *Handler) logs(w http.ResponseWriter, r *http.Request) {
	count, _ := strconv.Atoi(r.URL.Query().Get("lines"))
	if count < 50 || count > 1000 {
		count = 300
	}
	path := filepath.Join(h.cfg.RootDir, "storage", "logs", "laravel.log")
	lines := tailLines(path, count)
	writeJSON(w, 200, map[string]any{
		"file":  "storage/logs/laravel.log",
		"lines": lines,
	})
}

func tailLines(path string, count int) []string {
	file, err := os.Open(path)
	if err != nil {
		return []string{}
	}
	defer file.Close()

	ring := make([]string, count)
	total := 0
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		ring[total%count] = scanner.Text()
		total++
	}

	limit := count
	if total < count {
		limit = total
	}
	out := make([]string, 0, limit)
	start := total - limit
	for i := 0; i < limit; i++ {
		out = append(out, ring[(start+i)%count])
	}
	return out
}
