# Brewing Timer Redesign — Design Spec

## Problem

The brewing timer screen feels disconnected from the main page. Hard conditional swap on enter (no transition), flat layout with no depth or warmth, mismatched typography and spacing, and a "between infusions" state that feels like a different app entirely.

## Design Decisions

### Visual Concept: Hybrid Timer
- Thin SVG progress ring (2.5px stroke, tea-colored) fills as time runs
- Background color wash — radial gradient in tea's accent color that breathes (8s ease-in-out cycle), intensifying from ~6% to ~14% tea color as the timer progresses
- Timer number in Noto Serif SC (weight 300, 52px) — same font as tea name, creates typographic unity
- No ring glow background element (removed — reads as tacky)

### Transition: Tea Color Bridge
- When brewing starts: main page fades out (opacity 0 + slight blur over 300ms), tea accent color washes in from center as a radial gradient, then brewing screen fades in through the color (300ms)
- When brewing ends: reverse — fade out, color recedes, main page fades in
- On `prefers-reduced-motion`: simple crossfade, no blur or color bridge

### Between-Infusions State: Spatial Continuity
- Ring persists in same position with dashed stroke (`stroke-dasharray: 8 14`) that breathes (opacity 0.15→0.3, 4s cycle)
- Timer number shows next steep time with "s" suffix in lighter weight
- ±3 adjusters sit in a centered row below the ring (not flanking it)
- "Brew Next" CTA in same position/style as "Start Brewing" on main page
- Subtle steam wisps (3 radial gradient divs, 6% tea color) drift upward on staggered 6–8.5s cycles
- Background wash relaxes to ~55% opacity — visual "exhale"
- Phase transition uses crossfade only (no translateY) to avoid "new page" feeling

### Schedule: Compact Pill Strip
- Shown inside the info card below the ring, matching TeaDetail/CustomMode pill style exactly
- Done pills: struck through, faded (opacity 0.4)
- Active pill: tea-tinted background (`color-mix(tea 10%, transparent)`), tea-colored text, weight 600
- Upcoming pills: neutral bg, reduced opacity (0.7)

## Typography Scale

All values must match the main page's existing type system:

| Element | Font | Size | Weight | Extras |
|---|---|---|---|---|
| Tea name | Noto Serif SC | 20px (`text-xl`) | 400 | `color: accentColor` (full saturation) |
| Phase label | DM Sans | 11px | 500 | uppercase, `tracking-[1.5px]`, `color-mix(tea 50%, secondary)` |
| Timer number | Noto Serif SC | 52px | 300 | `letter-spacing: -0.01em`, `color: primary` |
| Timer "s" suffix (between) | Noto Serif SC | 18px | 300 | opacity 0.35 |
| Rinse hint | Noto Serif SC | 13px | 400 | italic, `text-secondary` |
| Card labels | DM Sans | 11px | 500 | uppercase, `tracking-[1px]`, `text-tertiary` |
| Card info values | DM Sans | 14px | 500 | `text-secondary` |
| Schedule pills | DM Sans | 12px | 500 (600 active) | — |
| Brew tip | Noto Serif SC | 13px | 400 | italic, `color-mix(tea 25%, secondary)` |
| End session | DM Sans | 12px | 500 | — |
| Brew Next CTA | DM Sans | 15px | 500 | — |

## Component Matching (exact parity with main page)

### Info Card
- `bg-surface/60 border border-border/50 rounded-[14px]` — matches SessionSummary
- No `backdrop-filter` — not used elsewhere in the app
- Padding: `px-5 py-3.5`
- Contains: schedule label + pills, divider, param row (Temp/Ratio/Vessel), divider, brew tip (between state only)

### Schedule Pills
- `px-2.5 py-1 rounded-md text-[12px] font-medium border`
- Active: `bg-clay-soft border-clay/20 text-clay` pattern but with tea accent via `color-mix`
- Done: `bg-transparent border-border text-tertiary opacity-40 line-through`
- Upcoming: `bg-bg border-border text-secondary opacity-70`

