package mailer

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/mail"
	"net/smtp"
	"strings"
	"time"

	"freshtrack/backend/internal/config"
)

type Mailer interface {
	SendEmailVerification(ctx context.Context, to, code string) error
	SendPasswordReset(ctx context.Context, to, code string) error
	SendHouseholdInvite(ctx context.Context, to, code string) error
}

func New(cfg config.Config) Mailer {
	switch strings.ToLower(cfg.MailProvider) {
	case "resend":
		return ResendMailer{From: cfg.MailFrom, APIKey: cfg.ResendAPIKey}
	case "noop":
		return NoopMailer{}
	default:
		return SMTPMailer{From: cfg.MailFrom, Host: cfg.SMTPHost, Port: cfg.SMTPPort}
	}
}

type NoopMailer struct{}

func (NoopMailer) SendEmailVerification(context.Context, string, string) error { return nil }
func (NoopMailer) SendPasswordReset(context.Context, string, string) error     { return nil }
func (NoopMailer) SendHouseholdInvite(context.Context, string, string) error   { return nil }

type SMTPMailer struct {
	From string
	Host string
	Port int
}

func (m SMTPMailer) SendEmailVerification(ctx context.Context, to, code string) error {
	return m.send(ctx, to, "Verify your FreshTrack email", fmt.Sprintf("Your FreshTrack verification code is: %s\n\nThis code expires in 15 minutes.", code))
}

func (m SMTPMailer) SendPasswordReset(ctx context.Context, to, code string) error {
	return m.send(ctx, to, "Reset your FreshTrack password", fmt.Sprintf("Your FreshTrack password reset code is: %s\n\nThis code expires in 15 minutes.", code))
}

func (m SMTPMailer) SendHouseholdInvite(ctx context.Context, to, code string) error {
	return m.send(ctx, to, "FreshTrack household invite", fmt.Sprintf("Your FreshTrack household invite code is: %s", code))
}

func (m SMTPMailer) send(ctx context.Context, to, subject, body string) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}
	from, err := safeAddress(m.From)
	if err != nil {
		return err
	}
	recipient, err := safeAddress(to)
	if err != nil {
		return err
	}
	if hasHeaderBreak(subject) {
		return fmt.Errorf("invalid email subject")
	}
	message := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\n\r\n%s\r\n", from.String(), recipient.String(), subject, body)
	addr := fmt.Sprintf("%s:%d", m.Host, m.Port)
	return smtp.SendMail(addr, nil, from.Address, []string{recipient.Address}, []byte(message))
}

type ResendMailer struct {
	From   string
	APIKey string
}

func (m ResendMailer) SendEmailVerification(ctx context.Context, to, code string) error {
	return m.send(ctx, to, "Verify your FreshTrack email", fmt.Sprintf("Your FreshTrack verification code is: %s", code))
}

func (m ResendMailer) SendPasswordReset(ctx context.Context, to, code string) error {
	return m.send(ctx, to, "Reset your FreshTrack password", fmt.Sprintf("Your FreshTrack password reset code is: %s", code))
}

func (m ResendMailer) SendHouseholdInvite(ctx context.Context, to, code string) error {
	return m.send(ctx, to, "FreshTrack household invite", fmt.Sprintf("Your FreshTrack household invite code is: %s", code))
}

func (m ResendMailer) send(ctx context.Context, to, subject, text string) error {
	if m.APIKey == "" {
		return fmt.Errorf("RESEND_API_KEY is required")
	}
	if _, err := safeAddress(m.From); err != nil {
		return err
	}
	if _, err := safeAddress(to); err != nil {
		return err
	}
	if hasHeaderBreak(subject) {
		return fmt.Errorf("invalid email subject")
	}
	payload := map[string]any{"from": m.From, "to": []string{to}, "subject": subject, "text": text}
	body, _ := json.Marshal(payload)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+m.APIKey)
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 10 * time.Second}
	res, err := client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode >= 300 {
		return fmt.Errorf("resend returned status %d", res.StatusCode)
	}
	return nil
}

func safeAddress(value string) (*mail.Address, error) {
	if hasHeaderBreak(value) {
		return nil, fmt.Errorf("invalid email address")
	}
	address, err := mail.ParseAddress(strings.TrimSpace(value))
	if err != nil || address.Address == "" {
		return nil, fmt.Errorf("invalid email address")
	}
	return address, nil
}

func hasHeaderBreak(value string) bool {
	return strings.ContainsAny(value, "\r\n")
}
