package repository

import "fmt"

const (
	RoleAdmin = "admin_pelunasan"
	RoleWeb   = "tim_web"
)

func ValidateRevisionNo(no int) error {
	if no < 0 || no > 4 {
		return fmt.Errorf("current_revision_no must be between 0 and 4")
	}
	return nil
}

func ValidateStageForRevision(no int, stage string) error {
	allowed := allowedStages(no)
	for _, s := range allowed {
		if s == stage {
			return nil
		}
	}
	return fmt.Errorf("invalid stage '%s' for R%d", stage, no)
}

func ValidateWorkForRevision(no int, work string) error {
	allowed := allowedWork(no)
	for _, w := range allowed {
		if w == work {
			return nil
		}
	}
	return fmt.Errorf("invalid work_status '%s' for R%d", work, no)
}

func ValidateStageTransition(no int, from, to string) error {
	if err := ValidateStageForRevision(no, to); err != nil {
		return err
	}
	order := map[string]int{"--": 0, "waiting_client_data": 1, "ready_to_revision": 2, "ready_to_connection": 2}
	if order[to] < order[from] {
		return fmt.Errorf("invalid stage transition from %s to %s", from, to)
	}
	return nil
}

func ValidateWorkTransition(no int, stage, from, to string) error {
	if err := ValidateWorkForRevision(no, to); err != nil {
		return err
	}
	order := map[string]int{"--": 0, "not_started": 1, "on_progress": 2, "done": 3}
	if no == 0 {
		if to != "done" {
			return fmt.Errorf("R0 work_status must be done")
		}
		return nil
	}
	if to == "on_progress" && !(stage == "ready_to_revision" || (no == 4 && stage == "ready_to_connection")) {
		return fmt.Errorf("on_progress is allowed only when stage is ready_to_revision (R1-R3) or ready_to_connection (R4)")
	}
	if order[to] < order[from] {
		return fmt.Errorf("invalid work_status transition from %s to %s", from, to)
	}
	return nil
}

func allowedStages(no int) []string {
	switch no {
	case 0:
		return []string{"--"}
	case 1, 2, 3:
		return []string{"--", "waiting_client_data", "ready_to_revision"}
	case 4:
		return []string{"--", "ready_to_connection"}
	default:
		return []string{}
	}
}

func allowedWork(no int) []string {
	if no == 0 {
		return []string{"done"}
	}
	return []string{"--", "not_started", "on_progress", "done"}
}

func CanViewProject(role string, actorID int64, assignedWebID *int64) bool {
	if role == RoleAdmin {
		return true
	}
	if role == RoleWeb && assignedWebID != nil {
		return *assignedWebID == actorID
	}
	return false
}
