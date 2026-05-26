# Smartchat Revision & Billing Automation System Design

## 1) Analisis Database Lama

### Tetap Dipertahankan (dengan normalisasi bertahap)
- `conversations` sebagai entitas project/customer utama (terkait domain, owner, catatan operasional).
- `users` sebagai master akun pengguna internal.
- `user_infos` tetap sementara sebagai sumber data billing existing saat masa transisi.

### Perlu Migrasi / Refactor
- `user_infos.is_rev_0_done` s/d `is_rev_3_done` ➜ diganti menjadi model event + state berbasis revision cycle.
- `conversations.tim_design_id` ➜ direpurpose/rename pada domain revisi menjadi assignment tim web per siklus.
- `conversations.sisa_pelunasan` dan `tanggal_pelunasan` ➜ dipindahkan menjadi histori transaksi + billing snapshot agar bisa diaudit.

### Deprecated
- `revision_groups` (legacy grouping tidak eksplisit untuk state machine modern).
- `revisions` (jika masih berisi struktur flat tanpa stage + history).
- `chat_revisions` (jika hanya catatan chat tanpa event semantic).

> Catatan: tiga tabel legacy bisa tetap dibaca dalam mode read-only selama fase backfill, lalu diarsipkan.

---

## 2) Arsitektur Database Final (Production-ready)

## Prinsip Desain
- **State terkini** dipisahkan dari **history event**.
- Semua aksi penting (payment, stage change, assignment, automation trigger) tercatat immutable.
- Model siap untuk dashboard filter-heavy + bot context query.

### A. `revision_projects` (source of truth per project revisi)
Fungsi: status operasional terkini project revisi.

Kolom utama:
- `id` (bigint, PK)
- `conversation_id` (bigint, FK -> conversations.id, unique)
- `client_user_id` (bigint, FK -> users.id, nullable; jika customer ada di users)
- `current_revision_level` (tinyint, not null) enum: `0,1,2,3,4`
- `current_revision_stage` (varchar, not null) enum:
  - `--`
  - `waiting_client_data`
  - `ready_to_revision`
  - `ready_to_connection`
- `current_work_status` (varchar, not null) enum:
  - `--`
  - `not_started`
  - `on_progress`
  - `done`
- `assigned_web_user_id` (bigint, FK -> users.id, nullable)
- `payment_status` (varchar, not null) enum: `unpaid`, `partial_paid`, `paid`, `overdue`
- `remaining_balance` (decimal(14,2), not null, default 0)
- `active_until` (date, nullable)
- `temporary_domain` (varchar(255), nullable)
- `official_domain` (varchar(255), nullable)
- `last_payment_at` (datetime, nullable)
- `last_stage_changed_at` (datetime, nullable)
- `created_at`, `updated_at`

Index penting:
- `idx_revision_projects_level_stage_status` (`current_revision_level`,`current_revision_stage`,`current_work_status`)
- `idx_revision_projects_payment` (`payment_status`,`active_until`)
- `idx_revision_projects_assigned_web` (`assigned_web_user_id`,`current_work_status`)
- `idx_revision_projects_conversation` (`conversation_id` unique)

### B. `revision_cycles` (riwayat siklus R0-R4)
Fungsi: satu baris per level revisi per project.

Kolom:
- `id` (PK)
- `revision_project_id` (FK -> revision_projects.id)
- `revision_level` tinyint enum `0..4`
- `stage` enum sama seperti di atas
- `work_status` enum sama seperti di atas
- `started_at` datetime not null
- `completed_at` datetime nullable
- `assigned_web_user_id` FK users nullable
- `notes` text nullable
- `created_by` FK users not null
- `updated_by` FK users nullable
- timestamps

Constraint:
- unique (`revision_project_id`,`revision_level`) untuk mencegah duplikasi satu level aktif.

Index:
- `idx_cycles_project_level`
- `idx_cycles_assignee_status`

### C. `revision_events` (audit log + automation trigger log)
Fungsi: event sourcing ringan.

