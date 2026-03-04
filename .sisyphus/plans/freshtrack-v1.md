# FreshTrack v1 (Android Expo + Supabase): Household Inventory, Barcode Scan, Expiry Reminders

## TL;DR

> **Quick Summary**: UI/UX-first: ship a modern industrial Android APK (Expo) with complete screens, navigation, and interactions for household inventory + barcode + reminders. Back-end integration (Supabase Auth + Postgres + RLS) is implemented after the UI flows are stable.
>
> **Milestone 1 (Frontend APK)**: Mock/Local mode end-to-end flows (no backend required).
> **Milestone 2 (Real Sync)**: Supabase integration (auth + household + inventory + RLS).
>
> **Deliverables**:
> - Supabase local project + migrations for household schema + RLS
> - Expo Android app: Auth, household create/join, barcode scan+lookup, inventory CRUD (per batch), consumed/wasted decrement, reminders+settings
> - Test + CI baseline (tests-after)
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Expo app bootstrap -> Design system + screens -> Mock data flows -> Backend schema+RLS -> Supabase integration -> Notifications

---

## Context

### Original Repo Intent (from docs)
- `README.md` describes: Android Expo app + Supabase sync + local notification reminders.
- `PLAN.md` contains an older plan that excludes barcode + household; this plan supersedes it.

### Updated v1 Requirements (confirmed)
- Platform: Android only.
- Client: Expo (React Native).
- Backend: Supabase (Auth + Postgres) for cross-device sync.
- Auth: Google OAuth via Supabase + keep email OTP as fallback.
- Household model: 1 household, 1 shared inventory; each user belongs to exactly 1 household; no household switching.
- Invite/join: invite code/link; first-login flow offers Create vs Join.
- Permissions: all members can CRUD inventory and decrement consumed/wasted; only owner can manage invites and remove members.
- Inventory granularity: per batch/lot (same product can have multiple batches with different expiry).
- Quantity: decimal number + preset units (pcs/pack/g/kg/ml/l).
- Barcode: scan should auto-populate product identity; use public API lookup + fallback manual entry and save household-scoped barcode->product mapping.
- Reminders: household-global settings (reminder time + lead days list), default lead days 7/3/0, snooze 1 day.
- Settings permissions (default): only household owner can change reminder settings (time + lead days).
- Notification recipients: all members receive reminders on their own device.
- Notification sync: best-effort; device schedules update when the app is opened/synced (no server push).
- Testing: YES (tests-after) using Jest + React Native Testing Library.

---

## Work Objectives

### Core Objective
Deliver a demo-ready, production-quality APK frontend (industrial modern UI) for the full v1 flow (auth, household, inventory, scan, consume/waste, reminders). Implement with a clean data-layer boundary so Supabase integration can be added without redesigning the UI.

### Definition of Done
- Supabase local stack starts and applies migrations cleanly.
- RLS guarantees: a user in household A cannot read/write household B data; non-owner cannot manage invites.
- Mobile app can:
  - Sign in with Google (and email OTP fallback)
  - Create/join household
  - Add inventory batch via barcode scan (auto-fill) or manual
  - Decrement quantity as consumed/wasted and hide finished batches
  - Schedule/cancel reminders and snooze for 1 day
- UI is complete and cohesive:
  - shared component kit matches industrial design direction
  - empty/error/loading states exist for all key screens
  - flows work end-to-end in a "mock/local" mode (no backend required) and can be packaged as an installable Android build (APK/dev-client)
- CI runs lint + tests for the mobile app.

### Must Have
- Frontend-first build: screens + navigation + interaction polish.
- Barcode scan -> product auto-fill (public lookup + household cache fallback).
- Expiry reminders (7/3/0) with household settings + snooze.

### Key Architectural Requirement (to enable frontend focus)
- Implement a repository/data-source interface so the app can run in:
  - Mock/Local mode (fast UI iteration, demo APK)
  - Supabase mode (real auth/sync) later

Decision (confirmed): Start with Mock/Local mode first, then wire Supabase once UI stabilizes.

### Must NOT Have (Guardrails)
- No multi-household membership per user.
- No per-item custom reminder schedules (household-global only).
- No server-side push notifications / edge functions (local notifications only).
- No OCR/photo extraction.
- No analytics/reporting dashboards.
- No offline write-queue / offline-first sync.
- No storing nutrition facts / ingredient lists / product images from product APIs (store name + brand only).
- No AI menu maker / recipe recommendation in v1 (defer to v2).

