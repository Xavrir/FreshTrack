package server

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"math/big"
	"net"
	"net/http"
	"net/mail"
	"strconv"
	"strings"
	"time"

	"freshtrack/backend/internal/config"
	"freshtrack/backend/internal/httpx"
	"freshtrack/backend/internal/mailer"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/argon2"
)

type Server struct {
	cfg    config.Config
	db     *pgxpool.Pool
	logger *slog.Logger
	mail   mailer.Mailer
}

type ctxKey string

const userIDKey ctxKey = "user_id"

func New(cfg config.Config, db *pgxpool.Pool, logger *slog.Logger) *Server {
	return &Server{cfg: cfg, db: db, logger: logger, mail: mailer.New(cfg)}
}

func (s *Server) Routes() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(limitRequestBody(1 << 20))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   s.cfg.CORSAllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Get("/health", s.health)
	r.Get("/ready", s.ready)

	r.Route("/v1", func(r chi.Router) {
		r.Post("/auth/signup", s.signup)
		r.Post("/auth/verify-email", s.verifyEmail)
		r.Post("/auth/resend-verification", s.resendVerification)
		r.Post("/auth/login", s.login)
		r.Post("/auth/refresh", s.refresh)
		r.Post("/auth/forgot-password", s.forgotPassword)
		r.Post("/auth/reset-password", s.resetPassword)

		r.Group(func(r chi.Router) {
			r.Use(s.requireAuth)
			r.Post("/auth/logout", s.logout)
			r.Get("/me", s.me)
			r.Patch("/me", s.updateMe)

			r.Get("/household", s.getHousehold)
			r.Post("/household", s.createHousehold)
			r.Patch("/household", s.updateHousehold)
			r.Post("/household/join", s.joinHousehold)
			r.Get("/household/members", s.listMembers)
			r.Delete("/household/members/{userID}", s.removeMember)
			r.Get("/household/invite", s.getInvite)
			r.Post("/household/invite/rotate", s.rotateInvite)
			r.Get("/household/settings", s.getSettings)
			r.Patch("/household/settings", s.updateSettings)

			r.Get("/inventory", s.listInventory)
			r.Post("/inventory", s.createInventory)
			r.Get("/inventory/{id}", s.getInventory)
			r.Patch("/inventory/{id}", s.updateInventory)
			r.Delete("/inventory/{id}", s.deleteInventory)
			r.Post("/inventory/{id}/consume", s.consumeInventory)
			r.Post("/inventory/{id}/waste", s.wasteInventory)
			r.Get("/inventory/{id}/events", s.listBatchEvents)
			r.Get("/history", s.history)

			r.Post("/products/detect", s.detectProduct)
			r.Post("/menus/recommend", s.recommendMenus)
		})
	})

	return r
}

func (s *Server) health(w http.ResponseWriter, _ *http.Request) {
	httpx.Data(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (s *Server) ready(w http.ResponseWriter, r *http.Request) {
	if err := s.db.Ping(r.Context()); err != nil {
		httpx.Error(w, http.StatusServiceUnavailable, "database_unavailable", "Database is unavailable")
		return
	}
	httpx.Data(w, http.StatusOK, map[string]string{"status": "ready"})
}

type userDTO struct {
	ID            string  `json:"id"`
	Email         string  `json:"email"`
	FullName      *string `json:"fullName,omitempty"`
	EmailVerified bool    `json:"emailVerified"`
}

type authResponse struct {
	AccessToken  string  `json:"accessToken"`
	RefreshToken string  `json:"refreshToken"`
	User         userDTO `json:"user"`
}

func (s *Server) signup(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		FullName string `json:"fullName"`
	}
	if err := httpx.ReadJSON(r, &req); err != nil {
		httpx.BadJSON(w, err)
		return
	}
	req.Email = normalizeEmail(req.Email)
	fields := map[string]string{}
	if !validEmail(req.Email) {
		fields["email"] = "Enter a valid email address"
	}
	if len(req.Password) < 8 {
		fields["password"] = "Password must be at least 8 characters"
	}
	if len(fields) > 0 {
		httpx.ValidationError(w, fields)
		return
	}

	hash, err := hashPassword(req.Password, s.cfg.PasswordPepper)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "password_hash_failed", "Could not create password hash")
		return
	}

	var id uuid.UUID
	var email string
	var fullName *string
	err = s.db.QueryRow(r.Context(), `INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, NULLIF($3, '')) RETURNING id, email, full_name`, req.Email, hash, strings.TrimSpace(req.FullName)).Scan(&id, &email, &fullName)
	if err != nil {
		if isUniqueViolation(err) {
			httpx.Error(w, http.StatusConflict, "email_taken", "Email is already registered")
			return
		}
		s.logger.Error("create user", "error", err)
		httpx.Error(w, http.StatusInternalServerError, "create_user_failed", "Could not create user")
		return
	}

	code, err := s.createEmailCode(r.Context(), "email_verification_codes", id, 15*time.Minute)
	if err == nil {
		_ = s.mail.SendEmailVerification(r.Context(), email, code)
	}
	httpx.Data(w, http.StatusCreated, map[string]any{"userId": id.String(), "email": email, "fullName": fullName, "emailVerificationRequired": true})
}

func (s *Server) verifyEmail(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
		Code  string `json:"code"`
	}
	if err := httpx.ReadJSON(r, &req); err != nil {
		httpx.BadJSON(w, err)
		return
	}
	user, err := s.userByEmail(r.Context(), normalizeEmail(req.Email))
	if err != nil {
		httpx.Error(w, http.StatusUnauthorized, "invalid_code", "Invalid or expired code")
		return
	}
	if err := s.consumeCode(r.Context(), "email_verification_codes", user.ID, req.Code); err != nil {
		httpx.Error(w, http.StatusUnauthorized, "invalid_code", "Invalid or expired code")
		return
	}
	_, err = s.db.Exec(r.Context(), `UPDATE users SET email_verified_at = COALESCE(email_verified_at, now()), updated_at = now() WHERE id = $1`, user.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "verify_failed", "Could not verify email")
		return
	}
	httpx.Data(w, http.StatusOK, map[string]bool{"verified": true})
}

func (s *Server) resendVerification(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}
	if err := httpx.ReadJSON(r, &req); err != nil {
		httpx.BadJSON(w, err)
		return
	}
	if user, err := s.userByEmail(r.Context(), normalizeEmail(req.Email)); err == nil && !user.EmailVerified {
		if code, err := s.createEmailCode(r.Context(), "email_verification_codes", user.ID, 15*time.Minute); err == nil {
			_ = s.mail.SendEmailVerification(r.Context(), user.Email, code)
		}
	}
	httpx.Data(w, http.StatusOK, map[string]bool{"sent": true})
}

