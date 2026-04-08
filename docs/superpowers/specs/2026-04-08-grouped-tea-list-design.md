# Grouped Tea List — Design Spec

## Overview

Consolidate the 8-row tea list into 5 rows by grouping variant teas under parent categories. White (Fresh/Aged), Oolong (Light/Dark), and Pu-erh (Sheng/Shou) each become a single row with an inline variant picker. Green Tea and Black Tea remain standalone. Tightens the UI, reduces scroll, and makes sub-variants a discovery moment rather than upfront cognitive load.

## Tea Groups

| Row | Group ID | Display Name | Variants | Standalone |
|-----|----------|-------------|----------|------------|
| 1 | `green` | Green Tea | — | Yes |
| 2 | `white` | White Tea | Fresh (`fresh-white`), Aged (`aged-white`) | No |
| 3 | `oolong` | Oolong | Light (`light-oolong`), Dark (`dark-oolong`) | No |
| 4 | `puerh` | Pu-erh | Sheng (`sheng`), Shou (`shou`) | No |
| 5 | `black` | Black Tea | — | Yes |

Existing `TeaPreset` objects are untouched. Grouping is a display-layer concern only.

## Category Colors

Updated to harmonize across the full palette and reflect 红茶 (red tea) for black tea.

| Category | Old Color | New Color | Reasoning |
|----------|-----------|-----------|-----------|
| Green | `#7A9E6B` | `#7A9E6B` | No change — cool sage anchors the green end |
| White | `#BFB49C` | `#B5A890` | Warmer, sits between border sand and oolong gold; evokes dried white tea leaf |
| Oolong | `#B5A26A` | `#A8884A` | Richer gold-amber to hold its place next to the warmer neighbors |
| Pu-erh | `#8B9E6F` | `#7B6B4D` | Was incorrectly green (sheng-biased). Now earth-brown: compressed cake color |
| Black | `#8B5E4B` | `#945046` | Copper-red reflecting 红茶 liquor color. Distinct from clay accent `#7A4A35` |

**Color arc on screen:** sage green → dried leaf → amber → earth → copper-red. Each dot is distinct in both hue and value against `#FAF7F2` surface.

The `color` field on the `TeaPreset` for `black` also updates to `#945046`.

## Interaction States

### State 1 — Collapsed (default)

Row looks identical to current tea rows:
- **Dot**: category color (see table above)
- **Name**: group display name (e.g. "White Tea")
- **Subtitle**: category-level description (e.g. "Delicate to aged")
- **Temperature**: lower variant's temp (the gentler starting point)
- Standalone teas (Green, Black) show their own preset values as-is

### State 2 — Group expanded, no variant picked

Tap a grouped row → row adopts selected styling (rounded-t, tinted bg `color-mix(in srgb, {categoryColor} 6%, var(--color-surface))`, border-clay/30). Below the row, inside the same accordion body, two **variant pills** appear. No TeaDetail yet.

**Pill layout:**
- Two pills side by side, horizontally centered, with `gap: 8px`
- Padding: `6px 16px` per pill
- Border: `1px solid color-mix(in srgb, {categoryColor} 25%, transparent)`
- Border radius: `20px` (full pill shape)
- Text: variant's distinguishing word only — "Fresh" / "Aged", not "Fresh White" / "Aged White"
- Font: 13px, `font-medium`, `text-secondary`
- Background: transparent (unselected)
- Container padding: `12px 16px` — tight, not as much as TeaDetail

**Standalone teas skip this state entirely** — tap goes straight to State 3 equivalent (TeaDetail).

### State 3 — Variant selected

Tap a pill:
- **Selected pill**: background fills to `color-mix(in srgb, {variantColor} 12%, var(--color-surface))`, border strengthens to `color-mix(in srgb, {variantColor} 40%, transparent)`, text shifts to `text-primary`
- **Unselected pill**: stays transparent/muted
- **Dot**: transitions to the selected variant's actual color (160ms ease-out)
- **Temperature**: updates to the selected variant's temp
- **Subtitle**: updates to the selected variant's subtitle
- **TeaDetail**: slides in below the pills via grid-template-rows animation (same pattern as current accordion)

