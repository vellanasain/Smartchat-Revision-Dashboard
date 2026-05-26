-- Revision & Billing v2 (React + Go primary stack)
-- Breaking changes are allowed in development environment.

CREATE TABLE IF NOT EXISTS revision_projects (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  conversation_id BIGINT UNSIGNED NOT NULL,
  client_name VARCHAR(191) NOT NULL,
  temporary_domain VARCHAR(255) NULL,
  official_domain VARCHAR(255) NULL,
  admin_pelunasan_id BIGINT UNSIGNED NOT NULL,
  web_executor_id BIGINT UNSIGNED NULL,
  payment_status ENUM('unpaid','partial_paid','paid','overdue') NOT NULL DEFAULT 'unpaid',
  remaining_payment DECIMAL(14,2) NOT NULL DEFAULT 0,
  active_until DATE NULL,
  current_revision_no TINYINT UNSIGNED NOT NULL DEFAULT 0,
  current_revision_stage ENUM('--','waiting_client_data','ready_to_revision','ready_to_connection') NOT NULL DEFAULT '--',
  current_work_status ENUM('--','not_started','on_progress','done') NOT NULL DEFAULT '--',
  total_free_revision_used TINYINT UNSIGNED NOT NULL DEFAULT 0,
  is_completed TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_revision_projects_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  CONSTRAINT fk_revision_projects_admin FOREIGN KEY (admin_pelunasan_id) REFERENCES users(id),
  CONSTRAINT fk_revision_projects_web FOREIGN KEY (web_executor_id) REFERENCES users(id),
  UNIQUE KEY uq_revision_projects_conversation (conversation_id),
  KEY idx_revision_projects_assignee (web_executor_id, current_work_status),
  KEY idx_revision_projects_revision (current_revision_no, current_revision_stage, current_work_status),
  KEY idx_revision_projects_payment (payment_status, active_until)
);

CREATE TABLE IF NOT EXISTS revision_cycles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT UNSIGNED NOT NULL,
  revision_no TINYINT UNSIGNED NOT NULL,
  revision_label VARCHAR(50) NOT NULL,
  revision_stage ENUM('--','waiting_client_data','ready_to_revision','ready_to_connection') NOT NULL DEFAULT '--',
  work_status ENUM('--','not_started','on_progress','done') NOT NULL DEFAULT '--',
  assigned_web_id BIGINT UNSIGNED NULL,
  started_at DATETIME NULL,
  completed_at DATETIME NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cycles_project FOREIGN KEY (project_id) REFERENCES revision_projects(id),
  CONSTRAINT fk_cycles_web FOREIGN KEY (assigned_web_id) REFERENCES users(id),
  UNIQUE KEY uq_cycles_project_revision (project_id, revision_no),
  KEY idx_cycles_status (project_id, revision_stage, work_status)
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  payment_type ENUM('manual','bank_transfer','gateway','other') NOT NULL DEFAULT 'manual',
  payment_status ENUM('pending','settlement','failed','refunded') NOT NULL DEFAULT 'pending',
  payment_proof_url VARCHAR(512) NULL,
  detected_by_ai TINYINT(1) NOT NULL DEFAULT 0,
  paid_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payments_project FOREIGN KEY (project_id) REFERENCES revision_projects(id),
  KEY idx_payments_project (project_id, created_at),
  KEY idx_payments_status (payment_status, paid_at)
);

CREATE TABLE IF NOT EXISTS revision_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT UNSIGNED NOT NULL,
  cycle_id BIGINT UNSIGNED NULL,
  actor_type ENUM('system','admin_pelunasan','tim_web','bot_ai') NOT NULL DEFAULT 'system',
  actor_id BIGINT UNSIGNED NULL,
  event_type VARCHAR(80) NOT NULL,
  payload_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_events_project FOREIGN KEY (project_id) REFERENCES revision_projects(id),
  CONSTRAINT fk_events_cycle FOREIGN KEY (cycle_id) REFERENCES revision_cycles(id),
  CONSTRAINT fk_events_actor FOREIGN KEY (actor_id) REFERENCES users(id),
  KEY idx_events_project (project_id, created_at),
  KEY idx_events_type (event_type, created_at)
);

CREATE TABLE IF NOT EXISTS automation_jobs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  project_id BIGINT UNSIGNED NOT NULL,
  job_type ENUM('send_whatsapp','send_email','detect_payment','notify_web_team') NOT NULL,
  payload_json JSON NULL,
  status ENUM('queued','processing','success','failed','dead_letter') NOT NULL DEFAULT 'queued',
  retry_count INT UNSIGNED NOT NULL DEFAULT 0,
  executed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_jobs_project FOREIGN KEY (project_id) REFERENCES revision_projects(id),
  KEY idx_jobs_status (status, retry_count, created_at),
  KEY idx_jobs_project (project_id, created_at)
);

-- Legacy flow should be considered deprecated after cutover:
-- revision_groups, revisions, chat_revisions, user_infos.is_rev_0_done..is_rev_3_done
