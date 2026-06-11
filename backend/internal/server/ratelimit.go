package server

import (
	"context"
	"errors"
	"fmt"
	"math"
	"net/http"
	"strconv"
	"time"

	"freshtrack/backend/internal/httpx"

	"github.com/jackc/pgx/v5"
)

// Rate-limit tunables. Auth endpoints are low-QPS, so the limits are generous
// enough for real users but tight enough to blunt brute-force and email-bombing.
const (
	// Per-IP request limits.
	ipAttemptLimit  = 10
	ipAttemptWindow = 15 * time.Minute

	// Per-email code-send limits (signup / resend / forgot-password).
	emailSendLimit    = 5
	emailSendWindow   = time.Hour
	emailSendCooldown = 60 * time.Second
)

// rateDecision is the outcome of a rate-limit check.
type rateDecision struct {
	Allowed    bool
	RetryAfter time.Duration
}

// allow enforces a fixed-window count limit plus an optional minimum cooldown
// between events for a bucket key. It is backed by the auth_rate_limits table so
// the limit holds across multiple API instances (Railway may run >1 replica).
//
// It fails open on database errors: rate limiting must never take down auth, and
// a broken database already breaks the underlying operation anyway.
func (s *Server) allow(ctx context.Context, key string, limit int, window, cooldown time.Duration) rateDecision {
	tx, err := s.db.Begin(ctx)
	if err != nil {
		s.logger.Warn("ratelimit begin failed; allowing", "error", err)
		return rateDecision{Allowed: true}
	}
	defer tx.Rollback(ctx)

	var count int
	var windowStart, lastEvent time.Time
	err = tx.QueryRow(ctx,
		`SELECT count, window_start, last_event FROM auth_rate_limits WHERE bucket_key = $1 FOR UPDATE`,
		key,
	).Scan(&count, &windowStart, &lastEvent)

	now := time.Now()

	if errors.Is(err, pgx.ErrNoRows) {
		if _, e := tx.Exec(ctx,
			`INSERT INTO auth_rate_limits (bucket_key, count, window_start, last_event) VALUES ($1, 1, now(), now())`,
			key,
		); e != nil {
			s.logger.Warn("ratelimit insert failed; allowing", "error", e)
			return rateDecision{Allowed: true}
		}
		if e := tx.Commit(ctx); e != nil {
			s.logger.Warn("ratelimit commit failed; allowing", "error", e)
		}
		return rateDecision{Allowed: true}
	}
	if err != nil {
		s.logger.Warn("ratelimit select failed; allowing", "error", err)
		return rateDecision{Allowed: true}
	}

	// Roll the window over if it has elapsed.
	if now.Sub(windowStart) >= window {
		count = 0
		windowStart = now
	}

	// Cooldown gate (does not consume the window budget).
	if cooldown > 0 && now.Sub(lastEvent) < cooldown {
		return rateDecision{Allowed: false, RetryAfter: cooldown - now.Sub(lastEvent)}
	}

	// Window budget gate.
	if count >= limit {
		return rateDecision{Allowed: false, RetryAfter: window - now.Sub(windowStart)}
	}

	if _, e := tx.Exec(ctx,
		`UPDATE auth_rate_limits SET count = $2, window_start = $3, last_event = now() WHERE bucket_key = $1`,
		key, count+1, windowStart,
	); e != nil {
		s.logger.Warn("ratelimit update failed; allowing", "error", e)
		return rateDecision{Allowed: true}
	}
	if e := tx.Commit(ctx); e != nil {
		s.logger.Warn("ratelimit commit failed; allowing", "error", e)
	}
	return rateDecision{Allowed: true}
}

// rateLimitIP returns middleware that throttles requests per client IP. The name
// scopes the bucket so different endpoints have independent budgets.
func (s *Server) rateLimitIP(name string, limit int, window time.Duration) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := fmt.Sprintf("%s:ip:%s", name, clientIPKey(r))
			if d := s.allow(r.Context(), key, limit, window, 0); !d.Allowed {
				writeTooManyRequests(w, d.RetryAfter, "Too many attempts. Please try again later.")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// allowEmailSend enforces the per-email code-send cooldown and hourly cap. It
// writes the 429 response itself and returns false when the send must be
// suppressed. The generic message never reveals whether the account exists.
func (s *Server) allowEmailSend(w http.ResponseWriter, r *http.Request, email string) bool {
	key := "send:email:" + email
	if d := s.allow(r.Context(), key, emailSendLimit, emailSendWindow, emailSendCooldown); !d.Allowed {
		writeTooManyRequests(w, d.RetryAfter, "Please wait before requesting another code.")
		return false
	}
	return true
}

func writeTooManyRequests(w http.ResponseWriter, retryAfter time.Duration, message string) {
	if retryAfter > 0 {
		w.Header().Set("Retry-After", strconv.Itoa(int(math.Ceil(retryAfter.Seconds()))))
	}
	httpx.Error(w, http.StatusTooManyRequests, "too_many_requests", message)
}

// clientIPKey returns a stable string key for the requester's IP, or "unknown".
func clientIPKey(r *http.Request) string {
	if ip := clientIP(r); ip != nil {
		if s, ok := ip.(string); ok && s != "" {
			return s
		}
	}
	return "unknown"
}

// pruneRateLimits removes rate-limit rows whose window has long elapsed so the
// table does not grow unbounded.
func (s *Server) pruneRateLimits(ctx context.Context) error {
	_, err := s.db.Exec(ctx, `DELETE FROM auth_rate_limits WHERE last_event < now() - interval '1 day'`)
	return err
}

// pruneExpiredCodes removes consumed or expired verification / reset codes.
func (s *Server) pruneExpiredCodes(ctx context.Context) error {
	for _, table := range []string{"email_verification_codes", "password_reset_codes"} {
		if _, err := s.db.Exec(ctx,
			fmt.Sprintf(`DELETE FROM %s WHERE consumed_at IS NOT NULL OR expires_at < now() - interval '1 day'`, table),
		); err != nil {
			return err
		}
	}
	return nil
}

// StartMaintenance runs periodic cleanup of rate-limit and code tables until the
// context is cancelled. It is safe to run on every instance.
func (s *Server) StartMaintenance(ctx context.Context) {
	ticker := time.NewTicker(time.Hour)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := s.pruneRateLimits(ctx); err != nil {
				s.logger.Warn("prune rate limits failed", "error", err)
			}
			if err := s.pruneExpiredCodes(ctx); err != nil {
				s.logger.Warn("prune expired codes failed", "error", err)
			}
		}
	}
}
