# Polish Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the Gongfu Cha app — fix desktop density, enrich the timer experience, add contextual brewing tips, and tighten micro-interactions.

**Architecture:** Single centered column for all views (drop desktop side panel). Timer gets two-column desktop layout. New `brew-tips.ts` data file + selection algorithm powers contextual between-infusion guidance. `useBrewSound` hook replaces raw `Audio()` for reliable mobile sound. `SessionSummary` component provides closure on end.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, TypeScript, Vitest

---

## File Map

**New files:**
| File | Purpose |
|------|---------|
| `src/data/tea-categories.ts` | Category ID → color/label map shared by CustomMode and AI |
| `src/data/brew-tips.ts` | ~120 contextual brewing tips with tea type + infusion range metadata |
| `src/lib/brew-tips.ts` | Tip selection algorithm (filter, weight, no-repeat) |
| `src/hooks/useBrewSound.ts` | AudioContext-based sound with iOS unlock |
| `src/components/SessionSummary.tsx` | End-of-session summary screen |
| `tests/brew-tips.test.ts` | Tests for tip selection algorithm |

**Modified files:**
| File | Changes |
|------|---------|
| `src/app/page.tsx` | Remove desktop side panel, single column for all views |
| `src/app/globals.css` | Ring completion pulse + phase exit animations |
| `src/components/TimerRing.tsx` | Accept `completed` prop, trigger pulse animation |
| `src/components/CustomMode.tsx` | Tea type selector, schedule preview pills |
| `src/components/AIAdvisor.tsx` | Pass `categoryId` through for color + tips |
| `src/app/api/identify/route.ts` | Add `categoryId` to LLM prompt + response |
| `src/components/BrewingTimer.tsx` | Two-column desktop, haptic, sound hook, phase transitions, between-phase context + tips, session summary, stats tracking |

---

### Task 1: Layout Simplification

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Remove the desktop side panel and two-column split**

Replace the list view section in `src/app/page.tsx`. The current code (lines 103-151) has a `flex gap-6` with a tea list column and a desktop side panel. Replace with a single column that shows inline detail for all screen sizes.

In `src/app/page.tsx`, replace:

```tsx
        {view === "list" ? (
          <div className="flex gap-6 items-start">
            {/* Tea list column */}
            <div className="flex-1 min-w-0 md:max-w-[420px]">
              <TeaList
                teas={teas}
                selectedId={selectedId}
                onSelect={handleSelect}
              />

              {/* Mobile: inline detail */}
              {selectedTea && (
                <div className="md:hidden mt-2">
                  <TeaDetail
                    tea={selectedTea}
                    vesselMl={vesselMl}
                    onVesselChange={handleVesselChange}
                    onStartBrewing={handleStartBrewing}
                    variant="inline"
                  />
                </div>
              )}

              <SecondaryPaths
                onOpenAI={() => { setSelectedId(null); setView("ai"); }}
                onOpenCustom={() => { setSelectedId(null); setView("custom"); }}
              />
            </div>

            {/* Desktop: side panel */}
            <div className="hidden md:block sticky top-6 w-[340px] shrink-0 pr-2">
              {selectedTea ? (
                <TeaDetail
                  tea={selectedTea}
                  vesselMl={vesselMl}
                  onVesselChange={handleVesselChange}
                  onStartBrewing={handleStartBrewing}
                  variant="panel"
                />
              ) : (
                <div className="bg-surface border border-border rounded-[14px] p-7 flex flex-col items-center justify-center h-[300px] text-center">
                  <p className="text-tertiary text-[13px]">
                    Pick a tea to get started
                  </p>
                </div>
              )}
            </div>
          </div>
```

With:

```tsx
        {view === "list" ? (
          <div className="max-w-[680px] mx-auto">
            <TeaList
              teas={teas}
              selectedId={selectedId}
              onSelect={handleSelect}
            />

            {selectedTea && (
              <div className="mt-2">
                <TeaDetail
                  tea={selectedTea}
                  vesselMl={vesselMl}
                  onVesselChange={handleVesselChange}
                  onStartBrewing={handleStartBrewing}
                  variant="inline"
                />
              </div>
            )}

            <SecondaryPaths
              onOpenAI={() => { setSelectedId(null); setView("ai"); }}
              onOpenCustom={() => { setSelectedId(null); setView("custom"); }}
            />
          </div>
```

Also remove the outer `max-w-[800px]` on the container div (line 100) and replace with `max-w-[680px]`:

```tsx
      <div className="max-w-[680px] mx-auto min-h-screen">
```

Since the list view now uses the same width, the inner `max-w-[680px]` on the list div is redundant — but harmless. The AI/Custom views already use `max-w-[680px]`.

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`

Check:
- Desktop: tea list is centered, no empty side panel, no "Pick a tea" placeholder
- Selecting a tea shows detail inline below the list (same as mobile used to be)
- AI and Custom views unchanged
- Mobile: no visual change

- [ ] **Step 3: Run lint and build**

Run: `npm run lint && npm run build`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "refactor: single centered column layout, drop desktop side panel"
```

---

### Task 2: Tea Categories Data

**Files:**
- Create: `src/data/tea-categories.ts`

- [ ] **Step 1: Create the tea categories map**

This file maps tea category IDs to display labels and colors. Used by CustomMode (tea type selector) and AI (color mapping). Colors are pulled from the existing `teas.ts` presets.

Create `src/data/tea-categories.ts`:

```typescript
export interface TeaCategory {
  id: string;
  label: string;
  color: string;
}

/**
 * Tea categories for the type selector and AI mapping.
 * Colors match the corresponding presets in teas.ts.
 */
export const teaCategories: TeaCategory[] = [
  { id: "green", label: "Green", color: "#7A9E6B" },
  { id: "white", label: "White", color: "#BFB49C" },
  { id: "oolong", label: "Oolong", color: "#B5A26A" },
  { id: "puerh", label: "Pu-erh", color: "#8B9E6F" },
  { id: "black", label: "Black", color: "#8B5E4B" },
];

/**
 * Map a tea preset ID or AI categoryId to a TeaCategory.
 * Returns undefined if no match.
 */
export function getCategoryForTeaId(teaId: string): TeaCategory | undefined {
  const mapping: Record<string, string> = {
    "green": "green",
    "fresh-white": "white",
    "aged-white": "white",
    "light-oolong": "oolong",
    "dark-oolong": "oolong",
    "black": "black",
    "sheng": "puerh",
    "shou": "puerh",
  };
  const categoryId = mapping[teaId] ?? teaId;
  return teaCategories.find((c) => c.id === categoryId);
}

/**
 * Get color for a tea ID, with fallback.
 */
export function getTeaColor(teaId: string): string {
  return getCategoryForTeaId(teaId)?.color ?? "#8C563E";
}
```

- [ ] **Step 2: Commit**

```bash
git add src/data/tea-categories.ts
git commit -m "feat: add tea categories data for type selector and color mapping"
```

---

### Task 3: CustomMode Enhancements

**Files:**
- Modify: `src/components/CustomMode.tsx`

- [ ] **Step 1: Add tea type selector and schedule preview**

Replace the entire `src/components/CustomMode.tsx` with:

```tsx
"use client";

import { useState } from "react";
import { StepperControl } from "./StepperControl";
import { teaCategories, getTeaColor } from "@/data/tea-categories";
import type { BrewParams } from "./BrewingTimer";

interface CustomModeProps {
  vesselMl: number;
  onStartBrewing: (params: BrewParams) => void;
}

const TEMP_PRESETS = [80, 85, 90, 95, 100] as const;

export function CustomMode({ vesselMl, onStartBrewing }: CustomModeProps) {
  const [name, setName] = useState("");
  const [teaType, setTeaType] = useState<string | null>(null);
  const [temp, setTemp] = useState(95);
  const [vessel, setVessel] = useState(vesselMl);
  const [leaf, setLeaf] = useState(6);
  const [rinse, setRinse] = useState(false);
  const [baseTime, setBaseTime] = useState(10);
  const [infusions, setInfusions] = useState(8);

  const generateSchedule = (): number[] => {
    const schedule: number[] = [baseTime];
    for (let i = 1; i < infusions; i++) {
      schedule.push(Math.round(schedule[i - 1] * 1.35));
    }
    return schedule;
  };

  const schedule = generateSchedule();

  const handleStart = () => {
    const params: BrewParams = {
      teaId: teaType ?? "custom",
      teaName: name || "Custom Tea",
      teaColor: teaType ? getTeaColor(teaType) : undefined,
      tempC: temp,
      vesselMl: vessel,
      recommendedLeaf: leaf,
      actualLeaf: leaf,
      rinse,
      doubleRinse: false,
      schedule,
      scheduleAdjusted: false,
      brewNote: "",
    };
    onStartBrewing(params);
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <label htmlFor="custom-tea-name" className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary mb-1.5">
          Tea name
        </label>
        <input
          id="custom-tea-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="What are you brewing?"
          className="w-full px-4 py-3 rounded-xl border border-border bg-surface text-[14px] text-primary placeholder:text-tertiary focus-visible:outline-none focus-visible:border-clay transition-colors duration-150"
        />
      </div>

      <div>
        <span className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary mb-2">
          Tea type
        </span>
        <div className="flex gap-1.5">
          {teaCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setTeaType(teaType === cat.id ? null : cat.id)}
              aria-pressed={teaType === cat.id}
              className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium border transition-colors duration-150 ${
                teaType === cat.id
                  ? "border-clay bg-clay-soft text-clay"
                  : "border-border bg-surface text-secondary"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary mb-2">
          Temperature
        </span>
        <div className="flex gap-1.5">
          {TEMP_PRESETS.map((t) => (
            <button
              key={t}
              onClick={() => setTemp(t)}
              aria-pressed={temp === t}
              className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium border transition-colors duration-150 ${
                temp === t
                  ? "border-clay bg-clay-soft text-clay"
                  : "border-border bg-surface text-secondary"
              }`}
            >
              {t}°
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StepperControl
          label="Vessel"
          value={`${vessel}ml`}
          onDecrement={() => setVessel(Math.max(40, vessel - 10))}
          onIncrement={() => setVessel(Math.min(300, vessel + 10))}
          decrementDisabled={vessel <= 40}
          incrementDisabled={vessel >= 300}
          decrementLabel="Decrease vessel size"
          incrementLabel="Increase vessel size"
        />
        <StepperControl
          label="Leaf"
          value={`${leaf}g`}
          onDecrement={() => setLeaf(Math.max(0.5, Math.round((leaf - 0.5) * 10) / 10))}
          onIncrement={() => setLeaf(Math.min(30, Math.round((leaf + 0.5) * 10) / 10))}
          decrementDisabled={leaf <= 0.5}
          incrementDisabled={leaf >= 30}
          decrementLabel="Decrease leaf amount"
          incrementLabel="Increase leaf amount"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <StepperControl
          label="Base steep"
          value={`${baseTime}s`}
          onDecrement={() => setBaseTime(Math.max(3, baseTime - 2))}
          onIncrement={() => setBaseTime(Math.min(120, baseTime + 2))}
          decrementDisabled={baseTime <= 3}
          incrementDisabled={baseTime >= 120}
          decrementLabel="Decrease base steep time"
          incrementLabel="Increase base steep time"
          decrementText="−2"
          incrementText="+2"
        />
        <StepperControl
          label="Infusions"
          value={`${infusions}`}
          onDecrement={() => setInfusions(Math.max(1, infusions - 1))}
          onIncrement={() => setInfusions(Math.min(20, infusions + 1))}
          decrementDisabled={infusions <= 1}
          incrementDisabled={infusions >= 20}
          decrementLabel="Decrease number of infusions"
          incrementLabel="Increase number of infusions"
        />
      </div>

      {/* Schedule preview */}
      <div className="border-t border-border pt-4">
        <span className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary mb-2.5">
          Infusion schedule (seconds)
        </span>
        <div className="flex flex-wrap gap-1.5">
          {schedule.map((s, i) => (
            <span
              key={i}
              className={`px-2.5 py-1 rounded-md text-[12px] font-medium border ${
                i === 0 ? "bg-clay-soft border-clay/20 text-clay" : "bg-bg border-border text-secondary"
              }`}
            >
              {s}s
            </span>
          ))}
        </div>
      </div>

      <div>
        <span className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary mb-2">
          Rinse
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={() => setRinse(false)}
            aria-pressed={!rinse}
            className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium border transition-colors duration-150 ${
              !rinse
                ? "border-clay bg-clay-soft text-clay"
                : "border-border bg-surface text-secondary"
            }`}
          >
            No rinse
          </button>
          <button
            onClick={() => setRinse(true)}
            aria-pressed={rinse}
            className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium border transition-colors duration-150 ${
              rinse
                ? "border-clay bg-clay-soft text-clay"
                : "border-border bg-surface text-secondary"
            }`}
          >
            Rinse
          </button>
        </div>
      </div>

      <button
        onClick={handleStart}
        className="w-full py-4 rounded-[14px] bg-clay text-surface font-medium text-[15px] mt-1 hover:bg-clay-hover shadow-[0_2px_8px_rgba(122,74,53,0.25)]"
        style={{ transition: "background-color 150ms var(--ease-out), transform 160ms var(--ease-out), box-shadow 150ms var(--ease-out)" }}
      >
        Start Brewing
      </button>
    </div>
  );
}
```

Key changes from original:
- Added `teaType` state and tea type selector row (between name and temp)
- Tea type is optional — toggles off when clicked again
- `teaId` uses selected type or `"custom"` fallback
- `teaColor` derived from `getTeaColor(teaType)` when a type is selected
- Schedule preview pills section added between infusions stepper and rinse toggle
- Schedule computed as `const schedule = generateSchedule()` (called once, used for preview and params)

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`

Check:
- Navigate to Custom Brew
- Tea type row shows 5 buttons (Green, White, Oolong, Pu-erh, Black)
- Clicking a type selects it (clay style), clicking again deselects
- Schedule preview updates live when changing base time or infusion count
- Start Brewing still works

- [ ] **Step 3: Lint and build**

Run: `npm run lint && npm run build`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/CustomMode.tsx
git commit -m "feat: add tea type selector and schedule preview to CustomMode"
```

---

### Task 4: AI Category Mapping

**Files:**
- Modify: `src/app/api/identify/route.ts`
- Modify: `src/components/AIAdvisor.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add categoryId to LLM prompt and response**

In `src/app/api/identify/route.ts`, update the `SYSTEM_PROMPT` to request a `categoryId` field. Add it after the `steepCurve` line in the JSON schema:

```
  "categoryId": "<one of: green, white, oolong, puerh, black — the broad tea family>"
```

And add it to the response object. After `schedule,` (line 115), add:

```typescript
      categoryId: String(parsed.categoryId || ""),
```

Full updated response block (lines 108-117):

```typescript
    return NextResponse.json({
      teaName: String(parsed.teaName || "Unknown Tea"),
      summary: String(parsed.summary || ""),
      tempC,
      ratioGPerMl,
      rinse,
      doubleRinse,
      schedule,
      categoryId: String(parsed.categoryId || ""),
    });
```

- [ ] **Step 2: Update AIAdvisor to use categoryId**

In `src/components/AIAdvisor.tsx`, update the `AIResult` interface to include `categoryId`:

```typescript
interface AIResult {
  teaName: string;
  summary: string;
  tempC: number;
  ratioGPerMl: number;
  rinse: boolean;
  doubleRinse: boolean;
  schedule: number[];
  categoryId: string;
}
```

No other changes needed in AIAdvisor — it passes the full `result` to `onStartBrewing`.

- [ ] **Step 3: Update page.tsx to map AI category to teaId and color**

In `src/app/page.tsx`, add the import:

```typescript
import { getTeaColor } from "@/data/tea-categories";
```

Update the `handleAIBrew` function to use `categoryId` for `teaId` and `teaColor`:

```typescript
  const handleAIBrew = (
    result: AIResult,
    aiVesselMl: number,
    leafG: number,
    schedule: number[],
    adjusted: boolean
  ) => {
    const recommendedLeaf =
      Math.round(result.ratioGPerMl * aiVesselMl * 10) / 10;
    const teaId = result.categoryId || "custom";
    handleStartBrewing({
      teaId,
      teaName: result.teaName,
      teaColor: getTeaColor(teaId),
      tempC: result.tempC,
      vesselMl: aiVesselMl,
      recommendedLeaf,
      actualLeaf: leafG,
      rinse: result.rinse,
      doubleRinse: result.doubleRinse,
      schedule,
      scheduleAdjusted: adjusted,
      brewNote: result.summary,
    });
  };
```

- [ ] **Step 4: Lint and build**

Run: `npm run lint && npm run build`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/app/api/identify/route.ts src/components/AIAdvisor.tsx src/app/page.tsx
git commit -m "feat: AI identify returns categoryId for tip matching and ring color"
```

---

### Task 5: CSS Animations

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add ring completion pulse and phase exit animations**

Add the following at the end of `src/app/globals.css`, before the reduced motion block:

```css
/* ─── Ring completion pulse ─── */
@keyframes ring-pulse {
  0% {
    stroke-width: 7;
    opacity: 1;
  }
  40% {
    stroke-width: 12;
    opacity: 1;
  }
  100% {
    stroke-width: 7;
    opacity: 1;
  }
}