Kolom:
- `id` (PK)
- `revision_project_id` FK
- `revision_cycle_id` FK nullable
- `event_type` enum:
  - `project_created`
  - `assignment_changed`
  - `stage_changed`
  - `work_status_changed`
  - `payment_detected`
  - `active_until_extended`
  - `wa_sent`
  - `email_sent`
  - `bot_switched`
- `event_payload` JSON not null
- `actor_user_id` FK users nullable (system event = null)
- `event_at` datetime not null
- `idempotency_key` varchar(128) nullable
- timestamps

Index:
- `idx_events_project_time` (`revision_project_id`,`event_at desc`)
- `idx_events_type_time` (`event_type`,`event_at desc`)
- unique `idempotency_key` (nullable unique)

### D. `payment_transactions`
Fungsi: histori pembayaran granular.

Kolom:
- `id` PK
- `revision_project_id` FK
- `conversation_id` FK
- `amount` decimal(14,2)
- `currency` char(3) default `IDR`
- `payment_channel` enum: `manual`, `xendit`, `midtrans`, `bank_transfer`, `other`
- `payment_status` enum: `pending`, `settlement`, `failed`, `refunded`
- `external_ref` varchar(128) nullable
- `paid_at` datetime nullable
- `detected_at` datetime not null
- `raw_payload` JSON nullable
- timestamps

Index:
- `idx_payment_project_paidat`
- `idx_payment_external_ref` unique (jika gateway menyediakan ID unik)

### E. `project_assignments` (opsional bila butuh histori assignment detail)
Jika cukup di `revision_events`, tabel ini bisa di-skip. Jika dipakai:
- histori siapa assigned kapan, alasan, dan effective range.

### F. `automation_jobs`
Fungsi: outbox + retry untuk WA/email/bot trigger.

Kolom:
- `id` PK
- `revision_project_id` FK
- `job_type` enum: `send_wa`, `send_email`, `switch_bot`, `sync_dashboard`
- `template_code` varchar(64) nullable
- `target` varchar(255) nullable
- `payload` JSON not null
- `status` enum: `queued`,`processing`,`success`,`failed`,`dead_letter`
- `attempt_count` int default 0
- `next_retry_at` datetime nullable
- `last_error` text nullable
- timestamps

Index:
- `idx_automation_status_retry` (`status`,`next_retry_at`)
- `idx_automation_project_created` (`revision_project_id`,`created_at desc`)

### G. `user_roles` (jika ingin robust RBAC)
Jika saat ini `users.role` string tunggal, minimal tambah validasi enum:
- `admin_pelunasan`
- `tim_web`

Jika future multi-role:
- `roles`, `user_role_maps`, `permissions`, `role_permission_maps`.

---

## 3) ERD Sederhana (Text)

- `conversations (1) ---- (1) revision_projects`
- `revision_projects (1) ---- (N) revision_cycles`
- `revision_projects (1) ---- (N) revision_events`
- `revision_projects (1) ---- (N) payment_transactions`
- `revision_projects (1) ---- (N) automation_jobs`
- `users (1) ---- (N) revision_projects.assigned_web_user_id`
- `users (1) ---- (N) revision_events.actor_user_id`
- `users (1) ---- (N) revision_cycles.assigned_web_user_id`

---

## 4) Tabel Baru, Deprecated, dan Kolom Lama yang Dihapus

## Tabel Baru
- `revision_projects`
- `revision_cycles`
- `revision_events`
- `payment_transactions`
- `automation_jobs`
- (opsional) `project_assignments`
- (opsional) set RBAC table penuh

## Deprecated
- `revision_groups`
- `revisions`
- `chat_revisions`

## Kolom Lama yang Dihapus (setelah migrasi stabil)
- `user_infos.is_rev_0_done`
- `user_infos.is_rev_1_done`
- `user_infos.is_rev_2_done`
- `user_infos.is_rev_3_done`
- (opsional) `conversations.tim_design_id` jika sudah dipindah ke `assigned_web_user_id`
- (opsional) `conversations.sisa_pelunasan`, `tanggal_pelunasan` bila histori payment sudah penuh dan sinkron

