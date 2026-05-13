# FreshTrack v1 — Frontend Specification

## Product

Android app (Expo/React Native) for tracking household food inventory with barcode scanning and local expiry reminders. One household per user, shared inventory among members.

## Design Direction

**Modern Industrialist** — warehouse signage, factory status boards, engineering drawings. Structural, utilitarian, bold.

- **Typography**: Barlow (geometric sans-serif, engineering-drawing quality) for UI text. JetBrains Mono for data, codes, quantities, dates.
- **Colors**: Dark-first palette. Near-black background (#0C0C0C), warm neutral surfaces, industrial amber (#F0A500) as primary accent. Alarm red for danger/expiry. Operational green for fresh/success. All text warm-white (#E8E2D9), never pure white.
- **Shape**: Zero border radius everywhere. 2px structural borders. No soft shadows — hard offset shadows (2px/2px, 0 blur) on interactive elements only.
- **Labels**: Section headers in uppercase monospace with wide letter-spacing, like stenciled warehouse labels ("MEMBERS", "REMINDERS", "PRODUCT INFO").
- **Status indicators**: Rectangular chips acting as traffic lights — red for expiring soon, amber for warning, green for fresh.
- **Data display**: All numeric/date/code values in monospace. Quantities, barcodes, invite codes, expiry dates.

## Navigation Structure

```
Auth Flow (unauthenticated):
  Auth → OTP

Onboarding (authenticated, no household):
  Onboarding

Main App (authenticated + household):
  InventoryHome
    ├── Scanner → AddBatch
    ├── AddBatch (manual)
    ├── BatchDetail
    │     ├── EditBatch
    │     └── ConsumeWaste (modal)
    ├── History
    └── HouseholdSettings
```

Auth gating: Navigation conditionally renders Auth, Onboarding, or Main stack based on session + household membership state.

## Screens

### 1. Auth Screen (Login)

Entry point. No navigation header.

**Layout:**
- App title "FRESH" (white) / "TRACK" (amber) — stacked, display size, black weight, uppercase with widest letter-spacing
- Amber accent bar (3px thick, 64px wide) below title
- Tagline in monospace muted text: "Track inventory. Prevent waste."

**Demo Mode card** (shown when `EXPO_PUBLIC_SUPABASE_URL` is not set):
- Section label: "DEMO MODE"
- Body: "No Supabase configured. Running offline."
- Primary button: "ENTER DEMO"

**Authentication card:**
- Section label: "AUTHENTICATION"
- Disabled secondary button: "GOOGLE SIGN-IN" (disabled until Google OAuth is wired)
- Structural "OR" divider (thin lines with monospace "OR" label centered)
- Email input (monospace, label: "EMAIL", placeholder: "you@example.com")
- Primary button: "SEND OTP" (disabled in demo mode)

**State: Loading** — amber ActivityIndicator centered on dark background while checking session.

### 2. OTP Screen

Navigation header: "VERIFY" (amber, uppercase).

**Layout:**
- Card with section label: "VERIFICATION"
- Heading: "Check your email"
- Body: "Code sent to {email}" (muted)
- OTP input: monospace, centered, large font (24px), letter-spacing 8, numeric keyboard, 6 digit max
- Primary button: "VERIFY"

**State: Loading** — button shows ActivityIndicator during verification.
**State: Error** — alert dialog on invalid code.

### 3. Onboarding Screen

No navigation header.

**Layout:**
- Page header: "SETUP" (bold, uppercase) with amber accent bar
- **Option A card:**
  - Section label: "OPTION A"
  - Heading: "Create Household"
  - Body: "Start a new shared inventory and invite others."
  - Primary button: "CREATE NEW"
- Structural "OR" divider
- **Option B card:**
  - Section label: "OPTION B"
  - Heading: "Join Existing"
  - Body: "Have an invite code from a family member or roommate?"
  - Invite code input (monospace, auto-capitalize)
  - Secondary button: "JOIN HOUSEHOLD"

**State: Loading** — buttons show ActivityIndicator.
**State: Error** — alert dialog on invalid invite code or if user already belongs to a household.

### 4. Inventory Home

No navigation header (custom inline header).

**Header area:**
- "INVENTORY" (h2, black weight, uppercase, wide tracking) with amber accent bar
- "SETTINGS" link (amber, uppercase caption) aligned right

**Search bar** (below header):
- Input with monospace placeholder: "Search items..."
- Optional filter chips: "ALL", "EXPIRING", "FRESH" (toggle active state)

**Item list** (FlatList):
- Each item is a Card with:
  - Product name (body, bold)
  - Quantity + unit in monospace muted ("5 pcs")
  - Expiry status chip aligned right:
    - Expired or ≤ 2 days: red chip ("EXPIRED" / "2D LEFT")
    - 3-7 days: amber/warning chip ("5D LEFT")
    - > 7 days: green chip ("14D LEFT")
    - No expiry date: default chip ("NO EXPIRY")
- Tapping a card navigates to BatchDetail
- Items sorted by soonest expiry, null-expiry at bottom

**Empty state** (when no items):
- Centered layout
- Large monospace text: "NO ITEMS"
- Muted body: "Add your first item by scanning a barcode or entering manually."
- Primary button: "ADD FIRST ITEM" (navigates to AddBatch)

**Bottom action bar** (pinned, with top border):
- Two buttons side by side:
  - Secondary: "MANUAL ADD" → navigates to AddBatch
  - Primary: "SCAN" → navigates to Scanner

### 5. Scanner Screen

Full screen modal, no navigation header. Dark background (#000).

**Layout:**
- Camera viewfinder area (flex: 1, centered)
  - Rectangular focus box: 250×150, 2px amber border, 0 radius
  - Below box: "SCANNING..." in monospace amber, uppercase, widest tracking
- Bottom controls area (dark overlay with amber top border):
  - Instructions: "Position barcode in the frame"
  - Secondary button: "ENTER MANUALLY" (navigates to AddBatch without barcode)
  - Ghost button: "CANCEL" (white text, navigates back)

**On successful scan:**
- Navigate to AddBatch with scanned barcode
- If barcode found in household cache or public API: pre-fill product name and brand

### 6. Add Batch Screen

Navigation header: "ADD ITEM" (amber, uppercase).

**Barcode indicator** (shown when barcode param exists):
- Row: green "SCANNED" chip + barcode value in monospace muted

**Product lookup status** (shown while looking up barcode):
- Amber spinner + "Looking up product..." in monospace

**Form card:**
- Section label: "PRODUCT INFO"
- Name input (label: "NAME", required)
- Brand input (label: "BRAND", optional)
- Row: Quantity input (label: "QTY", numeric) + Unit picker/input (label: "UNIT", placeholder: "pcs")
- Expiry date input (label: "EXPIRY", monospace, placeholder: "YYYY-MM-DD")
  - Helper text: "Leave empty for no expiry reminders."
- Primary button: "SAVE BATCH"

**Validation:**
- Name is required
- Quantity must be > 0
- Show inline error text (red) below invalid fields

### 7. Edit Batch Screen

Navigation header: "EDIT ITEM" (amber, uppercase).

Same form as Add Batch but pre-filled with existing batch data. Button text: "SAVE CHANGES". Include a ghost danger button at the bottom: "DELETE ITEM" with confirmation alert.

Route: `EditBatch: { id: string }`

### 8. Batch Detail Screen

Navigation header: "DETAILS" (amber, uppercase).

**Info card:**
- Row: product name (h3, bold) + category chip (e.g. "DRY GOOD")
- Divider
- Data row: "QTY" label → value in bold monospace / "EXPIRY" label → date in bold monospace
- Divider
- "ADDED BY" label → user name + date
- If applicable: "BARCODE" label → barcode value in monospace

**Actions section:**
- Section label: "ACTIONS"
- Card with:
  - Primary button: "MARK CONSUMED" → navigates to ConsumeWaste
  - Danger button: "MARK WASTED" → navigates to ConsumeWaste (with waste flag)
  - Ghost button: "EDIT" → navigates to EditBatch

### 9. Consume/Waste Screen (Modal)

Presented as modal. Navigation header: "RECORD" (amber, uppercase).

**Layout:**
- Screen header: "RECORD" with product name and remaining qty in monospace muted
- Card:
  - Amount input (monospace, numeric, label: "AMOUNT", defaultValue: remaining quantity)
  - Helper text in monospace muted: "Enter the amount consumed or wasted."
  - Row: Secondary "CANCEL" button + Primary "CONFIRM" button

**Validation:**
- Amount must be > 0
- Amount must be ≤ remaining quantity
- Show inline error if validation fails

**On confirm:**
- Decrement batch quantity
- Record inventory event (consumed or wasted)
- If quantity reaches 0: batch is hidden from active inventory
- Navigate back to inventory home

### 10. History Screen

Navigation header: "HISTORY" (amber, uppercase).

**Layout:**
- Section label: "ACTIVITY LOG"
- FlatList of events, newest first. Each event row:
  - Left: event icon/indicator (green dot for consumed, red dot for wasted, amber dot for added)
  - Product name (body, bold)
  - Event description in monospace muted: "Consumed 3 pcs" / "Wasted 1 pcs" / "Added 12 pcs"
  - Timestamp in monospace muted: "2 hours ago" / "Mar 5, 2026"
  - Structural bottom border dividing rows

**Empty state:**
- "NO ACTIVITY" in large monospace
- "Events will appear here as you consume, waste, or add items."

### 11. Household Settings Screen

Navigation header: "SETTINGS" (amber, uppercase).

**Members card:**
- Section label: "MEMBERS"
- List of members, each with:
  - User identifier (monospace, bold if self: "YOU")
  - Role chip: green "OWNER" or default "MEMBER"
  - If owner viewing a member: ghost danger "REMOVE" button
  - Structural bottom border between rows
- If owner: "INVITE CODE" label with code value in bold monospace (h3 size)

**Reminders card** (owner only):
- Section label: "REMINDERS"
- Time input (monospace, label: "TIME", placeholder: "09:00")
- Lead days input (monospace, label: "LEAD DAYS", placeholder: "7, 3, 0")
  - Helper text: "Comma separated days before expiry."
- Primary button: "SAVE"

**Sign out:**
- Ghost button with danger-colored text: "SIGN OUT"
- Confirmation alert before signing out

## Component Kit

All components use the theme system (useTheme hook). No hardcoded colors or fonts.

### Text
- Variants: display, h1, h2, h3, body, caption, label
- Props: color, weight (regular/medium/semibold/bold/black), mono, uppercase, tracking
- Labels auto-uppercase. Display/h1/h2 get wide letter-spacing by default.
- Font mapping: weight → specific loaded Barlow font name. Mono → JetBrains Mono variant.

### Button
- Variants: primary (amber bg), secondary (transparent, structural border), danger (red bg), ghost (no border)
- Sizes: sm, md, lg
- Props: loading, block, disabled
- All button text is uppercase with wider letter-spacing
- Hard shadow on non-ghost variants (2px offset, 0 blur). Press state: translate down + shadow reduction.

### Card
- 2px structural border, zero radius
- Props: elevated (uses borderStrong color)
- No soft shadows

### TextInput
- 2px border, zero radius
- Props: label (uppercase), error (red text below), helperText (monospace muted below), mono
- Labels are automatically uppercase semibold with wider tracking

### Chip
- Rectangular, 1px border, zero radius
- Variants: default (transparent bg, structural border), success (green), danger (red), warning (amber)
- Text is uppercase bold with wider tracking

### Container
- Safe area wrapper with theme background
- Props: scroll, safeArea

### Divider (new)
- Thin line using borderStrong color
- Optional centered label ("OR") in monospace

## Data Layer

The app uses a repository pattern with two implementations:
1. **Mock mode** (no Supabase URL): In-memory state with realistic demo data
2. **Supabase mode**: Real database queries

The UI never calls Supabase directly. All data access goes through:
- `AuthProvider` — session, user, sign-in/out
- `HouseholdProvider` — household, members, settings, invite code
- `InventoryRepository` — batches CRUD, events, barcode cache

## Platform

- Expo SDK 55
- React Native 0.83
- React Navigation (Native Stack)
- TypeScript strict mode
- Android only (v1)
