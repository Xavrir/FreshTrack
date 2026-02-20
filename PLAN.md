# Sistem Pencatatan Kadaluarsa Makanan (Android Expo + Supabase)

## TL;DR

> **Quick Summary**: Bangun repo GitHub + aplikasi Android (Expo) yang bisa login (email OTP), sinkron data via Supabase, mencatat makanan & tanggal kadaluarsa, serta mengirim pengingat notifikasi lokal pada H-3 dan H-0.
>
> **Deliverables**:
> - Repo GitHub baru dengan struktur monorepo ringan (`apps/mobile` + `supabase` + `docs` + CI)
> - Supabase project lokal + migrasi SQL (schema + RLS) untuk data per-user
> - Expo Android app: Auth OTP, CRUD item, status (consumed/wasted), scheduling & cancel notif
> - Automated checks: lint/typecheck/tests (tests-after)
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Repo scaffold -> Supabase schema+RLS -> Auth in app -> CRUD -> Notifications

---

## Context

### Original Request
- Aplikasi untuk mencatat persediaan/sisa makanan + tanggal kadaluarsa
- Ada pengingat untuk yang mendekati kadaluarsa
- Bisa menandai makanan sudah dikonsumsi / terbuang
- Sync lintas device; akun pribadi

### Interview Summary (decisions)
- Platform: Android saja
- App stack: React Native (Expo)
- Backend: Supabase
- Auth: Email Magic Link / OTP (Supabase Auth)
- Reminder: notifikasi lokal H-3 dan H-0
- Testing: YES (tests-after) via Jest + React Native Testing Library (RTL)

### Metis Review (guardrails + defaults)
**Guardrails (v1)**:
- Tidak ada barcode scan/OCR/foto
- Tidak ada household/shared list
- Tidak ada analytics/reporting
- Tidak ada custom backend (Supabase only)

**Defaults Applied (override kalau perlu)**:
- Waktu notifikasi: 09:00 waktu lokal device
- Notifikasi dibatch per hari (1 notif untuk beberapa item) untuk menghindari spam
- Item boleh tanpa tanggal kadaluarsa (`expiry_date` nullable)
- Konflik edit antar device: last-write-wins berbasis `updated_at` server
- Offline write-queue: OUT untuk v1 (online-first). Offline read: best-effort cache.

---

## Work Objectives

### Core Objective
Menyediakan sistem pencatatan makanan berbasis akun (login OTP) yang tersinkron lintas device, dengan pengingat kadaluarsa (H-3/H-0) dan alur "habis/dibuang".

### Concrete Deliverables
- Struktur repo (baru) + dokumentasi runbook (local dev)
- `supabase/migrations/*` untuk schema + RLS
- Expo app (Android):
  - Login OTP
  - List item (sort by expiry)
  - Add/Edit/Delete item
  - Mark consumed/wasted
  - Schedule/cancel local notifications
- CI GitHub Actions: lint, typecheck, unit/integration tests (Jest)

### Definition of Done
- `npm run lint` dan `npm test` berjalan di CI (untuk app)
- Supabase local: `supabase start` + `supabase db reset` sukses
- RLS terbukti: user A tidak bisa baca/tulis data user B via REST
- Di device Android, notifikasi H-3/H-0 muncul untuk item yang kadaluarsa sesuai skenario uji

### Must Have
- Data per user (isolated via RLS)
- Sinkronisasi list item lintas device (online)
- Reminder lokal H-3 dan H-0

### Must NOT Have (guardrails)
- Barcode/OCR/foto, household sharing, analytics
- Push notifications server-side (v1 hanya local)
- Custom schedule per item (v1 hanya global 09:00)

---

## Verification Strategy (tests-after)

### Test Decision
- **Infrastructure exists**: NO (repo baru)
- **User wants tests**: YES (tests-after)
- **Framework**: Jest + React Native Testing Library

### Automated Verification (agent-executable)
- Mobile unit/integration:
  - `npm test` (Jest) untuk:
    - mapper/date logic (H-3/H-0 computation)
    - notification scheduling/cancel logic (mock expo-notifications)
    - data access layer wrapper (mock supabase client)
- Backend verification (Supabase local) via curl:
  - Insert/read blocked by RLS for non-owner tokens

