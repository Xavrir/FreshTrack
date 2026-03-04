# Architecture

## Overview

- Client: Expo (Android)
- Backend: Supabase (Postgres + Auth)
- Reminder: local notifications (expo-notifications)

## Data Model (v1)

- `households`: id, owner_user_id
- `household_members`: household_id, user_id, role ('owner'|'member')
- `household_invites`: household_id, code
- `barcode_mappings`: household_id, barcode, name, brand, source
- `inventory_batches`: id, household_id, barcode, name, brand, quantity, unit, expiry_date
- `inventory_events`: batch_id, household_id, actor_user_id, event_type ('consumed'|'wasted'|'adjust'), amount, unit
- `household_settings`: household_id, reminder_time_local, lead_days

## Security

- RLS: Membership-based. Users can only read/write data in their own `household_id`.
- Owner-only: Invite management, member removal, and settings changes.

## Notifications

- Trigger: Lead days (e.g. 7, 3, 0 days before expiry) at `reminder_time_local`.
- Local Scheduling: Devices compute triggers for active inventory. Re-schedules happen on app open and when inventory is updated.
