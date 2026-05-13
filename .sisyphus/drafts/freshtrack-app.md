

# Draft: FreshTrack

## Requirements (confirmed)
- App name: FreshTrack.
- Purpose: Help users record food inventory and remaining food with expiration dates.
- Core UX: Show reminders for food nearing expiration; allow users to mark food as consumed or wasted.
- Outcome: More organized and efficient household food management.

## Requirements (confirmed from repo docs)
- Platform target (v1): Android only.
- Client stack (v1): Expo (React Native).
- Backend (v1): Supabase (Auth + Postgres) for cross-device sync.
- Auth (v1): Email OTP / magic link (Supabase Auth).
- Reminder (v1): Local notifications H-3 and H-0.

## Repo State (observed)
- Repo currently contains docs/scaffold only; no Expo app source yet in `apps/mobile/` (only README).
- Supabase CLI project not initialized yet in `supabase/` (only README).
- A fairly detailed implementation plan already exists in `PLAN.md`.

## Technical Decisions
- Defaults proposed in `PLAN.md` (not yet implemented):
  - Notif time: 09:00 local device time.
  - Notif batching: 1 notification per day per type (H-3/H-0) to avoid spam.
  - Expiry is optional (`expiry_date` nullable).
  - Conflict strategy: last-write-wins using server `updated_at`.
  - Offline: online-first; offline write-queue OUT for v1.

## Planned Data Model (from docs)
- `food_items`: id, user_id, name, expiry_date (nullable), status (active/consumed/wasted), deleted_at (nullable), created_at, updated_at.
- Optional: `food_item_events` for consumed/wasted event log; optional `profiles` for settings.

## Research Findings
- `README.md` positions the product as: Android Expo app + Supabase sync + local notification reminders.
- `PLAN.md` includes guardrails: no barcode/OCR/photo, no shared household list, no analytics/reporting, no custom backend.
- `docs/runbook.md` mentions `npm install` and `npm run supabase:*` commands, but corresponding package scripts do not exist yet (since folders are not initialized).

## Open Questions
- User indicated `PLAN.md` likely needs changes ("mungkin perlu kita rubah").
- Confirm defaults from `PLAN.md` (notif time 09:00, batching, online-first, no per-item custom schedule).
- Requested changes vs current guardrails:
  - Add richer food item fields.
  - Make reminders more flexible.
  - Add household/shared list.
  - Add barcode/scan.
  - Prioritize UI/UX.

## Requirements (new decisions)
- v1 MUST include both: household/shared list + barcode/scan (user decision).
- Household model (v1): 1 household, 1 shared inventory.
- Membership rule (v1): each user belongs to exactly 1 household (no switching).
- Invite mechanism (v1): household join via invite code/link.
- Permissions (v1): all members can CRUD inventory and mark consumed/wasted; only owner manages invites and member removal.

## Requirements (barcode expectation)
- Scan barcode produk (mis. snack/mie instan) should auto-populate into the app (at least item identity like name/brand) rather than only saving the raw barcode.

## Requirements (barcode fallback)
- If lookup misses: allow manual entry and save barcode→product mapping so future scans auto-fill (household-scoped).

## Requirements (reminder flexibility)
- v1 reminder settings are global at household level (not per-item): reminder time + lead days list.
- v1 includes snooze behavior from notification.

## Requirements (snooze)
- Snooze duration (v1): 1 day.
- Data model: What attributes are needed per food item (name, category, quantity+unit, purchase date, expiry date, location, notes, barcode, etc.)?
- Reminder rules: How many days before expiry; per-item customization; repeat/snooze?
- Persistence: Local-only vs cloud sync; multi-device?
- Auth: Required or anonymous/local?
- Language: Indonesian-only or bilingual?

## Scope Boundaries
- INCLUDE: Inventory CRUD, expiry date tracking, reminders/notifications, consumed/wasted logging.
- EXCLUDE (proposed guardrails v1): barcode/OCR/photo, household sharing, analytics/reporting, server push notifications.
## Requirements (food item fields v1)
- Required additional field beyond name/expiry: quantity + unit.
Wilson
