# Architecture

## Overview

- Client: Expo (Android)
- Backend: Supabase (Postgres + Auth)
- Reminder: local notifications (expo-notifications)

## Data Model (planned)

- `food_items`
  - `id` (uuid)
  - `user_id` (uuid)
  - `name` (text)
  - `expiry_date` (date, nullable)
  - `status` (`active|consumed|wasted`)
  - `deleted_at` (timestamptz, nullable)
  - `created_at`, `updated_at`

## Security

- RLS: `auth.uid() = user_id` untuk semua tabel user-data

## Notifications

- Trigger: H-3 dan H-0 pada jam 09:00 waktu lokal.
- Batching: 1 notifikasi per hari per tipe (H-3/H-0).
