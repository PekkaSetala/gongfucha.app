# Gongfu Cha — Redesign Spec (April 2026)

A gongfu-style tea brewing timer and guide. The user picks a tea, adjusts vessel and leaf amount, and the app guides them through multiple short steeps with a countdown timer. The aesthetic is warm, quiet, and considered — off-white parchment tones, not dark mode.

---

## Tech Stack

- **Next.js + React + Tailwind CSS** — chosen for API routes, future database/auth extensibility, and Vercel deployment
- **CSS transitions with custom easing** — no Framer Motion; all animation achieved with CSS using custom cubic-bezier curves
- **OpenRouter** — server-side API route for AI tea identification
- **Static JSON tea data** — accessed through an abstraction layer (`getTeas()`) so it can swap to a database later without architecture changes
- **localStorage** — for user preferences (vessel size, last-used tea)
- **PWA (v1)** — service worker caches the app shell so the timer works through connection drops; installable on home screen
- **No database for v1** — data model is structured for easy migration to Postgres/CMS when needed (e.g., tea shop partnerships)
- **No external state library** — useState/useContext handles everything

---

## Design System

### Palette (off-white, warm parchment)

```
--bg:             #F4EFE6    (warm off-white base)
--bg-warm:        #F0E8DA    (slightly warmer variant)
--surface:        #FAF7F2    (cards, elevated panels)
--surface-hover:  #F0EBE2    (interactive hover state)
--border:         #E4DBCC    (default borders)
--border-hover:   #D0C5B4    (hover borders)
--text-primary:   #2C2520    (near-black, warm)
--text-secondary: #6B5D4F    (secondary labels)
--text-tertiary:  #9E8E7A    (metadata, hints)
--accent-clay:    #8C563E    (primary actions, active states)
--accent-gold:    #B89A4C    (seasonal tags, restrained highlights)
```

80-85% of the UI is neutral warm tones. Clay is the main active color, used sparingly.

### Tea Colors (muted, earthy dots in the list)

```
Green Tea:    #7A9E6B
Fresh White:  #BFB49C
Sheng Pu-erh: #8B9E6F
Light Oolong: #B5A26A
Dark Oolong:  #8E6B3E
Black Tea:    #8B5E4B
Aged White:   #A69480
Shou Pu-erh:  #6B4E3A
```

### Typography

- **Latin:** DM Sans (clean, geometric, warm)
- **Chinese:** Noto Serif SC (for any decorative/atmospheric Chinese characters — not functional labels)
- All functional labels and tea names are in **English**
- `font-variant-numeric: tabular-nums` on all number displays

### Animation

Custom easing curves — never use default CSS `ease` or `ease-in`:

```css
--ease-out:    cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
```

Duration rules:
- Button press feedback: 100–160ms
- Tooltips, small popovers: 125–200ms
- Dropdowns, selects: 150–250ms
- Modals, drawers, sheets: 200–500ms
- Standard UI transitions stay under 300ms

Key principles:
- Every pressable element gets `transform: scale(0.97)` on `:active`
- Never animate from `scale(0)` — start from `scale(0.95) + opacity: 0`
- `ease-out` for enter/exit, `ease-in-out` for move/morph
- Exit animations faster than enter (asymmetric timing)
- Only animate `transform` and `opacity` (GPU-accelerated)
- Respect `prefers-reduced-motion`
- Gate hover states behind `@media (hover: hover) and (pointer: fine)`

### Touch Targets

- Primary buttons: 56px min height
- Secondary buttons: 44px min height
- Chips/tags: 36px min height
- All interactive elements must work one-handed with wet fingers

### What to Avoid

- Glossy gradients, neon glow, frosted-glass surfaces
- Decorative leaf illustrations, brush-script fonts
- Red/gold "Chinese restaurant" symbolism
- Anything that looks AI-generated — no over-symmetry, no gratuitous glassmorphism, no generic component library feel
- `transition: all` — always specify exact properties
- `ease-in` on any UI element
- Animation duration > 300ms on standard UI transitions

---

## Navigation Architecture

No tab bar. No traditional navigation.

- **Home screen** = tea list. It owns the viewport.
- **AI Advisor** and **Custom Mode** are secondary — accessed via icon buttons in the header, open as bottom sheets (mobile) or side panels (desktop).
- All three paths converge on the same brewing timer screen.

---

## Tea Selection (Home Screen)

### Layout

Vertical list of 8 teas ordered by TCM thermal nature (cool → warm). This ordering reflects the real Chinese tradition of categorizing teas by their cooling/warming effect on the body — based on oxidation level and processing method.

Each tea row is a tappable card showing:
- Color dot (muted, unique per tea)
- Tea name (English)
- Short descriptor (e.g., "Floral high-mountain")
- Temperature

