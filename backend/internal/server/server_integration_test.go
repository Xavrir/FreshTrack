//go:build integration

package server

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"strings"
	"testing"
	"time"

	"freshtrack/backend/internal/config"

	"github.com/jackc/pgx/v5/pgxpool"
)

const testPassword = "testpassword123"

func TestAuthFlowIntegration(t *testing.T) {
	app, db := newIntegrationApp(t)
	email := uniqueEmail(t, "auth")

	signup := requestJSON(t, app, http.MethodPost, "/v1/auth/signup", "", map[string]any{
		"email": email, "password": testPassword, "fullName": "Auth Test",
	})
	assertStatus(t, signup, http.StatusCreated)
	if required, ok := dataMap(t, signup)["emailVerificationRequired"].(bool); !ok || !required {
		t.Fatalf("expected emailVerificationRequired=true, got %#v", dataMap(t, signup)["emailVerificationRequired"])
	}

	loginBlocked := requestJSON(t, app, http.MethodPost, "/v1/auth/login", "", map[string]any{
		"email": email, "password": testPassword,
	})
	assertStatus(t, loginBlocked, http.StatusForbidden)

	verifyUserEmail(t, db, email)

	login := requestJSON(t, app, http.MethodPost, "/v1/auth/login", "", map[string]any{
		"email": email, "password": testPassword,
	})
	assertStatus(t, login, http.StatusOK)
	accessToken, refreshToken := authTokens(t, login)
	if accessToken == "" || refreshToken == "" {
		t.Fatal("expected non-empty access and refresh tokens")
	}

	refresh := requestJSON(t, app, http.MethodPost, "/v1/auth/refresh", "", map[string]any{"refreshToken": refreshToken})
	assertStatus(t, refresh, http.StatusOK)
	_, rotatedRefreshToken := authTokens(t, refresh)
	if rotatedRefreshToken == "" || rotatedRefreshToken == refreshToken {
		t.Fatalf("expected rotated refresh token, old=%q new=%q", refreshToken, rotatedRefreshToken)
	}

	logout := requestJSON(t, app, http.MethodPost, "/v1/auth/logout", accessToken, map[string]any{"refreshToken": rotatedRefreshToken})
	assertStatus(t, logout, http.StatusOK)
}

// TestOtpOnlySignupBlocksPasswordLogin verifies that an account created via the
// email-OTP flow (no password) cannot be logged into with a password — including
// the old deterministic email-derived "fallback" password that used to be a hole.
func TestOtpOnlySignupBlocksPasswordLogin(t *testing.T) {
	app, db := newIntegrationApp(t)
	email := uniqueEmail(t, "otponly")

	signup := requestJSON(t, app, http.MethodPost, "/v1/auth/signup", "", map[string]any{
		"email": email,
	})
	assertStatus(t, signup, http.StatusCreated)

	var authMethod string
	var hasHash bool
	if err := db.QueryRow(context.Background(),
		`SELECT auth_method, password_hash IS NOT NULL FROM users WHERE email = $1`, email,
	).Scan(&authMethod, &hasHash); err != nil {
		t.Fatalf("load user: %v", err)
	}
	if authMethod != "otp" {
		t.Fatalf("expected auth_method=otp, got %q", authMethod)
	}
	if hasHash {
		t.Fatal("expected OTP-only user to have NULL password_hash")
	}

	// Even after the email is verified, password login must stay blocked.
	verifyUserEmail(t, db, email)
	for _, pw := range []string{testPassword, "FreshTrack-" + email + "-Passwordless"} {
		resp := requestJSON(t, app, http.MethodPost, "/v1/auth/login", "", map[string]any{
			"email": email, "password": pw,
		})
		assertStatus(t, resp, http.StatusUnauthorized)
	}
}

// TestAuthRateLimitingIntegration verifies the per-IP attempt cap and the
// per-email send cooldown.
func TestAuthRateLimitingIntegration(t *testing.T) {
	app, _ := newIntegrationApp(t)

	// Per-IP cap: ipAttemptLimit allowed, then 429.
	for i := 0; i < ipAttemptLimit; i++ {
		resp := requestJSON(t, app, http.MethodPost, "/v1/auth/verify-email", "", map[string]any{
			"email": "nobody@freshtrack.local", "code": "000000",
		})
		assertStatus(t, resp, http.StatusUnauthorized)
	}
	blocked := requestJSON(t, app, http.MethodPost, "/v1/auth/verify-email", "", map[string]any{
		"email": "nobody@freshtrack.local", "code": "000000",
	})
	assertStatus(t, blocked, http.StatusTooManyRequests)
	if ra := blocked.Header().Get("Retry-After"); ra == "" {
		t.Fatal("expected Retry-After header on 429")
	}
}