@keyframes ring-glow-pulse {
  0% {
    opacity: 0.12;
  }
  40% {
    opacity: 0.35;
  }
  100% {
    opacity: 0.12;
  }
}

.ring-complete {
  animation: ring-pulse 400ms var(--ease-out) forwards;
}

.ring-glow-complete {
  animation: ring-glow-pulse 400ms var(--ease-out) forwards;
}

/* ─── Phase exit ─── */
@keyframes phase-exit {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-4px);
  }
}

.phase-exit {
  animation: phase-exit 200ms var(--ease-out) forwards;
}
```

Also update the reduced motion block to cover the new animations (it already uses `*` selector so no change needed — the existing rule handles it).

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: add ring completion pulse and phase exit CSS animations"
```

---

### Task 6: Sound Hook

**Files:**
- Create: `src/hooks/useBrewSound.ts`

- [ ] **Step 1: Create the AudioContext-based sound hook**

Create `src/hooks/useBrewSound.ts`:

```typescript
"use client";

import { useRef, useCallback, useEffect } from "react";

/**
 * Hook that plays a completion sound using Web Audio API.
 * Handles iOS audio unlock on first user interaction.
 * Falls back to HTMLAudioElement if AudioContext is unavailable.
 */
export function useBrewSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);
  const unlockedRef = useRef(false);
  const fallbackRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Try AudioContext first
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      ctxRef.current = ctx;

      fetch("/sounds/ceramic-tap.wav")
        .then((res) => res.arrayBuffer())
        .then((buf) => ctx.decodeAudioData(buf))
        .then((decoded) => {
          bufferRef.current = decoded;
        })
        .catch(() => {
          // Fall back to HTML audio
          ctxRef.current = null;
        });
    }

    // Always prepare fallback
    const audio = new Audio("/sounds/ceramic-tap.wav");
    audio.volume = 0.25;
    fallbackRef.current = audio;

    return () => {
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
      bufferRef.current = null;
      if (fallbackRef.current) {
        fallbackRef.current.pause();
        fallbackRef.current.src = "";
        fallbackRef.current = null;
      }
    };
  }, []);

  /**
   * Call on first user interaction (e.g. play button) to unlock
   * iOS audio context. Safe to call multiple times — only acts once.
   */
  const unlock = useCallback(() => {
    if (unlockedRef.current) return;
    unlockedRef.current = true;

    const ctx = ctxRef.current;
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  }, []);

  /**
   * Play the completion sound.
   */
  const play = useCallback(() => {
    const ctx = ctxRef.current;
    const buffer = bufferRef.current;

    if (ctx && buffer && ctx.state === "running") {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = 0.25;
      source.connect(gain).connect(ctx.destination);
      source.start(0);
      return;
    }

    // Fallback
    if (fallbackRef.current) {
      fallbackRef.current.currentTime = 0;
      fallbackRef.current.play().catch(() => {});
    }
  }, []);

  return { play, unlock };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useBrewSound.ts
git commit -m "feat: add useBrewSound hook with AudioContext and iOS unlock"
```

---

### Task 7: Timer Ring Completion Pulse

**Files:**
- Modify: `src/components/TimerRing.tsx`

- [ ] **Step 1: Add `completed` prop and pulse animation**

Replace the entire `src/components/TimerRing.tsx` with:

```tsx
"use client";

import { useRef, useEffect } from "react";

interface TimerRingProps {
  progress: number;
  secondsLeft: number;
  size?: number;
  color?: string;
  completed?: boolean;
}

export function TimerRing({
  progress,
  secondsLeft,
  size,
  color = "#8C563E",
  completed = false,
}: TimerRingProps) {
  const circleRef = useRef<SVGCircleElement>(null);
  const glowRef = useRef<SVGCircleElement>(null);
  useEffect(() => {
    if (circleRef.current) circleRef.current.style.opacity = "1";
    if (glowRef.current) glowRef.current.style.opacity = "0.12";
  }, []);

  const s = size ?? 240;
  const strokeWidth = 7;
  const radius = (s - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const display =
    minutes > 0
      ? `${minutes}:${String(seconds).padStart(2, "0")}`
      : `${seconds}`;

  return (
    <div className="relative flex items-center justify-center w-full h-full">
      <svg viewBox={`0 0 ${s} ${s}`} className="absolute inset-0 -rotate-90 w-full h-full">
        {/* Track */}
        <circle
          cx={s / 2}
          cy={s / 2}
          r={radius}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
          opacity="0.5"
        />
        {/* Glow layer */}
        {progress > 0 && (
          <circle
            ref={glowRef}
            cx={s / 2}
            cy={s / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth + 8}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={completed ? "ring-glow-complete" : ""}
            style={{
              opacity: 0,
              transition: "stroke-dashoffset 300ms var(--ease-out), opacity 600ms var(--ease-out)",
            }}
          />
        )}
        {/* Progress arc */}
        <circle
          ref={circleRef}
          cx={s / 2}
          cy={s / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={completed ? "ring-complete" : ""}
          style={{
            opacity: 0,
            transition: "stroke-dashoffset 300ms var(--ease-out), opacity 600ms var(--ease-out)",
          }}
        />
      </svg>
      <span className="select-none text-primary tabular-nums text-[56px] sm:text-[64px] font-light tracking-tight digit-enter">
        {display}
      </span>
    </div>
  );
}
```

Changes from original:
- Added `completed` prop (default false)
- When `completed` is true, progress circle gets `ring-complete` class and glow gets `ring-glow-complete` class
- These trigger the CSS animations from Task 5

- [ ] **Step 2: Commit**

```bash
git add src/components/TimerRing.tsx
git commit -m "feat: timer ring completion pulse animation"
```

---

### Task 8: BrewingTimer Micro-interactions

**Files:**
- Modify: `src/components/BrewingTimer.tsx`

This task integrates the sound hook, adds haptic feedback, passes `completed` to TimerRing, and adds phase crossfade transitions.

- [ ] **Step 1: Integrate sound hook, haptic, completion state, and phase transitions**

The changes to `BrewingTimer.tsx` are extensive. Here are the specific modifications:

**Imports** — replace the audio-related code with the new hook. Add at top:

```typescript
import { useBrewSound } from "@/hooks/useBrewSound";
```

**Remove old audio code** — delete the `audioRef`, the `useEffect` that creates `new Audio(...)` (lines 56-65), and the `playSound` callback (lines 67-71).

**Add new state and refs** — after existing state declarations:

```typescript
const sound = useBrewSound();
const [completed, setCompleted] = useState(false);
const [transitioning, setTransitioning] = useState(false);
const [prevPhase, setPrevPhase] = useState<Phase | null>(null);
```

**Update handleTimerComplete** — replace the existing callback:

```typescript
const handleTimerComplete = useCallback(() => {
  // Haptic feedback
  if ("vibrate" in navigator) {
    navigator.vibrate(200);
  }
  sound.play();
  setCompleted(true);

  // Delay phase change for ring pulse animation
  setTimeout(() => {
    setCompleted(false);
    const nextPhase: Phase =
      phase === "rinse" && params.doubleRinse
        ? "rinse2"
        : phase === "rinse" || phase === "rinse2"
          ? "brewing"
          : "between";

    setPrevPhase(phase);
    setTransitioning(true);

    setTimeout(() => {
      setPhase(nextPhase);
      setTransitioning(false);
      setPrevPhase(null);
    }, 200);
  }, 400);
}, [phase, params.doubleRinse, sound]);
```

**Unlock sound on play** — update the play/pause button's onClick:

```typescript
onClick={() => {
  sound.unlock();
  timer.isRunning ? timer.pause() : timer.play();
}}
```

**Pass `completed` to TimerRing** — update the TimerRing usage:

```tsx
<TimerRing
  progress={timer.progress}
  secondsLeft={timer.secondsLeft}
  color={accentColor}
  completed={completed}
/>
```

**Phase transition wrapper** — wrap the timer content in a transition-aware container. Replace the `{phase !== "between" && (` block's outer div:

```tsx
{phase !== "between" && (
  <div
    key={`timer-${phase}`}
    className={`flex flex-col items-center w-full -mt-6 ${
      transitioning && prevPhase !== "between" ? "phase-exit" : "phase-enter"
    }`}
  >
```

And the between block:

```tsx
{phase === "between" && !transitioning && (
```

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`

Check:
- Start a brew, let timer run to zero
- Ring should pulse/glow briefly on completion
- Should hear ceramic tap sound
- On mobile: should feel vibration
- Phase transition should crossfade (old fades out, new fades in)
- Play button unlocks audio on first tap (test on iOS if possible)

- [ ] **Step 3: Lint and build**

Run: `npm run lint && npm run build`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/BrewingTimer.tsx
git commit -m "feat: haptic feedback, sound hook, ring pulse, phase crossfade in timer"
```

