# FreshTrack — Project Vision & Constitution

> **AGENT INSTRUCTION:** Read this file before every iteration. It serves as the project's "Long-Term Memory."

## 1. Core Identity
* **Project Name:** FreshTrack
* **Stitch Project ID:** 14824261495157425687
* **Mission:** Help households track food inventory, reduce waste, and never forget expiring items
* **Target Audience:** Non-tech-savvy household members (parents, grandparents, roommates). Must be grandma-friendly.
* **Voice:** Warm, helpful, calm. Like a friendly kitchen assistant. Never technical or intimidating.

## 2. Visual Language
*Reference these descriptors when prompting Stitch.*

* **The "Vibe" (Adjectives):**
    * *Primary:* Warm neo-skeuomorphic — soft depth, tactile, physical metaphors
    * *Secondary:* Kitchen-cozy — cream tones, terracotta accents, natural colors
    * *Tertiary:* Organized pantry — scannable, clear hierarchy, traffic-light status colors

## 3. Architecture & File Structure
* **Root:** `stitch/queue/`
* **Asset Flow:** Stitch generates to `queue/` -> Validate -> Reference for React Native implementation
* **Navigation Strategy:** Stack-based (React Navigation Native Stack). Auth flow -> Onboarding -> Main app with tab/push navigation.

## 4. Live Sitemap (Current State)
*Update this when a new screen is successfully generated.*

* [x] `inventory-home` - a6037b13fe8b4d1d828f667d1326ed93 — Main dashboard with food items list, search, filter chips, bottom action bar
* [x] `auth-login` - c7cef1a9ec4e4fea871a2615008bd7df — Login screen with branding, demo mode, Google/email OTP options
* [x] `onboarding` - 9f8eb02a29d3481e81b6a094d7641251 — Create or join household flow
* [x] `batch-detail` - edcc7d368ca14ab29257a484f2053651 — Item detail view with quantity, expiry, actions (consume/waste/edit)
* [x] `add-batch` - 32e70628b67e46a5a5c930389ed90ef0 — Add new food item form (name, brand, qty, unit, expiry)
* [x] `edit-batch` - c1047f01097f49bab8c32e39bb272996 — Edit existing food item form with delete option
* [x] `consume-waste` - 1ac15e5802844845927993c3050bdb60 — Record consumption or waste modal with amount validation
* [x] `history` - 603a43178fc04108b491592b19bfb65c — Activity log showing consumed/wasted/added events
* [x] `settings` - fc4af421ee0d48689f1e96123b7f6280 — Household members, invite code, reminder config, sign out
* [x] `scanner` - 227bdd2462f049f1bca575d97e8d14cd — Barcode scanner with camera viewfinder and focus box
* [x] `otp-verify` - b1b3a08e99ca4cdca5c996c6b4003edd — OTP code entry screen

## 5. The Roadmap (Backlog)
*Pick the next task from here if available.*

### High Priority
- [x] Generate inventory-home screen (the main dashboard — most important)
- [x] Generate auth-login screen (entry point)
- [x] Generate batch-detail screen (item details + actions)
- [x] Generate add-batch screen (add item form)

### Medium Priority
- [x] Generate settings screen (household management)
- [x] Generate history screen (activity log)
- [x] Generate onboarding screen (create/join household)
- [x] Generate consume-waste screen (record modal)

### Low Priority
- [x] Generate scanner screen (camera viewfinder)
- [x] Generate edit-batch screen (edit form)
- [x] Generate otp-verify screen

### Next Phase
- [ ] Adapt Stitch HTML designs to React Native components (Warm Pantry theme)
- [ ] Update tokens.ts with canonical design tokens from DESIGN.md
- [ ] Install DM Sans + Space Grotesk fonts for Expo

## 6. Creative Freedom Guidelines
*When the backlog is empty, follow these guidelines to innovate.*

1. **Stay On-Brand:** New screens must feel like a warm, organized pantry
2. **Enhance the Core:** Support the mission of reducing food waste
3. **Naming Convention:** Use lowercase, hyphenated filenames (e.g., `inventory-home`)
4. **Status Colors:** Always use red=expired, gold=warning, green=fresh
5. **Data in Monospace:** Quantities, dates, barcodes always use Space Grotesk

### Ideas to Explore
- [ ] `shopping-list` - Auto-generated shopping list from low-stock items
- [ ] `waste-report` - Monthly waste summary with stats and trends
- [ ] `recipe-suggest` - Recipe suggestions based on expiring items

## 7. Rules of Engagement
1. Do not recreate screens already marked [x] in Section 4
2. Always update `next-prompt.md` before completing
3. Consume ideas from Section 6 when you use them
4. Every screen must include the DESIGN SYSTEM block from DESIGN.md Section 6
5. Generate for MOBILE device type (393x852 viewport)
6. All data values (dates, quantities, barcodes) must use monospace font