Teas that match the current season get a subtle "In season" tag (gold accent). The header shows a seasonal hint: *"Spring calls for something light — green or floral"*

### Tea Order (cool → warm)

1. Green Tea — cold, unoxidized
2. Fresh White — cool, minimal processing
3. Sheng Pu-erh — cool when young
4. Light Oolong — cool-to-neutral
5. Dark Oolong — neutral-to-warm, roasted
6. Black Tea — warm, fully oxidized
7. Aged White — neutral-to-warm through aging
8. Shou Pu-erh — warm, post-fermented

### Seasonal Mapping

| Season | Primary teas | Secondary |
|--------|-------------|-----------|
| Spring | Green Tea, Light Oolong | Fresh White |
| Summer | Green Tea, Fresh White | Sheng Pu-erh |
| Autumn | Dark Oolong, Light Oolong | Aged White |
| Winter | Black Tea, Shou Pu-erh | Dark Oolong, Aged White |

### Interaction

- Tap a tea → detail card expands below it (mobile) or appears in side panel (desktop)
- Detail card shows: brewing params, brew note, infusion schedule
- User can adjust vessel size and leaf amount before starting (see Vessel & Leaf Adjustment below)
- "Start Brewing" button appears when a tea is selected

### Responsive Behavior

- **Mobile (<720px):** Full-width tea list. Detail expands inline below the selected tea. Brew button appears below the detail.
- **Desktop (720px+):** Tea list on the left (~420px), sticky detail panel on the right (~340px). Detail panel shows full params including infusion schedule pills.

---

## Vessel & Leaf Adjustment

### Default Behavior

- Default vessel size: **120ml** (stored in localStorage, persists across sessions)
- Leaf amount auto-calculated from the tea's ideal ratio at the current vessel size
- Infusion schedule auto-adjusts based on actual ratio vs ideal ratio

### User Controls

In the detail card, before "Start Brewing":
- **Vessel size** — adjustable (stepper or input). Changing this recalculates leaf amount to maintain the ideal ratio.
- **Leaf amount** — adjustable. Deviating from the calculated amount triggers schedule adjustment.

### Schedule Adjustment Logic

Each tea has a baseline ratio (g/ml) and baseline schedule. When the user's actual ratio deviates from baseline:
- **Lower ratio (less leaf)** → longer steep times
- **Higher ratio (more leaf)** → shorter steep times

This is an approximation, not a formula. The UI should indicate when times have been adjusted: a subtle "adjusted for your ratio" label. The adjustment is a heuristic — proportional scaling based on ratio deviation, not a tea-science simulation.

### Tea Data Model

```typescript
interface TeaPreset {
  id: string;
  name: string;
  color: string;           // hex color for the dot
  subtitle: string;        // short descriptor
  ratioGPerMl: number;     // ideal g per ml (e.g., 0.07 for Dark Oolong)
  tempC: number;           // water temperature
  rinse: boolean;          // whether rinse is needed
  doubleRinse: boolean;    // shou pu-erh
  baselineSchedule: number[]; // seconds per infusion at ideal ratio
  brewNote: string;        // poetic/practical note
  seasons: string[];       // which seasons this tea suits
}
```

---

## Brewing Timer Screen

The timer is the heart of the app. Calm, focused — a meditation bell, not a kitchen timer.

### Flow

1. **Rinse step** (if applicable) → short guided timer (5s), "Pour, wait, discard." Shou Pu-erh gets a double rinse (two consecutive 5s rinses). Flows automatically into infusion 1.
2. **Infusion countdown** → large circular progress ring with countdown number in center. Play/pause below.
3. **Between infusions** → shows completed time, next infusion preview with ±3s adjustment buttons (one-handed, wet fingers), "Brew Next" button, session progress pills.
4. **Schedule extension** → when the user brews past the preset schedule, each additional infusion adds ~35% to the previous time. Generated times labeled as extended.
5. **Session end** → user taps "End" in the top bar at any point.

### Timer Layout

- Top bar: tea name on left, "End" on right
- Infusion number label (e.g., "Infusion 3")
- Large circular progress ring with countdown in center
- Play/Pause button below the ring
- Brew params line: temperature · leaf amount · vessel size
- Schedule preview bar at bottom (pills showing all infusion times, current highlighted)

### Timer Behavior

- Play → ring animates clockwise, number counts down
- Pause → freezes ring and countdown, button toggles to play
- Countdown reaches 0 → ceramic tap sound → transition to between-infusion state
- Timer must work offline (PWA service worker keeps the app running through connection drops)

### Sound Design

Single struck ceramic bowl tone — like tapping a thin porcelain cup with a fingernail. Short, clean, quiet. No reverb, no melody, no layering. The kind of sound you'd barely notice in a quiet room.

---

