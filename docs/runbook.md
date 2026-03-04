# Runbook (Local Dev)

## Supabase

Prereq: Docker harus jalan.

```bash
cd supabase
npm install
npm start          # Memulai Supabase lokal (berisi auth, db, dll)
npm run reset      # Me-reset DB dengan migrations terbaru
```

Supabase Studio (default): http://localhost:54323

## Mobile (Expo)

```bash
cd apps/mobile
npm install
cp .env.example .env
npx expo start
npm run lint       # Menjalankan ESLint
npm test           # Menjalankan Jest tests
```