---

## Verification Strategy (tests-after)

### Test Decision
- **Infrastructure exists**: NO (repo currently scaffold/docs only).
- **User wants tests**: YES (tests-after).
- **Framework**: Jest + React Native Testing Library.

### Automated Verification (agent-executable)
- Mobile unit/integration tests cover:
  - barcode lookup client + fallback to household cache
  - quantity decrement + event creation rules
  - reminder trigger date computation (7/3/0) and snooze (+1 day)
  - notification schedule/cancel/reschedule logic (mock `expo-notifications`)
- Backend (Supabase local) verification via SQL/curl:
  - RLS policies exist and enforce household membership
  - unique constraint enforces 1 household per user

Known limitation (document explicitly): Android local notifications can be delayed by OS (Doze). Treat as expected behavior, not a v1 blocker.

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Frontend foundation):
- Task 2: Create Expo app scaffold + lint/test baseline
- Task 10: Industrial design system + component kit implementation

Wave 2 (UI flows with mock data):
- Task 11: Navigation + screen skeletons for all core screens
- Task 12: Mock/Local repositories to make flows interactive end-to-end

Wave 3 (Backend + auth integration):
- Task 1: Initialize Supabase local project and scripts
- Task 3: Design schema + RLS for household/shared inventory + barcode cache + settings
- Task 4: Auth (Google + OTP fallback) + session plumbing
- Task 5: Household onboarding (create/join) + member management (owner-only)

Wave 4 (Real data + reminders):
- Task 6: Barcode scanning + product lookup + household barcode cache
- Task 7: Inventory batches CRUD + consumed/wasted decrement + history events
- Task 8: Local notifications scheduling + cancel + reschedule on app open + snooze
- Task 9: CI + docs updates

Critical Path: 2 -> 10 -> 11 -> 12 -> 3 -> 4 -> 5 -> 7 -> 8

---

## TODOs

### 1) Supabase local project setup

**What to do**:
- Initialize Supabase CLI project in `supabase/`.
- Add repeatable commands for:
  - `supabase start`
  - `supabase db reset`
  - how to view auth emails locally (inbucket) if available.

**References**:
- `supabase/README.md` - current placeholder.
- `docs/runbook.md` - contains intended local-dev commands (needs aligning with real scripts).
- Supabase CLI docs: https://supabase.com/docs/guides/cli

**Acceptance Criteria**:
- `supabase start` succeeds with Docker running.
- `supabase db reset` succeeds on a clean checkout.

### 2) Expo app bootstrap + lint/test baseline

**What to do**:
- Create Expo app in `apps/mobile/`.
- Set up env var plumbing for Supabase:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Add `.env.example`; keep `.env` ignored.
- Set up ESLint and Jest + React Native Testing Library.

**References**:
- `apps/mobile/README.md` - target stack.
- `README.md` - repo intent.
- Expo env vars: https://docs.expo.dev/guides/environment-variables/
- RN Testing Library: https://callstack.github.io/react-native-testing-library/

**Acceptance Criteria**:
- `npm run lint` passes in `apps/mobile`.
- `npm test` passes in `apps/mobile` with at least 1 test.
- `npx expo start` launches the app (Android target).

### 10) Design system + component kit (industrial modern)

**What to do**:
- Implement the visual direction as tokens and reusable components:
  - typography pairing (Sans + Mono), spacing scale, radii, borders, color palettes (light + dark)
  - buttons, inputs, chips, list rows, cards, bottom sheets, toasts/banners
- Ensure the UI does not look like a generic template; keep it tactile and technical.

**References**:
- Stitch prompt (generated in this session) for aesthetic constraints and screen composition.

**Acceptance Criteria**:
- Component kit exists and is used across screens (no one-off styling per screen).
- Light + dark theme both render correctly.

### 11) Navigation + screen skeletons (UI-first)

**What to do**:
- Build the full navigation map and screen layouts for:
  - Auth (Google/Email), OTP, Create/Join household
  - Inventory home, scanner, add/edit batch, batch detail, consume/waste sheet
  - Household management, reminder settings (owner-only), history/events
- Include loading/empty/error states and realistic Indonesian microcopy.

**Acceptance Criteria**:
- All screens are reachable and visually complete.
- Empty/error/loading states exist for each screen.

### 12) Mock/Local mode: interactive flows without backend

