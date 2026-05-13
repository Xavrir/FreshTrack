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

Run backend integration tests against the migrated local database:

```bash
FRESHTRACK_TEST_DATABASE_URL="$DATABASE_URL" go test -tags=integration ./internal/server
```

## Supabase Legacy

Supabase files still exist during migration, but the target backend is Go + PostgreSQL.

## Mobile (Expo)

```bash
cd apps/mobile
npm install
cp .env.example .env
npx expo start
npm run lint       # Menjalankan ESLint
npm test           # Menjalankan Jest tests
```