Note: Notifikasi "benar-benar muncul" biasanya butuh real device; eksekusi harus menyertakan langkah device test + bukti (screenshot/recording) sebagai evidence.

---

## Repo Architecture (recommended)

### Monorepo layout
```
.
├── apps/
│   └── mobile/                # Expo app (Android)
├── supabase/                  # Supabase CLI project (migrations, seed, config)
├── docs/                      # Product + architecture notes
├── .github/workflows/         # CI
├── README.md
└── LICENSE
```

### Tooling defaults (v1)
- Package manager: `npm` (simple, no workspace tooling required untuk 1 app)
- Date handling: `date-fns`
- State/data fetching: tetap sederhana (React hooks + minimal abstraction). Hindari Redux.

### Naming
- Default repo name: `sistem-kadaluarsa-makanan` (boleh ganti)
- Bahasa UI: Indonesia (default)

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (Start Immediately):
- Task 1: Create GitHub repo + base scaffolding
- Task 2: Create Supabase project (local dev) + baseline config

Wave 2 (After Wave 1):
- Task 3: Supabase schema + RLS + seed
- Task 4: Expo app setup + lint/test infra + env plumbing

Wave 3 (After Wave 2):
- Task 5: Auth (OTP)
- Task 6: Food items CRUD + list UI
- Task 7: Status transitions + history
- Task 8: Notifications schedule/cancel + batching
- Task 9: CI + docs polish

Critical Path: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 8

---

## TODOs

Catatan: Repo masih belum ada. Banyak "References" akan berupa file yang akan dibuat + external docs.

### 1) Create GitHub repo + baseline scaffolding

What to do:
- Buat repo baru (via `gh repo create` atau manual) dan inisialisasi struktur folder monorepo.
- Tambahkan `README.md`, `LICENSE`, `docs/` (PRD singkat + architecture), `.editorconfig`.

Must NOT do:
- Jangan tambah tooling berlebihan (turbo/nx) untuk 1 app.

Acceptance Criteria:
- Repo punya struktur folder `apps/mobile`, `supabase`, `docs`.
- `README.md` berisi quickstart local dev (Supabase + Expo).

External References:
- GitHub CLI: https://cli.github.com/manual/gh_repo_create

---

### 2) Supabase local project setup

What to do:
- Inisialisasi Supabase CLI project di folder `supabase/`.
- Dokumentasikan perintah:
  - `supabase start`
  - `supabase db reset`
  - cara lihat email OTP pada local stack (inbucket) kalau tersedia.

Acceptance Criteria:
- `supabase start` sukses dan servis berjalan.
- `supabase db reset` sukses dan schema apply tanpa error.

External References:
- Supabase CLI docs: https://supabase.com/docs/guides/cli
- Local development: https://supabase.com/docs/guides/local-development

---

### 3) Database schema + RLS (per-user isolation)

What to do:
- Buat migrasi SQL untuk tabel inti (minimum):
  - `food_items`
  - `food_item_events` (opsional tapi disarankan untuk audit: consumed/wasted)
  - `profiles` (opsional: settings global seperti `reminder_hour`)
- Terapkan RLS: user hanya bisa CRUD rows miliknya (`auth.uid() = user_id`).
- Tambahkan index untuk query list (mis. `user_id, expiry_date, updated_at`).

Must NOT do:
- Jangan implement household/shared list.

Acceptance Criteria:
- Migrasi ada di `supabase/migrations/*.sql`.
- RLS ON dan policy benar untuk semua tabel user-data.
- Uji otomatis (agent-executable) pada local supabase:
  - `supabase db reset` PASS
  - `psql` ke DB lokal: `select * from pg_policies where tablename in ('food_items','food_item_events');` mengandung ekspresi `auth.uid() = user_id`
  - `psql` ke DB lokal: `select relrowsecurity from pg_class where relname='food_items';` bernilai true

External References:
- RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Auth UID: https://supabase.com/docs/guides/auth/row-level-security

---

### 4) Expo app bootstrap + env + lint/test

What to do:
- Buat Expo app di `apps/mobile/`.
- Setup env vars (Expo public):
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Tambahkan `.env.example` dan pastikan `.env` di-ignore git.
- Setup lint + formatting + tests:
  - ESLint
  - Jest + RTL

Acceptance Criteria:
- `npm run lint` PASS.
- `npm test` PASS (minimal 1 test).
- App bisa jalan: `npx expo start` dan build Android dev.