Pills remain visible above TeaDetail so the user can switch variants without collapsing.

### State 4 — Variant switch

Tap the other pill while TeaDetail is showing:

1. Current TeaDetail content fades out: `opacity 0` + `filter: blur(2px)` over 100ms ease-out
2. Content swaps (new variant's TeaDetail)
3. New content fades in: `opacity 1` + `filter: blur(0)` over 150ms ease-out
4. Height delta handled by `grid-template-rows` over 200ms with `var(--ease-out)`
5. Dot color, temp, subtitle transition to new variant values (160ms ease-out)

**`prefers-reduced-motion`**: skip blur and crossfade — instant content swap. Keep height transition (layout adjustment, not movement).

### State 5 — Collapse

Tap the row header again → pills and TeaDetail collapse together. Same grid-template-rows `1fr → 0fr` animation as current accordion (300ms, `var(--ease-out)`).

## Pill Press Feedback

Pills inherit the global `button:active { transform: scale(0.97) }` already in globals.css. No additional press styling needed.

## Scroll Behavior

When a group expands (State 2), scroll the pill area into view with `scrollIntoView({ behavior: "smooth", block: "nearest" })`. When a variant is selected (State 3), scroll TeaDetail into view — same as current behavior.

## Data Structure

Add a `teaGroups` array in `teas.ts`:

```ts
export interface TeaGroup {
  id: string;
  name: string;
  subtitle: string;
  categoryColor: string;
  /** Temperature shown on collapsed row — lower variant's temp */
  displayTempC: number;
  variants: string[];  // TeaPreset IDs — order matters (first pill, second pill)
  variantLabels: string[];  // Short labels for pills
}

export const teaGroups: (TeaGroup | string)[] = [
  "green",  // standalone — render from TeaPreset directly
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
  "black",  // standalone
];
```

## Files Changed

| File | Change |
|------|--------|
| `src/data/teas.ts` | Add `TeaGroup` interface and `teaGroups` array. Update `black` preset color to `#945046`. |
| `src/data/tea-categories.ts` | Update category colors: white `#B5A890`, oolong `#A8884A`, puerh `#7B6B4D`, black `#945046`. |
| `src/components/TeaList.tsx` | Rewrite to iterate `teaGroups` instead of flat `teas[]`. Add grouped row rendering, pill UI, variant selection state, crossfade animation logic. |
| `src/app/page.tsx` | Update `handleSelect` to handle group expansion vs. variant selection. May need `selectedGroupId` + `selectedVariantId` state separation. |
| `src/app/globals.css` | Add `.variant-crossfade-exit` and `.variant-crossfade-enter` classes for the blur+opacity transition. |

## What Does NOT Change

- `TeaPreset` interface and individual preset objects (except black's color)
- `TeaDetail.tsx` — receives a `TeaPreset` as before, unaware of grouping
- `BrewingTimer.tsx` — receives `BrewParams` as before
- `AIAdvisor.tsx`, `CustomMode.tsx` — secondary paths unchanged
- Accordion animation pattern (grid-template-rows)
- View state machine in `page.tsx` (list → enter-brewing → brewing → exit-brewing)

## Accessibility

- Grouped rows: `aria-expanded` on the group button
- Variant pills: `role="radiogroup"` container, `role="radio"` + `aria-checked` on each pill
- Standalone rows: `aria-expanded` as currently implemented
- Pill labels are descriptive enough without extra aria-label (e.g. "Fresh", "Aged" in context of "White Tea" group)

## Edge Cases

- **Deep link / restore**: No URL routing exists — all state is ephemeral. No concern.
- **Vessel change while variant is selected**: `TeaDetail` already resets leaf override on `vesselMl` change. No concern.
- **AI identify returns a variant tea**: AI flow is separate — uses `AIAdvisor` → `handleAIBrew`. Does not interact with the grouped list selection. No concern.
