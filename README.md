# FreshTrack

Aplikasi Android (Expo) untuk mencatat makanan + tanggal kadaluarsa, dengan pengingat notifikasi lokal (H-3 & H-0) dan sinkronisasi lintas device melalui Supabase.

Status: repo ini baru dibuat (scaffold + dokumen). Implementasi fitur aplikasinya akan dikerjakan belakangan.

## Fitur (v1)

- Login: email OTP / magic link (Supabase Auth)
- Catat makanan: nama + tanggal kadaluarsa (opsional)
- Tandai status: dikonsumsi / terbuang
- Reminder: notifikasi lokal H-3 dan H-0 (default jam 09:00 waktu lokal)
- Sync: data tersimpan per-user (RLS)

## Struktur Repo

- `apps/mobile` - Expo app (Android)
- `supabase` - Supabase CLI project (migrations, seed, config)
- `docs` - catatan arsitektur + runbook

## Prerequisites

- Node.js + npm
- Docker (untuk Supabase local)
- Android Studio / Android SDK (untuk menjalankan di emulator/device)

## Dokumen

- `PLAN.md` - work plan lengkap untuk implementasi
- `docs/architecture.md` - arah arsitektur
- `docs/runbook.md` - catatan local dev (akan dipakai saat implementasi)

## Catatan

- Repo GitHub belum dibuat via `gh` karena `gh auth` di mesin ini tidak valid. Setelah login ulang, repo bisa dibuat dan remote bisa ditambahkan.