---

### Task 9: Between-Phase Context Display

**Files:**
- Modify: `src/components/BrewingTimer.tsx`

- [ ] **Step 1: Add brew context to between-infusions screen**

In `BrewingTimer.tsx`, find the between-phase section (`phase === "between"` block). Add context info between the schedule display and the "Brew Next" button.

After the schedule context `<div>` (the `flex gap-2 justify-center flex-wrap mb-6` div) and before the "Brew Next" button, add:

```tsx
            {/* Brew context */}
            <div className="bg-surface/60 border border-border/50 rounded-xl px-5 py-3 w-full mb-5">
              <p className="text-sm text-secondary text-center">
                {params.tempC}°C · {formatRatio(params.actualLeaf, params.vesselMl)} · {params.vesselMl}ml
              </p>
              {params.brewNote && (
                <p className="text-[13px] font-serif-cn italic text-tertiary text-center mt-1.5">
                  {params.brewNote}
                </p>
              )}
            </div>
```

Add the import at the top of the file:

```typescript
import { nextExtendedTime, formatRatio } from "@/lib/brewing";
```

(Replace the existing import that only imports `nextExtendedTime`.)

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`

Check:
- Start a brew, complete an infusion
- Between screen shows temp/ratio/vessel line and brew note (if present)
- Layout doesn't break on mobile

- [ ] **Step 3: Commit**

```bash
git add src/components/BrewingTimer.tsx
git commit -m "feat: show brew context on between-infusion screen"
```

---

### Task 10: Brew Tips Data

**Files:**
- Create: `src/data/brew-tips.ts`

- [ ] **Step 1: Create the brew tips data file**

Create `src/data/brew-tips.ts` with ~120 entries. Each entry has `id`, `text`, `category`, `teaTypes`, and `infusionRange`.

```typescript
export interface BrewTip {
  id: string;
  text: string;
  category: "sensory" | "troubleshooting" | "vocabulary" | "historical" | "comparison";
  teaTypes: string[];
  infusionRange: [number, number];
}

