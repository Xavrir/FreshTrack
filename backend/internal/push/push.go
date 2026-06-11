// Package push delivers notifications through the Expo Push API.
package push

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

const expoPushURL = "https://exp.host/--/api/v2/push/send"

// Sender delivers a notification to a set of Expo push tokens.
type Sender interface {
	Send(ctx context.Context, tokens []string, title, body string) error
}

// NoopSender drops notifications (used in tests / when push is disabled).
type NoopSender struct{}

func (NoopSender) Send(context.Context, []string, string, string) error { return nil }

// ExpoSender posts messages to the Expo Push API in batches of 100.
type ExpoSender struct {
	Client *http.Client
}

func NewExpoSender() ExpoSender {
	return ExpoSender{Client: &http.Client{Timeout: 10 * time.Second}}
}

type expoMessage struct {
	To    string `json:"to"`
	Title string `json:"title"`
	Body  string `json:"body"`
	Sound string `json:"sound"`
}

func (e ExpoSender) Send(ctx context.Context, tokens []string, title, body string) error {
	if len(tokens) == 0 {
		return nil
	}
	const batchSize = 100
	for start := 0; start < len(tokens); start += batchSize {
		end := start + batchSize
		if end > len(tokens) {
			end = len(tokens)
		}
		messages := make([]expoMessage, 0, end-start)
		for _, token := range tokens[start:end] {
			messages = append(messages, expoMessage{To: token, Title: title, Body: body, Sound: "default"})
		}
		if err := e.post(ctx, messages); err != nil {
			return err
		}
	}
	return nil
}

func (e ExpoSender) post(ctx context.Context, messages []expoMessage) error {
	payload, err := json.Marshal(messages)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, expoPushURL, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	client := e.Client
	if client == nil {
		client = http.DefaultClient
	}
	res, err := client.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode >= 300 {
		return fmt.Errorf("expo push returned status %d", res.StatusCode)
	}
	return nil
}
