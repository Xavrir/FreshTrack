-- name: ListInventoryBatches :many
SELECT *
FROM inventory_batches
WHERE household_id = $1 AND deleted_at IS NULL
ORDER BY expiry_date ASC NULLS LAST, updated_at DESC;

-- name: GetInventoryBatch :one
SELECT *
FROM inventory_batches
WHERE id = $1 AND household_id = $2 AND deleted_at IS NULL;

-- name: ListInventoryEvents :many
SELECT *
FROM inventory_events
WHERE household_id = $1
ORDER BY created_at DESC;
