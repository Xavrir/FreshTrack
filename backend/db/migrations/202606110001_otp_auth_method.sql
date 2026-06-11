-- +goose Up
-- OTP-only users no longer carry a (guessable) password. Make password_hash
-- optional and record how each account authenticates. Existing rows default to
-- 'otp', which disables password login for accounts created by the old mobile
-- flow that stored a deterministic email-derived password.
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_method text NOT NULL DEFAULT 'otp';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_auth_method_check;
ALTER TABLE users ADD CONSTRAINT users_auth_method_check CHECK (auth_method IN ('otp', 'password'));

-- +goose Down
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_auth_method_check;
ALTER TABLE users DROP COLUMN IF EXISTS auth_method;
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
