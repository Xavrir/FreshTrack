package database

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

// migrationsDir is the on-disk location of ordered goose-style SQL migrations,
// relative to the process working directory (backend/).
const migrationsDir = "db/migrations"

// baselineMigration is the original init migration. Databases bootstrapped by the
// previous (untracked) runner already have this schema applied without a recorded
// version, so it is backfilled rather than re-run.
const baselineMigration = "202605120001_init.sql"

// Migrate applies any migration files in db/migrations that have not yet been
// recorded in the schema_migrations table, in lexical filename order. It is safe
// to run on every boot and on both fresh and previously-bootstrapped databases.
func Migrate(ctx context.Context, db *pgxpool.Pool) error {
	if _, err := db.Exec(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (
		version text PRIMARY KEY,
		applied_at timestamptz NOT NULL DEFAULT now()
	)`); err != nil {
		return fmt.Errorf("create schema_migrations: %w", err)
	}

	if err := backfillBaseline(ctx, db); err != nil {
		return err
	}

	applied, err := appliedVersions(ctx, db)
	if err != nil {
		return err
	}

	files, err := migrationFiles()
	if err != nil {
		return err
	}

	for _, file := range files {
		if applied[file] {
			continue
		}
		if err := applyMigration(ctx, db, file); err != nil {
			return fmt.Errorf("apply migration %s: %w", file, err)
		}
	}
	return nil
}

// backfillBaseline records the baseline migration as already-applied when the
// database was created by the old bootstrap runner (users table exists) but the
// migration was never tracked. This prevents re-running the init schema.
func backfillBaseline(ctx context.Context, db *pgxpool.Pool) error {
	var tracked bool
	if err := db.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version = $1)`, baselineMigration).Scan(&tracked); err != nil {
		return fmt.Errorf("check baseline: %w", err)
	}
	if tracked {
		return nil
	}

	var usersExists bool
	if err := db.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')`).Scan(&usersExists); err != nil {
		return fmt.Errorf("check users table: %w", err)
	}
	if !usersExists {
		return nil
	}
	if _, err := db.Exec(ctx, `INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING`, baselineMigration); err != nil {
		return fmt.Errorf("backfill baseline: %w", err)
	}
	return nil
}

func appliedVersions(ctx context.Context, db *pgxpool.Pool) (map[string]bool, error) {
	rows, err := db.Query(ctx, `SELECT version FROM schema_migrations`)
	if err != nil {
		return nil, fmt.Errorf("load applied versions: %w", err)
	}
	defer rows.Close()

	applied := make(map[string]bool)
	for rows.Next() {
		var version string
		if err := rows.Scan(&version); err != nil {
			return nil, err
		}
		applied[version] = true
	}
	return applied, rows.Err()
}

func migrationFiles() ([]string, error) {
	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		return nil, fmt.Errorf("read migrations dir: %w", err)
	}
	var files []string
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}
		files = append(files, entry.Name())
	}
	sort.Strings(files)
	return files, nil
}

// applyMigration runs the Up portion of a goose-style migration inside a
// transaction and records its version atomically.
func applyMigration(ctx context.Context, db *pgxpool.Pool, file string) error {
	raw, err := os.ReadFile(filepath.Join(migrationsDir, file))
	if err != nil {
		return err
	}
	upSQL := strings.Split(string(raw), "-- +goose Down")[0]
	upSQL = strings.Replace(upSQL, "-- +goose Up", "", 1)
	upSQL = strings.TrimSpace(upSQL)

	tx, err := db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if upSQL != "" {
		if _, err := tx.Exec(ctx, upSQL); err != nil {
			return err
		}
	}
	if _, err := tx.Exec(ctx, `INSERT INTO schema_migrations (version) VALUES ($1)`, file); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
