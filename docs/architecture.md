# Architecture

## Overview

- Client: Expo (Android)
- Backend: Go API
- Database: PostgreSQL
- Email: Mailpit locally, Resend in production
- Reminder: local notifications (expo-notifications)

## Data Model (v1)

- `users`: email/password identity, verification status
- `user_sessions`: refresh-token sessions
- `email_verification_codes`: email verification code hashes
- `password_reset_codes`: password reset code hashes
- `households`: id, name, owner_user_id
- `household_members`: household_id, user_id, role ('owner'|'member')
- `household_invites`: household_id, hashed invite codes
- `barcode_mappings`: household_id, barcode, name, brand, category, unit, source
- `inventory_batches`: id, household_id, barcode, name, brand, quantity, unit, category, storage, expiry_date
- `inventory_events`: batch_id, household_id, actor_user_id, event_type ('created'|'consumed'|'wasted'|'adjusted'|'deleted'), amount, unit
- `household_settings`: household_id, reminder_time_local, lead_days

## Security

- API authorization: membership-based. Users can only read/write data for households they belong to.
- Owner-only: invite rotation, member removal, household updates, and settings changes.
- Auth: JWT access tokens plus hashed refresh-token sessions.
- Secrets/codes: password hashes use Argon2id; verification/reset/invite codes are stored hashed.

## Notifications

- Trigger: Lead days (e.g. 7, 3, 0 days before expiry) at `reminder_time_local`.
- Local Scheduling: Devices compute triggers for active inventory. Re-schedules happen on app open and when inventory is updated.
