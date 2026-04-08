# Grouped Tea List — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the 8-row tea list into 5 rows with inline variant pills for grouped teas (White, Oolong, Pu-erh).

**Architecture:** Add a `teaGroups` display-layer structure that references existing `TeaPreset` IDs. `TeaList.tsx` iterates groups instead of flat presets. `page.tsx` gains separate group/variant selection state. TeaDetail remains unaware of grouping — it still receives a `TeaPreset`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Vitest

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/data/teas.ts` | Modify | Add `TeaGroup` type, `teaGroups` array, `getTeaGroup()` helper. Update black preset color. |
| `src/data/tea-categories.ts` | Modify | Update 4 category colors (white, oolong, puerh, black). |
| `tests/tea-groups.test.ts` | Create | Unit tests for `teaGroups` structure and `getTeaGroup()`. |
| `src/app/globals.css` | Modify | Add variant crossfade animation classes. |
| `src/components/TeaList.tsx` | Rewrite | Iterate `teaGroups`, render grouped rows with pills, standalone rows as before. |
| `src/app/page.tsx` | Modify | Replace `selectedId` with `expandedGroupId` + `selectedVariantId`. Wire new selection handlers. |

---

### Task 1: Add teaGroups data structure and update colors

**Files:**
- Modify: `src/data/teas.ts:1-146`
- Modify: `src/data/tea-categories.ts:1-44`
- Create: `tests/tea-groups.test.ts`

- [ ] **Step 1: Write failing tests for teaGroups**

Create `tests/tea-groups.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { teaGroups, getTeaById, type TeaGroup } from "@/data/teas";

