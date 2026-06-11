package storage

import (
	"io"
	"net/http"
	"os"
	"strings"
	"testing"
	"time"
)

// TestLiveR2RoundTrip does a real presign → PUT → public GET against the
// configured bucket. It only runs when STORAGE_TEST_LIVE=1 and the STORAGE_*
// env vars are set, so normal `go test` skips it.
func TestLiveR2RoundTrip(t *testing.T) {
	if os.Getenv("STORAGE_TEST_LIVE") != "1" {
		t.Skip("set STORAGE_TEST_LIVE=1 to run the live R2 test")
	}
	p := Presigner{
		Endpoint:      os.Getenv("STORAGE_ENDPOINT"),
		Bucket:        os.Getenv("STORAGE_BUCKET"),
		Region:        os.Getenv("STORAGE_REGION"),
		AccessKey:     os.Getenv("STORAGE_ACCESS_KEY"),
		SecretKey:     os.Getenv("STORAGE_SECRET_KEY"),
		PublicBaseURL: os.Getenv("STORAGE_PUBLIC_BASE_URL"),
	}
	if p.Endpoint == "" || p.Bucket == "" || p.AccessKey == "" || p.SecretKey == "" || p.PublicBaseURL == "" {
		t.Fatal("missing STORAGE_* env vars")
	}

	key := "healthcheck/r2-roundtrip.txt"
	body := "freshtrack r2 ok @ " + time.Now().UTC().Format(time.RFC3339)
	contentType := "text/plain"

	uploadURL, err := p.PresignPut(key, contentType, time.Now(), 5*time.Minute)
	if err != nil {
		t.Fatalf("presign: %v", err)
	}

	// PUT the object.
	req, err := http.NewRequest(http.MethodPut, uploadURL, strings.NewReader(body))
	if err != nil {
		t.Fatalf("build PUT: %v", err)
	}
	req.Header.Set("Content-Type", contentType)
	putResp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("PUT: %v", err)
	}
	putBody, _ := io.ReadAll(putResp.Body)
	putResp.Body.Close()
	if putResp.StatusCode >= 300 {
		t.Fatalf("PUT failed: status %d, body=%s", putResp.StatusCode, string(putBody))
	}
	t.Logf("PUT ok (status %d)", putResp.StatusCode)

	// GET it back from the public URL.
	publicURL := p.PublicURL(key)
	getResp, err := http.Get(publicURL)
	if err != nil {
		t.Fatalf("public GET: %v", err)
	}
	got, _ := io.ReadAll(getResp.Body)
	getResp.Body.Close()
	if getResp.StatusCode >= 300 {
		t.Fatalf("public GET failed: status %d, body=%s (public dev URL may still be propagating)", getResp.StatusCode, string(got))
	}
	if string(got) != body {
		t.Fatalf("body mismatch: got %q want %q", string(got), body)
	}
	t.Logf("public GET ok: %s -> %q", publicURL, string(got))
}
