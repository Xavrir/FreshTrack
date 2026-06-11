// Package storage produces presigned PUT URLs for an S3-compatible object store
// (Cloudflare R2 by default). It implements AWS Signature Version 4 query-string
// presigning directly so the service avoids the large AWS SDK dependency.
package storage

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/url"
	"strings"
	"time"
)

// Presigner signs upload URLs for a single bucket on an S3-compatible endpoint.
type Presigner struct {
	Endpoint      string // e.g. https://<account>.r2.cloudflarestorage.com (no trailing slash)
	Bucket        string
	Region        string // "auto" for R2
	AccessKey     string
	SecretKey     string
	PublicBaseURL string // public base for GET, e.g. https://cdn.example.com (no trailing slash)
}

// PublicURL returns the publicly readable URL for an uploaded object key.
func (p Presigner) PublicURL(key string) string {
	return strings.TrimRight(p.PublicBaseURL, "/") + "/" + strings.TrimLeft(key, "/")
}

// PresignPut returns a presigned URL the client can PUT the object to. The
// request must be sent with the same Content-Type used here; the payload is
// signed as UNSIGNED-PAYLOAD so the body need not be hashed in advance.
func (p Presigner) PresignPut(key, contentType string, now time.Time, expiry time.Duration) (string, error) {
	if key == "" {
		return "", fmt.Errorf("empty object key")
	}
	region := p.Region
	if region == "" {
		region = "auto"
	}
	host, err := hostFromEndpoint(p.Endpoint)
	if err != nil {
		return "", err
	}

	amzDate := now.UTC().Format("20060102T150405Z")
	dateStamp := now.UTC().Format("20060102")
	scope := strings.Join([]string{dateStamp, region, "s3", "aws4_request"}, "/")

	// Path-style addressing: /<bucket>/<key>. Slashes within the key are kept.
	canonicalURI := "/" + p.Bucket + "/" + encodePath(key)

	// host is the only signed header; Content-Type is enforced by the caller.
	signedHeaders := "host"

	query := url.Values{}
	query.Set("X-Amz-Algorithm", "AWS4-HMAC-SHA256")
	query.Set("X-Amz-Credential", p.AccessKey+"/"+scope)
	query.Set("X-Amz-Date", amzDate)
	query.Set("X-Amz-Expires", fmt.Sprintf("%d", int(expiry.Seconds())))
	query.Set("X-Amz-SignedHeaders", signedHeaders)
	canonicalQuery := encodeQuery(query)

	canonicalHeaders := "host:" + host + "\n"
	canonicalRequest := strings.Join([]string{
		"PUT",
		canonicalURI,
		canonicalQuery,
		canonicalHeaders,
		signedHeaders,
		"UNSIGNED-PAYLOAD",
	}, "\n")

	stringToSign := strings.Join([]string{
		"AWS4-HMAC-SHA256",
		amzDate,
		scope,
		hashHex(canonicalRequest),
	}, "\n")

	signature := hex.EncodeToString(sign(signingKey(p.SecretKey, dateStamp, region, "s3"), stringToSign))

	return p.Endpoint + canonicalURI + "?" + canonicalQuery + "&X-Amz-Signature=" + signature, nil
}

func hostFromEndpoint(endpoint string) (string, error) {
	u, err := url.Parse(endpoint)
	if err != nil || u.Host == "" {
		return "", fmt.Errorf("invalid storage endpoint %q", endpoint)
	}
	return u.Host, nil
}

// encodePath URI-encodes each path segment per RFC 3986 while preserving the
// slashes that separate key segments.
func encodePath(key string) string {
	segments := strings.Split(key, "/")
	for i, seg := range segments {
		segments[i] = encodeSegment(seg)
	}
	return strings.Join(segments, "/")
}

// encodeQuery renders query parameters in AWS canonical form: sorted by key with
// RFC 3986 percent-encoding (space as %20, not +).
func encodeQuery(values url.Values) string {
	// url.Values.Encode sorts by key and uses + for spaces; AWS needs %20 and
	// stricter escaping, so build it manually.
	keys := make([]string, 0, len(values))
	for k := range values {
		keys = append(keys, k)
	}
	// Single value per key in our usage; sort keys.
	for i := 0; i < len(keys); i++ {
		for j := i + 1; j < len(keys); j++ {
			if keys[j] < keys[i] {
				keys[i], keys[j] = keys[j], keys[i]
			}
		}
	}
	parts := make([]string, 0, len(keys))
	for _, k := range keys {
		parts = append(parts, encodeSegment(k)+"="+encodeSegment(values.Get(k)))
	}
	return strings.Join(parts, "&")
}

// encodeSegment percent-encodes per AWS SigV4 rules (unreserved chars unescaped).
func encodeSegment(s string) string {
	const upperhex = "0123456789ABCDEF"
	var b strings.Builder
	for i := 0; i < len(s); i++ {
		c := s[i]
		if (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') ||
			c == '-' || c == '_' || c == '.' || c == '~' {
			b.WriteByte(c)
			continue
		}
		b.WriteByte('%')
		b.WriteByte(upperhex[c>>4])
		b.WriteByte(upperhex[c&0x0f])
	}
	return b.String()
}

func hashHex(s string) string {
	sum := sha256.Sum256([]byte(s))
	return hex.EncodeToString(sum[:])
}

func sign(key []byte, msg string) []byte {
	h := hmac.New(sha256.New, key)
	h.Write([]byte(msg))
	return h.Sum(nil)
}

func signingKey(secret, dateStamp, region, service string) []byte {
	kDate := sign([]byte("AWS4"+secret), dateStamp)
	kRegion := sign(kDate, region)
	kService := sign(kRegion, service)
	return sign(kService, "aws4_request")
}