**What to do**:
- Create a data access boundary (repository interfaces) and a mock/local implementation so the APK demo works without Supabase.
- Support:
  - fake auth session
  - create/join household (simulated)
  - inventory CRUD, barcode mapping cache behavior, event history
  - reminder settings UI behavior and local scheduling stubs/mocks

**Acceptance Criteria**:
- End-to-end flow works in mock mode on device/emulator:
  - user can "login", create/join household, add batch via scan/manual, decrement quantity, view history, edit settings.
- A shareable Android build exists for review (choose one based on tooling readiness):
  - `expo run:android` dev build installed on emulator/device, OR
  - EAS preview APK build (if EAS is configured for the project).

### 3) Supabase schema + RLS for household/shared inventory

**What to do**:
- Replace the old per-user-only model from `docs/architecture.md` with household-based schema.
- Create migrations for (minimum):
  - `households` (id, owner_user_id, created_at)
  - `household_members` (household_id, user_id, role='owner|member', created_at)
    - enforce one-household-per-user with a unique constraint on `user_id`
  - `household_invites` (household_id, code, created_at, revoked_at nullable)
    - decision default: persistent code until rotated/revoked (no expiry)
  - `products` (optional, light): only if you want stable product IDs
  - `barcode_mappings` (household_id, barcode, name, brand nullable, source='off|manual', updated_at)
    - household-scoped mapping, used for auto-fill
  - `inventory_batches` (household_id, barcode nullable, name, brand nullable, quantity numeric, unit text, expiry_date date nullable, created_by, created_at, updated_at, deleted_at nullable)
  - `inventory_events` (batch_id, household_id, actor_user_id, type='consumed|wasted|adjust', amount numeric, unit text, created_at)
  - `household_settings` (household_id, reminder_time_local 'HH:MM', lead_days int[], updated_at)

**RLS design**:
- Household membership-based read/write:
  - allow select/insert/update/delete if `auth.uid()` is a member of the row's `household_id`
- Owner-only for invite management and member removal.

**References**:
- `docs/architecture.md` - needs to be updated for household model.
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Auth UID in RLS: https://supabase.com/docs/guides/auth/row-level-security

**Acceptance Criteria**:
- Migrations exist in `supabase/migrations/*.sql`.
- `supabase db reset` applies schema without errors.
- DB enforces one-household-per-user:
  - Verified by constraint existence in `psql`.
- RLS is ON for household tables with correct policies.
- Agent-executable RLS test:
  - create user A in household A and user B in household B
  - user A cannot `select`/`insert` into household B rows via REST.

### 4) Auth: Google OAuth + email OTP fallback (Supabase)

**What to do**:
- Enable Google provider in Supabase Auth.
- Configure Expo deep link redirect URI.
- Implement login UI:
  - "Continue with Google"
  - "Continue with Email" (OTP)
- Persist session, refresh token handling, logout.

**References**:
- Supabase JS Auth sign-in (OTP): https://supabase.com/docs/reference/javascript/auth-signinwithotp
- Supabase Auth OAuth overview: https://supabase.com/docs/guides/auth/social-login
- Expo linking: https://docs.expo.dev/guides/linking/

**Acceptance Criteria**:
- Google sign-in works in Android dev build/emulator with configured redirect.
- Email OTP fallback can sign in.
- Session persists after app restart.

### 5) Household onboarding + member management

**What to do**:
- After login, detect membership:
  - if user has no household: show Create vs Join
- Create household:
  - create `households` row
  - create `household_members` row role=owner
  - create default `household_settings` (time default 09:00 unless changed; lead_days default 7/3/0)
- Join household:
  - enter invite code
  - insert `household_members` role=member
  - enforce DB constraint prevents joining 2nd household
- Owner-only screens/actions:
  - view invite code / rotate/revoke
  - list members
  - remove member
  - update household reminder settings (time + lead days)

**References**:
- This plan's schema in Task 3.

**Acceptance Criteria**:
- New user can create household and becomes owner.
- New user can join household via invite code.
- Member cannot join second household (DB constraint) and app shows a clear error.
- Non-owner cannot access invite/member management endpoints (403 from RLS/policies).

Default behavior (document in app/help): removing a member does not delete inventory; they simply lose access.

### 6) Barcode scan + product lookup + household cache

