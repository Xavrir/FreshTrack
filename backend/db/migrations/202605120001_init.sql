-- +goose Up
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text,
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash text NOT NULL UNIQUE,
  user_agent text,
  ip_address inet,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE TABLE email_verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  attempts int NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE password_reset_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  attempts int NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE households (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_user_id uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE household_members (
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (household_id, user_id)
);

CREATE TABLE household_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  code_hash text NOT NULL UNIQUE,
  code_suffix text NOT NULL,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE household_settings (
  household_id uuid PRIMARY KEY REFERENCES households(id) ON DELETE CASCADE,
  reminder_time_local text NOT NULL DEFAULT '09:00',
  lead_days int[] NOT NULL DEFAULT ARRAY[7, 3, 0],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE inventory_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  barcode text,
  name text NOT NULL,
  brand text,
  quantity numeric(12, 3) NOT NULL CHECK (quantity >= 0),
  unit text NOT NULL,
  category text,
  storage text,
  storage_detail text,
  expiry_date date,
  image_url text,
  notes text,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE inventory_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES inventory_batches(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL REFERENCES users(id),
  event_type text NOT NULL CHECK (event_type IN ('created', 'consumed', 'wasted', 'adjusted', 'deleted')),
  amount numeric(12, 3),
  unit text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE barcode_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid REFERENCES households(id) ON DELETE CASCADE,
  barcode text NOT NULL,
  name text NOT NULL,
  brand text,
  category text,
  unit text,
  source text NOT NULL CHECK (source IN ('openfoodfacts', 'manual', 'ai')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (household_id, barcode)
);

CREATE INDEX users_email_idx ON users(email);
CREATE INDEX user_sessions_user_id_idx ON user_sessions(user_id);
CREATE INDEX user_sessions_refresh_token_hash_idx ON user_sessions(refresh_token_hash);
CREATE INDEX user_sessions_expires_at_idx ON user_sessions(expires_at);
CREATE INDEX household_members_user_id_idx ON household_members(user_id);
CREATE INDEX household_members_household_id_idx ON household_members(household_id);
CREATE INDEX household_invites_household_id_idx ON household_invites(household_id);
CREATE INDEX household_invites_code_hash_idx ON household_invites(code_hash);
CREATE INDEX inventory_batches_household_deleted_idx ON inventory_batches(household_id, deleted_at);
CREATE INDEX inventory_batches_household_expiry_idx ON inventory_batches(household_id, expiry_date);
CREATE INDEX inventory_batches_household_updated_idx ON inventory_batches(household_id, updated_at DESC);
CREATE INDEX inventory_batches_barcode_idx ON inventory_batches(barcode);
CREATE INDEX inventory_events_household_created_idx ON inventory_events(household_id, created_at DESC);
CREATE INDEX inventory_events_batch_created_idx ON inventory_events(batch_id, created_at DESC);
CREATE INDEX barcode_mappings_household_barcode_idx ON barcode_mappings(household_id, barcode);

-- +goose Down
DROP TABLE IF EXISTS barcode_mappings;
DROP TABLE IF EXISTS inventory_events;
DROP TABLE IF EXISTS inventory_batches;
DROP TABLE IF EXISTS household_settings;
DROP TABLE IF EXISTS household_invites;
DROP TABLE IF EXISTS household_members;
DROP TABLE IF EXISTS households;
DROP TABLE IF EXISTS password_reset_codes;
DROP TABLE IF EXISTS email_verification_codes;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS users;
DROP EXTENSION IF EXISTS pgcrypto;
DROP EXTENSION IF EXISTS citext;