func TestEmailSendCooldownIntegration(t *testing.T) {
	app, _ := newIntegrationApp(t)
	email := uniqueEmail(t, "cooldown")

	first := requestJSON(t, app, http.MethodPost, "/v1/auth/resend-verification", "", map[string]any{"email": email})
	assertStatus(t, first, http.StatusOK)

	second := requestJSON(t, app, http.MethodPost, "/v1/auth/resend-verification", "", map[string]any{"email": email})
	assertStatus(t, second, http.StatusTooManyRequests)
}

// TestHouseholdInviteFullCodeIntegration verifies that the full shareable invite
// code is returned by GET /v1/household/invite (not just the suffix) and that it
// can be used to join.
func TestHouseholdInviteFullCodeIntegration(t *testing.T) {
	app, db := newIntegrationApp(t)
	email := uniqueEmail(t, "invite")

	requestJSON(t, app, http.MethodPost, "/v1/auth/signup", "", map[string]any{
		"email": email, "password": testPassword, "fullName": "Invite Owner",
	})
	verifyUserEmail(t, db, email)
	login := requestJSON(t, app, http.MethodPost, "/v1/auth/login", "", map[string]any{
		"email": email, "password": testPassword,
	})
	assertStatus(t, login, http.StatusOK)
	accessToken, _ := authTokens(t, login)

	created := requestJSON(t, app, http.MethodPost, "/v1/household", accessToken, map[string]any{"name": "Invite Household"})
	assertStatus(t, created, http.StatusCreated)
	createdCode, _ := dataMap(t, created)["inviteCode"].(string)
	if createdCode == "" {
		t.Fatal("expected a non-empty invite code on create")
	}

	got := requestJSON(t, app, http.MethodGet, "/v1/household/invite", accessToken, nil)
	assertStatus(t, got, http.StatusOK)
	if full, _ := dataMap(t, got)["code"].(string); full != createdCode {
		t.Fatalf("expected GET invite to return full code %q, got %q", createdCode, full)
	}

	// A second user can join with the shared full code.
	joinerEmail := uniqueEmail(t, "joiner")
	requestJSON(t, app, http.MethodPost, "/v1/auth/signup", "", map[string]any{
		"email": joinerEmail, "password": testPassword,
	})
	verifyUserEmail(t, db, joinerEmail)
	joinerLogin := requestJSON(t, app, http.MethodPost, "/v1/auth/login", "", map[string]any{
		"email": joinerEmail, "password": testPassword,
	})
	assertStatus(t, joinerLogin, http.StatusOK)
	joinerToken, _ := authTokens(t, joinerLogin)

	joined := requestJSON(t, app, http.MethodPost, "/v1/household/join", joinerToken, map[string]any{"code": createdCode})
	assertStatus(t, joined, http.StatusOK)
}