### ±3 Adjuster Buttons
- Match StepperControl exactly: `w-11 h-11 rounded-xl border border-border bg-bg text-secondary text-[14px] font-medium`
- Text: "−3" and "+3"
- Centered row with `gap-2`, the time number between them: `[−3] [20s] [+3]`

### CTA Buttons (Play, Brew Next)
- Play: 56px circle, `bg-[accentColor] text-surface shadow-[0_2px_8px_rgba(teaR,teaG,teaB,0.25)]`
- Pause: 56px circle, `border border-border bg-surface text-secondary`
- Brew Next: `w-full py-4 rounded-[14px] bg-[accentColor] text-surface font-medium text-[15px] shadow-[0_2px_8px_rgba(teaR,teaG,teaB,0.25)]`
- All buttons: `transition: transform 160ms var(--ease-out)`, `:active { transform: scale(0.97) }`

### End Session Button
- `text-sm min-h-[48px] px-5 py-2.5 rounded-xl hover-lift`
- `border: 1px solid color-mix(in srgb, accentColor 12%, var(--color-border))`
- `color: color-mix(in srgb, accentColor 30%, var(--color-tertiary))`
- `bg-surface`

## Tea Accent Color Usage

Two elements at full saturation. Everything else descends:

| Element | Tea color opacity |
|---|---|
| Tea name text | 100% |
| Ring progress stroke | 100%, opacity 0.75 |
| Ring glow stroke (wider, behind progress) | 100%, opacity 0.06, stroke-width 12 |
| Ring track | `color-mix(tea 8%, border)` |
| Play/Brew Next button bg | 100% |
| Phase label | `color-mix(tea 50%, secondary)` |
| Active pill bg | `color-mix(tea 10%, transparent)` |
| Active pill border | `color-mix(tea 25%, border)` |
| Active pill text | 100% |
| Card border | `color-mix(tea 8%, border)` |
| Info row divider | `color-mix(tea 6%, border)` |
| Tip text | `color-mix(tea 25%, secondary)` |
| End session text | `color-mix(tea 30%, tertiary)` |
| End session border | `color-mix(tea 12%, border)` |
| Background wash peak | `color-mix(tea 14%, transparent)` center, fading to transparent |
| Button shadow | `rgba(teaR, teaG, teaB, 0.25)` |

## Animation Spec

### Color Wash (brewing)
```css
background: radial-gradient(
  ellipse 90% 55% at 50% 30%,
  color-mix(in srgb, var(--tea-accent) 14%, transparent),
  color-mix(in srgb, var(--tea-accent) 5%, transparent) 55%,
  transparent 100%
);
animation: wash-breathe 8s ease-in-out infinite;
/* 0%,100%: opacity 0.6  →  50%: opacity 1 */
```

Additionally, `--wash-intensity` CSS custom property driven by JS from 0→1 over the steep duration to deepen the wash as time progresses.

### Color Wash (between)
Same gradient, but static at opacity 0.55. No breathing animation — the pause should feel still.

### Ring Glow Stroke
A second SVG circle behind the progress stroke: same `stroke-dasharray`/`stroke-dashoffset`, but `stroke-width: 12` and `opacity: 0.06`. Creates a soft halo without any blur filter.

### Digit Transition
Each second, the timer number re-mounts (React `key={seconds}`), triggering:
```css
animation: digit-settle 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
/* from: opacity 0, translateY(6px)  →  to: opacity 1, translateY(0) */
```

### Completion Pulse
When infusion completes (existing ring-complete/ring-glow-complete animations stay). Add a brief wash flash:
```css
/* ::after pseudo on the container */
background: radial-gradient(circle at 50% 40%, color-mix(tea 20%, transparent), transparent 70%);
animation: wash-flash 1.2s ease-out forwards;
/* 0%: opacity 0  →  12%: opacity 1  →  100%: opacity 0 */
```

