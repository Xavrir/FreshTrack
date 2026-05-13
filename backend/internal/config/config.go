package config

import (
	"errors"
	"os"
	"strconv"
	"strings"
	"time"
)

const (
	devAccessTokenSecret = "dev_access_secret_change_me"
	devPasswordPepper    = "dev_password_pepper_change_me"
)

type Config struct {
	AppEnv             string
	APIPort            string
	DatabaseURL        string
	AccessTokenSecret  string
	AccessTokenTTL     time.Duration
	RefreshTokenTTL    time.Duration
	PasswordPepper     string
	MailProvider       string
	MailFrom           string
	SMTPHost           string
	SMTPPort           int
	ResendAPIKey       string
	OpenAIAPIKey       string
	PublicAPIURL       string
	CORSAllowedOrigins []string
}

func Load() Config {
	return Config{
		AppEnv:             env("APP_ENV", "development"),
		APIPort:            env("API_PORT", "8080"),
		DatabaseURL:        env("DATABASE_URL", "postgres://freshtrack:freshtrack@localhost:5432/freshtrack?sslmode=disable"),
		AccessTokenSecret:  env("JWT_ACCESS_SECRET", devAccessTokenSecret),
		AccessTokenTTL:     durationEnv("ACCESS_TOKEN_TTL", 15*time.Minute),
		RefreshTokenTTL:    durationEnv("REFRESH_TOKEN_TTL", 720*time.Hour),
		PasswordPepper:     env("PASSWORD_PEPPER", devPasswordPepper),
		MailProvider:       env("MAIL_PROVIDER", "mailpit"),
		MailFrom:           env("MAIL_FROM", "FreshTrack <noreply@freshtrack.local>"),
		SMTPHost:           env("SMTP_HOST", "localhost"),
		SMTPPort:           intEnv("SMTP_PORT", 1025),
		ResendAPIKey:       env("RESEND_API_KEY", ""),
		OpenAIAPIKey:       env("OPENAI_API_KEY", ""),
		PublicAPIURL:       env("PUBLIC_API_URL", "http://localhost:8080"),
		CORSAllowedOrigins: splitEnv("CORS_ALLOWED_ORIGINS", []string{"*"}),
	}
}

func (c Config) Validate() error {
	if c.AppEnv == "development" || c.AppEnv == "test" || c.AppEnv == "" {
		return nil
	}
	var problems []string
	if c.AccessTokenSecret == "" || c.AccessTokenSecret == devAccessTokenSecret {
		problems = append(problems, "JWT_ACCESS_SECRET must be set to a production secret")
	}
	if c.PasswordPepper == "" || c.PasswordPepper == devPasswordPepper {
		problems = append(problems, "PASSWORD_PEPPER must be set to a production secret")
	}
	for _, origin := range c.CORSAllowedOrigins {
		if origin == "*" {
			problems = append(problems, "CORS_ALLOWED_ORIGINS cannot include * outside development")
		}
	}
	if strings.EqualFold(c.MailProvider, "resend") && c.ResendAPIKey == "" {
		problems = append(problems, "RESEND_API_KEY is required when MAIL_PROVIDER=resend")
	}
	if len(problems) > 0 {
		return errors.New(strings.Join(problems, "; "))
	}
	return nil
}

func env(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func durationEnv(key string, fallback time.Duration) time.Duration {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	duration, err := time.ParseDuration(value)
	if err != nil {
		return fallback
	}
	return duration
}

func intEnv(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func splitEnv(key string, fallback []string) []string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	if len(result) == 0 {
		return fallback
	}
	return result
}
