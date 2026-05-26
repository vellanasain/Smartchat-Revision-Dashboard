ALTER TABLE revision_projects
  MODIFY conversation_id BIGINT UNSIGNED NULL,
  ADD COLUMN package_name VARCHAR(191) NULL AFTER web_executor_id,
  ADD COLUMN notes TEXT NULL AFTER is_completed;

-- TODO(deprecation): legacy Laravel read-flow still exists in routes/web.php and blade views.
-- Do not remove until React pages fully consume Go API detail/create endpoints.
