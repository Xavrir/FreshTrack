-- +goose Up
-- Per-household timezone so expiry reminders fire at the household's real local
-- time. Existing rows default to UTC.
ALTER TABLE household_settings ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC';

-- Expo push tokens registered per user/device.
CREATE TABLE device_push_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expo_token  text NOT NULL UNIQUE,
  platform    text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz
);
CREATE INDEX idx_device_push_tokens_user ON device_push_tokens (user_id) WHERE disabled_at IS NULL;

-- Dedupe ledger: one reminder per household/batch/lead-day/local-date.
CREATE TABLE notifications_sent (
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  batch_id     uuid NOT NULL REFERENCES inventory_batches(id) ON DELETE CASCADE,
  lead_day     int NOT NULL,
  send_date    date NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (household_id, batch_id, lead_day, send_date)
);

-- +goose Down
DROP TABLE IF EXISTS notifications_sent;
DROP TABLE IF EXISTS device_push_tokens;
ALTER TABLE household_settings DROP COLUMN IF EXISTS timezone;