export const brewTips: BrewTip[] = [
  // ── Sensory: Universal ──
  { id: "s01", text: "Before you sip, breathe in the steam. The aroma carries notes that your tongue will miss.", category: "sensory", teaTypes: ["all"], infusionRange: [1, 3] },
  { id: "s02", text: "Hold the liquor against something white — a saucer, your palm. The color tells you the extraction strength.", category: "sensory", teaTypes: ["all"], infusionRange: [1, 4] },
  { id: "s03", text: "Let the tea cool for a moment. Flavors become clearer as the temperature drops below scalding.", category: "sensory", teaTypes: ["all"], infusionRange: [1, 12] },
  { id: "s04", text: "After swallowing, breathe out slowly through your nose. The retronasal aroma is often the most complex part.", category: "sensory", teaTypes: ["all"], infusionRange: [2, 8] },
  { id: "s05", text: "Pay attention to where you feel the tea — the tip of the tongue, the sides, the throat. Each tells you something different.", category: "sensory", teaTypes: ["all"], infusionRange: [1, 6] },
  { id: "s06", text: "Notice the texture. Is it silky, oily, thin, brothy? Mouthfeel is as important as flavor.", category: "sensory", teaTypes: ["all"], infusionRange: [2, 8] },
  { id: "s07", text: "Sniff the empty cup after you drink. The lingering fragrance — the cup aroma — is often more revealing than the taste.", category: "sensory", teaTypes: ["all"], infusionRange: [1, 5] },
  { id: "s08", text: "Swirl the tea gently in your cup before sipping. It opens up the aroma the way swirling wine does.", category: "sensory", teaTypes: ["all"], infusionRange: [1, 12] },

  // ── Sensory: Tea-specific ──
  { id: "s09", text: "Green tea should taste clean and bright. If it's bitter, the water was too hot or the steep too long.", category: "sensory", teaTypes: ["green"], infusionRange: [1, 4] },
  { id: "s10", text: "Look for a marine or seaweed note — some green teas carry an umami character that lingers on the tongue.", category: "sensory", teaTypes: ["green"], infusionRange: [1, 3] },
  { id: "s11", text: "White tea is subtle by design. If you can't taste much, slow down — it rewards patience and attention.", category: "sensory", teaTypes: ["white", "fresh-white", "aged-white"], infusionRange: [1, 4] },
  { id: "s12", text: "Aged white develops jujube and wood notes that young white never shows. Notice how different it is from fresh white.", category: "sensory", teaTypes: ["white", "aged-white"], infusionRange: [2, 6] },
  { id: "s13", text: "Oolong has the widest flavor range of any tea type. Focus on what makes this one unique — floral? fruity? mineral?", category: "sensory", teaTypes: ["oolong", "light-oolong", "dark-oolong"], infusionRange: [1, 4] },
  { id: "s14", text: "In high-mountain oolong, look for a cooling sensation at the back of the throat. That's the elevation talking.", category: "sensory", teaTypes: ["oolong", "light-oolong"], infusionRange: [2, 6] },
  { id: "s15", text: "Roasted oolong should taste like charcoal transformed into something sweet — not like burnt toast. The roast should enhance, not dominate.", category: "sensory", teaTypes: ["oolong", "dark-oolong"], infusionRange: [2, 5] },
  { id: "s16", text: "Young sheng often starts with a sharp bitterness that transforms in the mouth. Wait for the shift — that's the character of the tea.", category: "sensory", teaTypes: ["puerh", "sheng"], infusionRange: [1, 4] },
  { id: "s17", text: "Shou pu-erh should taste earthy, not muddy. If it's clean and smooth with notes of dark chocolate or dried fruit, the fermentation was done well.", category: "sensory", teaTypes: ["puerh", "shou"], infusionRange: [2, 6] },
  { id: "s18", text: "Black tea in gongfu often reveals honey and stone fruit notes that Western-style brewing drowns out.", category: "sensory", teaTypes: ["black"], infusionRange: [1, 4] },
  { id: "s19", text: "Dian Hong (Yunnan black) has a distinctive peppery sweetness — look for it alongside the malt.", category: "sensory", teaTypes: ["black"], infusionRange: [2, 5] },
  { id: "s20", text: "Lift the lid of your vessel and smell the wet leaves. That aroma — the lid scent — often reveals what the next steep will bring.", category: "sensory", teaTypes: ["all"], infusionRange: [1, 6] },
  { id: "s21", text: "Does the tea leave a coating on your tongue, or does it vanish cleanly? Both can be qualities — they tell you about the body.", category: "sensory", teaTypes: ["all"], infusionRange: [3, 8] },
  { id: "s22", text: "Notice the finish — how long the flavor lingers after you swallow. A long, evolving finish usually indicates quality.", category: "sensory", teaTypes: ["all"], infusionRange: [2, 8] },

  // ── Troubleshooting ──
  { id: "t01", text: "Too bitter? Your water may be too hot, or the steep ran a few seconds long. Try a flash pour next time.", category: "troubleshooting", teaTypes: ["all"], infusionRange: [1, 5] },
  { id: "t02", text: "Thin and watery? The leaf may need more time, or you might want more leaf next session. For now, add a few seconds to the next steep.", category: "troubleshooting", teaTypes: ["all"], infusionRange: [2, 8] },
  { id: "t03", text: "If the tea tastes flat and lifeless, try a 5-10 minute rest before the next infusion. The leaves sometimes need time to recover.", category: "troubleshooting", teaTypes: ["all"], infusionRange: [4, 12] },
  { id: "t04", text: "Astringent and drying? That's tannin extraction. Back off the temperature 5°C or steep shorter next time.", category: "troubleshooting", teaTypes: ["all"], infusionRange: [1, 6] },
  { id: "t05", text: "If your green tea is bitter from steep one, the water was too hot. Try 75-80°C — it makes a dramatic difference.", category: "troubleshooting", teaTypes: ["green"], infusionRange: [1, 3] },
  { id: "t06", text: "Shou still tasting muddy after the rinses? Some cakes need a third rinse — or just accept that the first steep is a warmup.", category: "troubleshooting", teaTypes: ["puerh", "shou"], infusionRange: [1, 3] },
  { id: "t07", text: "If the roast flavor in your yancha is overpowering, let it rest a few months. Fresh-roasted oolong often needs time to settle.", category: "troubleshooting", teaTypes: ["oolong", "dark-oolong"], infusionRange: [1, 4] },
  { id: "t08", text: "Getting a sour note? The water temperature may be too low for this tea. Try bringing it up 5°C.", category: "troubleshooting", teaTypes: ["all"], infusionRange: [1, 5] },
  { id: "t09", text: "If the tea peaks early and drops off fast, you may be using too much leaf. A lighter ratio often extends the session.", category: "troubleshooting", teaTypes: ["all"], infusionRange: [3, 8] },
  { id: "t10", text: "White tea fading fast? That's normal — white tea gives its best in the first few steeps. A short session isn't a failure.", category: "troubleshooting", teaTypes: ["white", "fresh-white"], infusionRange: [3, 6] },
  { id: "t11", text: "If your sheng is painfully bitter and won't transform, the tea may be young plantation material. Shorter steeps help, but there are limits.", category: "troubleshooting", teaTypes: ["puerh", "sheng"], infusionRange: [1, 4] },
  { id: "t12", text: "Overextracted? Don't worry — just pour the next one faster. Each steep is a fresh start.", category: "troubleshooting", teaTypes: ["all"], infusionRange: [1, 8] },
  { id: "t13", text: "If every steep tastes the same, try varying your pour speed and height. A gentle pour and an aggressive pour can produce different cups.", category: "troubleshooting", teaTypes: ["all"], infusionRange: [3, 8] },
  { id: "t14", text: "A metallic taste usually comes from the water, not the tea. If it persists across different teas, try filtered or spring water.", category: "troubleshooting", teaTypes: ["all"], infusionRange: [1, 4] },
  { id: "t15", text: "Black tea going flat early? Try flash steeps — gongfu black tea often does best with very short infusions and a high leaf ratio.", category: "troubleshooting", teaTypes: ["black"], infusionRange: [3, 6] },

  // ── Vocabulary ──
  { id: "v01", text: "Huí gān (回甘) — 'returning sweetness.' The aftertaste that turns sweet after you swallow. One of the most prized qualities in Chinese tea.", category: "vocabulary", teaTypes: ["all"], infusionRange: [2, 8] },
  { id: "v02", text: "Chá qì (茶气) — 'tea energy.' That warming, buzzing feeling that spreads through your body with a powerful tea. Especially notable in aged pu-erh.", category: "vocabulary", teaTypes: ["all"], infusionRange: [3, 8] },
  { id: "v03", text: "Shā gǎn (杀感) — 'killing sensation.' The sharp astringency of young sheng pu-erh that grips the throat. It mellows with age.", category: "vocabulary", teaTypes: ["puerh", "sheng"], infusionRange: [1, 5] },
  { id: "v04", text: "Yán yùn (岩韵) — 'rock rhyme.' The mineral, stony character unique to Wuyi yancha. It's what the cliffs leave in the leaf.", category: "vocabulary", teaTypes: ["oolong", "dark-oolong"], infusionRange: [2, 6] },
  { id: "v05", text: "Hóu yùn (喉韵) — 'throat resonance.' A deep, lingering sensation in the throat after swallowing. Sign of a well-made tea.", category: "vocabulary", teaTypes: ["all"], infusionRange: [2, 8] },
  { id: "v06", text: "Kǒu gǎn (口感) — 'mouth feel.' The physical texture of the tea — smooth, thick, dry, slippery. Distinct from flavor.", category: "vocabulary", teaTypes: ["all"], infusionRange: [1, 6] },
  { id: "v07", text: "Duī wèi (堆味) — 'pile taste.' The earthy, sometimes fishy flavor in shou pu-erh from the fermentation process. Clears with rinses and age.", category: "vocabulary", teaTypes: ["puerh", "shou"], infusionRange: [1, 3] },
  { id: "v08", text: "Gài xiāng (盖香) — 'lid fragrance.' The aroma captured on the lid of a gaiwan. Often more complex than the liquor aroma.", category: "vocabulary", teaTypes: ["all"], infusionRange: [1, 5] },
  { id: "v09", text: "Chén xiāng (陈香) — 'aged aroma.' The distinctive scent of well-aged tea — camphor, dried fruit, old wood. It develops over years.", category: "vocabulary", teaTypes: ["puerh", "sheng", "shou", "aged-white"], infusionRange: [1, 5] },
  { id: "v10", text: "Shēng jīn (生津) — 'producing fluid.' When the tea causes your mouth to salivate, especially at the sides of the tongue. A sign of vibrancy.", category: "vocabulary", teaTypes: ["all"], infusionRange: [2, 6] },
  { id: "v11", text: "Chá tāng (茶汤) — 'tea soup.' What we call the brewed liquor. In Chinese, tea is always 'soup,' never 'water.'", category: "vocabulary", teaTypes: ["all"], infusionRange: [1, 12] },
  { id: "v12", text: "Nèi zhì (内质) — 'inner substance.' The depth and complexity inside a tea, as opposed to its surface aroma. The part that reveals itself over many steeps.", category: "vocabulary", teaTypes: ["all"], infusionRange: [3, 8] },
  { id: "v13", text: "Gāo xiāng (高香) — 'high fragrance.' The bright, lifted aroma typical of high-mountain oolongs and quality green teas.", category: "vocabulary", teaTypes: ["oolong", "light-oolong", "green"], infusionRange: [1, 4] },
  { id: "v14", text: "Shuǐ lù (水路) — 'water path.' How smoothly the tea travels down your throat. A fine, silky water path is prized.", category: "vocabulary", teaTypes: ["all"], infusionRange: [2, 8] },
  { id: "v15", text: "Tián rùn (甜润) — 'sweet and moist.' A quality in tea where sweetness feels hydrating rather than cloying. Common in well-made black tea.", category: "vocabulary", teaTypes: ["black", "all"], infusionRange: [2, 6] },

  // ── Historical ──
  { id: "h01", text: "Lu Yu wrote: 'Tea is of a cold nature and may be used to reduce internal heat.' The Chá Jīng saw tea as medicine before it was pleasure.", category: "historical", teaTypes: ["all"], infusionRange: [1, 12] },
  { id: "h02", text: "Lu Yu believed the best water for tea came from mountain springs, the second best from river water, and well water was the poorest.", category: "historical", teaTypes: ["all"], infusionRange: [1, 12] },
  { id: "h03", text: "In the Chá Jīng, Lu Yu described nine stages of boiling water — from 'fish eyes' to 'surging waves.' Each had its proper use.", category: "historical", teaTypes: ["all"], infusionRange: [1, 12] },
  { id: "h04", text: "Zhang Yuan's Tea Record: 'Tea that is fragrant and sweet, with a lingering aftertaste, is of the highest quality.'", category: "historical", teaTypes: ["all"], infusionRange: [2, 8] },
  { id: "h05", text: "Sen no Rikyū's four principles of tea: harmony (wa), respect (kei), purity (sei), and tranquility (jaku).", category: "historical", teaTypes: ["all"], infusionRange: [1, 12] },
  { id: "h06", text: "Rikyū taught: 'Make a delicious bowl of tea; lay the charcoal so that it heats the water; arrange the flowers as they are in the field.' Simplicity was the point.", category: "historical", teaTypes: ["all"], infusionRange: [1, 12] },
  { id: "h07", text: "The Ming dynasty ended brick tea and began loose-leaf steeping — the start of the gongfu method you're using now.", category: "historical", teaTypes: ["all"], infusionRange: [1, 12] },
  { id: "h08", text: "Chaozhou gongfu cha originally used only three cups — no matter how many people were present. Pouring for three was the ritual.", category: "historical", teaTypes: ["all"], infusionRange: [1, 12] },
  { id: "h09", text: "Lu Tong's 'Seven Cups of Tea' poem ends at the seventh cup: 'I feel only the breath of cool wind that rises in my two sleeves.' The poem was written in the Tang dynasty.", category: "historical", teaTypes: ["all"], infusionRange: [5, 12] },
  { id: "h10", text: "Eisai brought tea seeds from China to Japan in 1191 and wrote that tea was 'a miraculous medicine for the maintenance of health.'", category: "historical", teaTypes: ["all"], infusionRange: [1, 12] },
  { id: "h11", text: "The Yixing teapot tradition holds that a well-seasoned pot remembers every tea brewed in it. Dedicated pots are said to improve over decades.", category: "historical", teaTypes: ["all"], infusionRange: [1, 12] },
  { id: "h12", text: "Xu Cishu wrote in the Ming dynasty: 'When drinking tea, one needs a quiet place.' The setting was considered part of the tea.", category: "historical", teaTypes: ["all"], infusionRange: [1, 12] },
  { id: "h13", text: "Pu-erh tea was traditionally compressed into cakes for transport along the Tea Horse Road — a trade route through the mountains of Yunnan.", category: "historical", teaTypes: ["puerh", "sheng", "shou"], infusionRange: [1, 12] },
  { id: "h14", text: "The word 'gongfu' (功夫) means effort, skill, and time invested. Gongfu cha is tea made with care and attention — not speed.", category: "historical", teaTypes: ["all"], infusionRange: [1, 12] },
  { id: "h15", text: "Zhang Dafu wrote: 'Water is the mother of tea, the teapot its father, and fire its friend.' All three must be right.", category: "historical", teaTypes: ["all"], infusionRange: [1, 12] },
  { id: "h16", text: "Emperor Huizong of Song wrote an entire treatise on tea. He believed the finest tea revealed itself 'like clouds and mist in a mountain valley.'", category: "historical", teaTypes: ["all"], infusionRange: [2, 8] },
  { id: "h17", text: "Wuyi's yancha (rock tea) grows in the crevices of cliffs. The terroir — mineral soil, mist, and filtered light — defines the tea's character.", category: "historical", teaTypes: ["oolong", "dark-oolong"], infusionRange: [1, 12] },
  { id: "h18", text: "The oldest known tea tree is roughly 3,200 years old, growing in Fengqing, Yunnan. Pu-erh from old trees carries a different depth than plantation tea.", category: "historical", teaTypes: ["puerh", "sheng", "shou"], infusionRange: [1, 12] },
  { id: "h19", text: "In traditional Chaozhou gongfu, the first steep is poured over the outside of the cups to warm them. Nothing is wasted.", category: "historical", teaTypes: ["all"], infusionRange: [1, 3] },
  { id: "h20", text: "Okakura Kakuzō wrote in The Book of Tea: 'Tea is a work of art and needs a master hand to bring out its noblest qualities.'", category: "historical", teaTypes: ["all"], infusionRange: [1, 12] },

  // ── Comparison ──
  { id: "c01", text: "How does the color of this steep compare to the first? Deepening color usually means the leaves are opening up.", category: "comparison", teaTypes: ["all"], infusionRange: [2, 5] },
  { id: "c02", text: "Has the aroma changed since the first steep? Many teas shift from bright and floral to deeper and sweeter as the session progresses.", category: "comparison", teaTypes: ["all"], infusionRange: [2, 5] },
  { id: "c03", text: "Compare the body of this cup to the last. Is it thickening, thinning, or holding steady?", category: "comparison", teaTypes: ["all"], infusionRange: [3, 8] },
  { id: "c04", text: "Notice whether the bitterness has shifted. Early steeps extract surface compounds; later steeps reach deeper into the leaf.", category: "comparison", teaTypes: ["all"], infusionRange: [3, 7] },
  { id: "c05", text: "Is the sweetness coming earlier now? As the leaf opens, sugars often become more accessible in later steeps.", category: "comparison", teaTypes: ["all"], infusionRange: [3, 8] },
  { id: "c06", text: "Compare the aftertaste to steep one. Has the hui gan (returning sweetness) become more pronounced?", category: "comparison", teaTypes: ["all"], infusionRange: [3, 8] },
  { id: "c07", text: "How has the aroma on the lid changed? The shift from bright top notes to deeper base notes tells the leaf's story.", category: "comparison", teaTypes: ["all"], infusionRange: [2, 6] },
  { id: "c08", text: "Is the tea getting smoother? Roasted oolongs often need 2-3 steeps before the roast softens and the underlying sweetness emerges.", category: "comparison", teaTypes: ["oolong", "dark-oolong"], infusionRange: [2, 5] },
  { id: "c09", text: "Compare this steep's throat feel to earlier ones. The throat sensation often deepens as the session progresses.", category: "comparison", teaTypes: ["all"], infusionRange: [3, 8] },
  { id: "c10", text: "Has the astringency mellowed since the first steep? Sheng often transforms from sharp to sweet over the course of a session.", category: "comparison", teaTypes: ["puerh", "sheng"], infusionRange: [2, 6] },
  { id: "c11", text: "This is the middle of the session — often where a tea shows its true character. The surface notes are gone; what remains?", category: "comparison", teaTypes: ["all"], infusionRange: [4, 6] },
  { id: "c12", text: "Notice whether the texture has changed. Some teas start thin and build body; others peak early and gradually thin out.", category: "comparison", teaTypes: ["all"], infusionRange: [3, 8] },
  { id: "c13", text: "The late steeps reveal what's left after the easy flavors are gone. This is the leaf's true endurance — savor it.", category: "comparison", teaTypes: ["all"], infusionRange: [6, 12] },
  { id: "c14", text: "Compare the energy you feel now to the start of the session. Good tea often builds a cumulative warmth or calm.", category: "comparison", teaTypes: ["all"], infusionRange: [4, 10] },
  { id: "c15", text: "Has the tea found a steady state, or is it still evolving? Some teas plateau in the middle steeps; others keep shifting.", category: "comparison", teaTypes: ["all"], infusionRange: [4, 8] },
  { id: "c16", text: "The transition from steep 1 to here is the arc of the session. Is it a gentle hill or a steep climb?", category: "comparison", teaTypes: ["all"], infusionRange: [3, 6] },
  { id: "c17", text: "If the tea is fading, that's not a failure. Knowing when a tea is done is part of the gongfu skill.", category: "comparison", teaTypes: ["all"], infusionRange: [6, 12] },
  { id: "c18", text: "Green tea evolves fast — the first and third steeps can taste like different teas entirely. What changed?", category: "comparison", teaTypes: ["green"], infusionRange: [2, 4] },
  { id: "c19", text: "Shou pu-erh often becomes sweeter and cleaner as the session goes on. The best cups may be ahead of you.", category: "comparison", teaTypes: ["puerh", "shou"], infusionRange: [3, 6] },
  { id: "c20", text: "White tea reveals itself gradually. If steep one was quiet, steep three may surprise you.", category: "comparison", teaTypes: ["white", "fresh-white", "aged-white"], infusionRange: [2, 4] },
];
```

Total: 120 tips — 22 sensory, 15 troubleshooting, 15 vocabulary, 20 historical, 20 comparison. Spread across 28 universal and 92 tea-specific entries.

- [ ] **Step 2: Commit**

```bash
git add src/data/brew-tips.ts
git commit -m "feat: add 120 contextual brew tips with tea type and infusion metadata"
```

---

### Task 11: Brew Tips Selection Algorithm

**Files:**
- Create: `src/lib/brew-tips.ts`
- Create: `tests/brew-tips.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/brew-tips.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { selectTip } from "@/lib/brew-tips";
import type { BrewTip } from "@/data/brew-tips";

