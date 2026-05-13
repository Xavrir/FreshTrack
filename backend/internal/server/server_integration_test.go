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

	created := requestJSON(t, app, http.MethodPost, "/v1/inventory", accessToken, map[string]any{
		"barcode":       uniqueDigits(),
		"name":          "Integration Milk",
		"brand":         "FreshTrack Test Brand",
		"quantity":      2,
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
		"quantity": 0,
		"notes":    "patched to zero",
	})
	assertStatus(t, patched, http.StatusOK)
	patchedData := dataMap(t, patched)
	if qty := patchedData["quantity"].(float64); qty != 0 {
		t.Fatalf("expected patched quantity 0, got %v", qty)
	}
	if storageDetail := patchedData["storageDetail"].(string); storageDetail != "top shelf" {
		t.Fatalf("expected omitted storageDetail to be preserved, got %q", storageDetail)
	}

	fetched := requestJSON(t, app, http.MethodGet, "/v1/inventory/"+itemID, accessToken, nil)
	assertStatus(t, fetched, http.StatusOK)
	fetchedData := dataMap(t, fetched)
	if qty := fetchedData["quantity"].(float64); qty != 0 {
		t.Fatalf("expected fetched quantity 0, got %v", qty)
	}
	if storageDetail := fetchedData["storageDetail"].(string); storageDetail != "top shelf" {
		t.Fatalf("expected fetched storageDetail to be preserved, got %q", storageDetail)
	}

	events := requestJSON(t, app, http.MethodGet, "/v1/inventory/"+itemID+"/events", accessToken, nil)
	assertStatus(t, events, http.StatusOK)
	assertEventTypes(t, dataSlice(t, events), "created", "adjusted")

	history := requestJSON(t, app, http.MethodGet, "/v1/history", accessToken, nil)
	assertStatus(t, history, http.StatusOK)
	assertEventTypes(t, dataSlice(t, history), "created", "adjusted")
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

func uniqueEmail(t *testing.T, prefix string) string {
	t.Helper()
	return prefix + "-" + uniqueDigits() + "@example.com"
}

func uniqueDigits() string {
	return strings.ReplaceAll(strconv.FormatInt(time.Now().UnixNano(), 10), "-", "")
}
