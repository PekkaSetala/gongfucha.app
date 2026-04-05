# AI Advisor — Smart Parameter Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the preset-matching AI advisor with a smart parameter generator that produces custom gongfu brewing params for any tea.

**Architecture:** Single text input calls an API route that asks the LLM to generate brewing parameters (temp, ratio, rinse, steep curve). Server validates and computes the schedule array. The component displays a result card with vessel/leaf steppers (reusing patterns from TeaDetail) and launches BrewingTimer.

**Tech Stack:** Next.js 16 API route, OpenRouter LLM API, React 19, Tailwind CSS 4, existing `brewing.ts` utilities.

**Spec:** `docs/superpowers/specs/2026-04-05-ai-advisor-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/app/api/identify/route.ts` | New prompt, validation, schedule generation |
| Modify | `src/components/AIAdvisor.tsx` | Result card with steppers, loading state |
| Modify | `src/app/page.tsx` | Pass vesselMl/onVesselChange to AIAdvisor, update handleAIBrew |

No new files. No new dependencies.

---

### Task 1: Rewrite the API route

**Files:**
- Modify: `src/app/api/identify/route.ts` (full rewrite, 103 lines)

- [ ] **Step 1: Replace the system prompt**

Replace the entire `SYSTEM_PROMPT` constant and remove the `getTeas` import. The new prompt asks for raw brewing parameters instead of a category ID.

```typescript
import { NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";

const SYSTEM_PROMPT = `You are a gongfu cha brewing expert. Given a tea name or description, generate specific gongfu brewing parameters for that exact tea.

You must respond ONLY with valid JSON in this exact format:
{
  "teaName": "the specific tea name",
  "summary": "2-3 sentences about this tea — origin, character, what makes it interesting. Knowledgeable but concise.",
  "tempC": <number 70-100>,
  "ratioGPerMl": <number 0.04-0.08, grams of leaf per ml of water>,
  "rinse": <boolean, whether a rinse is recommended>,
  "doubleRinse": <boolean, true only for shou pu-erh or heavily pile-fermented teas>,
  "steepCount": <number 5-12, recommended number of infusions>,
  "firstSteepSeconds": <number 5-15>,
  "steepCurve": <number 1.2-1.5, multiplier applied to each subsequent steep>
}

Guidelines:
- Green/white/light oolong: lower temp (70-90), no rinse, gentler curve (1.2-1.3)
- Dark oolong/black: higher temp (90-100), rinse for roasted teas
- Pu-erh: full boil (95-100), always rinse, double rinse for shou
- Higher ratios (0.06-0.08) for teas that benefit from intensity (oolong, pu-erh)
- Lower ratios (0.04-0.055) for delicate teas (green, white)`;
```

- [ ] **Step 2: Replace the POST handler with validation and schedule generation**

Replace the entire `POST` function:

```typescript
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function generateSchedule(
  firstSteep: number,
  curve: number,
  count: number
): number[] {
  const schedule: number[] = [firstSteep];
  for (let i = 1; i < count; i++) {
    schedule.push(Math.round(schedule[i - 1] * curve));
  }
  return schedule;
}

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://gongfucha.app",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: query },
          ],
          temperature: 0.3,
          max_tokens: 400,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    const parsed = JSON.parse(content);

    // Validate and clamp all values
    const tempC = clamp(Math.round(parsed.tempC ?? 95), 70, 100);
    const ratioGPerMl = clamp(parsed.ratioGPerMl ?? 0.055, 0.04, 0.08);
    const rinse = Boolean(parsed.rinse);
    const doubleRinse = Boolean(parsed.doubleRinse);
    const steepCount = clamp(Math.round(parsed.steepCount ?? 8), 5, 12);
    const firstSteep = clamp(Math.round(parsed.firstSteepSeconds ?? 10), 5, 15);
    const curve = clamp(parsed.steepCurve ?? 1.35, 1.2, 1.5);

    const schedule = generateSchedule(firstSteep, curve, steepCount);

    return NextResponse.json({
      teaName: String(parsed.teaName || "Unknown Tea"),
      summary: String(parsed.summary || ""),
      tempC,
      ratioGPerMl,
      rinse,
      doubleRinse,
      schedule,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Couldn't identify that tea. Try a different description, or use Custom Mode.",
      },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Verify the route compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to `src/app/api/identify/route.ts`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/identify/route.ts
git commit -m "feat(api): generate custom gongfu params instead of matching presets

Replace preset-matching with direct LLM parameter generation.
Server validates ranges and computes schedule from steep curve."
```

