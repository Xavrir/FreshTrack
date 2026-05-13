# Design System: FreshTrack — "Warm Pantry"
**Project ID:** 14824261495157425687
**Status:** Canonical — extracted from 11 Stitch-generated screens (Mar 2026)

## 1. Visual Theme & Atmosphere

**Neo-Skeuomorphism meets Kitchen Warmth.** The app should feel like a well-organized pantry — warm, tactile, and instantly familiar. Soft depth creates a sense of real objects on shelves. Every element feels touchable and real, but refined — not a cartoon fridge, more like a premium cookbook app.

**Mood**: Warm, trustworthy, calm, approachable. Like opening a well-lit pantry in a cozy kitchen.
**Density**: Medium — generous whitespace between items, large touch targets, nothing cramped.
**Anti-patterns**: No stark industrial aesthetics. No pure flat design. No glassmorphism on primary content. No neumorphism. No dark mode as default.

## 2. Color Palette & Roles (Canonical)

| Token | Hex | Role |
|-------|-----|------|
| `primary` | `#E8913A` | Terracotta Amber. Primary accent — buttons, highlights, active states, toggle switches |
| `background` | `#FBF7F0` | Warm Cream. Page background — like parchment or a light wooden shelf |
| `backgroundDark` | `#211911` | Dark mode background (future) |
| `surface` | `#FFFFFF` | Soft White. Card surfaces — clean containers on the cream shelf |
| `surfaceSecondary` | `#F5EDE0` | Warm Sand. Input backgrounds, inactive chips, secondary surface |
| `textPrimary` | `#2D1B0E` | Deep Espresso. Primary text — rich dark brown, not harsh black |
| `textSecondary` | `#8B7E74` | Warm Gray-Brown. Muted text — labels, timestamps, helpers |
| `border` | `#E8E0D6` | Light Border. Card borders, dividers — barely visible structure |
| `danger` | `#D64545` | Alarm Red. Expired items, destructive actions, waste recording |
| `success` | `#3B9B6D` | Fresh Green. Fresh items, positive states, "added" events |
| `warning` | `#E5A100` | Caution Gold. Expiring soon items, warning states |

**Note:** Stitch generated `#E8913B` on some screens (1 hex digit off from `#E8913A`). Canonical value is `#E8913A`.

## 3. Typography Rules

| Role | Font Family | Weight | Size Range | Usage |
|------|-------------|--------|------------|-------|
| **Headlines** | DM Sans | Bold (700) | 18-36px | Screen titles, item names, section headers |
| **Body** | DM Sans | Regular (400), Medium (500) | 14-16px | Body text, descriptions, event descriptions |
| **Labels** | DM Sans | Semibold (600) | 11-13px | Uppercase labels, chip text, nav links |
| **Data/Numbers** | Space Grotesk | Regular (400), Bold (700) | 13-48px | Quantities, dates, barcodes, OTP digits, invite codes |

**Size scale**: 11 / 13 / 14 / 15 / 16 / 18 / 20 / 22 / 24 / 28 / 36 / 48px

**Note:** Stitch also used Plus Jakarta Sans on some screens. For React Native, we normalize to DM Sans (UI) + Space Grotesk (data).

## 4. Component Stylings

### Buttons
- **Primary**: `#E8913A` bg, `#2D1B0E` text, 12px radius, 48-52px height, soft shadow `0 4px 12px rgba(45,27,14,0.05)`
- **Secondary**: transparent bg, 1.5px `#E8913A` border, 12px radius, 48px height
- **Ghost**: no bg, no border, text only (terracotta amber or gray-brown)
- **Danger**: transparent bg, 1.5px `#D64545` border, red text — or `#D64545` bg, white text for confirm
- **Pressed**: shadow shrinks, slight translateY(1px)
- **Disabled**: 50% opacity

### Cards
- White `#FFFFFF` bg, 16px radius, 1px `#E8E0D6` border
- Shadow: `0 4px 12px rgba(45, 27, 14, 0.05)` (standard)
- Elevated shadow: `0 4px 20px -2px rgba(232, 145, 59, 0.08), 0 2px 8px -2px rgba(0, 0, 0, 0.04)`
- Internal padding: 16-20px
- Cards feel like containers sitting on a shelf