func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := httpx.ReadJSON(r, &req); err != nil {
		httpx.BadJSON(w, err)
		return
	}
	user, err := s.userByEmail(r.Context(), normalizeEmail(req.Email))
	if err != nil || !verifyPassword(req.Password, user.PasswordHash, s.cfg.PasswordPepper) {
		httpx.Error(w, http.StatusUnauthorized, "invalid_credentials", "Invalid email or password")
		return
	}
	if !user.EmailVerified {
		httpx.Error(w, http.StatusForbidden, "email_not_verified", "Verify your email before logging in")
		return
	}
	response, err := s.issueTokens(r.Context(), user, r)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "login_failed", "Could not create session")
		return
	}
	httpx.Data(w, http.StatusOK, response)
}

func (s *Server) refresh(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refreshToken"`
	}
	if err := httpx.ReadJSON(r, &req); err != nil {
		httpx.BadJSON(w, err)
		return
	}
	hash := s.hashSecret(req.RefreshToken)
	var userID uuid.UUID
	err := s.db.QueryRow(r.Context(), `UPDATE user_sessions SET revoked_at = now(), last_used_at = now() WHERE refresh_token_hash = $1 AND revoked_at IS NULL AND expires_at > now() RETURNING user_id`, hash).Scan(&userID)
	if err != nil {
		httpx.Error(w, http.StatusUnauthorized, "invalid_refresh_token", "Invalid refresh token")
		return
	}
	user, err := s.userByID(r.Context(), userID)
	if err != nil {
		httpx.Error(w, http.StatusUnauthorized, "invalid_refresh_token", "Invalid refresh token")
		return
	}
	response, err := s.issueTokens(r.Context(), user, r)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "refresh_failed", "Could not refresh session")
		return
	}
	httpx.Data(w, http.StatusOK, response)
}

func (s *Server) logout(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refreshToken"`
	}
	_ = httpx.ReadJSON(r, &req)
	if req.RefreshToken != "" {
		_, _ = s.db.Exec(r.Context(), `UPDATE user_sessions SET revoked_at = now() WHERE refresh_token_hash = $1`, s.hashSecret(req.RefreshToken))
	}
	httpx.Data(w, http.StatusOK, map[string]bool{"loggedOut": true})
}

func (s *Server) forgotPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}
	if err := httpx.ReadJSON(r, &req); err != nil {
		httpx.BadJSON(w, err)
		return
	}
	if user, err := s.userByEmail(r.Context(), normalizeEmail(req.Email)); err == nil {
		if code, err := s.createEmailCode(r.Context(), "password_reset_codes", user.ID, 15*time.Minute); err == nil {
			_ = s.mail.SendPasswordReset(r.Context(), user.Email, code)
		}
	}
	httpx.Data(w, http.StatusOK, map[string]bool{"sent": true})
}

func (s *Server) resetPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email       string `json:"email"`
		Code        string `json:"code"`
		NewPassword string `json:"newPassword"`
	}
	if err := httpx.ReadJSON(r, &req); err != nil {
		httpx.BadJSON(w, err)
		return
	}
	if len(req.NewPassword) < 8 {
		httpx.ValidationError(w, map[string]string{"newPassword": "Password must be at least 8 characters"})
		return
	}
	user, err := s.userByEmail(r.Context(), normalizeEmail(req.Email))
	if err != nil {
		httpx.Error(w, http.StatusUnauthorized, "invalid_code", "Invalid or expired code")
		return
	}
	hash, err := hashPassword(req.NewPassword, s.cfg.PasswordPepper)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "password_hash_failed", "Could not update password")
		return
	}
	tx, err := s.db.Begin(r.Context())
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "reset_failed", "Could not reset password")
		return
	}
	defer tx.Rollback(r.Context())
	if err := s.consumeCodeWith(r.Context(), tx, "password_reset_codes", user.ID, req.Code); err != nil {
		httpx.Error(w, http.StatusUnauthorized, "invalid_code", "Invalid or expired code")
		return
	}
	if _, err = tx.Exec(r.Context(), `UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`, hash, user.ID); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "reset_failed", "Could not reset password")
		return
	}
	if _, err = tx.Exec(r.Context(), `UPDATE user_sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`, user.ID); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "reset_failed", "Could not reset password")
		return
	}
	if err = tx.Commit(r.Context()); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "reset_failed", "Could not reset password")
		return
	}
	httpx.Data(w, http.StatusOK, map[string]bool{"reset": true})
}

func (s *Server) me(w http.ResponseWriter, r *http.Request) {
	user, err := s.userByID(r.Context(), mustUserID(r.Context()))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "user_not_found", "User not found")
		return
	}
	httpx.Data(w, http.StatusOK, toUserDTO(user))
}

func (s *Server) updateMe(w http.ResponseWriter, r *http.Request) {
	var req struct {
		FullName string `json:"fullName"`
	}
	if err := httpx.ReadJSON(r, &req); err != nil {
		httpx.BadJSON(w, err)
		return
	}
	_, err := s.db.Exec(r.Context(), `UPDATE users SET full_name = NULLIF($1, ''), updated_at = now() WHERE id = $2`, strings.TrimSpace(req.FullName), mustUserID(r.Context()))
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "update_user_failed", "Could not update profile")
		return
	}
	s.me(w, r)
}

type dbUser struct {
	ID            uuid.UUID
	Email         string
	PasswordHash  string
	FullName      *string
	EmailVerified bool
}

func (s *Server) userByEmail(ctx context.Context, email string) (dbUser, error) {
	var user dbUser
	var verified *time.Time
	err := s.db.QueryRow(ctx, `SELECT id, email, password_hash, full_name, email_verified_at FROM users WHERE email = $1 AND deleted_at IS NULL`, email).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.FullName, &verified)
	user.EmailVerified = verified != nil
	return user, err
}

func (s *Server) userByID(ctx context.Context, id uuid.UUID) (dbUser, error) {
	var user dbUser
	var verified *time.Time
	err := s.db.QueryRow(ctx, `SELECT id, email, password_hash, full_name, email_verified_at FROM users WHERE id = $1 AND deleted_at IS NULL`, id).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.FullName, &verified)
	user.EmailVerified = verified != nil
	return user, err
}

func toUserDTO(user dbUser) userDTO {
	return userDTO{ID: user.ID.String(), Email: user.Email, FullName: user.FullName, EmailVerified: user.EmailVerified}
}

func (s *Server) issueTokens(ctx context.Context, user dbUser, r *http.Request) (authResponse, error) {
	access, err := s.signAccessToken(user.ID)
	if err != nil {
		return authResponse{}, err
	}
	refresh, err := randomToken(32)
	if err != nil {
		return authResponse{}, err
	}
	_, err = s.db.Exec(ctx, `INSERT INTO user_sessions (user_id, refresh_token_hash, user_agent, ip_address, expires_at) VALUES ($1, $2, $3, $4, $5)`, user.ID, s.hashSecret(refresh), r.UserAgent(), clientIP(r), time.Now().Add(s.cfg.RefreshTokenTTL))
	if err != nil {
		return authResponse{}, err
	}
	return authResponse{AccessToken: access, RefreshToken: refresh, User: toUserDTO(user)}, nil
}

