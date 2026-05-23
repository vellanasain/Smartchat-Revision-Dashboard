# Revisions Module — Staging Deployment & QA Checklist

## Scope
Checklist ini untuk stack hybrid saat ini:
- React frontend
- Go API (default READ)
- Laravel backend (WRITE/auth source of truth)
- Nginx reverse proxy

Tidak mengubah arsitektur; fokus operability dan readiness.

---

## 1) Deployment Checklist (Pre-Deploy)

### Code & Branch
- [ ] Branch release sudah di-freeze
- [ ] Commit hash frontend/backend tercatat
- [ ] Changelog rollout disiapkan

### Build & Static Checks
- [ ] `cd react-app && npm run build` sukses
- [ ] `cd go-api && go test ./...` sukses
- [ ] `php -l app/Http/Controllers/RevisionController.php` sukses
- [ ] `php -l routes/web.php` sukses

### Config & Secrets
- [ ] `VITE_API_BASE` mengarah ke Go ingress path (`/go-api/api` atau domain setara)
- [ ] `VITE_LARAVEL_API_BASE` mengarah ke Laravel API fallback (`/api`)
- [ ] `VITE_PARITY_VERIFY` ditetapkan sesuai lingkungan (staging: `1`, production: opsional)
- [ ] `TRUST_PROXY_SHARED_KEY` diset kuat dan sama antara proxy & Go
- [ ] Laravel session/cookie env konsisten dengan domain staging

### Infra Routing
- [ ] Nginx route `/` -> React
- [ ] Nginx route `/go-api/*` -> Go API
- [ ] Nginx route `/api/*` -> Laravel API
- [ ] Nginx route `/revisions*` -> Laravel web routes
- [ ] Header trust (`X-Trusted-Proxy`, `X-Auth-Signature`) hanya diinject oleh proxy internal

---

## 2) Staging Startup Steps (Order)

## Urutan startup service (disarankan)
1. Database (MySQL)
2. Laravel app
3. Go API
4. React app/static
5. Nginx ingress

### Sample startup commands (local/staging-like)
```bash
# 1) start stack baseline
cd /workspace/Smartchat-Revision-Dashboard
docker compose -f docker-compose.hybrid.yml up -d

# 2) quick health checks
curl -sS http://localhost:8080/healthz
curl -sS http://localhost:8080/go-api/api/health
curl -sS http://localhost:8080/api/revisions/create-bootstrap
```

### Post-start sanity
- [ ] Login/session Laravel valid
- [ ] Revisions list load dari Go default
- [ ] Create bootstrap load
- [ ] Detail bootstrap load
- [ ] Fallback Laravel aktif jika Go endpoint dimatikan

---

## 3) Environment Variable Checklist

## React
- [ ] `VITE_API_BASE`
- [ ] `VITE_LARAVEL_API_BASE`
- [ ] `VITE_PARITY_VERIFY`

## Go API
- [ ] `GO_API_ADDR`
- [ ] `TRUST_PROXY_SHARED_KEY`
- [ ] DB vars (`DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`)

## Laravel
- [ ] `APP_ENV`, `APP_URL`
- [ ] DB vars
- [ ] SESSION/COOKIE config sesuai domain/proxy HTTPS

## Nginx / Gateway
- [ ] Upstream host/port benar
- [ ] Trust headers disuntik hanya untuk route Go
- [ ] TLS termination policy sesuai staging

---

## 4) Service Dependency Checklist
- [ ] Laravel bisa akses DB
- [ ] Go API bisa akses DB yang sama
- [ ] Nginx bisa reach laravel/go/react upstream
- [ ] React API path resolve via proxy
- [ ] Clock/timezone antar service sinkron (untuk log correlation)

---

## 5) Rollback / Fallback Procedure

## Fast fallback (tanpa redeploy besar)
1. Set React READ ke Laravel:
   - override `VITE_API_BASE=/api`
   - atau disable upstream Go di proxy `/go-api/*`
2. Reload React/Nginx config
3. Verifikasi revisions list/create/detail bootstrap via Laravel API

## Rollback penuh release
1. Revert deployment ke image/commit sebelumnya
2. Flush config cache jika perlu
3. Jalankan smoke test checklist minimal

## Decision triggers rollback
- >5% request Go READ gagal selama 10 menit
- fallback rate melonjak abnormal
- contract mismatch kritis yang impact UX utama

---

## 6) QA Checklist Revisions Module (Production-like)

### Revisions List
- [ ] Search submit sync query-string
- [ ] Filter marketing/web sinkron URL
- [ ] Pagination prev/next/ellipsis benar
- [ ] Refresh/back browser preserve state

### Create Revision
- [ ] Form bootstrap load (users/clients/defaults)
- [ ] Combobox client filter by marketing
- [ ] Money input format & hidden value sinkron
- [ ] Submit ke Laravel `POST /revisions` sukses
- [ ] Validation error tampil benar

### Detail/Edit Revision
- [ ] Detail bootstrap load dari Go
- [ ] Workflow row stage/work/note editable
- [ ] Notes modal open/save/close benar
- [ ] Submit update ke Laravel `PUT /revisions/{id}` sukses
- [ ] Error handling & back to list normal

### Fallback Behavior
- [ ] Simulasikan Go down -> React fallback ke Laravel berjalan
- [ ] UI tetap usable tanpa redesign/blank state

---

## 7) Monitoring & Logging Checklist

### Metrics minimum
- [ ] Go `/api/health` uptime
- [ ] 5xx rate Go vs Laravel
- [ ] React fallback-hit rate (Go->Laravel)
- [ ] Laravel 401/419 trend

### Logs minimum
- [ ] Nginx access/error logs aktif
- [ ] Go app logs (trust-boundary rejection, handler errors)
- [ ] Laravel app logs (write/auth/validation errors)

### Alert recommendations
- [ ] Go 5xx > threshold
- [ ] fallback rate spike
- [ ] trust-boundary unauthorized spike
- [ ] DB connection failure

---

## Troubleshooting

### Symptom: Revisions page kosong / request gagal
- Cek `VITE_API_BASE` dan proxy path `/go-api/api`
- Cek Go `/api/health`
- Cek fallback Laravel endpoint reachable

### Symptom: Go API selalu 401 `untrusted proxy boundary`
- Cek `TRUST_PROXY_SHARED_KEY` sama dengan header proxy
- Cek request benar-benar lewat Nginx (bukan direct)

### Symptom: Create submit gagal CSRF
- Pastikan domain/session Laravel benar
- Pastikan submit tetap menuju Laravel endpoint

### Symptom: Data mismatch Go vs Laravel
- Aktifkan `VITE_PARITY_VERIFY=1`
- Lihat warning parity di browser console
- Cek contract payload endpoint terkait

---

## Known Risks (Current)
1. Semantic contract drift (meskipun shape parity sudah ada)
2. Trust-boundary salah konfigurasi bisa blok READ Go
3. Fallback terlalu sering bisa menutupi masalah Go jika monitoring lemah
4. WRITE flow tetap Laravel (intended), sehingga dual-backend complexity masih ada

---

## Go/No-Go Staging Gate
Stack dinyatakan **ready untuk staging** jika:
- Semua pre-deploy checks lulus
- Startup + smoke checks lulus
- QA checklist kritikal lulus
- Monitoring/alert minimum aktif
- Rollback runbook teruji minimal 1 kali