---

### Task 2: Rewrite AIAdvisor component

**Files:**
- Modify: `src/components/AIAdvisor.tsx` (full rewrite, 119 lines)

- [ ] **Step 1: Write the new AIAdvisor component**

Replace the entire file content:

```tsx
"use client";

import { useState } from "react";
import {
  calculateLeafAmount,
  actualRatio,
  adjustSchedule,
  isScheduleAdjusted,
} from "@/lib/brewing";

interface AIResult {
  teaName: string;
  summary: string;
  tempC: number;
  ratioGPerMl: number;
  rinse: boolean;
  doubleRinse: boolean;
  schedule: number[];
}

interface AIAdvisorProps {
  vesselMl: number;
  onVesselChange: (ml: number) => void;
  onStartBrewing: (
    result: AIResult,
    vesselMl: number,
    leafG: number,
    schedule: number[],
    scheduleAdjusted: boolean
  ) => void;
}

export type { AIResult };

export function AIAdvisor({
  vesselMl,
  onVesselChange,
  onStartBrewing,
}: AIAdvisorProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [leafOverride, setLeafOverride] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!query.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setLeafOverride(null);

    try {
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (!res.ok) throw new Error("Failed to identify tea");

      const data: AIResult = await res.json();
      setResult(data);
    } catch {
      setError(
        "Couldn't identify that tea. Try a different description, or use Custom Mode instead."
      );
    } finally {
      setLoading(false);
    }
  };

  // Derived values when result exists
  const recommendedLeaf = result
    ? calculateLeafAmount(result.ratioGPerMl, vesselMl)
    : 0;
  const currentLeaf = leafOverride ?? recommendedLeaf;
  const currentRatio = result ? actualRatio(currentLeaf, vesselMl) : 0;
  const scheduleAdjusted = result
    ? isScheduleAdjusted(result.ratioGPerMl, currentRatio)
    : false;
  const displaySchedule =
    result && scheduleAdjusted
      ? adjustSchedule(result.schedule, result.ratioGPerMl, currentRatio)
      : result?.schedule ?? [];

  const handleVesselChange = (delta: number) => {
    const clamped = Math.max(40, Math.min(300, vesselMl + delta));
    onVesselChange(clamped);
    setLeafOverride(null);
  };

  const handleLeafChange = (delta: number) => {
    const current = leafOverride ?? recommendedLeaf;
    const clamped = Math.max(0.5, Math.min(30, current + delta));
    setLeafOverride(Math.round(clamped * 10) / 10);
  };

  const handleStartBrewing = () => {
    if (!result) return;
    onStartBrewing(result, vesselMl, currentLeaf, displaySchedule, scheduleAdjusted);
  };

  const stepperBtn =
    "w-9 h-9 rounded-lg border border-border bg-bg text-secondary text-[14px] font-medium flex items-center justify-center";

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-secondary leading-relaxed">
        Name or describe your tea — get gongfu brewing parameters.
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder='e.g. "Da Hong Pao" or "2020 Yiwu sheng"'
          className="flex-1 px-4 py-3 rounded-xl border border-border bg-surface text-[14px] text-primary placeholder:text-tertiary focus:outline-none focus:border-clay transition-colors duration-150"
          disabled={loading}
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !query.trim()}
          className="px-5 py-3 rounded-xl bg-clay text-[#FAF7F2] text-[14px] font-medium disabled:opacity-40 transition-opacity duration-150"
        >
          {loading ? (
            <span className="animate-pulse">Identifying...</span>
          ) : (
            "Identify"
          )}
        </button>
      </div>

      {error && <p className="text-[13px] text-clay italic">{error}</p>}

      {result && (
        <div className="bg-surface border border-border rounded-[14px] p-5 mt-2 detail-enter">
          <h3 className="text-lg font-medium mb-1">{result.teaName}</h3>
          <p className="text-[13px] font-serif-cn italic text-secondary leading-relaxed border-b border-border pb-3 mb-4">
            {result.summary}
          </p>

          {/* Vessel & Leaf steppers */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-[1px] text-tertiary mb-2">
                Vessel
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleVesselChange(-10)}
                  className={stepperBtn}
                >
                  −
                </button>
                <span className="text-[14px] font-medium min-w-[48px] text-center">
                  {vesselMl}ml
                </span>
                <button
                  onClick={() => handleVesselChange(10)}
                  className={stepperBtn}
                >
                  +
                </button>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-[1px] text-tertiary mb-2">
                Leaf
                {scheduleAdjusted && (
                  <span className="ml-1.5 normal-case tracking-normal text-gold">
                    adjusted
                  </span>
                )}
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleLeafChange(-0.5)}
                  className={stepperBtn}
                >
                  −
                </button>
                <span className="text-[14px] font-medium min-w-[48px] text-center">
                  {currentLeaf}g
                </span>
                <button
                  onClick={() => handleLeafChange(0.5)}
                  className={stepperBtn}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Compact params row */}
          <div className="flex gap-3 text-[13px] text-secondary mb-4">
            <span>{result.tempC}°C</span>
            <span className="text-border">·</span>
            <span>
              {result.doubleRinse
                ? "Rinse 2×"
                : result.rinse
                  ? "Rinse"
                  : "No rinse"}
            </span>
            <span className="text-border">·</span>
            <span>{displaySchedule.length} infusions</span>
          </div>

          {/* Start Brewing */}
          <button
            onClick={handleStartBrewing}
            className="w-full py-4 rounded-[14px] bg-clay text-[#FAF7F2] font-medium text-[15px]"
            style={{
              transition:
                "background-color 150ms var(--ease-out), transform 160ms var(--ease-out)",
            }}
          >
            Start Brewing
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the component compiles (will fail — page.tsx props mismatch)**

Run: `npx tsc --noEmit`
Expected: Error in `page.tsx` — `AIAdvisor` now requires `vesselMl` and `onVesselChange` props.

- [ ] **Step 3: Commit**

```bash
git add src/components/AIAdvisor.tsx
git commit -m "feat(ai): rewrite AIAdvisor with vessel/leaf steppers and AI-generated params

