# FreshTrack

Aplikasi Android (Expo) untuk mencatat inventori rumah tangga + tanggal kadaluarsa, barcode scanner, pengingat notifikasi lokal, dan sinkronisasi lintas device melalui backend Go + PostgreSQL.

## Fitur (v1)

- Login: email/password dengan verifikasi email
- Household: Shared inventory per rumah tangga (1 user = 1 household)
- Catat barang: Barcode scanner + auto-fill nama barang, kuantitas per batch
- Tandai status: Rekam jumlah dikonsumsi / terbuang
- Reminder: Notifikasi lokal H-7, H-3, dan H-0 (bisa dikonfigurasi per household)
- Sync: Data tersimpan per-household melalui API backend Go

## Struktur Repo

- `apps/mobile` - Expo app (Android)
- `backend` - Go API backend + PostgreSQL migrations
- `supabase` - Legacy Supabase implementation retained during migration
- `docs` - catatan arsitektur + runbook

## Prerequisites

- Node.js + npm
- Docker (untuk PostgreSQL/Mailpit local)
- Android Studio / Android SDK (untuk menjalankan di emulator/device)

## Dokumen

- `PLAN.md` - work plan lengkap
- `.sisyphus/plans/freshtrack-v1.md` - Sisyphus execution plan
- `docs/architecture.md` - arah arsitektur
- `docs/runbook.md` - catatan local dev

## Catatan

- Backend migration target: Go, PostgreSQL, chi, pgx, sqlc, goose, JWT sessions, Mailpit/Resend email.
