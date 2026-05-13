package config

import (
	"testing"
	"time"
)

func TestDurationEnvFallback(t *testing.T) {
	t.Setenv("ACCESS_TOKEN_TTL", "not-a-duration")
	cfg := Load()
	if cfg.AccessTokenTTL != 15*time.Minute {
		t.Fatalf("expected fallback duration, got %s", cfg.AccessTokenTTL)
	}
}

func TestSplitEnv(t *testing.T) {
	t.Setenv("CORS_ALLOWED_ORIGINS", "http://localhost:8081, https://example.com")
	cfg := Load()
	if len(cfg.CORSAllowedOrigins) != 2 {
		t.Fatalf("expected 2 origins, got %d", len(cfg.CORSAllowedOrigins))
	}
	if cfg.CORSAllowedOrigins[0] != "http://localhost:8081" || cfg.CORSAllowedOrigins[1] != "https://example.com" {
		t.Fatalf("unexpected origins: %#v", cfg.CORSAllowedOrigins)
	}
}

func TestValidateRejectsProductionDefaults(t *testing.T) {
	cfg := Config{
		AppEnv:             "production",
		AccessTokenSecret:  devAccessTokenSecret,
		PasswordPepper:     devPasswordPepper,
		CORSAllowedOrigins: []string{"*"},
	}
	if err := cfg.Validate(); err == nil {
		t.Fatal("expected production defaults to be rejected")
	}
}

func TestValidateAllowsDevelopmentDefaults(t *testing.T) {
	cfg := Load()
	if err := cfg.Validate(); err != nil {
		t.Fatalf("expected development defaults to validate: %v", err)
	}
}
