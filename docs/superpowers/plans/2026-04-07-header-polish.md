# Header Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the app header with a 功夫茶 watermark, rotating time-aware headlines, and richer weather mood expressions.

**Architecture:** Three independent data/UI changes converging in `Header.tsx`. New `greetings.ts` data module for headlines. Weather moods refactored from single-return to array-with-selection. Shared seeded-pick utility keeps headline and mood stable per visit.

**Tech Stack:** React 19, Tailwind CSS 4, TypeScript, Vitest

---

### Task 1: Seeded-pick utility

A small pure function used by both headlines and weather moods to pick deterministically from an array based on a time-window seed.

**Files:**
- Create: `src/lib/pick.ts`
- Create: `tests/pick.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/pick.test.ts
import { describe, it, expect, vi } from "vitest";
import { seededPick } from "@/lib/pick";

describe("seededPick", () => {
  it("returns an item from the array", () => {
    const items = ["a", "b", "c", "d", "e"];
    const result = seededPick(items, 1000);
    expect(items).toContain(result);
  });

  it("returns the same item for the same seed", () => {
    const items = ["a", "b", "c", "d", "e"];
    expect(seededPick(items, 12345)).toBe(seededPick(items, 12345));
  });

  it("returns different items for different seeds (statistical)", () => {
    const items = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const results = new Set(
      Array.from({ length: 20 }, (_, i) => seededPick(items, i))
    );
    // With 20 different seeds and 8 items, we expect more than 1 unique result
    expect(results.size).toBeGreaterThan(1);
  });

  it("handles single-item array", () => {
    expect(seededPick(["only"], 999)).toBe("only");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/pick.test.ts`
Expected: FAIL — cannot resolve `@/lib/pick`

- [ ] **Step 3: Implement seededPick**

```ts
// src/lib/pick.ts

/**
 * Pick an item from an array using a numeric seed.
 * Same seed + same array = same result.
 */
export function seededPick<T>(items: T[], seed: number): T {
  // Simple hash to spread sequential seeds
  const hash = ((seed * 2654435761) >>> 0) % items.length;
  return items[hash];
}

/**
 * Session seed: timestamp floored to 30-minute windows.
 * Reopening within the same window gives the same seed.
 */
export function getSessionSeed(): number {
  const WINDOW_MS = 30 * 60 * 1000;
  return Math.floor(Date.now() / WINDOW_MS);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/pick.test.ts`