func (s *Server) signAccessToken(userID uuid.UUID) (string, error) {
	now := time.Now()
	claims := jwt.RegisteredClaims{Subject: userID.String(), IssuedAt: jwt.NewNumericDate(now), ExpiresAt: jwt.NewNumericDate(now.Add(s.cfg.AccessTokenTTL))}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.AccessTokenSecret))
}

func (s *Server) requireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authz := r.Header.Get("Authorization")
		if !strings.HasPrefix(strings.ToLower(authz), "bearer ") {
			httpx.Error(w, http.StatusUnauthorized, "missing_token", "Missing bearer token")
			return
		}
		tokenString := strings.TrimSpace(authz[len("Bearer "):])
		claims := jwt.RegisteredClaims{}
		token, err := jwt.ParseWithClaims(tokenString, &claims, func(*jwt.Token) (any, error) { return []byte(s.cfg.AccessTokenSecret), nil })
		if err != nil || !token.Valid || claims.Subject == "" {
			httpx.Error(w, http.StatusUnauthorized, "invalid_token", "Invalid bearer token")
			return
		}
		id, err := uuid.Parse(claims.Subject)
		if err != nil {
			httpx.Error(w, http.StatusUnauthorized, "invalid_token", "Invalid bearer token")
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), userIDKey, id)))
	})
}

func mustUserID(ctx context.Context) uuid.UUID {
	id, _ := ctx.Value(userIDKey).(uuid.UUID)
	return id
}

func (s *Server) createEmailCode(ctx context.Context, table string, userID uuid.UUID, ttl time.Duration) (string, error) {
	code, err := numericCode(6)
	if err != nil {
		return "", err
	}
	if _, err = s.db.Exec(ctx, fmt.Sprintf(`UPDATE %s SET consumed_at = now() WHERE user_id = $1 AND consumed_at IS NULL`, table), userID); err != nil {
		return "", err
	}
	query := fmt.Sprintf(`INSERT INTO %s (user_id, code_hash, expires_at) VALUES ($1, $2, $3)`, table)
	_, err = s.db.Exec(ctx, query, userID, s.hashSecret(code), time.Now().Add(ttl))
	return code, err
}

func (s *Server) consumeCode(ctx context.Context, table string, userID uuid.UUID, code string) error {
	return s.consumeCodeWith(ctx, s.db, table, userID, code)
}

type codeExec interface {
	Exec(context.Context, string, ...any) (pgconn.CommandTag, error)
}

func (s *Server) consumeCodeWith(ctx context.Context, exec codeExec, table string, userID uuid.UUID, code string) error {
	hash := s.hashSecret(strings.TrimSpace(code))
	query := fmt.Sprintf(`WITH candidate AS (
		SELECT id, code_hash, attempts FROM %s WHERE user_id = $1 AND consumed_at IS NULL AND expires_at > now() ORDER BY created_at DESC LIMIT 1
	), bumped AS (
		UPDATE %s SET attempts = attempts + 1 WHERE id = (SELECT id FROM candidate) AND (SELECT attempts FROM candidate) < 5 RETURNING id, code_hash
	)
	UPDATE %s SET consumed_at = now() WHERE id = (SELECT id FROM bumped WHERE code_hash = $2)`, table, table, table)
	tag, err := exec.Exec(ctx, query, userID, hash)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("code not found")
	}
	return nil
}

func (s *Server) hashSecret(value string) string {
	sum := sha256.Sum256([]byte(s.cfg.PasswordPepper + ":" + value))
	return hex.EncodeToString(sum[:])
}

func (s *Server) getHousehold(w http.ResponseWriter, r *http.Request) {
	household, err := s.activeHousehold(r.Context(), mustUserID(r.Context()))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "household_not_found", "No household found")
		return
	}
	httpx.Data(w, http.StatusOK, household)
}

func (s *Server) createHousehold(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name string `json:"name"`
	}
	if err := httpx.ReadJSON(r, &req); err != nil && err != io.EOF {
		httpx.BadJSON(w, err)
		return
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = "My Household"
	}
	userID := mustUserID(r.Context())
	tx, err := s.db.Begin(r.Context())
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "transaction_failed", "Could not create household")
		return
	}
	defer tx.Rollback(r.Context())

	var householdID uuid.UUID
	if err := tx.QueryRow(r.Context(), `INSERT INTO households (name, owner_user_id) VALUES ($1, $2) RETURNING id`, name, userID).Scan(&householdID); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "create_household_failed", "Could not create household")
		return
	}
	if _, err := tx.Exec(r.Context(), `INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'owner')`, householdID, userID); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "create_member_failed", "Could not create household member")
		return
	}
	if _, err := tx.Exec(r.Context(), `INSERT INTO household_settings (household_id) VALUES ($1)`, householdID); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "create_settings_failed", "Could not create household settings")
		return
	}
	invite, err := randomInviteCode()
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "invite_failed", "Could not create invite")
		return
	}
	if _, err := tx.Exec(r.Context(), `INSERT INTO household_invites (household_id, code_hash, code_suffix, created_by) VALUES ($1, $2, $3, $4)`, householdID, s.hashSecret(invite), suffix(invite, 4), userID); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "invite_failed", "Could not create invite")
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "commit_failed", "Could not create household")
		return
	}
	httpx.Data(w, http.StatusCreated, map[string]any{"id": householdID.String(), "name": name, "inviteCode": invite})
}

func (s *Server) updateHousehold(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name string `json:"name"`
	}
	if err := httpx.ReadJSON(r, &req); err != nil {
		httpx.BadJSON(w, err)
		return
	}
	household, err := s.activeHousehold(r.Context(), mustUserID(r.Context()))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "household_not_found", "No household found")
		return
	}
	if household.Role != "owner" {
		httpx.Error(w, http.StatusForbidden, "owner_required", "Only the owner can update household details")
		return
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		httpx.ValidationError(w, map[string]string{"name": "Name is required"})
		return
	}
	_, err = s.db.Exec(r.Context(), `UPDATE households SET name = $1, updated_at = now() WHERE id = $2`, name, household.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "update_household_failed", "Could not update household")
		return
	}
	s.getHousehold(w, r)
}

func (s *Server) joinHousehold(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Code string `json:"code"`
	}
	if err := httpx.ReadJSON(r, &req); err != nil {
		httpx.BadJSON(w, err)
		return
	}
	code := strings.ToUpper(strings.TrimSpace(req.Code))
	if code == "" {
		httpx.ValidationError(w, map[string]string{"code": "Invite code is required"})
		return
	}
	var householdID uuid.UUID
	err := s.db.QueryRow(r.Context(), `SELECT household_id FROM household_invites WHERE code_hash = $1 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now()) ORDER BY created_at DESC LIMIT 1`, s.hashSecret(code)).Scan(&householdID)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "invalid_invite", "Invalid invite code")
		return
	}
	_, err = s.db.Exec(r.Context(), `INSERT INTO household_members (household_id, user_id, role) VALUES ($1, $2, 'member') ON CONFLICT DO NOTHING`, householdID, mustUserID(r.Context()))
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "join_failed", "Could not join household")
		return
	}
	s.getHousehold(w, r)
}

