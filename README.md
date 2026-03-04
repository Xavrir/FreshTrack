# FreshTrack

Aplikasi Android (Expo) untuk mencatat inventori rumah tangga + tanggal kadaluarsa, barcode scanner, pengingat notifikasi lokal, dan sinkronisasi lintas device melalui Supabase.

## Fitur (v1)

- Login: Google OAuth & email OTP (Supabase Auth)
- Household: Shared inventory per rumah tangga (1 user = 1 household)
- Catat barang: Barcode scanner + auto-fill nama barang, kuantitas per batch
- Tandai status: Rekam jumlah dikonsumsi / terbuang
- Reminder: Notifikasi lokal H-7, H-3, dan H-0 (bisa dikonfigurasi per household)
- Sync: Data tersimpan per-household dengan proteksi RLS Supabase

## Struktur Repo

- `apps/mobile` - Expo app (Android)
- `supabase` - Supabase CLI project (migrations, schema)
- `docs` - catatan arsitektur + runbook

## Prerequisites

- Node.js + npm
- Docker (untuk Supabase local)
- Android Studio / Android SDK (untuk menjalankan di emulator/device)

## Dokumen

- `PLAN.md` - work plan lengkap
- `.sisyphus/plans/freshtrack-v1.md` - Sisyphus execution plan
- `docs/architecture.md` - arah arsitektur
- `docs/runbook.md` - catatan local dev

## Catatan

- Frontend dibangun dengan pendekatan UI/UX industrial modern.