Expected: PASS (all 4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/pick.ts tests/pick.test.ts
git commit -m "feat: add seeded-pick utility for stable per-visit selection"
```

---

### Task 2: Headline data module

The pool of rotating headlines with time-band tags and a selector function.

**Files:**
- Create: `src/data/greetings.ts`
- Create: `tests/greetings.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/greetings.test.ts
import { describe, it, expect, vi } from "vitest";
import { getHeadline, type TimeBand } from "@/data/greetings";

describe("getHeadline", () => {
  it("returns a string", () => {
    const result = getHeadline(12, 100);
    expect(typeof result.text).toBe("string");
    expect(result.text.length).toBeGreaterThan(0);
  });

  it("returns same headline for same seed and hour", () => {
    const a = getHeadline(9, 5000);
    const b = getHeadline(9, 5000);
    expect(a.text).toBe(b.text);
  });

  it("morning hours exclude evening-only lines", () => {
    // Run multiple seeds at 8am — none should be evening-only
    const results = Array.from({ length: 50 }, (_, i) => getHeadline(8, i));
    const eveningOnly = [
      "The evening steep is the honest one",
      "Dark leaves for a dark sky",
      "End the day slower than you started it",
      "Nothing left to do but pour",
    ];
    for (const r of results) {
      expect(eveningOnly).not.toContain(r.text);
    }
  });

  it("evening hours exclude morning-only lines", () => {
    const results = Array.from({ length: 50 }, (_, i) => getHeadline(20, i));
    const morningOnly = [
      "A slow morning steep",
      "What's the first pour of the day?",
      "Morning light, hot water, good leaves",
      "The kettle's almost there",
    ];
    for (const r of results) {
      expect(morningOnly).not.toContain(r.text);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/greetings.test.ts`
Expected: FAIL — cannot resolve `@/data/greetings`

- [ ] **Step 3: Implement greetings module**

```ts
// src/data/greetings.ts
import { seededPick } from "@/lib/pick";

export type TimeBand = "morning" | "afternoon" | "evening";

type Greeting = {
  text: string;
  emphasis?: string; // word to wrap in <strong> if present
  band: TimeBand | "anytime";
};

const greetings: Greeting[] = [
  // Morning (5:00–11:59)
  { text: "A slow morning steep", band: "morning" },
  { text: "What's the first pour of the day?", emphasis: "first", band: "morning" },
  { text: "Morning light, hot water, good leaves", band: "morning" },
  { text: "The kettle's almost there", emphasis: "almost", band: "morning" },

  // Afternoon (12:00–16:59)
  { text: "Midday pause \u2014 what are we steeping?", emphasis: "steeping", band: "afternoon" },
  { text: "Something light? Something roasted?", emphasis: "roasted", band: "afternoon" },
  { text: "A few grams and a free afternoon", emphasis: "free", band: "afternoon" },
  { text: "Time between meetings deserves good tea", emphasis: "good", band: "afternoon" },

  // Evening (17:00–4:59)
  { text: "The evening steep is the honest one", emphasis: "honest", band: "evening" },
  { text: "Dark leaves for a dark sky", emphasis: "dark", band: "evening" },
  { text: "End the day slower than you started it", emphasis: "slower", band: "evening" },
  { text: "Nothing left to do but pour", emphasis: "pour", band: "evening" },

  // Anytime
  { text: "What are we brewing?", emphasis: "brewing", band: "anytime" },
  { text: "Every steep tells you something new", emphasis: "new", band: "anytime" },
  { text: "Same leaves, different steep", emphasis: "different", band: "anytime" },
  { text: "The cup doesn't rush", emphasis: "rush", band: "anytime" },
  { text: "Tried a wulong lately?", emphasis: "wulong", band: "anytime" },
  { text: "Something familiar or something new?", band: "anytime" },
  { text: "Water's ready", emphasis: "ready", band: "anytime" },
  { text: "Good tea doesn't need an occasion", emphasis: "occasion", band: "anytime" },
  { text: "Leaves first, then patience", emphasis: "patience", band: "anytime" },
  { text: "The second steep is where it opens up", emphasis: "opens", band: "anytime" },
];

function getTimeBand(hour: number): TimeBand {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
}

export function getHeadline(
  hour: number,
  seed: number
): { text: string; emphasis?: string } {
  const band = getTimeBand(hour);
  const candidates = greetings.filter(
    (g) => g.band === band || g.band === "anytime"
  );
  const picked = seededPick(candidates, seed);
  return { text: picked.text, emphasis: picked.emphasis };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/greetings.test.ts`
Expected: PASS (all 4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/data/greetings.ts tests/greetings.test.ts
git commit -m "feat: add rotating headline pool with time-band filtering"
```

---

### Task 3: Expand weather moods

Refactor `weather.ts` moods from single-return to arrays, pick with seeded selection.

**Files:**
- Modify: `src/lib/weather.ts:76-101`
- Modify: `src/hooks/useWeatherMood.ts`
- Create: `tests/weather-moods.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// tests/weather-moods.test.ts
import { describe, it, expect } from "vitest";
import { getWeatherMood } from "@/lib/weather";

describe("getWeatherMood (expanded)", () => {
  it("returns a string for every condition/season combo", () => {
    const conditions = [
      "clear", "cloudy", "overcast", "fog",
      "rain-light", "rain-heavy", "storm", "snow",
    ] as const;
    const seasons = ["spring", "summer", "autumn", "winter"] as const;
    for (const c of conditions) {
      for (const s of seasons) {
        const result = getWeatherMood(c, s, 100);
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
      }
    }
  });

  it("returns same mood for same seed", () => {
    const a = getWeatherMood("rain-light", "spring", 42);
    const b = getWeatherMood("rain-light", "spring", 42);
    expect(a).toBe(b);
  });

  it("has multiple options for at least some conditions", () => {
    // Different seeds should eventually produce different moods for rain-light
    const results = new Set(
      Array.from({ length: 30 }, (_, i) =>
        getWeatherMood("rain-light", "spring", i)
      )
    );
    expect(results.size).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/weather-moods.test.ts`
Expected: FAIL — `getWeatherMood` expects 2 args, got 3

- [ ] **Step 3: Refactor weather moods**

Replace the `moods` object and `getWeatherMood` in `src/lib/weather.ts` (lines 76–108). The new version:

```ts
// Replace lines 76-108 in src/lib/weather.ts with:

type MoodEntry = {
  text: string;
  seasons?: Season[]; // if omitted, applies to all seasons
};

const moods: Record<WeatherCondition, MoodEntry[]> = {
  clear: [
    { text: "Sun\u2019s out \u2014 keep it cool and green", seasons: ["summer"] },
    { text: "Clear and cold \u2014 a day for aged pu-erh", seasons: ["winter"] },
    { text: "Bright sky \u2014 something floral to match", seasons: ["spring"] },
    { text: "Clear autumn air \u2014 roasted oolong weather", seasons: ["autumn"] },
    { text: "Blue sky, no wind \u2014 steep outside if you can" },
    { text: "Sunlight on the cup \u2014 watch the color change" },
  ],
  cloudy: [
    { text: "Clouds drifting \u2014 a session with no rush" },
    { text: "Overcast and still \u2014 good steeping weather" },
    { text: "Grey enough to stay in \u2014 perfect" },
  ],
  overcast: [
    { text: "Grey skies \u2014 let the kettle do the talking" },
    { text: "Low ceiling, warm cup \u2014 nowhere better to be" },
    { text: "The light is flat \u2014 the tea doesn\u2019t need it" },
  ],
  fog: [
    { text: "Fog rolling in \u2014 something dark and warming" },
    { text: "Can\u2019t see far \u2014 focus on what\u2019s in the cup" },
    { text: "Mist outside, steam inside" },
  ],
  "rain-light": [
    { text: "Soft rain outside \u2014 a light oolong kind of day", seasons: ["spring", "summer"] },
    { text: "Rain on the window \u2014 time for something roasted", seasons: ["autumn", "winter"] },
    { text: "Drizzle and tea \u2014 a pairing that needs no argument" },
    { text: "Light rain tapping \u2014 the kettle harmonizes" },
  ],
  "rain-heavy": [
    { text: "Heavy rain \u2014 steep it slow, nowhere to be" },
    { text: "Pouring outside \u2014 pour inside" },
    { text: "The rain says stay \u2014 the tea agrees" },
  ],
  storm: [
    { text: "Thunder outside \u2014 brew something you can feel" },
    { text: "Storm rolling through \u2014 dark tea, strong pours" },
    { text: "Lightning weather \u2014 something bold to match" },
  ],
  snow: [
    { text: "Snow falling \u2014 dark tea, thick pours" },
    { text: "White outside, amber inside" },
    { text: "Snow muffles everything \u2014 the pour sounds louder" },
  ],
};

export function getWeatherMood(
  condition: WeatherCondition,
  season: Season,
  seed: number = 0,
): string {
  const entries = moods[condition];
  const candidates = entries.filter(
    (e) => !e.seasons || e.seasons.includes(season)
  );
  // Fallback to all entries if season filter empties the list
  const pool = candidates.length > 0 ? candidates : entries;
  return seededPick(pool, seed).text;
}
```

Add the import at the top of `weather.ts`:

```ts
import { seededPick } from "@/lib/pick";
```

- [ ] **Step 4: Update useWeatherMood to pass a seed**

Replace `src/hooks/useWeatherMood.ts`:

```ts
import { useState, useEffect } from "react";
import { fetchWeather, getWeatherMood, getCachedWeather, setCachedWeather } from "@/lib/weather";
import { getCurrentSeason, getSeasonalHint } from "@/lib/seasons";
import { getSessionSeed } from "@/lib/pick";

export function useWeatherMood(): string | null {
  const [mood, setMood] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    const season = getCurrentSeason();
    const seed = getSessionSeed();

    const cached = getCachedWeather();
    if (cached) {
      setMood(getWeatherMood(cached.condition, season, seed));
      return;
    }

    fetchWeather()
      .then((data) => {
        if (ignore) return;
        setCachedWeather(data);
        setMood(getWeatherMood(data.condition, season, seed));
      })
      .catch(() => {
        if (ignore) return;
        setMood(getSeasonalHint(season));
      });

    return () => { ignore = true; };
  }, []);

  return mood;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/weather-moods.test.ts`
Expected: PASS (all 3 tests)

- [ ] **Step 6: Run all existing tests to check for regressions**

Run: `npx vitest run`
Expected: All tests PASS (pick, greetings, weather-moods, brewing, brew-tips)

- [ ] **Step 7: Commit**

```bash
git add src/lib/weather.ts src/hooks/useWeatherMood.ts tests/weather-moods.test.ts
git commit -m "feat: expand weather moods to multiple expressions with seeded selection"
```

---

### Task 4: Watermark and headline in Header.tsx + CSS

Wire up the watermark, rotating headline, and entrance animation in the header component.

**Files:**
- Modify: `src/components/Header.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add CSS keyframe and watermark styles to globals.css**

Add after the existing `.view-enter` block (~line 166):

```css
/* ─── Headline entrance ─── */
@keyframes headline-arrive {
  from { opacity: 0; }
  to { opacity: 1; }
}

.headline-enter {
  animation: headline-arrive 200ms var(--ease-out) forwards;
}
```

And in the `@media (prefers-reduced-motion: reduce)` block, add:

```css
  .headline-enter {
    animation: none !important;
    opacity: 1;
  }
```

- [ ] **Step 2: Update Header.tsx with watermark, rotating headline, and entrance animation**

Replace the full content of `src/components/Header.tsx`:

```tsx
"use client";

import { useMemo } from "react";
import { useWeatherMood } from "@/hooks/useWeatherMood";
import { getHeadline } from "@/data/greetings";
import { getSessionSeed } from "@/lib/pick";

export function Header() {
  const mood = useWeatherMood();

  const headline = useMemo(() => {
    const hour = new Date().getHours();
    const seed = getSessionSeed();
    return getHeadline(hour, seed);
  }, []);

  // Build h1 content: wrap emphasis word in <strong> if specified
  const renderHeadline = () => {
    if (!headline.emphasis) {
      return headline.text;
    }
    const idx = headline.text.toLowerCase().indexOf(headline.emphasis.toLowerCase());
    if (idx === -1) return headline.text;
    const before = headline.text.slice(0, idx);
    const word = headline.text.slice(idx, idx + headline.emphasis.length);
    const after = headline.text.slice(idx + headline.emphasis.length);
    return (
      <>
        {before}
        <strong className="font-medium">{word}</strong>
        {after}
      </>
    );
  };

  return (
    <header className="relative px-5 pt-14 pb-6 overflow-hidden">
      {/* ─── 功夫茶 watermark ─── */}
      <span
        aria-hidden="true"
        className="absolute font-serif-cn select-none pointer-events-none"
        style={{
          fontSize: "130px",
          fontWeight: 400,
          opacity: 0.05,
          top: "50%",
          left: "-20px",
          transform: "translateY(-50%) rotate(-3deg)",
          lineHeight: 1,
          letterSpacing: "0.05em",
          color: "var(--color-secondary)",
        }}
      >
        功夫茶
      </span>

      {/* ─── Gongfu Cha label ─── */}
      <span className="relative block text-[14px] font-serif-cn font-normal tracking-[3px] uppercase text-tertiary mb-7">
        Gongfu Cha
      </span>

      {/* ─── Rotating headline ─── */}
      <h1 className="relative text-[26px] font-light leading-tight mb-1.5 headline-enter">
        {renderHeadline()}
      </h1>

      {/* ─── Weather mood ─── */}
      {mood && (
        <p className="relative text-[13px] text-tertiary italic leading-relaxed view-enter">
          {mood}
        </p>
      )}
    </header>
  );
}
```

- [ ] **Step 3: Run dev server and visually verify**

Run: `npm run dev`

Check at `http://localhost:3000`:
- 功夫茶 watermark visible as faint tilted characters behind header, bleeding off left edge
- Headline text varies (refresh in a new tab after 30+ minutes or change system clock to test)
- Headline fades in subtly on load
- Weather mood still appears below headline
- "Gongfu Cha" label unchanged
- Watermark not selectable, not interfering with text above it

- [ ] **Step 4: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 5: Run lint and build**

Run: `npm run lint && npm run build`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/components/Header.tsx src/app/globals.css
git commit -m "feat: add watermark, rotating headlines, and headline entrance animation"
```

---

### Task 5: Visual tuning pass

Fine-tune watermark opacity, position, and rotation by eye in the browser. This is a design-judgment step, not a code-logic step.

**Files:**
- Possibly modify: `src/components/Header.tsx` (watermark inline styles)

- [ ] **Step 1: Open dev server, inspect watermark**

Check these against the paper texture background:
- Is opacity too strong or too faint? Adjust between 0.04–0.07
- Is the left offset right? The first character should be partially cropped off-screen
- Is the rotation natural? 2–4deg range
- Does it work on both light and dark parts of the background?
- Does the watermark interfere with readability of "Gongfu Cha" or the headline?

- [ ] **Step 2: Test on mobile viewport**

Resize to 375px width. The watermark should still feel like texture, not crowd the text. Adjust font-size or left offset if needed.

- [ ] **Step 3: Commit any adjustments**

```bash
git add src/components/Header.tsx
git commit -m "fix: tune watermark opacity and positioning"
```

If no changes were needed, skip this commit.