func TestInventoryHouseholdFlowIntegration(t *testing.T) {
	app, db := newIntegrationApp(t)
	email := uniqueEmail(t, "inventory")

	requestJSON(t, app, http.MethodPost, "/v1/auth/signup", "", map[string]any{
		"email": email, "password": testPassword, "fullName": "Inventory Test",
	})
	verifyUserEmail(t, db, email)
	login := requestJSON(t, app, http.MethodPost, "/v1/auth/login", "", map[string]any{
		"email": email, "password": testPassword,
	})
	assertStatus(t, login, http.StatusOK)
	accessToken, _ := authTokens(t, login)

	household := requestJSON(t, app, http.MethodPost, "/v1/household", accessToken, map[string]any{"name": "Integration Household"})
	assertStatus(t, household, http.StatusCreated)

	missingExpiry := requestJSON(t, app, http.MethodPost, "/v1/inventory", accessToken, map[string]any{
		"name":     "No Expiry Item",
		"quantity": 1,
		"unit":     "pcs",
	})
	assertStatus(t, missingExpiry, http.StatusUnprocessableEntity)

	created := requestJSON(t, app, http.MethodPost, "/v1/inventory", accessToken, map[string]any{
		"barcode":       uniqueDigits(),
		"name":          "Integration Milk",
		"brand":         "FreshTrack Test Brand",
		"quantity":      4,
		"unit":          "bottle",
		"category":      "Dairy",
		"storage":       "fridge",
		"storageDetail": "top shelf",
		"expiryDate":    "2099-01-01",
	})
	assertStatus(t, created, http.StatusCreated)
	itemID, ok := dataMap(t, created)["id"].(string)
	if !ok || itemID == "" {
		t.Fatalf("expected created item id, got %#v", dataMap(t, created)["id"])
	}

	patched := requestJSON(t, app, http.MethodPatch, "/v1/inventory/"+itemID, accessToken, map[string]any{
		"quantity": 3,
		"notes":    "patched quantity",
	})
	assertStatus(t, patched, http.StatusOK)
	patchedData := dataMap(t, patched)
	if qty := patchedData["quantity"].(float64); qty != 3 {
		t.Fatalf("expected patched quantity 3, got %v", qty)
	}
	if storageDetail := patchedData["storageDetail"].(string); storageDetail != "top shelf" {
		t.Fatalf("expected omitted storageDetail to be preserved, got %q", storageDetail)
	}

	fetched := requestJSON(t, app, http.MethodGet, "/v1/inventory/"+itemID, accessToken, nil)
	assertStatus(t, fetched, http.StatusOK)
	fetchedData := dataMap(t, fetched)
	if qty := fetchedData["quantity"].(float64); qty != 3 {
		t.Fatalf("expected fetched quantity 3, got %v", qty)
	}
	if storageDetail := fetchedData["storageDetail"].(string); storageDetail != "top shelf" {
		t.Fatalf("expected fetched storageDetail to be preserved, got %q", storageDetail)
	}

	consumed := requestJSON(t, app, http.MethodPost, "/v1/inventory/"+itemID+"/consume", accessToken, map[string]any{"amount": 1})
	assertStatus(t, consumed, http.StatusOK)

	wasted := requestJSON(t, app, http.MethodPost, "/v1/inventory/"+itemID+"/waste", accessToken, map[string]any{"amount": 1})
	assertStatus(t, wasted, http.StatusOK)

	events := requestJSON(t, app, http.MethodGet, "/v1/inventory/"+itemID+"/events", accessToken, nil)
	assertStatus(t, events, http.StatusOK)
	assertEventTypes(t, dataSlice(t, events), "created", "adjusted", "consumed", "wasted")
	assertBatchName(t, dataSlice(t, events), "Integration Milk")

	deleted := requestJSON(t, app, http.MethodDelete, "/v1/inventory/"+itemID, accessToken, nil)
	assertStatus(t, deleted, http.StatusOK)

	deletedFetch := requestJSON(t, app, http.MethodGet, "/v1/inventory/"+itemID, accessToken, nil)
	assertStatus(t, deletedFetch, http.StatusNotFound)

	listed := requestJSON(t, app, http.MethodGet, "/v1/inventory", accessToken, nil)
	assertStatus(t, listed, http.StatusOK)
	assertMissingInventoryID(t, dataSlice(t, listed), itemID)

	history := requestJSON(t, app, http.MethodGet, "/v1/history", accessToken, nil)
	assertStatus(t, history, http.StatusOK)
	assertEventTypes(t, dataSlice(t, history), "created", "adjusted", "consumed", "wasted", "deleted")
	assertBatchName(t, dataSlice(t, history), "Integration Milk")
}

