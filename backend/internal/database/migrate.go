package database

import (
	"context"
	"os"
	"path/filepath"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

func Migrate(ctx context.Context, db *pgxpool.Pool) error {
	var exists bool
	if err := db.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users')`).Scan(&exists); err != nil {
		return err
	}
	if exists {
		return nil
	}
	migration, err := os.ReadFile(filepath.Join("db", "migrations", "202605120001_init.sql"))
	if err != nil {
		return err
	}
	upSQL := strings.Split(string(migration), "-- +goose Down")[0]
	upSQL = strings.Replace(upSQL, "-- +goose Up", "", 1)
	_, err = db.Exec(ctx, upSQL)
	return err
}