### Inputs
- 12px radius, `#F5EDE0` (warm sand) bg, 1.5px `#E8E0D6` border, 48px height
- Focus state: 1.5px `#E8913A` border
- Error state: 1.5px `#D64545` border
- Label above: DM Sans semibold, 11px, uppercase, `#8B7E74`
- Inset shadow (neo-skeuomorphic): `inset 2px 2px 5px rgba(45,27,14,0.05), inset -2px -2px 5px rgba(255,255,255,0.8)`

### Chips/Tags (Status Indicators)
- Pill-shaped (full radius / 9999px)
- **Expired/Danger**: `#D64545` bg, white text
- **Warning/Soon**: `#E5A100` bg, `#2D1B0E` text
- **Fresh/Good**: `#3B9B6D` bg, white text
- **Default/Inactive**: `#F5EDE0` bg, `#8B7E74` text
- **Active filter**: `#E8913A` bg, white text

### Toggle Switches
- Active: `#E8913A` (terracotta amber) track
- Inactive: `#E8E0D6` track

## 5. Layout Principles

| Token | Value | Usage |
|-------|-------|-------|
| `spacing.xs` | 4px | Tight gaps |
| `spacing.sm` | 8px | Icon gaps, inline spacing |
| `spacing.md` | 12px | Card gaps, chip spacing |
| `spacing.lg` | 16px | Card padding, section spacing |
| `spacing.xl` | 20px | Screen horizontal padding |
| `spacing.2xl` | 24px | Large section gaps |
| `spacing.3xl` | 32px | Major section dividers |
| `spacing.4xl` | 48px | Header/footer spacing |
| `radius.sm` | 8px | Small elements |
| `radius.md` | 12px | Buttons, inputs |
| `radius.lg` | 16px | Cards |
| `radius.xl` | 24px | Bottom sheets |
| `radius.full` | 9999px | Chips, pills, avatars |

- **Touch targets**: Minimum 44x44px, preferred 48-56px height for buttons
- **Mobile-first** at 393px logical width (standard Android phone)
- **Generous breathing room** — never cramped, always scannable

## 6. Shadow Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `shadow.card` | `0 4px 12px rgba(45, 27, 14, 0.05)` | Standard card elevation |
| `shadow.elevated` | `0 4px 20px -2px rgba(232, 145, 59, 0.08), 0 2px 8px -2px rgba(0, 0, 0, 0.04)` | Elevated cards, modals |
| `shadow.input` | `inset 2px 2px 5px rgba(45, 27, 14, 0.05), inset -2px -2px 5px rgba(255, 255, 255, 0.8)` | Neo-skeuomorphic input fields |
| `shadow.button` | `0 2px 8px rgba(0, 0, 0, 0.12)` | Primary button resting state |

## 7. Icon System

- **Material Symbols Outlined** (Google Fonts) — consistent across all screens
- Weight range: 100-700, fill 0-1
- Used for: navigation arrows, search, settings, edit, copy, calendar, barcode icons

## 8. Screen Inventory

| Screen | Stitch ID | Status |
|--------|-----------|--------|
| inventory-home | `a6037b13fe8b4d1d828f667d1326ed93` | Generated |
| auth-login | `c7cef1a9ec4e4fea871a2615008bd7df` | Generated |
| batch-detail | `edcc7d368ca14ab29257a484f2053651` | Generated |
| add-batch | `32e70628b67e46a5a5c930389ed90ef0` | Generated |
| settings | `fc4af421ee0d48689f1e96123b7f6280` | Generated |
| history | `603a43178fc04108b491592b19bfb65c` | Generated |
| onboarding | `9f8eb02a29d3481e81b6a094d7641251` | Generated |
| consume-waste | `1ac15e5802844845927993c3050bdb60` | Generated |
| scanner | `227bdd2462f049f1bca575d97e8d14cd` | Generated |
| edit-batch | `c1047f01097f49bab8c32e39bb272996` | Generated |
| otp-verify | `b1b3a08e99ca4cdca5c996c6b4003edd` | Generated |