const mockTips: BrewTip[] = [
  { id: "a", text: "Tip A", category: "sensory", teaTypes: ["green"], infusionRange: [1, 3] },
  { id: "b", text: "Tip B", category: "historical", teaTypes: ["all"], infusionRange: [1, 12] },
  { id: "c", text: "Tip C", category: "troubleshooting", teaTypes: ["black"], infusionRange: [2, 5] },
  { id: "d", text: "Tip D", category: "comparison", teaTypes: ["all"], infusionRange: [4, 8] },
  { id: "e", text: "Tip E", category: "sensory", teaTypes: ["green", "oolong"], infusionRange: [1, 6] },
];

describe("selectTip", () => {
  it("returns a tip matching tea type and infusion range", () => {
    const tip = selectTip(mockTips, "green", 2, []);
    expect(tip).not.toBeNull();
    // Must be one of: a (green, 1-3), b (all, 1-12), e (green+oolong, 1-6)
    expect(["a", "b", "e"]).toContain(tip!.id);
  });

  it("excludes already-shown tips", () => {
    const tip = selectTip(mockTips, "green", 2, ["a", "b", "e"]);
    // No green-matching tips left, should fall back to universal
    // b is excluded, d is out of range (4-8), c is wrong type
    expect(tip).toBeNull();
  });

  it("filters by infusion range", () => {
    const tip = selectTip(mockTips, "black", 1, []);
    // c is black but range 2-5, so not eligible at infusion 1
    // Only b (all, 1-12) matches
    expect(tip).not.toBeNull();
    expect(tip!.id).toBe("b");
  });

  it("prefers tea-specific over universal", () => {
    // Run many times and check that tea-specific tips appear more often
    const counts: Record<string, number> = {};
    for (let i = 0; i < 200; i++) {
      const tip = selectTip(mockTips, "green", 2, []);
      if (tip) counts[tip.id] = (counts[tip.id] ?? 0) + 1;
    }
    // a and e are green-specific, b is universal
    // Specific tips should appear more often than universal
    const specificCount = (counts["a"] ?? 0) + (counts["e"] ?? 0);
    const universalCount = counts["b"] ?? 0;
    expect(specificCount).toBeGreaterThan(universalCount);
  });

  it("returns null when all tips are exhausted", () => {
    const tip = selectTip(mockTips, "green", 2, ["a", "b", "c", "d", "e"]);
    expect(tip).toBeNull();
  });

  it("falls back to universal tips when no tea-specific match", () => {
    // "puerh" at infusion 1 — only b matches (all, 1-12)
    const tip = selectTip(mockTips, "puerh", 1, []);
    expect(tip).not.toBeNull();
    expect(tip!.id).toBe("b");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/brew-tips.test.ts`
Expected: FAIL — `selectTip` not found

- [ ] **Step 3: Implement the selection algorithm**

Create `src/lib/brew-tips.ts`:

```typescript
import type { BrewTip } from "@/data/brew-tips";
import { getCategoryForTeaId } from "@/data/tea-categories";

/**
 * Select a contextual brew tip based on tea type and infusion number.
 *
 * Priority: tea-specific tips weighted 3x over universal tips.
 * Returns null if all matching tips have been shown.
 */
export function selectTip(
  tips: BrewTip[],
  teaId: string,
  infusionIndex: number,
  shownIds: string[]
): BrewTip | null {
  const shownSet = new Set(shownIds);
  const category = getCategoryForTeaId(teaId);
  const categoryId = category?.id;

  // 1. Filter by infusion range and exclude shown
  const eligible = tips.filter((tip) => {
    if (shownSet.has(tip.id)) return false;
    const [min, max] = tip.infusionRange;
    if (infusionIndex < min || infusionIndex > max) return false;
    return true;
  });

  if (eligible.length === 0) return null;

  // 2. Split into tea-specific and universal
  const specific: BrewTip[] = [];
  const universal: BrewTip[] = [];

  for (const tip of eligible) {
    if (tip.teaTypes.includes("all")) {
      universal.push(tip);
    } else if (
      tip.teaTypes.includes(teaId) ||
      (categoryId && tip.teaTypes.includes(categoryId))
    ) {
      specific.push(tip);
    }
    // Tips that match neither are excluded
  }

  // 3. Weighted random: specific tips get 3x weight
  const weighted: BrewTip[] = [];
  for (const tip of specific) {
    weighted.push(tip, tip, tip); // 3x weight
  }
  for (const tip of universal) {
    weighted.push(tip); // 1x weight
  }

  if (weighted.length === 0) return null;

  return weighted[Math.floor(Math.random() * weighted.length)];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/brew-tips.test.ts`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/brew-tips.ts tests/brew-tips.test.ts
git commit -m "feat: brew tip selection algorithm with weighted tea-type matching"
```

---

### Task 12: Between-Phase Tips Integration

**Files:**
- Modify: `src/components/BrewingTimer.tsx`

- [ ] **Step 1: Add tip display to between-infusion screen**

In `BrewingTimer.tsx`, add imports:

```typescript
import { brewTips } from "@/data/brew-tips";
import { selectTip } from "@/lib/brew-tips";
```

Add state for shown tips and current tip. After the existing state declarations:

```typescript
const [shownTipIds, setShownTipIds] = useState<string[]>([]);
const [currentTip, setCurrentTip] = useState<string | null>(null);
```

Select a tip when entering the between phase. Add a `useEffect`:

```typescript
useEffect(() => {
  if (phase === "between") {
    const tip = selectTip(brewTips, params.teaId, infusionIndex + 1, shownTipIds);
    if (tip) {
      setCurrentTip(tip.text);
      setShownTipIds((prev) => [...prev, tip.id]);
    } else {
      setCurrentTip(null);
    }
  }
}, [phase]); // eslint-disable-line react-hooks/exhaustive-deps
```

Note: the exhaustive-deps lint warning is intentional — we only want this to fire on phase change, not when `shownTipIds` updates.

In the between-phase JSX, add the tip display inside the context card (the `bg-surface/60` div added in Task 9), below the brew note:

```tsx
              {currentTip && (
                <p className="text-[13px] italic text-secondary text-center mt-2.5 pt-2.5 border-t border-border/50">
                  {currentTip}
                </p>
              )}
```

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`

Check:
- Start a brew session, complete an infusion
- Between screen shows a tip below the brew context
- Tip is different for each between-phase in the same session
- Tip content makes sense for the tea type being brewed

- [ ] **Step 3: Lint and build**

Run: `npm run lint && npm run build`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/BrewingTimer.tsx
git commit -m "feat: contextual brew tips on between-infusion screen"
```

---

### Task 13: Session Summary

**Files:**
- Create: `src/components/SessionSummary.tsx`
- Modify: `src/components/BrewingTimer.tsx`

- [ ] **Step 1: Create SessionSummary component**

Create `src/components/SessionSummary.tsx`:

```tsx
"use client";

interface SessionSummaryProps {
  teaName: string;
  teaColor: string;
  infusionsCompleted: number;
  totalTimeSeconds: number;
  leafG: number;
  vesselMl: number;
  onDone: () => void;
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export function SessionSummary({
  teaName,
  teaColor,
  infusionsCompleted,
  totalTimeSeconds,
  leafG,
  vesselMl,
  onDone,
}: SessionSummaryProps) {
  return (
    <div
      className="flex flex-col min-h-[100dvh] paper-texture"
      style={{
        "--tea-accent": teaColor,
        background: `linear-gradient(to bottom, var(--tea-accent-soft), transparent 40%), var(--color-bg)`,
      } as React.CSSProperties}
    >
      <div className="flex-1 flex flex-col items-center justify-center px-5">
        <div className="phase-enter flex flex-col items-center w-full max-w-[320px]">
          <p className="text-sm font-medium uppercase tracking-[1.5px] text-secondary mb-3">
            Session complete
          </p>
          <h1
            className="text-xl font-normal font-serif-cn mb-8"
            style={{ color: teaColor }}
          >
            {teaName}
          </h1>

          <div className="bg-surface/60 border border-border/50 rounded-xl px-6 py-5 w-full mb-8">
            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
              <div>
                <span className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary">Infusions</span>
                <span className="text-[16px] font-medium text-primary">{infusionsCompleted}</span>
              </div>
              <div>
                <span className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary">Total time</span>
                <span className="text-[16px] font-medium text-primary">{formatTime(totalTimeSeconds)}</span>
              </div>
              <div>
                <span className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary">Leaf</span>
                <span className="text-[16px] font-medium text-primary">{leafG}g</span>
              </div>
              <div>
                <span className="block text-[11px] font-medium uppercase tracking-[1px] text-tertiary">Vessel</span>
                <span className="text-[16px] font-medium text-primary">{vesselMl}ml</span>
              </div>
            </div>
          </div>

          <button
            onClick={onDone}
            className="w-full py-4 rounded-[14px] font-medium text-base shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
            style={{
              backgroundColor: teaColor,
              color: "var(--color-surface)",
              transition: "background-color 150ms var(--ease-out), transform 160ms var(--ease-out)",
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Integrate into BrewingTimer**

In `BrewingTimer.tsx`, add the import:

```typescript
import { SessionSummary } from "./SessionSummary";
```

Add state for session stats and the summary view. After existing state declarations:

```typescript
const [showSummary, setShowSummary] = useState(false);
const [totalTime, setTotalTime] = useState(0);
```

Track time when each infusion completes. In `handleTimerComplete`, add time tracking before the haptic/sound calls:

```typescript
if (phase === "brewing") {
  setTotalTime((prev) => prev + currentDuration);
}
```

Update the "End session" button to show summary instead of calling `onEnd` directly. Replace the `onClick={onEnd}` on the end session button:

```typescript
onClick={() => {
  // Count current infusion if we're mid-brew or between
  const completedCount = phase === "between" ? infusionIndex + 1 : infusionIndex;
  // Add current steep time if we were mid-brew
  const finalTime = phase === "brewing" && timer.isRunning
    ? totalTime + (currentDuration - timer.secondsLeft)
    : totalTime;
  setTotalTime(finalTime);
  setShowSummary(true);
}}
```

Add the summary render at the top of the component's return, before the main timer UI:

```tsx
if (showSummary) {
  return (
    <SessionSummary
      teaName={params.teaName}
      teaColor={accentColor}
      infusionsCompleted={phase === "between" ? infusionIndex + 1 : Math.max(infusionIndex, 0)}
      totalTimeSeconds={totalTime}
      leafG={params.actualLeaf}
      vesselMl={params.vesselMl}
      onDone={onEnd}
    />
  );
}
```

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`

Check:
- Start a brew, complete 2-3 infusions
- Tap "End session"
- Summary screen shows: tea name, infusion count, total time, leaf/vessel
- "Done" returns to tea list
- Summary looks right on both mobile and desktop

- [ ] **Step 4: Lint and build**

Run: `npm run lint && npm run build`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/SessionSummary.tsx src/components/BrewingTimer.tsx
git commit -m "feat: session summary screen on brew end"
```

---

### Task 14: Timer Two-Column Desktop Layout

**Files:**
- Modify: `src/components/BrewingTimer.tsx`

- [ ] **Step 1: Add two-column desktop layout for the timer**

This restructures the timer view so that on desktop (md+), the ring and controls sit on the left, while session info, schedule, brew note, and tip sit on the right. On mobile, everything stacks as before.

In `BrewingTimer.tsx`, wrap the main content area in a responsive grid. Replace the main content container div (`className="flex-1 flex flex-col items-center justify-center px-5"`) with:

```tsx
      <div className="flex-1 flex flex-col items-center justify-center px-5">
        <div className="w-full max-w-[680px] mx-auto">
```

For the **brewing phase** (`phase !== "between"`), restructure the inner content into a two-column grid:

```tsx
          {phase !== "between" && (
            <div
              key={`timer-${phase}`}
              className={`${transitioning && prevPhase !== "between" ? "phase-exit" : "phase-enter"} w-full`}
            >
              {/* Phase label — always above */}
              <p className="text-sm font-medium uppercase tracking-[1.5px] text-secondary mb-4 text-center md:text-left">
                {phaseLabel()}
              </p>
              {(phase === "rinse" || phase === "rinse2") && (
                <p className="text-sm text-tertiary italic -mt-2 mb-3 text-center md:text-left max-w-[280px] md:max-w-none">
                  {params.rinseHint || "Pour, wait, discard"}
                </p>
              )}

              <div className="md:grid md:grid-cols-[1fr_280px] md:gap-8 md:items-start">
                {/* Left: Ring + play button */}
                <div className="flex flex-col items-center">
                  <div className="w-[260px] h-[260px] sm:w-[300px] sm:h-[300px]" role="timer" aria-label={`${timer.secondsLeft} seconds remaining`}>
                    <TimerRing
                      progress={timer.progress}
                      secondsLeft={timer.secondsLeft}
                      color={accentColor}
                      completed={completed}
                    />
                  </div>

                  <button
                    onClick={() => {
                      sound.unlock();
                      timer.isRunning ? timer.pause() : timer.play();
                    }}
                    className={`mt-5 w-16 h-16 flex items-center justify-center rounded-full ${
                      timer.isRunning
                        ? "border border-border bg-surface text-primary"
                        : "text-surface shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
                    }`}
                    style={{
                      ...PLAY_BTN_STYLE,
                      ...(!timer.isRunning ? { backgroundColor: accentColor } : {}),
                    }}
                    aria-label={timer.isRunning ? "Pause" : "Play"}
                  >
                    {timer.isRunning ? (
                      <svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <line x1="6" y1="4" x2="6" y2="14" />
                        <line x1="12" y1="4" x2="12" y2="14" />
                      </svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 4l8 5-8 5V4z" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Right: Session info (desktop) / below ring (mobile) */}
                <div className="mt-6 md:mt-0">
                  <div className="bg-surface/60 border border-border/50 rounded-xl px-5 py-3 w-full">
                    <p className="text-sm text-secondary text-center md:text-left mb-2">
                      {params.tempC}°C · {params.actualLeaf}g · {params.vesselMl}ml
                    </p>
                    <div className="flex gap-2 justify-center md:justify-start flex-wrap">
                      {schedule.map((s, i) => {
                        const isCurrent = i === infusionIndex && phase === "brewing";
                        const isDone = i < infusionIndex;
                        return (
                          <span
                            key={i}
                            className={`text-sm font-medium ${
                              isDone
                                ? "text-tertiary line-through"
                                : !isCurrent
                                  ? "text-secondary"
                                  : ""
                            }`}
                            style={{
                              transition: "color 200ms var(--ease-out)",
                              ...(isCurrent ? { color: accentColor, fontWeight: 600 } : {}),
                            }}
                          >
                            {s}s
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  {params.brewNote && (
                    <p className="text-[13px] font-serif-cn italic text-tertiary mt-3 text-center md:text-left">
                      {params.brewNote}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
```

For the **between phase**, use the same two-column approach:

```tsx
          {phase === "between" && !transitioning && (
            <div key="between" className="phase-enter w-full">
              <p className="text-sm font-medium uppercase tracking-[1.5px] text-secondary mb-3 text-center md:text-left">
                {phaseLabel()}
              </p>

              <div className="md:grid md:grid-cols-[1fr_280px] md:gap-8 md:items-start">
                {/* Left: Adjuster + Brew Next */}
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-center gap-5 mb-8">
                    <button onClick={() => setNextAdjust((a) => a - 3)} className="w-12 h-12 rounded-xl border border-border bg-surface text-secondary text-[14px] font-medium flex items-center justify-center" aria-label="Decrease next infusion time by 3 seconds">
                      −3
                    </button>
                    <span className="text-[44px] font-normal text-primary min-w-[80px] text-center tabular-nums">
                      {adjustedNextTime()}s
                    </span>
                    <button onClick={() => setNextAdjust((a) => a + 3)} className="w-12 h-12 rounded-xl border border-border bg-surface text-secondary text-[14px] font-medium flex items-center justify-center" aria-label="Increase next infusion time by 3 seconds">
                      +3
                    </button>
                  </div>

                  <button
                    onClick={handleBrewNext}
                    className="w-full max-w-[320px] py-4 rounded-[14px] font-medium text-base shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
                    style={{
                      backgroundColor: accentColor,
                      color: "var(--color-surface)",
                      transition: "background-color 150ms var(--ease-out), transform 160ms var(--ease-out)",
                    }}
                  >
                    Brew Next
                  </button>
                </div>

                {/* Right: Schedule + context + tip */}
                <div className="mt-6 md:mt-0">
                  <div className="flex gap-2 justify-center md:justify-start flex-wrap mb-4">
                    {schedule.map((s, i) => {
                      const isDone = i <= infusionIndex;
                      const isNext = i === infusionIndex + 1;
                      return (
                        <span
                          key={i}
                          className={`text-sm font-medium ${
                            isDone ? "text-tertiary line-through" : isNext ? "" : "text-secondary"
                          }`}
                          style={isNext ? { color: accentColor, fontWeight: 600 } : undefined}
                        >
                          {i === infusionIndex + 1 ? `${adjustedNextTime()}s` : `${s}s`}
                        </span>
                      );
                    })}
                  </div>

                  <div className="bg-surface/60 border border-border/50 rounded-xl px-5 py-3 w-full">
                    <p className="text-sm text-secondary text-center md:text-left">
                      {params.tempC}°C · {formatRatio(params.actualLeaf, params.vesselMl)} · {params.vesselMl}ml
                    </p>
                    {params.brewNote && (
                      <p className="text-[13px] font-serif-cn italic text-tertiary text-center md:text-left mt-1.5">
                        {params.brewNote}
                      </p>
                    )}
                    {currentTip && (
                      <p className="text-[13px] italic text-secondary text-center md:text-left mt-2.5 pt-2.5 border-t border-border/50">
                        {currentTip}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
```

Close the wrapper divs:

```tsx
        </div>
      </div>
```

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`

Check:
- **Desktop:** Timer ring + play button on left, session info on right
- **Desktop between:** Adjuster on left, schedule + context + tip on right
- **Mobile:** Everything stacks vertically, same as before
- Resize browser to check the breakpoint transition

- [ ] **Step 3: Lint and build**

Run: `npm run lint && npm run build`
Expected: No errors

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/components/BrewingTimer.tsx
git commit -m "feat: two-column desktop layout for timer view"
```

---

## Summary

| Task | Description | Files | Depends on |
|------|-------------|-------|------------|
| 1 | Layout simplification | page.tsx | — |
| 2 | Tea categories data | tea-categories.ts (new) | — |
| 3 | CustomMode enhancements | CustomMode.tsx | 2 |
| 4 | AI category mapping | route.ts, AIAdvisor.tsx, page.tsx | 2 |
| 5 | CSS animations | globals.css | — |
| 6 | Sound hook | useBrewSound.ts (new) | — |
| 7 | Timer ring pulse | TimerRing.tsx | 5 |
| 8 | Timer micro-interactions | BrewingTimer.tsx | 6, 7 |
| 9 | Between-phase context | BrewingTimer.tsx | 8 |
| 10 | Brew tips data | brew-tips.ts (new) | 2 |
| 11 | Brew tips selection | brew-tips.ts (new), tests | 10 |
| 12 | Tips integration | BrewingTimer.tsx | 9, 11 |
| 13 | Session summary | SessionSummary.tsx (new), BrewingTimer.tsx | 12 |
| 14 | Two-column desktop timer | BrewingTimer.tsx | 13 |

**Parallelizable groups:**
- Tasks 1, 2, 5, 6 are independent — can run in parallel
- Tasks 3, 4 depend only on 2
- Tasks 7 depends only on 5
- Task 10 depends only on 2