External References:
- Expo env vars: https://docs.expo.dev/guides/environment-variables/
- Testing RN: https://callstack.github.io/react-native-testing-library/

---

### 5) Supabase Auth (Email OTP) in app

What to do:
- Implement layar login: input email -> send OTP/magic link.
- Handle deep link/callback (kalau magic link) atau OTP entry flow (kalau OTP code).
- Persist session, handle refresh, logout.

Acceptance Criteria:
- User bisa login dan session tersimpan.
- Setelah login, user bisa fetch `food_items` (kosong kalau belum ada).
- Logout menghapus session dan kembali ke layar login.

External References:
- supabase-js Auth: https://supabase.com/docs/reference/javascript/auth-signinwithotp
- Expo linking: https://docs.expo.dev/guides/linking/

---

### 6) Food items CRUD + list UX

What to do:
- List view: sort by `expiry_date` (null expiry di bawah) dan highlight expired/soon.
- Add/Edit form:
  - name (required)
  - expiry_date (optional)
- Delete item (v1: soft delete via `deleted_at`, disarankan untuk aman konflik sync).

Acceptance Criteria:
- Add item (dengan expiry_date) muncul di list dan ada row di Supabase.
- Add item (tanpa expiry_date) muncul di list, tanpa jadwal notif.
- Edit item mengubah data di Supabase dan UI.
- Delete item tidak muncul di list (dan tidak bisa di-fetch tanpa include deleted).

---

### 7) Status transitions + event history

What to do:
- Action "Consumed" dan "Wasted" untuk item active.
- Update status di `food_items` + insert event di `food_item_events`.

Acceptance Criteria:
- Menandai consumed/wasted menghapusnya dari list active.
- Event tersimpan di DB dan hanya bisa diakses oleh pemilik.

---

### 8) Local notifications H-3 & H-0 (batch, cancel)

What to do:
- Saat item dibuat/diubah:
  - Hitung trigger H-3 dan H-0 pada jam 09:00 local time.
  - Schedule local notifications.
- Saat item dihapus / status jadi consumed/wasted / expiry_date jadi null:
  - Cancel scheduled notifications.
- Batching:
  - Satu notifikasi per hari per tipe (H-3 dan H-0) dengan daftar item.
  - Simpan mapping schedule-id di local storage (atau table) agar bisa cancel.
  - Rekomendasi: simpan key berbasis tanggal, contoh `notif:h3:2026-02-20` dan `notif:h0:2026-02-20`.

Acceptance Criteria:
- Unit test: fungsi hitung tanggal trigger benar untuk beberapa input (null expiry, already expired, today, future).
- Unit test: cancel dipanggil saat status berubah.
- Agent-executable verification: `getAllScheduledNotificationsAsync()` menunjukkan trigger yang benar setelah add/edit, dan list berkurang setelah consumed/wasted/delete.
- Manual device test (nice-to-have evidence): notifikasi benar-benar muncul pada device (bukan acceptance blocker untuk CI).

External References:
- expo-notifications: https://docs.expo.dev/versions/latest/sdk/notifications/

---

### 9) CI + docs polish

What to do:
- GitHub Actions workflow untuk:
  - install deps
  - lint
  - tests
- Tambahkan docs minimal:
  - `docs/architecture.md` (data model, RLS, notifications)
  - `docs/runbook.md` (local dev)

Acceptance Criteria:
- CI berjalan on PR.
- `README.md` bisa dipakai orang baru untuk run app + Supabase.

---

## Commit Strategy (recommended)
- `chore(repo): scaffold expo + supabase + docs`
- `feat(auth): email otp login`
- `feat(items): CRUD food items`
- `feat(reminders): schedule/cancel expiry notifications`
- `ci: add lint and test workflow`

---

## Success Criteria

### Verification Commands
```bash
# Supabase local
supabase start
supabase db reset

# Mobile app
cd apps/mobile
npm run lint
npm test
npx expo start
```

### Final Checklist
- [ ] Login OTP berfungsi
- [ ] CRUD item + status consumed/wasted berfungsi
- [ ] Notifikasi H-3/H-0 terjadwal dan ter-cancel sesuai perubahan
- [ ] Data terisolasi per user (RLS)
- [ ] CI hijau