**What to do**:
- Add barcode scanning UI in app (camera permission + scanner screen).
- On scan:
  1) Check household `barcode_mappings` cache first (fast + offline-friendly).
  2) If miss, call public API (default: Open Food Facts) to fetch product name/brand.
  3) If API miss/error: show manual form.
  4) If user edits/overrides product identity: write/overwrite mapping in `barcode_mappings`.

Precedence rule (v1): household mapping overrides public API results for the same barcode.

**External References**:
- Open Food Facts product endpoint: https://world.openfoodfacts.org/api/v2/product/{barcode}

**Acceptance Criteria**:
- Scanning a known barcode pre-fills name/brand in Add Batch form.
- If lookup fails, user can manually enter name/brand and save; rescan auto-fills from household mapping.
- Household mapping isolation: household A mapping is not visible in household B.

### 7) Inventory batches CRUD + consumed/wasted decrement + history

**What to do**:
- Inventory list:
  - show batches sorted by soonest expiry (null expiry at bottom)
  - allow grouping by product name (optional, UI-only)
- Add/edit batch:
  - name (required)
  - brand (optional)
  - barcode (optional)
  - quantity (required)
  - unit (required preset)
  - expiry_date (optional; no reminders if null)
- Consumed/wasted actions:
  - prompt for amount (default = full remaining)
  - validate amount > 0 and <= remaining
  - enforce unit consistency (event unit must match batch unit for v1)
  - decrement batch quantity
  - insert `inventory_events`
  - when quantity reaches 0: hide from active list (soft-finish or mark deleted)

**Acceptance Criteria**:
- Member A adds batch; member B sees it after sync.
- Decrement consumed reduces quantity and creates an event row.
- When quantity reaches 0, batch no longer appears in active list.

### 8) Local notifications: schedule/cancel/reschedule + snooze

**What to do**:
- Use `expo-notifications`.
- Scheduling rules (per device):
  - read household settings (reminder time + lead days list)
  - for each batch with expiry_date: compute trigger dates for each lead day
  - batch notifications per day per lead-day (so at most N notifications/day where N = number of lead days)
- Cancel/reschedule on:
  - expiry_date changes
  - batch deleted/finished (quantity 0)
  - settings change
- Re-schedule routine must run on app open:
  - fetch active batches for household
  - rebuild scheduled notifications window (e.g., next 30 days) to recover after reinstall
- Snooze 1 day:
  - notification action triggers scheduling a new notification +24h
  - snooze state is device-local only for v1 (not synced across members/devices)

**References**:
- expo-notifications: https://docs.expo.dev/versions/latest/sdk/notifications/

**Acceptance Criteria**:
- Unit tests for trigger computation for multiple scenarios (past expiry, today, future, null expiry).
- Unit tests ensure cancel/reschedule called on edits and on quantity reaching 0.
- Agent-executable verification in app runtime (dev build):
  - `getAllScheduledNotificationsAsync()` reflects expected upcoming triggers after add/edit.
  - After consumed/wasted to 0: scheduled notifications count decreases.

### 9) CI + docs alignment

**What to do**:
- Add GitHub Actions workflow for `apps/mobile`:
  - install deps
  - lint
  - test
- Update docs to match new v1 scope:
  - `docs/architecture.md` updated to household schema + barcode + reminders
  - `docs/runbook.md` updated to real local dev commands
  - root `README.md` updated (Auth includes Google; household; barcode; reminder defaults)

**Acceptance Criteria**:
- CI runs on PR and passes.
- Docs no longer contradict v1 scope (household + barcode included).

---

## Commit Strategy (suggested)
- `chore(repo): scaffold expo app and supabase local`
- `feat(db): household schema and rls`
- `feat(auth): google oauth with otp fallback`
- `feat(household): create/join via invite code`
- `feat(barcode): scan and product autofill with cache`
- `feat(inventory): batches and quantity decrement events`
- `feat(reminders): device-local expiry notifications and snooze`
- `ci: add mobile lint and test workflow`

---

## Success Criteria

### Verification Commands
```bash
# Supabase
supabase start
supabase db reset

# Mobile
cd apps/mobile
npm run lint
npm test
npx expo start
```

### Final Checklist
- [ ] Household create/join works; one-household-per-user enforced
- [ ] RLS prevents cross-household access; owner-only management enforced
- [ ] Barcode scan auto-fills product; cache fallback works
- [ ] Inventory batches CRUD works; consumed/wasted decrements quantity and records events
- [ ] Notifications scheduled for 7/3/0 lead days; snooze 1 day works; reschedule on app open works
- [ ] CI green