func (s *Server) listMembers(w http.ResponseWriter, r *http.Request) {
	household, err := s.activeHousehold(r.Context(), mustUserID(r.Context()))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "household_not_found", "No household found")
		return
	}
	rows, err := s.db.Query(r.Context(), `SELECT u.id, u.email, u.full_name, hm.role, hm.created_at FROM household_members hm JOIN users u ON u.id = hm.user_id WHERE hm.household_id = $1 ORDER BY hm.created_at ASC`, household.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "list_members_failed", "Could not list members")
		return
	}
	defer rows.Close()
	members := []map[string]any{}
	for rows.Next() {
		var id uuid.UUID
		var email, role string
		var fullName *string
		var createdAt time.Time
		if err := rows.Scan(&id, &email, &fullName, &role, &createdAt); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "scan_failed", "Could not list members")
			return
		}
		members = append(members, map[string]any{"userId": id.String(), "email": email, "fullName": fullName, "role": role, "createdAt": createdAt})
	}
	httpx.Data(w, http.StatusOK, members)
}

func (s *Server) removeMember(w http.ResponseWriter, r *http.Request) {
	household, err := s.activeHousehold(r.Context(), mustUserID(r.Context()))
	if err != nil || household.Role != "owner" {
		httpx.Error(w, http.StatusForbidden, "owner_required", "Only the owner can remove members")
		return
	}
	memberID, err := uuid.Parse(chi.URLParam(r, "userID"))
	if err != nil || memberID == household.OwnerUserID {
		httpx.Error(w, http.StatusBadRequest, "invalid_member", "Invalid member")
		return
	}
	_, err = s.db.Exec(r.Context(), `DELETE FROM household_members WHERE household_id = $1 AND user_id = $2`, household.ID, memberID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "remove_member_failed", "Could not remove member")
		return
	}
	httpx.Data(w, http.StatusOK, map[string]bool{"removed": true})
}

func (s *Server) getInvite(w http.ResponseWriter, r *http.Request) {
	household, err := s.activeHousehold(r.Context(), mustUserID(r.Context()))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "household_not_found", "No household found")
		return
	}
	var suffix string
	var createdAt time.Time
	err = s.db.QueryRow(r.Context(), `SELECT code_suffix, created_at FROM household_invites WHERE household_id = $1 AND revoked_at IS NULL ORDER BY created_at DESC LIMIT 1`, household.ID).Scan(&suffix, &createdAt)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "invite_not_found", "No active invite found")
		return
	}
	httpx.Data(w, http.StatusOK, map[string]any{"codeSuffix": suffix, "createdAt": createdAt})
}

func (s *Server) rotateInvite(w http.ResponseWriter, r *http.Request) {
	household, err := s.activeHousehold(r.Context(), mustUserID(r.Context()))
	if err != nil || household.Role != "owner" {
		httpx.Error(w, http.StatusForbidden, "owner_required", "Only the owner can rotate invites")
		return
	}
	invite, err := randomInviteCode()
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "invite_failed", "Could not create invite")
		return
	}
	tx, err := s.db.Begin(r.Context())
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "invite_failed", "Could not create invite")
		return
	}
	defer tx.Rollback(r.Context())
	if _, err := tx.Exec(r.Context(), `UPDATE household_invites SET revoked_at = now() WHERE household_id = $1 AND revoked_at IS NULL`, household.ID); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "invite_failed", "Could not create invite")
		return
	}
	if _, err := tx.Exec(r.Context(), `INSERT INTO household_invites (household_id, code_hash, code_suffix, created_by) VALUES ($1, $2, $3, $4)`, household.ID, s.hashSecret(invite), suffix(invite, 4), mustUserID(r.Context())); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "invite_failed", "Could not create invite")
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "invite_failed", "Could not create invite")
		return
	}
	httpx.Data(w, http.StatusCreated, map[string]string{"inviteCode": invite})
}

func (s *Server) getSettings(w http.ResponseWriter, r *http.Request) {
	household, err := s.activeHousehold(r.Context(), mustUserID(r.Context()))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "household_not_found", "No household found")
		return
	}
	settings, err := s.settings(r.Context(), household.ID)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "settings_not_found", "Settings not found")
		return
	}
	httpx.Data(w, http.StatusOK, settings)
}

func (s *Server) updateSettings(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ReminderTimeLocal *string `json:"reminderTimeLocal"`
		LeadDays          []int   `json:"leadDays"`
	}
	if err := httpx.ReadJSON(r, &req); err != nil {
		httpx.BadJSON(w, err)
		return
	}
	household, err := s.activeHousehold(r.Context(), mustUserID(r.Context()))
	if err != nil || household.Role != "owner" {
		httpx.Error(w, http.StatusForbidden, "owner_required", "Only the owner can update settings")
		return
	}
	current, err := s.settings(r.Context(), household.ID)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "settings_not_found", "Settings not found")
		return
	}
	reminder := current.ReminderTimeLocal
	if req.ReminderTimeLocal != nil {
		reminder = strings.TrimSpace(*req.ReminderTimeLocal)
	}
	leads := current.LeadDays
	if req.LeadDays != nil {
		leads = req.LeadDays
	}
	_, err = s.db.Exec(r.Context(), `UPDATE household_settings SET reminder_time_local = $1, lead_days = $2, updated_at = now() WHERE household_id = $3`, reminder, leads, household.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "update_settings_failed", "Could not update settings")
		return
	}
	s.getSettings(w, r)
}

type householdDTO struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	OwnerUserID uuid.UUID `json:"ownerUserId"`
	Role        string    `json:"role"`
}

type settingsDTO struct {
	ReminderTimeLocal string `json:"reminderTimeLocal"`
	LeadDays          []int  `json:"leadDays"`
}

func (s *Server) activeHousehold(ctx context.Context, userID uuid.UUID) (householdDTO, error) {
	var h householdDTO
	err := s.db.QueryRow(ctx, `SELECT h.id, h.name, h.owner_user_id, hm.role FROM household_members hm JOIN households h ON h.id = hm.household_id WHERE hm.user_id = $1 AND h.deleted_at IS NULL ORDER BY hm.created_at ASC LIMIT 1`, userID).Scan(&h.ID, &h.Name, &h.OwnerUserID, &h.Role)
	return h, err
}

func (s *Server) settings(ctx context.Context, householdID uuid.UUID) (settingsDTO, error) {
	var settings settingsDTO
	err := s.db.QueryRow(ctx, `SELECT reminder_time_local, lead_days FROM household_settings WHERE household_id = $1`, householdID).Scan(&settings.ReminderTimeLocal, &settings.LeadDays)
	return settings, err
}

