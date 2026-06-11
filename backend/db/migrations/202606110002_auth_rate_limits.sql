-- +goose Up
-- Cross-instance rate-limit counters for auth endpoints (anti brute-force and
-- anti email-bombing). One row per bucket key, e.g. "verify:ip:1.2.3.4" or
-- "send:email:user@example.com".
CREATE TABLE auth_rate_limits (
  bucket_key   text PRIMARY KEY,
  count        int NOT NULL DEFAULT 0 CHECK (count >= 0),
  window_start timestamptz NOT NULL DEFAULT now(),
  last_event   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_auth_rate_limits_window_start ON auth_rate_limits (window_start);

-- +goose Down
DROP TABLE IF EXISTS auth_rate_limits;