---

## 5) Strategi Migrasi Data

## Fase 0: Persiapan
- Tambah tabel baru tanpa mengganggu flow existing.
- Tambah feature flag `revision_v2_enabled`.

## Fase 1: Backfill snapshot awal
1. Buat satu row `revision_projects` per `conversation` aktif.
2. Mapping `is_rev_x_done`:
   - semua false -> `current_revision_level=0`, `stage='--'`, `work_status='done'` (sesuai definisi R0)
   - `is_rev_1_done=true` berarti minimal pernah menyelesaikan R1; tentukan level saat ini dari flag tertinggi done + data legacy revisions.
3. `remaining_balance` isi dari `conversations.sisa_pelunasan`.
4. `temporary_domain` dari `user_infos.domain` (jika itu domain staging), `official_domain` dari `conversations.domain` bila valid.

## Fase 2: Backfill history
- `revision_groups` -> `revision_cycles` (group ke cycle level).
- `revisions` -> `revision_events` (`stage_changed` / `work_status_changed` berdasarkan mapping status legacy).
- `chat_revisions` -> opsional masuk `revision_events` tipe `note_added` atau tetap diarsip read-only.
- transaksi pembayaran existing -> `payment_transactions` dengan `payment_channel='manual'`, `detected_at` dari timestamp record lama.

## Fase 3: Dual write
- Selama 2-4 minggu, semua update revision menulis ke model lama + baru.
- Bangun reconciliation job harian untuk bandingkan state lama vs baru.

## Fase 4: Cutover read path
- Dashboard React read dari `revision_projects` + joined aggregates.
- Bot context read full dari model baru.

## Fase 5: Decommission
- Matikan write ke kolom legacy.
- Drop kolom `is_rev_x_done` setelah masa observasi.

---

## 6) Workflow Dashboard (Role-aware)

## Query model dashboard
Endpoint utama mengembalikan list dari `revision_projects` + denormalized fields:
- project/customer name (`conversations.name`)
- revision level/stage/work_status
- payment_status, remaining_balance, active_until
- assigned_web_user

## Filter wajib
- `revision_level`
- `payment_status`
- `work_status`
- `assigned_web_user_id`
- `active_until` (range / expired soon)

## Aturan visibilitas
- `admin_pelunasan`: tanpa batasan tenant (lihat semua).
- `tim_web`: `where assigned_web_user_id = auth.user.id`.

## Operasi update
- Tim Web: hanya boleh patch `work_status` (+ optional note).
- Admin: boleh update `revision_stage`, assignment, trigger automation, manual payment adjust.

---

## 7) Role System

## Minimal (cepat)
- Pertahankan `users.role` dengan whitelist ketat:
  - `admin_pelunasan`
  - `tim_web`

## Rekomendasi production
- Gunakan policy-based authorization (Laravel Policy/Gate):
  - `viewAnyRevisionProject`
  - `viewAssignedRevisionProject`
  - `updateWorkStatus`
  - `updateRevisionStage`
  - `assignWebTeam`
  - `triggerAutomation`

---

## 8) Automation Events Final

## A. Saat create revision project
1. Insert `revision_projects` + cycle awal.
2. Log `revision_events.project_created`.
3. Enqueue `automation_jobs.send_wa` (template onboarding revisi).
4. Enqueue `automation_jobs.switch_bot` (future bot mode).

## B. Saat payment detected
1. Insert `payment_transactions`.
2. Recompute `remaining_balance`, `payment_status`, `active_until` di `revision_projects`.
3. Log `payment_detected` + `active_until_extended` bila berubah.
4. Rule engine: jika syarat terpenuhi, set stage ke `ready_to_revision`.

## C. Saat stage jadi `ready_to_revision`
1. Update `revision_projects.current_revision_stage`.
2. Log event `stage_changed`.
3. Enqueue `send_email` ke `assigned_web_user_id`.