### Steam Wisps (between only)
Three `div` elements with `radial-gradient(ellipse at 50% 80%, color-mix(tea 6%, transparent), transparent 70%)`. Staggered animations:
- Wisp 1: 6s, no delay
- Wisp 2: 7.5s, 2s delay
- Wisp 3: 8.5s, 4s delay

Each wisp: rise 130px, widen to scaleX(1.3) at midpoint, narrow to scaleX(0.5) and fade out. Peak opacity: 0.45.

### Ring Idle Breathe (between only)
The dashed ring (`stroke-dasharray: 8 14`) oscillates opacity 0.15→0.3 on a 4s ease-in-out cycle.

### Phase Transitions
- Brewing → Between: crossfade only (opacity 0→1, 350ms ease-out). No translateY.
- Between → Brewing: `phase-enter` (existing: translateY 8px→0, opacity 0→1, 300ms ease-out). This is a fresh start, so vertical motion is appropriate.
- All other transitions: keep existing `phase-enter`/`phase-exit`.

### View Transition (enter/exit brewing)
New animation — replaces the hard conditional swap in `page.tsx`:
1. **Enter**: Container fades out (opacity 1→0, 250ms). Tea color radial gradient fades in on an overlay (150ms, starting at 200ms). Overlay holds 100ms. Brewing screen fades in through the overlay (300ms). Overlay fades out (200ms).
2. **Exit**: Reverse — brewing fades, color bridge, main page fades in.
3. Total duration: ~600ms enter, ~500ms exit.
4. Implementation: wrapper div in `page.tsx` with CSS transitions driven by a `transitioning` state, not React conditional rendering. Both views mount; visibility controlled by opacity/pointer-events.

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  /* Wash: no breathing, static at resting opacity */
  /* Wisps: hidden */
  /* Digit transition: instant (no translateY) */
  /* Ring idle: no breathing */
  /* View transition: simple 200ms crossfade */
  /* Phase transitions: 200ms opacity only */
  /* Completion: 400ms opacity fade, no bloom */
}
```

## Layout (Vertical Stack)

All content centered in a single column, `max-w-[680px]` matching the main page.

### Brewing State (top to bottom)
```
safe-area-top + 48px (pt-12)
Tea name (serif, 20px, tea color)
6px gap
Phase label (11px uppercase)
24px gap
Timer ring (210×210, number centered)
16px gap
Play/Pause button (56px circle)
28px gap
Info card (schedule pills + params + brew note)
flex-1 spacer
End session button
28px bottom padding
```

### Between State (top to bottom)
```
safe-area-top + 48px
Tea name
6px gap
Phase label ("Infusion N complete")
24px gap
Timer ring (dashed, number + "s" suffix centered)
16px gap
Adjuster row: [−3] 8px [number] 8px [+3]
16px gap
Brew Next CTA (full-width)
28px gap
Info card (schedule pills + params + tip)
flex-1 spacer
End session button
28px bottom padding
```

## Files Changed

| File | Change |
|---|---|
| `src/app/page.tsx` | Replace hard conditional with transition wrapper. Both views mount; opacity/pointer-events control visibility. Add transition state + tea color bridge overlay. |
| `src/components/BrewingTimer.tsx` | Complete layout rewrite. Single centered column. New card with pills. Serif timer number. Between state with ring persistence. Wash + wisp elements. |
| `src/components/TimerRing.tsx` | Add glow stroke layer. Add dashed mode for between state. Support serif font for number. Digit re-mount animation via key prop. |
| `src/app/globals.css` | Add wash-breathe, wash-flash, digit-settle, wisp, ring-idle-breathe keyframes. Add between-enter (fade-only) animation class. View transition keyframes. |
| `src/components/SessionSummary.tsx` | No changes needed — already matches the design language. |

## Out of Scope
- Rinse phase visual changes (keeps existing treatment)
- SessionSummary redesign (already consistent)
- Sound/haptic changes
- New tea presets or data changes
