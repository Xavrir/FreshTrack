# FreshTrack

Aplikasi Android (Expo) untuk mencatat inventori rumah tangga + tanggal kadaluarsa, barcode scanner, dan sinkronisasi lintas device. Mobile app memakai UI redesign dark/monospace dan backend Supabase (Postgres + Row Level Security) dengan autentikasi email OTP.

## Fitur (v1)

- Login: email OTP (one-time code, tanpa password)
- Household: Shared inventory per rumah tangga (1 user = 1 household) + kode undangan
- Catat barang: Barcode scanner + auto-fill nama barang, kuantitas per batch
- Tandai status: Rekam jumlah dikonsumsi / terbuang + riwayat aksi (history)
- Sync: Data tersimpan per-household di Supabase (Postgres + RLS)

## UI

- Tema dark/monospace: latar gelap dengan aksen emas, font Barlow + JetBrains Mono.
- `userInterfaceStyle` di-set ke `dark`; design tokens di `apps/mobile/src/theme/tokens.ts`.

## Struktur Repo

- `apps/mobile` - Expo app (Android): UI redesign + data layer Supabase
- `supabase` - Supabase backend (migrations, schema, RLS) — backend aktif untuk mobile
- `backend` - Go API backend + PostgreSQL migrations (jalur migrasi alternatif)
- `docs` - catatan arsitektur + runbook

## Prerequisites

- Node.js + npm
- Supabase CLI + Docker (untuk Supabase local: Postgres, Auth, Mailpit)
- Android Studio / Android SDK (untuk menjalankan di emulator/device)

## Menjalankan (local)

1. `supabase start` — jalankan stack Supabase local (API default di `http://127.0.0.1:54321`).
2. `cd apps/mobile && npm install`
3. Build/jalankan di emulator Android. Dari dalam emulator, Supabase local diakses lewat `http://10.0.2.2:54321` (cleartext HTTP diaktifkan via plugin `expo-build-properties`).
4. Login dengan email apa pun, lalu ambil kode OTP dari Mailpit (`http://127.0.0.1:54324`).

## Konfigurasi

- `EXPO_PUBLIC_SUPABASE_URL` — default `http://10.0.2.2:54321` (override untuk device fisik / Supabase cloud).
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — anon/publishable key.
- Default tersetel di `apps/mobile/src/lib/supabase.ts`.

## Dokumen

- `docs/architecture.md` - arah arsitektur
- `docs/runbook.md` - catatan local dev
