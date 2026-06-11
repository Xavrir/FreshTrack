package storage

import (
	"net/url"
	"strings"
	"testing"
	"time"
)

func testPresigner() Presigner {
	return Presigner{
		Endpoint:      "https://acct123.r2.cloudflarestorage.com",
		Bucket:        "freshtrack",
		Region:        "auto",
		AccessKey:     "AKIAEXAMPLE",
		SecretKey:     "secretExampleKey",
		PublicBaseURL: "https://cdn.example.com",
	}
}

func TestPresignPutWellFormed(t *testing.T) {
	p := testPresigner()
	now := time.Date(2026, 6, 11, 12, 0, 0, 0, time.UTC)
	raw, err := p.PresignPut("households/abc/photo.jpg", "image/jpeg", now, 10*time.Minute)
	if err != nil {
		t.Fatalf("presign: %v", err)
	}
	u, err := url.Parse(raw)
	if err != nil {
		t.Fatalf("parse url: %v", err)
	}
	if u.Host != "acct123.r2.cloudflarestorage.com" {
		t.Fatalf("unexpected host %q", u.Host)
	}
	if u.Path != "/freshtrack/households/abc/photo.jpg" {
		t.Fatalf("unexpected path %q", u.Path)
	}
	q := u.Query()
	for _, key := range []string{"X-Amz-Algorithm", "X-Amz-Credential", "X-Amz-Date", "X-Amz-Expires", "X-Amz-SignedHeaders", "X-Amz-Signature"} {
		if q.Get(key) == "" {
			t.Fatalf("missing query param %s", key)
		}
	}
	if q.Get("X-Amz-Algorithm") != "AWS4-HMAC-SHA256" {
		t.Fatalf("unexpected algorithm %q", q.Get("X-Amz-Algorithm"))
	}
	if got := q.Get("X-Amz-Expires"); got != "600" {
		t.Fatalf("expected expires 600, got %q", got)
	}
	if sig := q.Get("X-Amz-Signature"); len(sig) != 64 {
		t.Fatalf("expected 64-char hex signature, got %d chars", len(sig))
	}
	if !strings.HasPrefix(q.Get("X-Amz-Credential"), "AKIAEXAMPLE/20260611/auto/s3/aws4_request") {
		t.Fatalf("unexpected credential scope %q", q.Get("X-Amz-Credential"))
	}
}

func TestPresignPutDeterministic(t *testing.T) {
	p := testPresigner()
	now := time.Date(2026, 6, 11, 12, 0, 0, 0, time.UTC)
	a, _ := p.PresignPut("k/v.jpg", "image/jpeg", now, time.Minute)
	b, _ := p.PresignPut("k/v.jpg", "image/jpeg", now, time.Minute)
	if a != b {
		t.Fatal("expected identical signatures for identical inputs")
	}
	// A different key must change the signature.
	c, _ := p.PresignPut("k/other.jpg", "image/jpeg", now, time.Minute)
	if a == c {
		t.Fatal("expected different signature for different key")
	}
}

func TestPublicURL(t *testing.T) {
	p := testPresigner()
	if got := p.PublicURL("households/abc/photo.jpg"); got != "https://cdn.example.com/households/abc/photo.jpg" {
		t.Fatalf("unexpected public url %q", got)
	}
}
