# AI Advisor — Smart Parameter Generator

## Problem

The app has 8 tea presets. Users frequently brew teas that don't match any preset — a specific Wuyi cultivar, a particular vintage sheng, a rare white. Custom Mode lets them set params manually, but most people don't know the right gongfu parameters for an unfamiliar tea. The AI advisor should bridge this gap: type any tea, get tailored brewing parameters.

## Design

### Interaction Flow

1. User taps "Ask AI" from the main screen
2. Inline view opens with a text field and "Identify" button
3. User types a tea name or description (e.g. "aged Bai Mu Dan", "2020 Yiwu sheng")
4. Button shows "Identifying..." while the LLM responds
5. Result card appears with: tea name, summary, vessel/leaf steppers, params, Start Brewing
6. User adjusts vessel/leaf if needed, taps Start Brewing
7. BrewingTimer launches with the AI-generated params

### API Route (`src/app/api/identify/route.ts`)

**Input:** `{ query: string }`

**LLM prompt:** Ask the model to generate gongfu-specific brewing parameters directly. No preset matching — the AI produces custom params for the exact tea described.

**LLM output schema:**
```json
{
  "teaName": "string — specific tea name",
  "summary": "string — 2-3 sentences about origin, character, what makes it interesting",
  "tempC": "number — 70 to 100",
  "ratioGPerMl": "number — 0.04 to 0.08",
  "rinse": "boolean",
  "doubleRinse": "boolean",
  "steepCount": "number — 5 to 12",
  "firstSteepSeconds": "number — 5 to 15",
  "steepCurve": "number — 1.2 to 1.5 (multiplier per subsequent steep)"
}
```

**Server-side processing:**
- Parse and validate all values against the ranges above. Clamp out-of-range values.
- Generate the full `schedule: number[]` from `firstSteepSeconds`, `steepCurve`, and `steepCount` — don't trust the LLM to produce a consistent array.
- Return to client:
  ```json
  {
    "teaName": "string",
    "summary": "string",
    "tempC": number,
    "ratioGPerMl": number,
    "rinse": boolean,
    "doubleRinse": boolean,
    "schedule": [8, 10, 14, 19, 25, 34, 46, 62]
  }
  ```

**Error handling:** Same as current — 400 for missing query, 500 for LLM/parse failures with user-friendly message.

**No preset dependency.** The `getTeas()` import and categoryId matching are removed from this route.

### AIAdvisor Component (`src/components/AIAdvisor.tsx`)

**Props:**
```typescript
interface AIAdvisorProps {
  vesselMl: number;
  onVesselChange: (ml: number) => void;
  onStartBrewing: (result: AIResult, vesselMl: number) => void;
}
```

**State:**
- `query: string` — text input
- `loading: boolean` — API in flight
- `result: AIResult | null` — parsed API response
- `leafOverride: number | null` — user adjustment (same pattern as TeaDetail)
- `error: string | null`

**AIResult interface:**
```typescript
interface AIResult {
  teaName: string;
  summary: string;
  tempC: number;
  ratioGPerMl: number;
  rinse: boolean;
  doubleRinse: boolean;
  schedule: number[];
}
```

**Result card layout:**
```
┌─────────────────────────────┐
│  Tea Name                   │
│  "2-3 sentence summary"     │
│                             │
│  Vessel [−] 120ml [+]      │
│  Leaf   [−] 7.5g  [+]      │
│                             │
│  95°C · Rinse · 8 infusions │
│                             │
│  [ Start Brewing ]          │
└─────────────────────────────┘
```

- **Vessel stepper:** ±10ml, range 40–300ml. Changes persist to localStorage via `onVesselChange`. Changing vessel recalculates recommended leaf.
- **Leaf stepper:** ±0.5g, range 0.5–30g. When leaf deviates from recommended, schedule is adjusted via `adjustSchedule()` from `brewing.ts`.
- **Params row:** Temperature, rinse status (No / Yes / 2×), infusion count. Read-only, compact.
- **Summary:** Italic, serif-cn font, same style as TeaDetail's brew note.
- **Animation:** `detail-enter` class on the result card.
- **Loading:** Button text changes to "Identifying..." with subtle opacity pulse. No spinner.

**Schedule adjustment reuse:** Import `adjustSchedule` and `isScheduleAdjusted` from `brewing.ts`. When `leafOverride` is set, compute adjusted schedule the same way TeaDetail does. Show "adjusted" label on the leaf stepper when active.

### page.tsx Changes

- Pass `vesselMl` and `handleVesselChange` to `AIAdvisor` (currently only passed to TeaDetail)
- `handleAIBrew` builds `BrewParams` from the AI result + vessel + leaf, including `doubleRinse` and schedule adjustment
- No other structural changes — the view switching and inline pattern stay the same

### Files Modified

1. `src/app/api/identify/route.ts` — new prompt, remove preset matching, add validation + schedule generation
2. `src/components/AIAdvisor.tsx` — rewrite with vessel/leaf steppers, new result card, loading state
3. `src/app/page.tsx` — pass vesselMl/onVesselChange to AIAdvisor, update handleAIBrew

### Files Reused (no changes)

- `src/lib/brewing.ts` — `adjustSchedule`, `isScheduleAdjusted`, `calculateLeafAmount`
- `src/components/InlineViewHeader.tsx` — back navigation
- `src/app/globals.css` — `detail-enter` animation, design tokens

### What This Does NOT Include

- Photo/camera input (future feature)
- Conversational follow-ups during brewing (future feature)
- Offline/cached AI results
- Changes to the preset list or CustomMode

### Verification

1. `npm run build` — no type errors
2. `npm run dev` — navigate to Ask AI, type a tea name, verify:
   - Loading state shows "Identifying..."
   - Result card appears with tea name, summary, params
   - Vessel stepper changes leaf amount
   - Leaf stepper shows "adjusted" when changed
   - Start Brewing launches timer with correct params (temp, schedule, rinse/doubleRinse)
3. Test edge cases: very short query, unknown tea, LLM returning out-of-range values
4. `npx vitest run` — existing tests still pass