## D. Saat work_status jadi `done`
1. Update cycle current + project snapshot.
2. Log `work_status_changed`.
3. Enqueue `send_wa` template selesai revisi.
4. Jika R1/R2/R3 selesai, increment ke level berikutnya sesuai policy.
5. Jika R4 done, set project lifecycle selesai.

---

## 9) Bot Context Data (Source of Truth)

Bot “Optima Pelunasan” baca dari:
- **utama**: `revision_projects` (snapshot terkini cepat)
- **detail histori revisi**: `revision_cycles` + `revision_events`
- **histori pembayaran**: `payment_transactions`
- **metadata customer/project**: `conversations`, `user_infos` (transisi)

### Kenapa ini efektif
- Bot butuh jawaban cepat → snapshot table.
- Bot butuh justifikasi/riwayat → event/history table.
- Menghindari query berat ke tabel legacy yang tidak konsisten.

---

## 10) Endpoint API yang Perlu Ditambah

## Admin + Tim Web
- `GET /api/revision-projects` (filter + pagination + role scope)
- `GET /api/revision-projects/{id}`
- `GET /api/revision-projects/{id}/timeline` (events + cycles + payments)

## Admin only
- `POST /api/revision-projects`
- `PATCH /api/revision-projects/{id}/stage`
- `PATCH /api/revision-projects/{id}/assign-web`
- `POST /api/revision-projects/{id}/trigger-automation`
- `POST /api/revision-projects/{id}/payments/manual`

## Tim web only
- `PATCH /api/revision-projects/{id}/work-status`

## Internal webhook / integrations
- `POST /api/integrations/payments/webhook`
- `POST /api/integrations/wa/status-callback`

---

## 11) Saran Laravel + Go Hybrid

## Tetap di Laravel
- Auth, RBAC policy, admin CRUD, dashboard API orchestration.
- Transactional writes untuk revision/payment/event.
- Scheduler untuk reconciliation + outbox dispatcher (awal fase).

## Cocok dipindah ke Go
- High-throughput worker untuk:
  - WA sending pipeline
  - payment webhook processor ber-volume tinggi
  - event stream consumer untuk bot context sync
- Read-optimized API aggregator bila trafik dashboard tumbuh besar.

### Pola integrasi
- Laravel sebagai **system of record writer**.
- Go sebagai **async processor** via queue/outbox (`automation_jobs`).
- Komunikasi via DB outbox / message broker (RabbitMQ/Kafka jika scale naik).

---

## 12) Rencana Implementasi Bertahap Aman untuk Production

1. **Schema introduction**: tambah tabel baru + index + constraints.
2. **Backfill offline**: isi snapshot dan history dari legacy.
3. **Dual-write**: jalankan penulisan ganda + monitoring mismatch.
4. **Read cutover internal**: dashboard staging read dari schema baru.
5. **Automation gradual rollout**:
   - minggu 1: WA only
   - minggu 2: payment webhook auto stage
   - minggu 3: email + bot switch
6. **Role enforcement ketat**: aktifkan policy endpoint bertahap.
7. **Production cutover**: pindah default dashboard ke v2.
8. **Observability**:
   - metric lag outbox
   - error rate WA/email/webhook
   - mismatch state count
9. **Decommission legacy** setelah 2 siklus billing tanpa mismatch mayor.

---

## 13) Reasoning Teknis Inti (kenapa schema ini)
- `is_rev_x_done` adalah model **column-per-state** yang tidak scalable; setiap state baru butuh alter table + logic bercabang.
- Snapshot + history memisahkan kebutuhan performa (dashboard/bot cepat) dan auditability (compliance/debug).
- Event & outbox pattern memastikan automation reliable, retryable, dan idempotent.
- Revision cycle table membuat R0-R4 eksplisit, mudah difilter, mudah dianalisis SLA per tahap.
- Role policy berbasis aksi mencegah tim web mengubah stage/payment yang seharusnya domain admin.

