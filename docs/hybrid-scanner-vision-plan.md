# Hybrid Scanner Vision Plan

## Goal

Add real image-based item recognition to FreshTrack's existing hybrid scanner flow without exposing any LLM API key in the Expo client.

The intended product behavior is:

- barcode-first for packaged items
- photo-based AI fallback for loose produce, unlabeled items, or damaged barcodes
- user review in `AddBatch` before saving

## Recommended Architecture

Use Supabase as the backend boundary for auth, storage, and server-side vision calls.

### Why Supabase

- the project already uses Supabase auth and edge-function patterns
- edge functions provide a secure place to call a vision-capable LLM API
- storage can hold captured images if we want retries, history, or auditability
- the mobile app only needs Supabase public keys, not the LLM provider secret

### High-Level Flow

1. User opens `ScannerScreen`
2. App tries live barcode scan first
3. If no barcode is usable, user taps shutter
4. App uploads the captured image to Supabase Storage or sends image payload to an Edge Function
5. Supabase Edge Function calls the chosen vision-capable LLM API
6. Edge Function normalizes the response into `ProductDetectionDraft`
7. App navigates to `AddBatch` with the returned draft and captured image
8. User reviews and edits fields before saving

## Backend Components

### 1. Hosted Supabase Project

Needed later when we are ready to wire the real flow:

- hosted Supabase project URL
- anon key for the mobile client
- authenticated users enabled for the mobile app
- edge functions deployed for detection
- optional storage bucket for scanner images

### 2. Storage Bucket

Recommended bucket:

- bucket name: `scanner-captures`
- access: private
- path shape: `households/{householdId}/users/{userId}/{timestamp}.jpg`

Why private:

- scanner images may contain product labels, household context, or background clutter
- signed URLs or server-side reads are safer than public URLs

### 3. Edge Function

Recommended new function name:

- `product-detect-vision`

Alternative:

- extend the existing `product-detect` function to support both `barcode` and `image`

Recommendation:

- keep barcode and vision as separate function paths first
- merge later only if the request/response contracts stay simple

## Request and Response Contract

### Client -> Edge Function

Preferred request body:

```json
{
  "household_id": "uuid",
  "image_path": "scanner-captures/households/.../capture.jpg",
  "context": {
    "mode": "photo-fallback",
    "source": "mobile-scanner"
  }
}
```

Possible direct-upload alternative for early testing:

```json
{
  "household_id": "uuid",
  "image_base64": "...",
  "mime_type": "image/jpeg"
}
```

Recommendation:

- use Storage path for production
- use base64 only for quick proof-of-concept work

### Edge Function -> Client

Return the same shape already used by the app:

```json
{
  "autofill": {
    "name": "Organic Strawberries",
    "brand": "Fresh Farms",
    "quantityValue": "1",
    "unit": "box",
    "category": "Produce",
    "storage": "Main Fridge",
    "storageDetail": "Top Shelf",
    "notes": "Review quantity and expiry before saving.",
    "confidence": 0.78,
    "sources": ["vision-llm"],
    "imageUri": "signed-or-local-uri"
  }
}
```

## Vision LLM Responsibilities

The vision model should not decide everything. It should only provide a best-effort draft for review.

### Ask the model to infer

- item name
- likely brand if visible
- likely category
- rough package quantity if clearly visible
- likely storage recommendation
- short notes for the user
- confidence score

### Do not trust the model for

- exact expiry date unless clearly printed and legible
- exact quantity if packaging is obscured
- exact SKU/variant when the label is ambiguous
- household-specific storage decisions without fallback rules

### Prompting Notes

System prompt should force strict JSON and conservative guesses.

Required behavior:

- prefer `unknown` or empty values instead of hallucinating
- only output fields defined by `ProductDetectionDraft`
- include a low confidence score when packaging is unclear
- mention ambiguity in `notes`

## Normalization Rules

After the LLM returns data, the Edge Function should normalize it before sending it to the app.

Examples:

- map unit synonyms like `g`, `gram`, `grams` into one consistent unit
- trim brand noise and duplicate product names
- convert confidence into `0..1`
- clean category strings into app-friendly values
- reject nonsense values like negative quantities

## Client Changes Needed Later

### `apps/mobile/src/services/productDetection.ts`

Replace the phase-1 mock `detectProductFromImage()` flow with:

- optional image upload helper
- function invoke for `product-detect-vision`
- graceful fallback if upload or detection fails

### `apps/mobile/src/screens/ScannerScreen.tsx`

Keep the current phase-1 UX, then add:

- upload progress state after shutter capture
- clearer `Analyzing photo...` feedback
- retry action if upload or vision fails

### `apps/mobile/src/screens/AddBatchScreen.tsx`

Keep review-first behavior, then add:

- low-confidence warning treatment for uncertain fields
- optional source badge like `VISION PREFILL`
- optional signed-image preview if the upload URL differs from local URI

## Security Rules

### Secrets

- never expose the vision API key in Expo env vars
- store the provider key only in Supabase Edge Function secrets

### Authorization

The Edge Function must:

- verify auth header
- verify the user belongs to the target household
- only allow uploads/reads inside that household scope

### Storage Policies

If we use Storage, add policies so users can only access scanner captures for households they belong to.

## Failure Strategy

If vision fails, the app should still let the user continue.

Fallback order:

1. keep captured image
2. send user to `AddBatch`
3. prefill minimal defaults
4. show a note like `AI could not identify this item. Enter details manually.`

Do not block item logging on vision errors.

## Recommended Rollout

### Phase 2A - Backend Foundation

- create hosted Supabase project
- configure mobile env vars
- create private `scanner-captures` bucket
- add storage policies
- add edge-function secret for the chosen LLM provider

### Phase 2B - Vision Function

- implement `product-detect-vision`
- upload image from mobile and call function
- return normalized `ProductDetectionDraft`

### Phase 2C - UX Hardening

- add progress and retry states
- add confidence-based copy in `AddBatch`
- test on real pantry items, bottles, cartons, produce, and partially visible labels

### Phase 2D - Learning Layer

Optional later improvement:

- store user-corrected results as household-specific image or product mappings
- use them to improve future autofill

## Open Decisions

These choices should be made before implementation:

1. Which vision-capable LLM provider to use
2. Whether images should be stored permanently or deleted after detection
3. Whether the existing `product-detect` function should stay barcode-only or become a unified router
4. Whether low-confidence drafts should auto-open `AddBatch` or prompt the user first

## Recommended Default Decisions

- use hosted Supabase
- keep barcode and vision functions separate initially
- store images privately with short retention unless product needs history
- keep `AddBatch` as the always-on review step
- treat vision as assistive autofill, not source-of-truth inventory entry

## Minimal Implementation Checklist

- [ ] Create hosted Supabase project
- [ ] Add project URL and anon key to mobile env
- [ ] Create private storage bucket
- [ ] Define storage policies
- [ ] Add edge function for vision detection
- [ ] Add LLM provider secret to Supabase
- [ ] Replace mock `detectProductFromImage()` in the mobile client
- [ ] Test with packaged items and loose produce
- [ ] Tune prompt and normalization rules
- [ ] Add retention/cleanup policy for uploaded images