func newIntegrationApp(t *testing.T) (http.Handler, *pgxpool.Pool) {
	t.Helper()
	databaseURL := os.Getenv("FRESHTRACK_TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("set FRESHTRACK_TEST_DATABASE_URL to run integration tests")
	}
	ctx := context.Background()
	db, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatalf("connect test database: %v", err)
	}
	t.Cleanup(db.Close)
	if err := db.Ping(ctx); err != nil {
		t.Fatalf("ping test database: %v", err)
	}
	// Integration tests share one IP and database, so reset rate-limit state to
	// keep per-IP auth buckets from accumulating across tests.
	if _, err := db.Exec(ctx, `DELETE FROM auth_rate_limits`); err != nil {
		t.Fatalf("reset rate limits: %v", err)
	}
	cfg := config.Config{
		AppEnv:             "test",
		APIPort:            "0",
		DatabaseURL:        databaseURL,
		AccessTokenSecret:  "integration_access_secret",
		AccessTokenTTL:     15 * time.Minute,
		RefreshTokenTTL:    24 * time.Hour,
		PasswordPepper:     "integration_password_pepper",
		MailProvider:       "noop",
		MailFrom:           "FreshTrack <noreply@freshtrack.local>",
		PublicAPIURL:       "http://localhost:8080",
		CORSAllowedOrigins: []string{"*"},
	}
	return New(cfg, db, slog.New(slog.NewTextHandler(io.Discard, nil))).Routes(), db
}

func requestJSON(t *testing.T, handler http.Handler, method, path, token string, body any) *httptest.ResponseRecorder {
	t.Helper()
	var reader io.Reader
	if body != nil {
		payload, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("marshal request body: %v", err)
		}
		reader = bytes.NewReader(payload)
	}
	req := httptest.NewRequest(method, path, reader)
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, req)
	return recorder
}

func assertStatus(t *testing.T, recorder *httptest.ResponseRecorder, want int) {
	t.Helper()
	if recorder.Code != want {
		t.Fatalf("expected status %d, got %d: %s", want, recorder.Code, recorder.Body.String())
	}
}

func envelope(t *testing.T, recorder *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var decoded map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &decoded); err != nil {
		t.Fatalf("decode response %q: %v", recorder.Body.String(), err)
	}
	return decoded
}

func dataMap(t *testing.T, recorder *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	data, ok := envelope(t, recorder)["data"].(map[string]any)
	if !ok {
		t.Fatalf("expected response data object, got %s", recorder.Body.String())
	}
	return data
}

func dataSlice(t *testing.T, recorder *httptest.ResponseRecorder) []any {
	t.Helper()
	data, ok := envelope(t, recorder)["data"].([]any)
	if !ok {
		t.Fatalf("expected response data array, got %s", recorder.Body.String())
	}
	return data
}

func authTokens(t *testing.T, recorder *httptest.ResponseRecorder) (string, string) {
	t.Helper()
	data := dataMap(t, recorder)
	access, _ := data["accessToken"].(string)
	refresh, _ := data["refreshToken"].(string)
	return access, refresh
}

func verifyUserEmail(t *testing.T, db *pgxpool.Pool, email string) {
	t.Helper()
	tag, err := db.Exec(context.Background(), `UPDATE users SET email_verified_at = now(), updated_at = now() WHERE email = $1`, email)
	if err != nil {
		t.Fatalf("verify test user email: %v", err)
	}
	if tag.RowsAffected() != 1 {
		t.Fatalf("expected to verify 1 user, verified %d", tag.RowsAffected())
	}
}

func assertEventTypes(t *testing.T, events []any, want ...string) {
	t.Helper()
	found := map[string]bool{}
	for _, event := range events {
		eventMap, ok := event.(map[string]any)
		if !ok {
			continue
		}
		if eventType, ok := eventMap["eventType"].(string); ok {
			found[eventType] = true
		}
	}
	for _, eventType := range want {
		if !found[eventType] {
			t.Fatalf("expected event type %q in events %#v", eventType, events)
		}
	}
}

func assertBatchName(t *testing.T, events []any, want string) {
	t.Helper()
	for _, event := range events {
		eventMap, ok := event.(map[string]any)
		if !ok {
			continue
		}
		if eventMap["batchName"] == want {
			return
		}
	}
	t.Fatalf("expected batchName %q in events %#v", want, events)
}

func assertMissingInventoryID(t *testing.T, items []any, id string) {
	t.Helper()
	for _, item := range items {
		itemMap, ok := item.(map[string]any)
		if !ok {
			continue
		}
		if itemMap["id"] == id {
			t.Fatalf("expected deleted inventory %q to be hidden from list %#v", id, items)
		}
	}
}

func uniqueEmail(t *testing.T, prefix string) string {
	t.Helper()
	return prefix + "-" + uniqueDigits() + "@example.com"
}

func uniqueDigits() string {
	return strings.ReplaceAll(strconv.FormatInt(time.Now().UnixNano(), 10), "-", "")
}