## AI Advisor (v1 — text search only)

Accessed via icon button in the header → opens as bottom sheet (mobile) / panel (desktop).

### Flow

1. User types a tea name or description (e.g., "Da Hong Pao", "2023 aged white cake from Fuding", "light floral oolong, tightly rolled")
2. App sends to OpenRouter via server-side API route
3. AI returns: identified tea name, which of the 8 categories it maps to, brew params (using closest preset as baseline), and a short summary about the tea
4. User sees result card with params and summary
5. User can adjust vessel/leaf as usual
6. "Start Brewing" → enters the timer

### Scope

- Text input only for v1 (image identification deferred)
- AI maps to closest preset and adjusts — does not generate entirely novel brew schedules
- Model choice: fast, cheap, good at tea knowledge (specific model selected during implementation)
- Server-side API route keeps the OpenRouter key safe
- **Error handling:** If the AI can't identify the tea or the API is unreachable, show a simple message suggesting the user try Custom Mode instead. No retry loops, no loading spinners that hang.

---

## Custom Mode

Accessed via icon button in the header → bottom sheet / panel.

Manual parameter entry:
- Tea name (freeform)
- Water temperature
- Vessel size
- Leaf amount
- Rinse toggle
- Infusion schedule: user sets a base steep time (e.g., 10s) and number of infusions; the app generates an incrementing schedule using the same ~35% extension logic

"Start Brewing" → enters the timer with the custom params.

---

## Screens (6 total for v1)

1. **Home / Tea List** — vertical list, header with greeting + seasonal hint, icon buttons for AI/Custom
2. **Tea Detail** — expanded card (mobile inline / desktop side panel) with params, vessel/leaf adjustment, brew note, schedule, "Start Brewing"
3. **Brewing Timer** — circular progress ring, countdown, play/pause, rinse step integration
4. **Between Infusions** — completed time, next preview with ±3s adjust, "Brew Next", session progress
5. **AI Advisor** — bottom sheet/panel, text input, result card, "Start Brewing"
6. **Custom Mode** — bottom sheet/panel, parameter form, "Start Brewing"

No settings screen, no session history, no tasting tags for v1.

---

## Data: Tea Presets

All teas use 120ml default vessel. Leaf amounts shown at default; actual amounts recalculate based on user's vessel size.

### Green Tea
- Ratio: 0.0625 g/ml, Temp: 80°C, Rinse: No
- Schedule: 8, 10, 12, 15, 20, 28, 38
- Note: "No rinse, lower temp. The first steep is the brightest."
- Seasons: Spring, Summer

### Fresh White
- Ratio: 0.05 g/ml, Temp: 88°C, Rinse: No
- Schedule: 12, 15, 18, 22, 28, 36, 50, 70
- Note: "White tea rewards patience and a gentle, slow curve."
- Seasons: Summer

### Sheng Pu-erh
- Ratio: 0.055 g/ml, Temp: 95°C, Rinse: Yes
- Schedule: 6, 8, 10, 12, 16, 22, 30, 45
- Note: "Short, careful steeps keep the bitterness in check."
- Seasons: Summer

### Light Oolong
- Ratio: 0.055 g/ml, Temp: 95°C, Rinse: No
- Schedule: 10, 12, 14, 18, 24, 32, 45, 60
- Note: "No rinse — preserve the first flush of fragrance."
- Seasons: Spring, Autumn

### Dark Oolong
- Ratio: 0.07 g/ml, Temp: 100°C, Rinse: Yes
- Schedule: 8, 10, 12, 15, 20, 28, 38, 55
- Note: "Let the roast open gradually. Early steeps stay short."
- Seasons: Autumn, Winter

### Black Tea
- Ratio: 0.055 g/ml, Temp: 95°C, Rinse: No
- Schedule: 10, 12, 15, 18, 24, 32, 45, 62
- Note: "Start steady, then widen as the sweetness softens."
- Seasons: Winter

### Aged White
- Ratio: 0.05 g/ml, Temp: 95°C, Rinse: Yes
- Schedule: 10, 12, 15, 20, 28, 38, 55, 75
- Note: "Higher heat unlocks the jujube and wood notes."
- Seasons: Autumn, Winter

### Shou Pu-erh
- Ratio: 0.058 g/ml, Temp: 100°C, Rinse: Yes (double)
- Schedule: 10, 12, 15, 18, 24, 32, 45, 60
- Note: "A double rinse clears pile notes. Let the middle steeps linger."
- Seasons: Winter

---

## Future Considerations (not v1)

- Image-based tea identification via AI
- Database-backed tea collections (tea shop partnerships — each shop has their own tea selection)
- User accounts and auth
- Session history and tasting notes
- Tea journal / favorites
- More granular PWA features (push notifications for timer)
