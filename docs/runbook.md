# Runbook (Local Dev)

## Backend (Go + PostgreSQL)

Prereq: Docker harus jalan.

```bash
docker compose up -d postgres mailpit

cd backend
cp .env.example .env
go mod tidy
```

API health check:

```bash
curl http://localhost:8080/health
curl http://localhost:8080/ready
```

Mailpit UI: http://localhost:8025

### Database migrations

Install goose if needed:

```bash
go install github.com/pressly/goose/v3/cmd/goose@latest
```

Run migrations from `backend/`:

```bash
set -a && source .env && set +a
goose -dir db/migrations postgres "$DATABASE_URL" up
```

Start and validate the API from `backend/`:

```bash
go run ./cmd/api
go test ./...
go build -o /tmp/freshtrack-api ./cmd/api
```

If running without sourcing `.env`, use the academic MVP local defaults:

```bash
APP_ENV=development \
API_PORT=8080 \
DATABASE_URL='postgres://freshtrack:freshtrack@localhost:5432/freshtrack?sslmode=disable' \
JWT_ACCESS_SECRET=dev_access_secret_change_me \
ACCESS_TOKEN_TTL=15m \
REFRESH_TOKEN_TTL=720h \
PASSWORD_PEPPER=dev_password_pepper_change_me \
MAIL_PROVIDER=mailpit \
MAIL_FROM='FreshTrack <noreply@freshtrack.local>' \
SMTP_HOST=localhost \
SMTP_PORT=1025 \
PUBLIC_API_URL=http://localhost:8080 \
CORS_ALLOWED_ORIGINS='*' \
go run ./cmd/api
```

Run backend integration tests against the migrated local database:

```bash
FRESHTRACK_TEST_DATABASE_URL="$DATABASE_URL" go test -tags=integration ./internal/server
```

## Runtime Note

The active academic MVP runtime is Go + PostgreSQL with Mailpit for local email OTP.

## Production Email (Resend)

For real OTP delivery in production (e.g. Railway), switch the mailer from Mailpit
to Resend:

1. In the Resend dashboard, add and verify your sending **domain** (DNS records).
2. Set `MAIL_FROM` to a verified address on that domain, e.g.
   `FreshTrack <noreply@yourdomain.com>`.
3. Set the following environment variables (store the API key as a **secret**, never
   in the repo):
   - `MAIL_PROVIDER=resend`
   - `RESEND_API_KEY=<secret>`
   - `MAIL_FROM=FreshTrack <noreply@yourdomain.com>`
4. The backend validates that `RESEND_API_KEY` is present when `MAIL_PROVIDER=resend`
   and will refuse to start otherwise. OTP emails are sent with both a plain-text and
   a branded HTML body. Send failures are logged (without leaking to the API caller).

### Key rotation

If a `RESEND_API_KEY` is ever exposed (e.g. pasted into a chat), rotate it:
revoke the old key in the Resend dashboard, issue a new one, and update the
secret in your host (Railway). Confirm a test OTP still delivers afterward.

## Mobile (Expo)

```bash
cd apps/mobile
npm install
cp .env.example .env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080 npx expo run:android
npx tsc --noEmit
npm run lint       # Menjalankan ESLint
npm test -- --runInBand
```

Use `http://10.0.2.2:8080` for Android emulator API access. Use `http://localhost:8025` on the host to open Mailpit and read OTP messages.

## Academic MVP Demo Path

1. Sign up or log in and read OTP from Mailpit.
2. Create household and keep the returned full invite code visible.
3. Add item with required expiry date and verify it appears in expiry order.
4. Open detail, edit fields, then verify list/detail updates.
5. Delete an item and verify it disappears from inventory.
6. Add another item, mark consumed or wasted, and verify the activity history event.
7. Check expiry labels with test dates for `EXPIRED`, `H-1`, `H-3`, `H-7`, and `FRESH`.

## Barcode Scanning (Device Validation)

The scanner uses `expo-camera` `CameraView` with live barcode detection, which
requires a native build — **Expo Go does not fully exercise barcode scanning**.
To validate on a physical device:

1. Build a development/preview client, e.g. `npx expo run:android` (local native
   build) or an EAS build (`eas build --profile preview --platform android`).
2. Launch with `EXPO_PUBLIC_API_URL` pointed at the backend so the app runs in
   real (non-mock) mode. In real mode the demo `FALLBACK_CANDIDATES` are hidden
   and only live scan results are shown.
3. Scan real EAN/UPC barcodes and confirm `POST /v1/products/detect` autofills the
   Add Batch form (household `barcode_mappings` hit → high confidence; otherwise
   OpenFoodFacts lookup).

## Photo Storage (Cloudflare R2)

Inventory photos upload directly to object storage via a presigned PUT. The
backend signs the request; the app uploads the bytes to R2 and stores the public
URL in `image_url`. Until storage is configured the upload endpoint returns
`501 storage_not_configured` and the app keeps client-side images.

To enable (Cloudflare R2):

1. Create an R2 bucket and an API token with object read/write.
2. Make the bucket public (or attach a custom domain) for read access.
3. Set the backend environment variables:
   - `STORAGE_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com`
   - `STORAGE_BUCKET=<bucket>`
   - `STORAGE_REGION=auto`
   - `STORAGE_ACCESS_KEY=<access key id>` (secret)
   - `STORAGE_SECRET_KEY=<secret access key>` (secret)
   - `STORAGE_PUBLIC_BASE_URL=https://<public-bucket-or-cdn-domain>`
4. The mobile app calls `POST /v1/uploads/sign` and PUTs the photo to the
   returned `uploadUrl`. An S3 bucket works the same way (set `STORAGE_REGION`
   to the AWS region).

## Push Notifications (Expiry Reminders)

The backend runs a scheduler (every 15 minutes, guarded by a Postgres advisory
lock so only one instance fires) that sends Expo push notifications for items
expiring on a household's configured `leadDays`, at the household's local
`reminderTimeLocal` in its `timezone`. A `notifications_sent` ledger dedupes so
each item fires once per lead-day per local day.

- The app registers an Expo push token via `POST /v1/me/push-token` after sign-in
  (`expo-notifications`). Requires a native/dev build and a physical device — push
  tokens are not issued in Expo Go or simulators.
- Set each household's timezone (IANA name, e.g. `Asia/Jakarta`) in Household
  Settings so reminders fire at the right local time.
- To test: register a device token, add an item expiring at a `leadDays` offset,
  set `reminderTimeLocal` to the current local minute, and wait for the next tick
  (or restart the API to run a tick sooner).

## Deferred Beta Work

- Real AI image recognition (current detection is barcode + OpenFoodFacts).
- Railway hosting and production smoke testing.
