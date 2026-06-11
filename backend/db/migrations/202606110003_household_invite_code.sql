-- +goose Up
-- Store the full invite code so it can be re-displayed and shared after the
-- initial create/rotate response. Previously only a hash + 4-char suffix were
-- kept, which forced a "rotate to reveal" workaround in the app. Existing rows
-- keep a NULL code (unrecoverable from the hash); owners can rotate to get a
-- shareable code. The hash is retained for join-time lookup.
ALTER TABLE household_invites ADD COLUMN IF NOT EXISTS code text;

-- +goose Down
ALTER TABLE household_invites DROP COLUMN IF EXISTS code;