type inventoryDTO struct {
	ID            uuid.UUID `json:"id"`
	HouseholdID   uuid.UUID `json:"householdId"`
	Barcode       *string   `json:"barcode,omitempty"`
	Name          string    `json:"name"`
	Brand         *string   `json:"brand,omitempty"`
	Quantity      float64   `json:"quantity"`
	Unit          string    `json:"unit"`
	Category      *string   `json:"category,omitempty"`
	Storage       *string   `json:"storage,omitempty"`
	StorageDetail *string   `json:"storageDetail,omitempty"`
	ExpiryDate    *string   `json:"expiryDate,omitempty"`
	ImageURL      *string   `json:"imageUrl,omitempty"`
	Notes         *string   `json:"notes,omitempty"`
	CreatedBy     uuid.UUID `json:"createdBy"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

func (s *Server) listInventory(w http.ResponseWriter, r *http.Request) {
	household, err := s.activeHousehold(r.Context(), mustUserID(r.Context()))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "household_not_found", "No household found")
		return
	}
	search := strings.TrimSpace(r.URL.Query().Get("search"))
	status := strings.TrimSpace(r.URL.Query().Get("status"))
	query := `SELECT id, household_id, barcode, name, brand, quantity::float8, unit, category, storage, storage_detail, expiry_date::text, image_url, notes, created_by, created_at, updated_at FROM inventory_batches WHERE household_id = $1 AND deleted_at IS NULL`
	args := []any{household.ID}
	if search != "" {
		args = append(args, "%"+search+"%")
		query += fmt.Sprintf(` AND (name ILIKE $%d OR brand ILIKE $%d OR barcode ILIKE $%d)`, len(args), len(args), len(args))
	}
	switch status {
	case "fresh":
		query += ` AND (expiry_date IS NULL OR expiry_date > current_date + 3)`
	case "expiring":
		query += ` AND expiry_date BETWEEN current_date AND current_date + 3`
	case "expired":
		query += ` AND expiry_date < current_date`
	case "low_stock":
		query += ` AND quantity <= 1`
	}
	query += ` ORDER BY expiry_date ASC NULLS LAST, updated_at DESC LIMIT 100`
	rows, err := s.db.Query(r.Context(), query, args...)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "list_inventory_failed", "Could not list inventory")
		return
	}
	defer rows.Close()
	items, err := scanInventoryRows(rows)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "scan_inventory_failed", "Could not list inventory")
		return
	}
	httpx.Data(w, http.StatusOK, items)
}

func (s *Server) createInventory(w http.ResponseWriter, r *http.Request) {
	var req inventoryRequest
	if err := httpx.ReadJSON(r, &req); err != nil {
		httpx.BadJSON(w, err)
		return
	}
	if fields := validateInventory(req); len(fields) > 0 {
		httpx.ValidationError(w, fields)
		return
	}
	household, err := s.activeHousehold(r.Context(), mustUserID(r.Context()))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "household_not_found", "No household found")
		return
	}
	tx, err := s.db.Begin(r.Context())
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "create_inventory_failed", "Could not create inventory item")
		return
	}
	defer tx.Rollback(r.Context())
	var item inventoryDTO
	err = tx.QueryRow(r.Context(), `INSERT INTO inventory_batches (household_id, barcode, name, brand, quantity, unit, category, storage, storage_detail, expiry_date, image_url, notes, created_by) VALUES ($1, NULLIF($2,''), $3, NULLIF($4,''), $5, $6, NULLIF($7,''), NULLIF($8,''), NULLIF($9,''), $10, NULLIF($11,''), NULLIF($12,''), $13) RETURNING id, household_id, barcode, name, brand, quantity::float8, unit, category, storage, storage_detail, expiry_date::text, image_url, notes, created_by, created_at, updated_at`, household.ID, str(req.Barcode), strings.TrimSpace(req.Name), str(req.Brand), req.Quantity, strings.TrimSpace(req.Unit), str(req.Category), str(req.Storage), str(req.StorageDetail), datePtr(req.ExpiryDate), str(req.ImageURL), str(req.Notes), mustUserID(r.Context())).Scan(&item.ID, &item.HouseholdID, &item.Barcode, &item.Name, &item.Brand, &item.Quantity, &item.Unit, &item.Category, &item.Storage, &item.StorageDetail, &item.ExpiryDate, &item.ImageURL, &item.Notes, &item.CreatedBy, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "create_inventory_failed", "Could not create inventory item")
		return
	}
	if _, err = tx.Exec(r.Context(), `INSERT INTO inventory_events (batch_id, household_id, actor_user_id, event_type, amount, unit) VALUES ($1, $2, $3, 'created', $4, $5)`, item.ID, household.ID, mustUserID(r.Context()), item.Quantity, item.Unit); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "create_inventory_failed", "Could not create inventory item")
		return
	}
	if err = tx.Commit(r.Context()); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "create_inventory_failed", "Could not create inventory item")
		return
	}
	httpx.Data(w, http.StatusCreated, item)
}

func (s *Server) getInventory(w http.ResponseWriter, r *http.Request) {
	item, ok := s.inventoryByParam(w, r)
	if !ok {
		return
	}
	httpx.Data(w, http.StatusOK, item)
}

func (s *Server) updateInventory(w http.ResponseWriter, r *http.Request) {
	item, ok := s.inventoryByParam(w, r)
	if !ok {
		return
	}
	var patch inventoryPatchRequest
	if err := httpx.ReadJSON(r, &patch); err != nil {
		httpx.BadJSON(w, err)
		return
	}
	req := mergeInventoryPatch(item, patch)
	if fields := validateInventory(req); len(fields) > 0 {
		httpx.ValidationError(w, fields)
		return
	}
	tx, err := s.db.Begin(r.Context())
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "update_inventory_failed", "Could not update inventory item")
		return
	}
	defer tx.Rollback(r.Context())
	var updated inventoryDTO
	err = tx.QueryRow(r.Context(), `UPDATE inventory_batches SET barcode = NULLIF($1,''), name = $2, brand = NULLIF($3,''), quantity = $4, unit = $5, category = NULLIF($6,''), storage = NULLIF($7,''), storage_detail = NULLIF($8,''), expiry_date = $9, image_url = NULLIF($10,''), notes = NULLIF($11,''), updated_at = now() WHERE id = $12 AND household_id = $13 AND deleted_at IS NULL RETURNING id, household_id, barcode, name, brand, quantity::float8, unit, category, storage, storage_detail, expiry_date::text, image_url, notes, created_by, created_at, updated_at`, str(req.Barcode), strings.TrimSpace(req.Name), str(req.Brand), req.Quantity, strings.TrimSpace(req.Unit), str(req.Category), str(req.Storage), str(req.StorageDetail), datePtr(req.ExpiryDate), str(req.ImageURL), str(req.Notes), item.ID, item.HouseholdID).Scan(&updated.ID, &updated.HouseholdID, &updated.Barcode, &updated.Name, &updated.Brand, &updated.Quantity, &updated.Unit, &updated.Category, &updated.Storage, &updated.StorageDetail, &updated.ExpiryDate, &updated.ImageURL, &updated.Notes, &updated.CreatedBy, &updated.CreatedAt, &updated.UpdatedAt)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "update_inventory_failed", "Could not update inventory item")
		return
	}
	if _, err = tx.Exec(r.Context(), `INSERT INTO inventory_events (batch_id, household_id, actor_user_id, event_type, amount, unit) VALUES ($1, $2, $3, 'adjusted', $4, $5)`, item.ID, item.HouseholdID, mustUserID(r.Context()), updated.Quantity, updated.Unit); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "update_inventory_failed", "Could not update inventory item")
		return
	}
	if err = tx.Commit(r.Context()); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "update_inventory_failed", "Could not update inventory item")
		return
	}
	httpx.Data(w, http.StatusOK, updated)
}

func (s *Server) deleteInventory(w http.ResponseWriter, r *http.Request) {
	item, ok := s.inventoryByParam(w, r)
	if !ok {
		return
	}
	tx, err := s.db.Begin(r.Context())
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "delete_inventory_failed", "Could not delete inventory item")
		return
	}
	defer tx.Rollback(r.Context())
	_, err = tx.Exec(r.Context(), `UPDATE inventory_batches SET deleted_at = now(), updated_at = now() WHERE id = $1 AND household_id = $2`, item.ID, item.HouseholdID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "delete_inventory_failed", "Could not delete inventory item")
		return
	}
	if _, err = tx.Exec(r.Context(), `INSERT INTO inventory_events (batch_id, household_id, actor_user_id, event_type, unit) VALUES ($1, $2, $3, 'deleted', $4)`, item.ID, item.HouseholdID, mustUserID(r.Context()), item.Unit); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "delete_inventory_failed", "Could not delete inventory item")
		return
	}
	if err = tx.Commit(r.Context()); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "delete_inventory_failed", "Could not delete inventory item")
		return
	}
	httpx.Data(w, http.StatusOK, map[string]bool{"deleted": true})
}

func (s *Server) consumeInventory(w http.ResponseWriter, r *http.Request) {
	s.recordInventoryAction(w, r, "consumed")
}
func (s *Server) wasteInventory(w http.ResponseWriter, r *http.Request) {
	s.recordInventoryAction(w, r, "wasted")
}

func (s *Server) recordInventoryAction(w http.ResponseWriter, r *http.Request, eventType string) {
	var req struct {
		Amount float64 `json:"amount"`
	}
	if err := httpx.ReadJSON(r, &req); err != nil {
		httpx.BadJSON(w, err)
		return
	}
	if req.Amount <= 0 {
		httpx.ValidationError(w, map[string]string{"amount": "Amount must be greater than zero"})
		return
	}
	household, err := s.activeHousehold(r.Context(), mustUserID(r.Context()))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "household_not_found", "No household found")
		return
	}
	batchID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_id", "Invalid inventory ID")
		return
	}
	tx, err := s.db.Begin(r.Context())
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "transaction_failed", "Could not record action")
		return
	}
	defer tx.Rollback(r.Context())
	var current float64
	var unit string
	err = tx.QueryRow(r.Context(), `SELECT quantity::float8, unit FROM inventory_batches WHERE id = $1 AND household_id = $2 AND deleted_at IS NULL FOR UPDATE`, batchID, household.ID).Scan(&current, &unit)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "inventory_not_found", "Inventory item not found")
		return
	}
	newQuantity := current - req.Amount
	if newQuantity < 0 {
		httpx.ValidationError(w, map[string]string{"amount": "Amount cannot exceed current quantity"})
		return
	}
	_, err = tx.Exec(r.Context(), `INSERT INTO inventory_events (batch_id, household_id, actor_user_id, event_type, amount, unit) VALUES ($1, $2, $3, $4, $5, $6)`, batchID, household.ID, mustUserID(r.Context()), eventType, req.Amount, unit)
	if err == nil {
		_, err = tx.Exec(r.Context(), `UPDATE inventory_batches SET quantity = $1, deleted_at = CASE WHEN $1 = 0 THEN now() ELSE deleted_at END, updated_at = now() WHERE id = $2`, newQuantity, batchID)
	}
	if err != nil || tx.Commit(r.Context()) != nil {
		httpx.Error(w, http.StatusInternalServerError, "record_action_failed", "Could not record inventory action")
		return
	}
	httpx.Data(w, http.StatusOK, map[string]any{"quantity": newQuantity})
}

func (s *Server) listBatchEvents(w http.ResponseWriter, r *http.Request) {
	item, ok := s.inventoryByParam(w, r)
	if !ok {
		return
	}
	s.writeEvents(w, r, `WHERE batch_id = $1 AND household_id = $2`, item.ID, item.HouseholdID)
}

func (s *Server) history(w http.ResponseWriter, r *http.Request) {
	household, err := s.activeHousehold(r.Context(), mustUserID(r.Context()))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "household_not_found", "No household found")
		return
	}
	s.writeEvents(w, r, `WHERE household_id = $1`, household.ID)
}

func (s *Server) writeEvents(w http.ResponseWriter, r *http.Request, where string, args ...any) {
	rows, err := s.db.Query(r.Context(), `SELECT id, batch_id, household_id, actor_user_id, event_type, amount::float8, unit, metadata, created_at FROM inventory_events `+where+` ORDER BY created_at DESC LIMIT 100`, args...)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "list_events_failed", "Could not list events")
		return
	}
	defer rows.Close()
	events := []map[string]any{}
	for rows.Next() {
		var id, batchID, householdID, actorID uuid.UUID
		var eventType string
		var amount *float64
		var unit *string
		var metadata map[string]any
		var createdAt time.Time
		if err := rows.Scan(&id, &batchID, &householdID, &actorID, &eventType, &amount, &unit, &metadata, &createdAt); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "scan_events_failed", "Could not list events")
			return
		}
		events = append(events, map[string]any{"id": id, "batchId": batchID, "householdId": householdID, "actorUserId": actorID, "eventType": eventType, "amount": amount, "unit": unit, "metadata": metadata, "createdAt": createdAt})
	}
	httpx.Data(w, http.StatusOK, events)
}

type inventoryRequest struct {
	Barcode       *string `json:"barcode"`
	Name          string  `json:"name"`
	Brand         *string `json:"brand"`
	Quantity      float64 `json:"quantity"`
	Unit          string  `json:"unit"`
	Category      *string `json:"category"`
	Storage       *string `json:"storage"`
	StorageDetail *string `json:"storageDetail"`
	ExpiryDate    *string `json:"expiryDate"`
	ImageURL      *string `json:"imageUrl"`
	Notes         *string `json:"notes"`
}

type inventoryPatchRequest struct {
	Barcode       *string  `json:"barcode"`
	Name          *string  `json:"name"`
	Brand         *string  `json:"brand"`
	Quantity      *float64 `json:"quantity"`
	Unit          *string  `json:"unit"`
	Category      *string  `json:"category"`
	Storage       *string  `json:"storage"`
	StorageDetail *string  `json:"storageDetail"`
	ExpiryDate    *string  `json:"expiryDate"`
	ImageURL      *string  `json:"imageUrl"`
	Notes         *string  `json:"notes"`
}

func mergeInventoryPatch(item inventoryDTO, patch inventoryPatchRequest) inventoryRequest {
	quantity := item.Quantity
	if patch.Quantity != nil {
		quantity = *patch.Quantity
	}
	name := item.Name
	if patch.Name != nil {
		name = *patch.Name
	}
	unit := item.Unit
	if patch.Unit != nil {
		unit = *patch.Unit
	}
	return inventoryRequest{
		Barcode:       chooseString(patch.Barcode, item.Barcode),
		Name:          name,
		Brand:         chooseString(patch.Brand, item.Brand),
		Quantity:      quantity,
		Unit:          unit,
		Category:      chooseString(patch.Category, item.Category),
		Storage:       chooseString(patch.Storage, item.Storage),
		StorageDetail: chooseString(patch.StorageDetail, item.StorageDetail),
		ExpiryDate:    chooseString(patch.ExpiryDate, item.ExpiryDate),
		ImageURL:      chooseString(patch.ImageURL, item.ImageURL),
		Notes:         chooseString(patch.Notes, item.Notes),
	}
}

func chooseString(next, current *string) *string {
	if next != nil {
		return next
	}
	return current
}

func validateInventory(req inventoryRequest) map[string]string {
	fields := map[string]string{}
	if strings.TrimSpace(req.Name) == "" {
		fields["name"] = "Name is required"
	}
	if req.Quantity < 0 {
		fields["quantity"] = "Quantity cannot be negative"
	}
	if strings.TrimSpace(req.Unit) == "" {
		fields["unit"] = "Unit is required"
	}
	if req.ExpiryDate != nil && strings.TrimSpace(*req.ExpiryDate) != "" {
		if _, err := time.Parse("2006-01-02", strings.TrimSpace(*req.ExpiryDate)); err != nil {
			fields["expiryDate"] = "Expiry date must use YYYY-MM-DD"
		}
	}
	return fields
}

func (s *Server) inventoryByParam(w http.ResponseWriter, r *http.Request) (inventoryDTO, bool) {
	household, err := s.activeHousehold(r.Context(), mustUserID(r.Context()))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "household_not_found", "No household found")
		return inventoryDTO{}, false
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid_id", "Invalid inventory ID")
		return inventoryDTO{}, false
	}
	var item inventoryDTO
	err = s.db.QueryRow(r.Context(), `SELECT id, household_id, barcode, name, brand, quantity::float8, unit, category, storage, storage_detail, expiry_date::text, image_url, notes, created_by, created_at, updated_at FROM inventory_batches WHERE id = $1 AND household_id = $2 AND deleted_at IS NULL`, id, household.ID).Scan(&item.ID, &item.HouseholdID, &item.Barcode, &item.Name, &item.Brand, &item.Quantity, &item.Unit, &item.Category, &item.Storage, &item.StorageDetail, &item.ExpiryDate, &item.ImageURL, &item.Notes, &item.CreatedBy, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "inventory_not_found", "Inventory item not found")
		return inventoryDTO{}, false
	}
	return item, true
}

func scanInventoryRows(rows pgx.Rows) ([]inventoryDTO, error) {
	items := []inventoryDTO{}
	for rows.Next() {
		var item inventoryDTO
		if err := rows.Scan(&item.ID, &item.HouseholdID, &item.Barcode, &item.Name, &item.Brand, &item.Quantity, &item.Unit, &item.Category, &item.Storage, &item.StorageDetail, &item.ExpiryDate, &item.ImageURL, &item.Notes, &item.CreatedBy, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Server) detectProduct(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Barcode string `json:"barcode"`
	}
	if err := httpx.ReadJSON(r, &req); err != nil {
		httpx.BadJSON(w, err)
		return
	}
	barcode := strings.TrimSpace(req.Barcode)
	if barcode == "" {
		httpx.ValidationError(w, map[string]string{"barcode": "Barcode is required"})
		return
	}
	household, err := s.activeHousehold(r.Context(), mustUserID(r.Context()))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "household_not_found", "No household found")
		return
	}
	draft := map[string]any{"barcode": barcode, "confidence": 0.2, "sources": []string{}}
	var name string
	var brand, category, unit *string
	var source string
	err = s.db.QueryRow(r.Context(), `SELECT name, brand, category, unit, source FROM barcode_mappings WHERE household_id = $1 AND barcode = $2`, household.ID, barcode).Scan(&name, &brand, &category, &unit, &source)
	if err == nil {
		draft["name"] = name
		draft["brand"] = brand
		draft["category"] = category
		draft["unit"] = unit
		draft["confidence"] = 0.98
		draft["sources"] = []string{source}
		httpx.Data(w, http.StatusOK, map[string]any{"autofill": draft})
		return
	}
	offDraft := fetchOpenFoodFacts(r.Context(), barcode)
	for k, v := range offDraft {
		draft[k] = v
	}
	httpx.Data(w, http.StatusOK, map[string]any{"autofill": draft})
}

func (s *Server) recommendMenus(w http.ResponseWriter, r *http.Request) {
	household, err := s.activeHousehold(r.Context(), mustUserID(r.Context()))
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "household_not_found", "No household found")
		return
	}
	rows, err := s.db.Query(r.Context(), `SELECT id, name, quantity::float8, unit, category, expiry_date::text FROM inventory_batches WHERE household_id = $1 AND deleted_at IS NULL AND quantity > 0 ORDER BY expiry_date ASC NULLS LAST LIMIT 50`, household.ID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "inventory_load_failed", "Could not load inventory")
		return
	}
	defer rows.Close()
	inventory := []map[string]any{}
	for rows.Next() {
		var id uuid.UUID
		var name, unit string
		var qty float64
		var category, expiry *string
		if err := rows.Scan(&id, &name, &qty, &unit, &category, &expiry); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "inventory_scan_failed", "Could not load inventory")
			return
		}
		inventory = append(inventory, map[string]any{"id": id.String(), "name": name, "quantity": qty, "unit": unit, "category": category, "expiryDate": expiry})
	}
	menus := fallbackMenus(inventory)
	if s.cfg.OpenAIAPIKey != "" && len(inventory) > 0 {
		if aiMenus, err := s.openAIMenus(r.Context(), inventory); err == nil && len(aiMenus) > 0 {
			menus = aiMenus
		}
	}
	httpx.Data(w, http.StatusOK, map[string]any{"menus": menus})
}

func fetchOpenFoodFacts(ctx context.Context, barcode string) map[string]any {
	client := &http.Client{Timeout: 8 * time.Second}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, "https://world.openfoodfacts.org/api/v2/product/"+barcode+".json", nil)
	if err != nil {
		return map[string]any{}
	}
	res, err := client.Do(req)
	if err != nil {
		return map[string]any{}
	}
	defer res.Body.Close()
	if res.StatusCode >= 300 {
		return map[string]any{}
	}
	var payload struct {
		Product map[string]any `json:"product"`
	}
	if json.NewDecoder(res.Body).Decode(&payload) != nil || payload.Product == nil {
		return map[string]any{}
	}
	draft := map[string]any{"sources": []string{"openfoodfacts"}, "confidence": 0.72}
	if value, ok := payload.Product["product_name"].(string); ok && value != "" {
		draft["name"] = value
	}
	if value, ok := payload.Product["brands"].(string); ok && value != "" {
		draft["brand"] = strings.TrimSpace(strings.Split(value, ",")[0])
	}
	if value, ok := payload.Product["quantity"].(string); ok && value != "" {
		qty, unit := normalizeQuantity(value)
		if qty != "" {
			draft["quantityValue"] = qty
		}
		if unit != "" {
			draft["unit"] = unit
		}
	}
	if tags, ok := payload.Product["categories_tags"].([]any); ok && len(tags) > 0 {
		if tag, ok := tags[0].(string); ok {
			draft["category"] = strings.ReplaceAll(strings.TrimPrefix(tag, "en:"), "-", " ")
		}
	}
	return draft
}

func (s *Server) openAIMenus(ctx context.Context, inventory []map[string]any) ([]map[string]any, error) {
	prompt := fmt.Sprintf(`Given this household inventory, recommend up to 3 menu ideas. Return strict JSON shape {"menus":[{"id":"string","name":"string","description":"string","difficulty":"easy|medium|advanced","canCook":boolean,"matchScore":number,"prepTime":"string","servings":"string","summary":"string","ingredients":[{"name":"string","quantity":"string","have":"string","status":"enough|low|missing"}],"steps":["string"]}]}. Inventory: %s`, mustJSON(inventory))
	body := map[string]any{"model": "gpt-4o-mini", "temperature": 0.2, "messages": []map[string]string{{"role": "system", "content": "You generate recipe recommendations from inventory and must respond with strict JSON only."}, {"role": "user", "content": prompt}}}
	encoded, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.openai.com/v1/chat/completions", strings.NewReader(string(encoded)))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+s.cfg.OpenAIAPIKey)
	req.Header.Set("Content-Type", "application/json")
	res, err := (&http.Client{Timeout: 20 * time.Second}).Do(req)
	if err != nil {
		return nil, errors.New("openai request failed")
	}
	defer res.Body.Close()
	if res.StatusCode >= 300 {
		return nil, errors.New("openai request failed")
	}
	var response struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if json.NewDecoder(res.Body).Decode(&response) != nil || len(response.Choices) == 0 {
		return nil, errors.New("openai response invalid")
	}
	var parsed struct {
		Menus []map[string]any `json:"menus"`
	}
	if json.Unmarshal([]byte(response.Choices[0].Message.Content), &parsed) != nil {
		return nil, errors.New("openai json invalid")
	}
	return parsed.Menus, nil
}

func fallbackMenus(inventory []map[string]any) []map[string]any {
	names := map[string]bool{}
	for _, item := range inventory {
		if name, ok := item["name"].(string); ok {
			names[strings.ToLower(name)] = true
		}
	}
	menus := []map[string]any{}
	if names["organic strawberries"] || names["strawberries"] {
		menus = append(menus, map[string]any{"id": "fresh-fruit-bowl", "name": "Fresh Fruit Bowl", "description": "Use fruit that is closest to expiry first.", "difficulty": "easy", "canCook": true, "matchScore": 72, "prepTime": "5 min", "servings": "2", "summary": "A quick way to clear fresh produce before it spoils.", "ingredients": []map[string]any{{"name": "Fruit", "quantity": "as available", "have": "in inventory", "status": "enough"}}, "steps": []string{"Wash fruit.", "Slice and serve."}})
	}
	if len(menus) == 0 {
		menus = append(menus, map[string]any{"id": "inventory-cleanout", "name": "Inventory Cleanout Plate", "description": "A flexible suggestion based on your available inventory.", "difficulty": "easy", "canCook": false, "matchScore": 50, "prepTime": "10 min", "servings": "1", "summary": "Add more ingredients to unlock stronger recommendations.", "ingredients": []map[string]any{}, "steps": []string{"Review expiring items.", "Combine compatible ingredients.", "Re-run recommendations after adding more pantry staples."}})
	}
	return menus
}

func hashPassword(password, pepper string) (string, error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	hash := argon2.IDKey([]byte(password+pepper), salt, 1, 64*1024, 4, 32)
	return fmt.Sprintf("$argon2id$v=19$m=65536,t=1,p=4$%s$%s", base64.RawStdEncoding.EncodeToString(salt), base64.RawStdEncoding.EncodeToString(hash)), nil
}

func verifyPassword(password, encoded, pepper string) bool {
	parts := strings.Split(encoded, "$")
	if len(parts) != 6 || parts[1] != "argon2id" {
		return false
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return false
	}
	expected, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return false
	}
	hash := argon2.IDKey([]byte(password+pepper), salt, 1, 64*1024, 4, uint32(len(expected)))
	return subtle.ConstantTimeCompare(hash, expected) == 1
}

func randomToken(byteLen int) (string, error) {
	buf := make([]byte, byteLen)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func numericCode(length int) (string, error) {
	var builder strings.Builder
	for i := 0; i < length; i++ {
		n, err := rand.Int(rand.Reader, big.NewInt(10))
		if err != nil {
			return "", err
		}
		builder.WriteString(n.String())
	}
	return builder.String(), nil
}

func randomInviteCode() (string, error) {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	var builder strings.Builder
	for i := 0; i < 8; i++ {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(alphabet))))
		if err != nil {
			return "", err
		}
		builder.WriteByte(alphabet[n.Int64()])
	}
	return builder.String(), nil
}

func suffix(value string, n int) string {
	if len(value) <= n {
		return value
	}
	return value[len(value)-n:]
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func validEmail(email string) bool {
	address, err := mail.ParseAddress(email)
	return err == nil && address.Address == email && len(email) <= 320 && !strings.ContainsAny(email, "\r\n")
}

func limitRequestBody(maxBytes int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
			next.ServeHTTP(w, r)
		})
	}
}

func clientIP(r *http.Request) any {
	if ip := net.ParseIP(strings.TrimSpace(r.Header.Get("X-Forwarded-For"))); ip != nil {
		return ip.String()
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil {
		return host
	}
	return nil
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

func str(value *string) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(*value)
}

func datePtr(value *string) any {
	if value == nil || strings.TrimSpace(*value) == "" {
		return nil
	}
	return strings.TrimSpace(*value)
}

func normalizeQuantity(quantity string) (string, string) {
	fields := strings.Fields(strings.TrimSpace(strings.ReplaceAll(quantity, ",", ".")))
	if len(fields) == 0 {
		return "", ""
	}
	if _, err := strconv.ParseFloat(fields[0], 64); err != nil {
		return quantity, ""
	}
	unit := ""
	if len(fields) > 1 {
		unit = strings.ToLower(fields[1])
	}
	return fields[0], unit
}

func mustJSON(value any) string {
	encoded, _ := json.Marshal(value)
	return string(encoded)
}
