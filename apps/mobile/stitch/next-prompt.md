---
page: inventory-home
---
The main dashboard screen of FreshTrack, a household food inventory app. This is the most important screen — users see it every time they open the app. It should feel like looking into a well-organized pantry.

**Layout (top to bottom):**

1. **Header area**: App name "FreshTrack" in bold sans-serif (22px) on the left. Two text links on the right: "History" and "Settings" in terracotta amber, uppercase, small (13px). Below the title, a small terracotta amber accent bar (3px thick, 48px wide).

2. **Search bar**: Full-width rounded input with warm sand background. Magnifying glass icon on the left. Placeholder: "Search items..." in gray-brown muted text. Monospace font for the input.

3. **Filter chips row**: Three horizontally-arranged pill chips: "All" (active — terracotta amber bg), "Expiring" (inactive — warm sand bg), "Fresh" (inactive — warm sand bg). Tappable to toggle filter.

4. **Food items list** (the main content, scrollable): Three example cards stacked vertically with 12px gap:
   - **Card 1**: "Susu UHT Diamond" (bold), "1 pcs" (monospace, muted) on the left. Red pill chip "2D LEFT" on the right. This item is expiring soon — the card has a very subtle red-tinted left border (2px).
   - **Card 2**: "Indomie Goreng" (bold), "5 pcs" (monospace, muted) on the left. Green pill chip "14D LEFT" on the right. Fresh item.
   - **Card 3**: "Telur Ayam" (bold), "12 pcs" (monospace, muted) on the left. Gold pill chip "5D LEFT" on the right. Warning state.
   
   Each card: white bg, 16px radius, soft warm shadow, 1px light border. 16px padding. Tappable (shows pressed state).

5. **Bottom action bar** (pinned at bottom, white bg, subtle top shadow): Two side-by-side buttons:
   - Left: "Manual Add" — secondary style (transparent bg, 1.5px terracotta border, rounded 12px)
   - Right: "Scan" — primary style (terracotta amber bg, espresso text, rounded 12px, soft shadow)

**Empty state** (shown when no items): Centered vertically. Large muted text "No items yet" with a friendly food basket illustration outline below. Subtitle: "Add your first item by scanning or entering manually." A single "Add First Item" primary button below.

**Key details:**
- Background: Warm Cream (#FBF7F0)
- All quantities and dates in monospace (Space Grotesk)
- Product names in DM Sans bold
- Touch targets minimum 44px height
- Overall feel: organized, warm, scannable at a glance

**DESIGN SYSTEM (REQUIRED):**
- Platform: Mobile, Mobile-first, Android phone (393x852 viewport)
- Theme: Light, warm neo-skeuomorphic. Soft depth, tactile buttons, container-like cards
- Background: Warm Cream (#FBF7F0) — like a light wooden shelf
- Surface: Soft White (#FFFFFF) for cards with warm shadow (0 2px 12px rgba(45,27,14,0.06))
- Surface Secondary: Warm Sand (#F5EDE0) for input backgrounds
- Primary Accent: Terracotta Amber (#E8913A) for buttons and active states
- Text Primary: Deep Espresso (#2D1B0E) — rich dark brown, not black
- Text Secondary: Warm Gray-Brown (#8B7E74) for muted text
- Danger: Alarm Red (#D64545) for expired items and destructive actions
- Success: Fresh Green (#3B9B6D) for fresh items and positive states
- Warning: Caution Gold (#E5A100) for items expiring soon
- Border: Light warm border (#E8E0D6) — barely visible structural lines
- Font: DM Sans or Manrope for UI text (warm geometric sans-serif), Space Grotesk for data/numbers
- Buttons: Rounded corners (12px), primary uses amber bg with soft shadow, pressed state sinks
- Cards: Rounded (16px), white bg, 1px border, soft warm shadow. Feel like containers on a shelf.
- Chips: Pill-shaped status indicators. Red=expired, Gold=warning, Green=fresh
- Layout: 20-24px screen padding, generous whitespace, 44px min touch targets
- Overall feel: Warm kitchen pantry — organized, approachable, trustworthy. NOT industrial, NOT flat, NOT generic.