Result card mirrors TeaDetail: vessel/leaf steppers with schedule
adjustment, compact params row, detail-enter animation.
Accepts vesselMl and onVesselChange props (page.tsx update next)."
```

---

### Task 3: Wire up page.tsx

**Files:**
- Modify: `src/app/page.tsx:10-11,51-77,125-133`

- [ ] **Step 1: Update the AIResult import and handleAIBrew**

In `src/app/page.tsx`, replace the import on line 10:

```tsx
// Old:
import { AIAdvisor } from "@/components/AIAdvisor";

// New:
import { AIAdvisor } from "@/components/AIAdvisor";
import type { AIResult } from "@/components/AIAdvisor";
```

Then replace the `handleAIBrew` function (lines 51-77) and the inline type:

```tsx
  const handleAIBrew = (
    result: AIResult,
    aiVesselMl: number,
    leafG: number,
    schedule: number[],
    adjusted: boolean
  ) => {
    const recommendedLeaf =
      Math.round(result.ratioGPerMl * aiVesselMl * 10) / 10;
    handleStartBrewing({
      teaId: "ai-identified",
      teaName: result.teaName,
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

- [ ] **Step 2: Pass vesselMl and onVesselChange to AIAdvisor**

Replace the AI view block (lines 125-133):

```tsx
            {view === "ai" && (
              <div className="px-5">
                <InlineViewHeader
                  title="Ask AI"
                  onBack={() => setView("list")}
                />
                <AIAdvisor
                  vesselMl={vesselMl}
                  onVesselChange={handleVesselChange}
                  onStartBrewing={handleAIBrew}
                />
              </div>
            )}
```

- [ ] **Step 3: Verify the full app compiles**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Run existing tests**

Run: `npx vitest run`
Expected: All tests in `tests/brewing.test.ts` pass. No regressions.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(page): wire vesselMl and onVesselChange to AIAdvisor

Pass vessel state to AI view so vessel stepper persists to
localStorage and leaf recalculates correctly."
```

---

### Task 4: Manual verification

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Test the happy path**

1. Open `localhost:3000`
2. Tap "Ask AI"
3. Type "Da Hong Pao" and tap Identify
4. Verify: "Identifying..." shows during loading
5. Verify: result card appears with tea name, summary, vessel/leaf steppers, params row
6. Tap vessel + a few times — leaf amount should recalculate
7. Tap leaf + beyond recommended — "adjusted" label should appear
8. Tap Start Brewing — timer should launch with correct params

- [ ] **Step 3: Test edge cases**

1. Submit empty query — button should be disabled
2. Submit gibberish — should show error message
3. Try a shou pu-erh variant — verify doubleRinse shows "Rinse 2×"
4. Try a green tea — verify no rinse, lower temp

- [ ] **Step 4: Build check**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 5: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address issues found during manual AI advisor testing"
```
