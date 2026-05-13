-- name: GetUserByEmail :one
SELECT id, email, password_hash, full_name, email_verified_at, created_at, updated_at
FROM users
WHERE email = $1 AND deleted_at IS NULL;

-- name: GetUserByID :one
SELECT id, email, password_hash, full_name, email_verified_at, created_at, updated_at
FROM users
WHERE id = $1 AND deleted_at IS NULL;

-- name: CreateUser :one
INSERT INTO users (email, password_hash, full_name)
VALUES ($1, $2, $3)
RETURNING id, email, full_name, email_verified_at, created_at, updated_at;