describe("teaGroups", () => {
  it("has exactly 5 entries", () => {
    expect(teaGroups).toHaveLength(5);
  });

  it("has green and black as standalone strings", () => {
    expect(teaGroups[0]).toBe("green");
    expect(teaGroups[4]).toBe("black");
  });

  it("has white, oolong, puerh as group objects", () => {
    const groups = teaGroups.filter(
      (g): g is TeaGroup => typeof g !== "string"
    );
    expect(groups).toHaveLength(3);
    expect(groups.map((g) => g.id)).toEqual(["white", "oolong", "puerh"]);
  });

  it("all variant IDs reference existing presets", () => {
    const groups = teaGroups.filter(
      (g): g is TeaGroup => typeof g !== "string"
    );
    for (const group of groups) {
      for (const variantId of group.variants) {
        expect(getTeaById(variantId)).toBeDefined();
      }
    }
  });

  it("all standalone IDs reference existing presets", () => {
    const standalones = teaGroups.filter(
      (g): g is string => typeof g === "string"
    );
    for (const id of standalones) {
      expect(getTeaById(id)).toBeDefined();
    }
  });

  it("variantLabels length matches variants length", () => {
    const groups = teaGroups.filter(
      (g): g is TeaGroup => typeof g !== "string"
    );
    for (const group of groups) {
      expect(group.variantLabels).toHaveLength(group.variants.length);
    }
  });

  it("displayTempC matches the lower variant temp", () => {
    const groups = teaGroups.filter(
      (g): g is TeaGroup => typeof g !== "string"
    );
    for (const group of groups) {
      const temps = group.variants.map((id) => getTeaById(id)!.tempC);
      expect(group.displayTempC).toBe(Math.min(...temps));
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/tea-groups.test.ts`
Expected: FAIL — `teaGroups` is not exported from `@/data/teas`.

- [ ] **Step 3: Add TeaGroup type and teaGroups array to teas.ts**

Add after the `TeaPreset` interface (after line 18) in `src/data/teas.ts`:

```ts
export interface TeaGroup {
  id: string;
  name: string;
  subtitle: string;
  categoryColor: string;
  /** Temperature shown on collapsed row — lower variant's temp */
  displayTempC: number;
  variants: string[];
  variantLabels: string[];
}

export const teaGroups: (TeaGroup | string)[] = [
  "green",
  {
    id: "white",
    name: "White Tea",
    subtitle: "Delicate to aged",
    categoryColor: "#B5A890",
    displayTempC: 88,
    variants: ["fresh-white", "aged-white"],
    variantLabels: ["Fresh", "Aged"],
  },
  {
    id: "oolong",
    name: "Oolong",
    subtitle: "Floral to roasted",
    categoryColor: "#A8884A",
    displayTempC: 95,
    variants: ["light-oolong", "dark-oolong"],
    variantLabels: ["Light", "Dark"],
  },
  {
    id: "puerh",
    name: "Pu-erh",
    subtitle: "Living to earthy",
    categoryColor: "#7B6B4D",
    displayTempC: 95,
    variants: ["sheng", "shou"],
    variantLabels: ["Sheng", "Shou"],
  },
  "black",
];
```

Update the black tea preset color on line 96:

```ts
    color: "#945046",
```

- [ ] **Step 4: Update category colors in tea-categories.ts**

In `src/data/tea-categories.ts`, update the `teaCategories` array colors:

```ts
export const teaCategories: TeaCategory[] = [
  { id: "green", label: "Green", color: "#7A9E6B" },
  { id: "white", label: "White", color: "#B5A890" },
  { id: "oolong", label: "Oolong", color: "#A8884A" },
  { id: "puerh", label: "Pu-erh", color: "#7B6B4D" },
  { id: "black", label: "Black", color: "#945046" },
];
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/tea-groups.test.ts`
Expected: All 7 tests PASS.

- [ ] **Step 6: Run all existing tests to confirm no regressions**

Run: `npx vitest run`
Expected: All tests PASS. The color changes don't affect any existing test assertions (brewing tests use ratios/temps, not colors).

- [ ] **Step 7: Commit**

```bash
git add src/data/teas.ts src/data/tea-categories.ts tests/tea-groups.test.ts
git commit -m "feat: add teaGroups data structure and update category colors

Add TeaGroup type and teaGroups array for display-layer grouping.
Update category colors for harmony: white #B5A890, oolong #A8884A,
puerh #7B6B4D, black #945046 (红茶 copper-red)."
```

---

### Task 2: Add variant crossfade CSS

**Files:**
- Modify: `src/app/globals.css:360-400`

- [ ] **Step 1: Add crossfade animation classes to globals.css**

Add before the `/* ─── Reduced motion ─── */` section (before line 364) in `src/app/globals.css`:

```css
/* ─── Variant crossfade (tea group pill switch) ─── */
.variant-exit {
  transition: opacity 100ms var(--ease-out), filter 100ms var(--ease-out);
  opacity: 0;
  filter: blur(2px);
}

.variant-enter {
  transition: opacity 150ms var(--ease-out), filter 150ms var(--ease-out);
  opacity: 1;
  filter: blur(0);
}

.variant-hidden {
  opacity: 0;
  filter: blur(2px);
}
```

- [ ] **Step 2: Add reduced-motion override for crossfade**

Inside the existing `@media (prefers-reduced-motion: reduce)` block (line 365), add:

```css
  .variant-exit,
  .variant-enter,
  .variant-hidden {
    transition: none !important;
    filter: none !important;
    opacity: 1 !important;
  }
```

- [ ] **Step 3: Verify build compiles**

Run: `npm run build`
Expected: Build succeeds. CSS changes are additive — no existing classes affected.

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "style: add variant crossfade animation classes

blur+opacity transition for tea group variant switching.
100ms exit, 150ms enter, respects prefers-reduced-motion."
```

---

### Task 3: Update page.tsx selection state

**Files:**
- Modify: `src/app/page.tsx:1-210`

This task changes `page.tsx` to use `expandedGroupId` + `selectedVariantId` instead of a single `selectedId`. The TeaList props interface changes, but we update TeaList in the next task. For now, update page.tsx and leave TeaList temporarily broken (it won't compile until Task 4).

- [ ] **Step 1: Replace selection state in page.tsx**

Replace lines 25-27:

```ts
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [aiExpanded, setAiExpanded] = useState(false);
  const [customExpanded, setCustomExpanded] = useState(false);
```

With:

```ts
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [aiExpanded, setAiExpanded] = useState(false);
  const [customExpanded, setCustomExpanded] = useState(false);
```

- [ ] **Step 2: Replace handleSelect with group/variant handlers**

Replace the `handleSelect` function (lines 58-62):

```ts
  const handleSelect = (id: string) => {
    setSelectedId(selectedId === id ? null : id);
    setAiExpanded(false);
    setCustomExpanded(false);
  };
```

With two handlers:

```ts
  const handleGroupToggle = (groupId: string) => {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
      setSelectedVariantId(null);
    } else {
      setExpandedGroupId(groupId);
      setSelectedVariantId(null);
    }
    setAiExpanded(false);
    setCustomExpanded(false);
  };

  const handleVariantSelect = (variantId: string) => {
    setSelectedVariantId(variantId);
  };
```

- [ ] **Step 3: Update handleToggleAI and handleToggleCustom**

Replace `setSelectedId(null)` with the new state resets in both handlers:

```ts
  const handleToggleAI = () => {
    setAiExpanded(!aiExpanded);
    setExpandedGroupId(null);
    setSelectedVariantId(null);
    setCustomExpanded(false);
  };

  const handleToggleCustom = () => {
    setCustomExpanded(!customExpanded);
    setExpandedGroupId(null);
    setSelectedVariantId(null);
    setAiExpanded(false);
  };
```

- [ ] **Step 4: Update selectedTea derivation and TeaList props**

Replace the `selectedTea` line (line 124):

```ts
  const selectedTea = selectedId ? getTeaById(selectedId) ?? null : null;
```

With:

```ts
  const selectedTea = selectedVariantId ? getTeaById(selectedVariantId) ?? null : null;
```

Update the `<TeaList>` props in JSX (lines 159-172):

```tsx
              <TeaList
                expandedGroupId={expandedGroupId}
                selectedVariantId={selectedVariantId}
                onGroupToggle={handleGroupToggle}
                onVariantSelect={handleVariantSelect}
                selectedTea={selectedTea}
                aiExpanded={aiExpanded}
                onToggleAI={handleToggleAI}
                customExpanded={customExpanded}
                onToggleCustom={handleToggleCustom}
                vesselMl={vesselMl}
                onVesselChange={handleVesselChange}
                onStartBrewing={handleStartBrewing}
                onAIBrew={handleAIBrew}
              />
```

- [ ] **Step 5: Remove unused imports**

Remove `getTeas` from the import on line 4 (no longer passing `teas` as a prop). Keep `getTeaById`.

Also remove the `const teas = getTeas();` line (line 24).

- [ ] **Step 6: Do NOT commit yet**

This will not compile until Task 4 completes (TeaList props mismatch). Proceed directly to Task 4.

---

### Task 4: Rewrite TeaList.tsx with grouped rendering

**Files:**
- Rewrite: `src/components/TeaList.tsx`

This is the largest task. TeaList now iterates `teaGroups`, renders standalone rows directly, and renders grouped rows with variant pills and crossfade logic.

- [ ] **Step 1: Write the complete new TeaList.tsx**

Replace the entire contents of `src/components/TeaList.tsx` with:

```tsx
"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { teaGroups, getTeaById, type TeaGroup, type TeaPreset } from "@/data/teas";
import type { BrewParams } from "./BrewingTimer";
import { TeaDetail } from "./TeaDetail";
import { AIAdvisor } from "./AIAdvisor";
import { CustomMode } from "./CustomMode";
import type { AIResult } from "./AIAdvisor";

interface TeaListProps {
  expandedGroupId: string | null;
  selectedVariantId: string | null;
  onGroupToggle: (groupId: string) => void;
  onVariantSelect: (variantId: string) => void;
  selectedTea: TeaPreset | null;
  aiExpanded: boolean;
  onToggleAI: () => void;
  customExpanded: boolean;
  onToggleCustom: () => void;
  vesselMl: number;
  onVesselChange: (ml: number) => void;
  onStartBrewing: (params: BrewParams) => void;
  onAIBrew: (
    result: AIResult,
    vesselMl: number,
    leafG: number,
    schedule: number[],
    adjusted: boolean
  ) => void;
}

export function TeaList({
  expandedGroupId,
  selectedVariantId,
  onGroupToggle,
  onVariantSelect,
  selectedTea,
  aiExpanded,
  onToggleAI,
  customExpanded,
  onToggleCustom,
  vesselMl,
  onVesselChange,
  onStartBrewing,
  onAIBrew,
}: TeaListProps) {
  const detailRef = useRef<HTMLDivElement>(null);
  const pillsRef = useRef<HTMLDivElement>(null);
  const aiRef = useRef<HTMLDivElement>(null);
  const customRef = useRef<HTMLDivElement>(null);
  const [crossfadeState, setCrossfadeState] = useState<"idle" | "exit" | "enter">("idle");
  const prevVariantRef = useRef<string | null>(null);

  // Scroll pills into view when group expands
  useEffect(() => {
    if (expandedGroupId && !selectedVariantId && pillsRef.current) {
      const frame = requestAnimationFrame(() => {
        pillsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [expandedGroupId, selectedVariantId]);

  // Scroll detail into view when variant selected
  useEffect(() => {
    if (selectedVariantId && detailRef.current) {
      const frame = requestAnimationFrame(() => {
        detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [selectedVariantId]);

  // Crossfade when switching between variants
  useEffect(() => {
    const prev = prevVariantRef.current;
    prevVariantRef.current = selectedVariantId;

    // Only crossfade when switching from one variant to another (not initial selection)
    if (prev && selectedVariantId && prev !== selectedVariantId) {
      setCrossfadeState("exit");
      const exitTimer = setTimeout(() => {
        setCrossfadeState("enter");
        const enterTimer = setTimeout(() => {
          setCrossfadeState("idle");
        }, 150);
        return () => clearTimeout(enterTimer);
      }, 100);
      return () => clearTimeout(exitTimer);
    }
  }, [selectedVariantId]);

  // Scroll AI into view when expanded
  useEffect(() => {
    if (aiExpanded && aiRef.current) {
      const frame = requestAnimationFrame(() => {
        aiRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [aiExpanded]);

  // Scroll Custom into view when expanded
  useEffect(() => {
    if (customExpanded && customRef.current) {
      const frame = requestAnimationFrame(() => {
        customRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [customExpanded]);

  const getCrossfadeClass = useCallback(() => {
    switch (crossfadeState) {
      case "exit": return "variant-exit";
      case "enter": return "variant-enter";
      default: return "";
    }
  }, [crossfadeState]);

  /** Resolve display values for a row — works for both standalone and group */
  function getRowDisplay(entry: TeaGroup | string): {
    id: string;
    name: string;
    subtitle: string;
    color: string;
    tempC: number;
    isGroup: boolean;
  } {
    if (typeof entry === "string") {
      const tea = getTeaById(entry)!;
      return {
        id: tea.id,
        name: tea.name,
        subtitle: tea.subtitle,
        color: tea.color,
        tempC: tea.tempC,
        isGroup: false,
      };
    }
    // For groups with a selected variant, show variant's values
    const activeVariant = selectedVariantId && entry.variants.includes(selectedVariantId)
      ? getTeaById(selectedVariantId)
      : null;
    return {
      id: entry.id,
      name: entry.name,
      subtitle: activeVariant ? activeVariant.subtitle : entry.subtitle,
      color: activeVariant ? activeVariant.color : entry.categoryColor,
      tempC: activeVariant ? activeVariant.tempC : entry.displayTempC,
      isGroup: true,
    };
  }

  return (
    <div className="flex flex-col gap-2 px-5" role="group" aria-label="Tea selection">
      {teaGroups.map((entry, index) => {
        const display = getRowDisplay(entry);
        const expanded = expandedGroupId === display.id;
        const isGroup = display.isGroup;
        const group = typeof entry !== "string" ? entry : null;

        return (
          <div key={display.id}>
            <button
              onClick={() => onGroupToggle(display.id)}
              aria-expanded={expanded}
              className={`
                tea-stagger w-full
                flex items-center gap-3.5 px-4 py-3.5 text-left
                border
                ${expanded
                  ? "rounded-t-[14px] rounded-b-none border-b-0 border-clay/30 shadow-[0_-2px_12px_rgba(140,86,62,0.06)]"
                  : "rounded-[14px] border-border bg-surface hover-lift"
                }
              `}
              style={{
                animationDelay: `${index * 40}ms`,
                transition: "border-color 200ms var(--ease-out), box-shadow 200ms var(--ease-out), background-color 200ms var(--ease-out), border-radius 200ms var(--ease-out)",
                backgroundColor: expanded ? `color-mix(in srgb, ${display.color} 6%, var(--color-surface))` : undefined,
              }}
            >
              <span
                className="w-5 h-5 rounded-full shrink-0"
                style={{
                  backgroundColor: display.color,
                  transition: "transform 250ms var(--ease-out), box-shadow 250ms var(--ease-out), background-color 160ms var(--ease-out)",
                  transform: expanded ? "scale(1.15)" : "scale(1)",
                  boxShadow: expanded ? `0 0 0 3px color-mix(in srgb, ${display.color} 20%, transparent)` : "none",
                }}
              />
              <span className="flex-1 min-w-0">
                <span className="text-[15px] font-serif-cn font-normal text-primary">
                  {display.name}
                </span>
                <span
                  className="block text-[12px] text-tertiary mt-0.5 truncate"
                  style={{ transition: "opacity 160ms var(--ease-out)" }}
                >
                  {display.subtitle}
                </span>
              </span>
              <span
                className="text-[13px] font-medium text-secondary shrink-0"
                style={{ transition: "opacity 160ms var(--ease-out)" }}
              >
                {display.tempC}°C
              </span>
            </button>

            {/* Accordion body */}
            <div
              className="grid transition-[grid-template-rows] duration-300"
              style={{
                gridTemplateRows: expanded ? "1fr" : "0fr",
                transitionTimingFunction: "var(--ease-out)",
              }}
            >
              <div className="overflow-hidden">
                {expanded && (
                  <div
                    className="border border-t-0 border-clay/30 rounded-b-[14px] pb-1"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${display.color} 4%, var(--color-surface))`,
                    }}
                  >
                    {/* Variant pills for grouped teas */}
                    {isGroup && group && (
                      <div
                        ref={pillsRef}
                        className="flex justify-center gap-2 px-4 py-3"
                        role="radiogroup"
                        aria-label={`${display.name} variants`}
                      >
                        {group.variants.map((variantId, vi) => {
                          const variant = getTeaById(variantId)!;
                          const isSelected = selectedVariantId === variantId;
                          return (
                            <button
                              key={variantId}
                              role="radio"
                              aria-checked={isSelected}
                              onClick={(e) => {
                                e.stopPropagation();
                                onVariantSelect(variantId);
                              }}
                              className="text-[13px] font-medium rounded-[20px] px-4 py-1.5"
                              style={{
                                border: `1px solid color-mix(in srgb, ${variant.color} ${isSelected ? "40%" : "25%"}, transparent)`,
                                backgroundColor: isSelected
                                  ? `color-mix(in srgb, ${variant.color} 12%, var(--color-surface))`
                                  : "transparent",
                                color: isSelected ? "var(--color-primary)" : "var(--color-secondary)",
                                transition: "background-color 160ms var(--ease-out), border-color 160ms var(--ease-out), color 160ms var(--ease-out)",
                              }}
                            >
                              {group.variantLabels[vi]}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* TeaDetail — for standalone teas or after variant selection */}
                    {selectedTea && (
                      (!isGroup || selectedVariantId) && (
                        <div
                          ref={detailRef}
                          className={getCrossfadeClass()}
                        >
                          <TeaDetail
                            tea={selectedTea}
                            vesselMl={vesselMl}
                            onVesselChange={onVesselChange}
                            onStartBrewing={onStartBrewing}
                            variant="inline"
                          />
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* ─── Divider ─── */}
      <p className="text-[11px] text-tertiary/40 tracking-[1.5px] uppercase text-center my-1">
        or
      </p>

      {/* Ask AI — accordion row */}
      <div>
        <button
          onClick={onToggleAI}
          aria-pressed={aiExpanded}
          aria-expanded={aiExpanded}
          className={`
            hover-lift w-full
            flex items-center gap-3.5 px-4 py-3.5 text-left
            border
            ${aiExpanded
              ? "rounded-t-[14px] rounded-b-none border-b-0 border-clay/30 shadow-[0_-2px_12px_rgba(140,86,62,0.06)] bg-surface"
              : "rounded-[14px] border-border bg-surface"
            }
          `}
          style={{
            transition: "border-color 200ms var(--ease-out), box-shadow 200ms var(--ease-out), background-color 200ms var(--ease-out), border-radius 200ms var(--ease-out)",
          }}
        >
          <span className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center bg-border/40">
            <svg width="13" height="13" viewBox="0 0 18 18" fill="none" stroke="var(--color-tertiary)" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <circle cx="9" cy="9" r="6" />
              <path d="M6.5 8h5M6.5 10.5h3" />
            </svg>
          </span>
          <span className="flex-1 min-w-0">
            <span className="text-[15px] font-medium text-primary">
              Ask AI
            </span>
            <span className="block text-[12px] text-tertiary mt-0.5">
              Describe your tea, get brew parameters
            </span>
          </span>
        </button>

        {/* AI accordion detail */}
        <div
          className="grid transition-[grid-template-rows] duration-300"
          style={{
            gridTemplateRows: aiExpanded ? "1fr" : "0fr",
            transitionTimingFunction: "var(--ease-out)",
          }}
        >
          <div className="overflow-hidden">
            {aiExpanded && (
              <div
                ref={aiRef}
                className="border border-t-0 border-clay/30 rounded-b-[14px] p-5"
              >
                <AIAdvisor
                  vesselMl={vesselMl}
                  onVesselChange={onVesselChange}
                  onStartBrewing={onAIBrew}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom — accordion row */}
      <div>
        <button
          onClick={onToggleCustom}
          aria-pressed={customExpanded}
          aria-expanded={customExpanded}
          className={`
            hover-lift w-full
            flex items-center gap-3.5 px-4 py-3.5 text-left
            border
            ${customExpanded
              ? "rounded-t-[14px] rounded-b-none border-b-0 border-clay/30 shadow-[0_-2px_12px_rgba(140,86,62,0.06)] bg-surface"
              : "rounded-[14px] border-border bg-surface"
            }
          `}
          style={{
            transition: "border-color 200ms var(--ease-out), box-shadow 200ms var(--ease-out), background-color 200ms var(--ease-out), border-radius 200ms var(--ease-out)",
          }}
        >
          <span className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center bg-border/40">
            <svg width="13" height="13" viewBox="0 0 18 18" fill="none" stroke="var(--color-tertiary)" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M3 6.5h12M3 11.5h12" />
              <circle cx="7" cy="6.5" r="1.5" fill="var(--color-bg)" />
              <circle cx="11" cy="11.5" r="1.5" fill="var(--color-bg)" />
            </svg>
          </span>
          <span className="flex-1 min-w-0">
            <span className="text-[15px] font-medium text-primary">
              Custom
            </span>
            <span className="block text-[12px] text-tertiary mt-0.5">
              Set your own parameters
            </span>
          </span>
        </button>

        {/* Custom accordion detail */}
        <div
          className="grid transition-[grid-template-rows] duration-300"
          style={{
            gridTemplateRows: customExpanded ? "1fr" : "0fr",
            transitionTimingFunction: "var(--ease-out)",
          }}
        >
          <div className="overflow-hidden">
            {customExpanded && (
              <div
                ref={customRef}
                className="border border-t-0 border-clay/30 rounded-b-[14px] p-5"
              >
                <CustomMode
                  vesselMl={vesselMl}
                  onStartBrewing={onStartBrewing}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Handle standalone teas auto-selecting variant in page.tsx**

Standalone teas (Green, Black) need to set `selectedVariantId` immediately when their group is toggled, since they skip the pill step. Update `handleGroupToggle` in `src/app/page.tsx`:

Add the import for `teaGroups` and `TeaGroup`:

```ts
import { getTeaById, teaGroups, type TeaGroup } from "@/data/teas";
```

Remove the now-unused `getTeas` import.

Update `handleGroupToggle`:

```ts
  const handleGroupToggle = (groupId: string) => {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
      setSelectedVariantId(null);
    } else {
      setExpandedGroupId(groupId);
      // Standalone teas auto-select immediately (no pill step)
      const entry = teaGroups.find(
        (g) => (typeof g === "string" ? g : g.id) === groupId
      );
      if (typeof entry === "string") {
        setSelectedVariantId(entry);
      } else {
        setSelectedVariantId(null);
      }
    }
    setAiExpanded(false);
    setCustomExpanded(false);
  };
```

- [ ] **Step 3: Verify the app compiles**

Run: `npm run build`
Expected: Build succeeds with no type errors.

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 5: Manual smoke test**

Run: `npm run dev`

Verify in browser at `http://localhost:3000`:
1. 5 rows visible: Green Tea, White Tea, Oolong, Pu-erh, Black Tea
2. Tap Green Tea → TeaDetail expands directly (no pills)
3. Tap White Tea → two pills appear: "Fresh" and "Aged"
4. Tap "Fresh" → TeaDetail for Fresh White appears below pills
5. Tap "Aged" → TeaDetail crossfades to Aged White, dot color changes
6. Tap White Tea header → everything collapses
7. Ask AI and Custom rows work as before
8. Tap Black Tea → TeaDetail expands directly (no pills)

- [ ] **Step 6: Commit**

```bash
git add src/components/TeaList.tsx src/app/page.tsx
git commit -m "feat: grouped tea list with variant pills

Consolidate 8 tea rows into 5 grouped rows. White, Oolong, Pu-erh
show variant pills on expand. Standalone teas (Green, Black) go
straight to TeaDetail. Crossfade with blur on variant switch."
```

---

### Task 5: Lint and final verification

**Files:**
- No new files

- [ ] **Step 1: Run linter**

Run: `npm run lint`
Expected: No errors. Fix any warnings about unused imports or variables.

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: Build succeeds with no warnings.

- [ ] **Step 4: Final visual check**

Run dev server and verify:
1. Color dots look correct (sage → tan → amber → earth → copper-red)
2. Stagger animation plays on page load for all 5 rows
3. Accordion open/close is smooth
4. Pill selection/deselection animates
5. Variant switch crossfade is visible (blur bridge)
6. Start Brewing works from both standalone and grouped teas
7. AI and Custom paths unaffected

- [ ] **Step 5: Commit any lint fixes if needed**

```bash
git add -A
git commit -m "chore: lint fixes for grouped tea list"
```
