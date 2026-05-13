# FreshTrack Backend

Go API backend for FreshTrack using PostgreSQL.

## Stack

- Go
- chi router
- pgx PostgreSQL driver
- goose migrations
- raw SQL query files for the initial scaffold; `sqlc.yaml` is included for future generated query packages
- JWT access tokens
- Refresh-token sessions
- Argon2id password hashing
- Mailpit locally, Resend in production

## Local setup

From the repository root:

```bash
docker compose up -d postgres mailpit
```

From `backend/`:

```bash
cp .env.example .env
go mod tidy
```

Install goose if needed and run migrations before starting the API:

```bash
go install github.com/pressly/goose/v3/cmd/goose@latest
set -a && source .env && set +a
goose -dir db/migrations postgres "$DATABASE_URL" up
go run ./cmd/api
```

Validate locally:

```bash
go test ./...
go build -o /tmp/freshtrack-api ./cmd/api
```

Run integration tests against a migrated local database:

```bash
FRESHTRACK_TEST_DATABASE_URL="$DATABASE_URL" go test -tags=integration ./internal/server
```

Mailpit UI: http://localhost:8025

Health check:

```bash
curl http://localhost:8080/health
```
