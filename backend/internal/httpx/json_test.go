package httpx

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestReadJSONRejectsUnknownFields(t *testing.T) {
	type payload struct {
		Name string `json:"name"`
	}
	req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"name":"milk","extra":true}`))
	var dst payload
	if err := ReadJSON(req, &dst); err == nil {
		t.Fatal("expected unknown field error")
	}
}

func TestDataWritesEnvelope(t *testing.T) {
	recorder := httptest.NewRecorder()
	Data(recorder, http.StatusCreated, map[string]string{"id": "123"})
	if recorder.Code != http.StatusCreated {
		t.Fatalf("expected status 201, got %d", recorder.Code)
	}
	if !strings.Contains(recorder.Body.String(), `"data"`) {
		t.Fatalf("expected data envelope, got %s", recorder.Body.String())
	}
}
