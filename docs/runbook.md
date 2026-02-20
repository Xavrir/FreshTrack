# Runbook (Local Dev)

## Supabase

Prereq: Docker harus jalan.

```bash
cd supabase
npm install
npm run supabase:start
npm run supabase:reset
```

Supabase Studio (default): http://localhost:54323

## Mobile (Expo)

```bash
cd apps/mobile
npm install
cp .env.example .env
npx expo start
```
