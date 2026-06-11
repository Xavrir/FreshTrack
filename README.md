# FreshTrack

Aplikasi Android (Expo) untuk mencatat inventori makanan rumah tangga, tanggal kedaluwarsa, jumlah stok, tindakan dikonsumsi/terbuang, dan riwayat aktivitas melalui backend Go + PostgreSQL.

Target saat ini adalah academic MVP/demo Sprint 1-3, bukan public beta. FreshTrack memakai backend Go + PostgreSQL sebagai satu-satunya runtime aktif.

## Fitur Academic MVP

- Auth demo: email/password + OTP via Mailpit lokal
- Household: shared inventory per rumah tangga
- Catat barang: tambah, edit, hapus item dengan nama, jumlah, unit, dan expiry wajib
- Inventory: daftar stok urut expiry ascending
- Tindakan: rekam jumlah dikonsumsi / terbuang dengan validasi jumlah
- History: event `added`, `adjusted`, `consumed`, `wasted`, dan `deleted`
- Reminder MVP: label in-app `EXPIRED`, `H-1`, `H-3`, `H-7`, atau `FRESH`

## Struktur Repo

- `apps/mobile` - Expo app (Android)
- `backend` - Go API backend + PostgreSQL migrations
- `docs` - catatan arsitektur + runbook

## Prerequisites

- Node.js + npm
- Docker (untuk PostgreSQL/Mailpit local)
- Android Studio / Android SDK (untuk menjalankan di emulator/device)

## Dokumen

- `docs/architecture.md` - arah arsitektur
- `docs/runbook.md` - catatan local dev
- `docs/archive/PLAN-legacy.md` - rencana awal (pra-pivot, arsip historis)

## Demo Lokal

```bash
docker compose up -d postgres mailpit
cd backend
cp .env.example .env
set -a && source .env && set +a
go run ./cmd/api
```

Di terminal lain:

```bash
cd apps/mobile
cp .env.example .env
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080 npx expo run:android
```

Mailpit UI untuk mengambil OTP: http://localhost:8025

## Post-MVP / Beta

- Photo upload/storage masih deferred; foto saat ini lokal/client-only.
- Barcode lookup tersedia, tetapi scanning kamera fisik masih perlu verifikasi real-device.
- OS push notifications via `expo-notifications` deferred; MVP hanya in-app labels/rules.
- Production email, verified Resend sender, auth hardening/rate limit, hosting Railway, dan production testing adalah scope beta.
