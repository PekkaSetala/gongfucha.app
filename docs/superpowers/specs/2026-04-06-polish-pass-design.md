# Polish Pass — Design Spec

## Overview

A comprehensive polish pass addressing desktop density, timer experience, between-infusion guidance, pre-brew confidence, and micro-interactions. The app should feel like a thoughtful tea companion, not a settings panel.

## 1. Layout: Single Centered Column

**Problem:** Desktop main page and timer view feel empty — too much white space around narrow content.

**Solution:** Drop the desktop side panel. All views share one centered `max-w-[680px]` column.

### Main page (list view)
- Remove the `md:` two-column split (`flex gap-6 items-start` → single column)
- Remove the desktop-only sticky side panel and the "Pick a tea to get started" placeholder
- Tea list and inline detail live in the same column on all screen sizes
- Selected tea expands inline below the list item (same as current mobile behavior)
- AI and Custom paths (SecondaryPaths) remain below the list

### Timer view (two-column on desktop)
- **Desktop (md+):** Two-column layout within the centered container
  - Left: Timer ring + play/pause button
  - Right: Phase label, session info (temp/leaf/vessel), schedule with current infusion highlighted, brew note, contextual tip
- **Mobile:** Current stacked layout unchanged — ring centered, info below
- Breakpoint: `md:` (768px)

### AI and Custom views
- Already use `max-w-[680px]` centered — no changes needed

## 2. Timer Micro-interactions

### 2a. Haptic feedback on timer complete
- Call `navigator.vibrate(200)` when an infusion completes
- Gate behind `'vibrate' in navigator` — silent no-op on desktop
- Fire alongside the existing `playSound()` call in `handleTimerComplete`

### 2b. Fix sound reliability on mobile
- On the first user interaction (play button tap), play a silent audio buffer to unlock the Web Audio context
- Use a shared `AudioContext` instead of `new Audio()` for the ceramic-tap sound
- Decode the wav file once, replay via `AudioBufferSourceNode` on each completion
- Falls back to current `Audio()` approach if `AudioContext` is unavailable

### 2c. Visual completion pulse
- When timer hits zero, the progress ring plays a 300ms glow animation:
  - Ring stroke briefly thickens (7 → 12px) and opacity pulses to 1.0
  - The glow circle pulses to opacity 0.3
  - Both ease back to resting state
- CSS keyframes animation, triggered by a `ring-complete` class added on completion
- Animation plays before the phase transition fires

### 2d. Smoother phase transitions
- Replace the current hard cut (unmount old → mount new with `phase-enter`) with a crossfade:
  - Outgoing phase fades out (opacity 1→0, translateY 0→-4px, 200ms)
  - After 150ms overlap, incoming phase fades in (current `phase-enter` animation)
- Implement via a short transition state: `phase` changes trigger a `transitioning` flag, old content renders with exit animation, then new content mounts

### 2e. Tea-colored timer ring for custom/AI brews
- Custom mode: derive `teaColor` from the new tea type selector (each type maps to a preset color from `teas.ts`)
- AI mode: map the returned `categoryId` to the corresponding tea preset color
- Fallback remains `#8C563E` if no mapping found

## 3. Between-Infusion Screen

### 3a. Context display
- Show below the ±3 adjuster, above "Brew Next":
  - Brew note (if present)
  - Compact params: `{temp}°C · {ratio} · {vessel}ml`
- Same styling as the current session info card during brewing

### 3b. Contextual tips system

**Data model:**
```typescript
interface BrewTip {
  id: string;
  text: string;
  category: "sensory" | "troubleshooting" | "vocabulary" | "historical" | "comparison";
  teaTypes: string[]; // tea IDs or ["all"]
  infusionRange: [number, number]; // [min, max] inclusive, e.g. [1, 3]
}
```

**Content:** ~120 entries across categories:
- **Sensory** (~30): Prompts to notice aroma, texture, color, aftertaste. Tea-type specific where possible.
- **Troubleshooting** (~20): Practical fixes — "Too bitter? Flash pour next time." "Thin body? Add a few seconds." Tea-type aware.
- **Vocabulary** (~20): One Chinese tea term per entry with pinyin and brief explanation. Terms like hui gan (回甘), cha qi (茶气), sha gan (杀感), yan yun (岩韵).
- **Historical** (~25): Quotes from Lu Yu (*Chá Jīng*), Zhang Yuan (*Tea Record*), Sen no Rikyū, and other tea literature. Universal — apply to all teas.
- **Comparison** (~25): "How has the texture changed since steep 1?" / "Compare the aroma lid to steep 2." Infusion-range weighted.

**Selection algorithm:**
1. Filter tips by `teaTypes` (include matching tea ID + "all")
2. Filter by `infusionRange` (current infusion index must be within range)
3. Exclude tips already shown this session (track by `id` in component state)
4. Weight: prefer tea-specific over universal, prefer matching infusion range over broad ranges
5. Random pick from weighted candidates
6. If no candidates remain, fall back to any unshown universal tip

**Display:** Italic text below the context info, same style as brew notes. One tip per between-phase screen. No interaction required — just read it while you taste.

**Data file:** `src/data/brew-tips.ts` — exported as a typed array.

## 4. Pre-Brew Confidence

### 4a. Schedule preview in CustomMode
- Below the infusions stepper (or below the rinse toggle), show the generated schedule as pills
- Same visual style as TeaDetail's schedule pills
- Updates live as user changes base time or infusion count
- Label: "Infusion schedule (seconds)"

### 4b. Tea type selector in CustomMode
- New row of toggle buttons between the tea name input and temperature presets
- Options: Green, White, Oolong, Pu-erh, Black
- Visual style: same as temperature preset buttons (pill toggles with `border-clay bg-clay-soft` when selected)
- Selecting a type:
  - Sets `teaColor` on the brew params (mapped from preset colors in `teas.ts`)
  - Enables tea-type-specific tips during brewing
  - Does NOT change temp, ratio, or schedule — those stay user-controlled
- Optional — user can skip it (defaults to no type, universal tips, default ring color)

### 4c. AI category mapping
- Add `categoryId` to the LLM response schema in `/api/identify`
- Map to closest tea preset ID: `"green" | "fresh-white" | "sheng" | "light-oolong" | "dark-oolong" | "black" | "aged-white" | "shou"`
- Use for tip selection and ring color during AI-identified brew sessions
- Pass through `BrewParams.teaId` (replace current `"ai-identified"` with the mapped category)

## 5. Session Summary

When user taps "End session," show a summary screen before returning to the tea list:

- Tea name (with tea-colored accent)
- Infusions completed (e.g., "6 infusions")
- Total brewing time (sum of all completed steep durations)
- Leaf and vessel used
- "Done" button returns to tea list

Minimal, closure-focused. No data persistence — just a moment before you leave.

**Implementation:** New `SessionSummary` component. `BrewingTimer` tracks `completedInfusions` count and `totalTime` accumulator. On "End session," renders `SessionSummary` instead of immediately calling `onEnd`.

## Non-goals

- No brew history / session persistence (future work)
- No sharing / export
- No changes to the tea preset data (8 teas stays)
- No changes to the AI identify API logic (just add `categoryId` to response)
- No changes to the color scheme or design tokens
