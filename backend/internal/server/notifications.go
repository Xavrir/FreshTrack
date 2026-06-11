package server

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"
)

// reminderTick is how often the reminder scheduler evaluates households.
const reminderTick = 15 * time.Minute

// reminderAdvisoryLock guards the scheduler so only one API instance fires
// reminders at a time (Railway may run multiple replicas).
const reminderAdvisoryLock = 776699

// parseHHMM parses a "HH:MM" reminder time. It returns ok=false on bad input.
func parseHHMM(value string) (hour, minute int, ok bool) {
	parts := strings.Split(strings.TrimSpace(value), ":")
	if len(parts) != 2 {
		return 0, 0, false
	}
	h, err := strconv.Atoi(parts[0])
	if err != nil || h < 0 || h > 23 {
		return 0, 0, false
	}
	m, err := strconv.Atoi(parts[1])
	if err != nil || m < 0 || m > 59 {
		return 0, 0, false
	}
	return h, m, true
}

// reminderDue reports whether the daily reminder should run: true once the local
// time has reached the configured reminder time. The per-batch ledger prevents
// repeat sends within the same local day.
func reminderDue(localNow time.Time, reminderTime string) bool {
	h, m, ok := parseHHMM(reminderTime)
	if !ok {
		return false
	}
	due := time.Date(localNow.Year(), localNow.Month(), localNow.Day(), h, m, 0, 0, localNow.Location())
	return !localNow.Before(due)
}

// reminderBody renders the notification text for a batch expiring in leadDay days.
func reminderBody(name string, leadDay int) string {
	switch {
	case leadDay <= 0:
		return fmt.Sprintf("%s expires today.", name)
	case leadDay == 1:
		return fmt.Sprintf("%s expires tomorrow.", name)
	default:
		return fmt.Sprintf("%s expires in %d days.", name, leadDay)
	}
}

// StartReminders runs the reminder scheduler until the context is cancelled.
func (s *Server) StartReminders(ctx context.Context) {
	ticker := time.NewTicker(reminderTick)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := s.runReminderTick(ctx); err != nil {
				s.logger.Warn("reminder tick failed", "error", err)
			}
		}
	}
}

type householdReminderConfig struct {
	householdID  string
	reminderTime string
	leadDays     []int
	timezone     string
}

// runReminderTick sends due expiry reminders for every household. It holds a
// Postgres advisory lock so concurrent instances do not double-send.
func (s *Server) runReminderTick(ctx context.Context) error {
	var locked bool
	if err := s.db.QueryRow(ctx, `SELECT pg_try_advisory_lock($1)`, reminderAdvisoryLock).Scan(&locked); err != nil {
		return err
	}
	if !locked {
		return nil
	}
	defer s.db.Exec(ctx, `SELECT pg_advisory_unlock($1)`, reminderAdvisoryLock)

	configs, err := s.householdReminderConfigs(ctx)
	if err != nil {
		return err
	}
	for _, cfg := range configs {
		s.processHouseholdReminders(ctx, cfg)
	}
	return nil
}

func (s *Server) householdReminderConfigs(ctx context.Context) ([]householdReminderConfig, error) {
	rows, err := s.db.Query(ctx, `SELECT h.id, hs.reminder_time_local, hs.lead_days, hs.timezone
		FROM households h JOIN household_settings hs ON hs.household_id = h.id
		WHERE h.deleted_at IS NULL`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var configs []householdReminderConfig
	for rows.Next() {
		var cfg householdReminderConfig
		if err := rows.Scan(&cfg.householdID, &cfg.reminderTime, &cfg.leadDays, &cfg.timezone); err != nil {
			return nil, err
		}
		configs = append(configs, cfg)
	}
	return configs, rows.Err()
}

func (s *Server) processHouseholdReminders(ctx context.Context, cfg householdReminderConfig) {
	loc, err := time.LoadLocation(cfg.timezone)
	if err != nil {
		loc = time.UTC
	}
	localNow := time.Now().In(loc)
	if !reminderDue(localNow, cfg.reminderTime) {
		return
	}
	today := time.Date(localNow.Year(), localNow.Month(), localNow.Day(), 0, 0, 0, 0, loc)

	for _, lead := range cfg.leadDays {
		targetDate := today.AddDate(0, 0, lead)
		rows, err := s.db.Query(ctx, `SELECT id, name FROM inventory_batches
			WHERE household_id = $1 AND deleted_at IS NULL AND quantity > 0 AND expiry_date = $2`,
			cfg.householdID, targetDate)
		if err != nil {
			s.logger.Warn("reminder query batches failed", "error", err)
			continue
		}
		type pending struct {
			id   string
			name string
		}
		var batches []pending
		for rows.Next() {
			var p pending
			if err := rows.Scan(&p.id, &p.name); err != nil {
				continue
			}
			batches = append(batches, p)
		}
		rows.Close()

		for _, b := range batches {
			// Claim the send via the dedupe ledger; skip if already claimed today.
			tag, err := s.db.Exec(ctx, `INSERT INTO notifications_sent (household_id, batch_id, lead_day, send_date)
				VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
				cfg.householdID, b.id, lead, today)
			if err != nil {
				s.logger.Warn("reminder ledger insert failed", "error", err)
				continue
			}
			if tag.RowsAffected() == 0 {
				continue
			}
			tokens, err := s.householdPushTokens(ctx, cfg.householdID)
			if err != nil {
				s.logger.Warn("reminder load tokens failed", "error", err)
				continue
			}
			if err := s.push.Send(ctx, tokens, "FreshTrack", reminderBody(b.name, lead)); err != nil {
				s.logger.Warn("reminder push failed", "error", err)
			}
		}
	}
}

func (s *Server) householdPushTokens(ctx context.Context, householdID string) ([]string, error) {
	rows, err := s.db.Query(ctx, `SELECT dpt.expo_token FROM device_push_tokens dpt
		JOIN household_members hm ON hm.user_id = dpt.user_id
		WHERE hm.household_id = $1 AND dpt.disabled_at IS NULL`, householdID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var tokens []string
	for rows.Next() {
		var token string
		if err := rows.Scan(&token); err != nil {
			return nil, err
		}
		tokens = append(tokens, token)
	}
	return tokens, rows.Err()
}
