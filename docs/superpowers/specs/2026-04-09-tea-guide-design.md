# Tea Guide — Design Spec

## Purpose

Add a browsable tea reference and short onboarding primer to the app, so newcomers to gongfu cha have a well-crafted place to learn *what* they're drinking and *how* to read the brewing parameters the rest of the app already shows them.

The corpus (`src/data/corpus/entries/*.json`, 84 entries) currently serves one feature: RAG identification in the AI advisor. That's a lot of hand-researched data behind one input box. The Tea Guide exposes the corpus directly as a reading surface, and doubles the demonstrated use of the existing RAG pipeline without adding infrastructure.

Portfolio framing: one retrieval pipeline, two features — identify (single best match) and explore (top-k browse).

## Scope

**In scope:**

- A new top-level view accessible from `SecondaryPaths`: **Tea guide**
- One hand-written onboarding piece ("A short primer on gongfu cha")
- A browsable index of all 84 corpus entries (chip filter + search)
- A reference card template rendered per corpus entry
- New `src/data/corpus-categories.ts` with six corpus-vocabulary categories (separate from the app's five)
- New `src/data/corpus/ids.ts` — eager-loaded set of 84 corpus entry ids for `TeaDetail` cross-link gating
- New `src/data/corpus/entries/index.ts` — barrel file re-exporting all 84 entries (dynamically imported by `page.tsx`)
- New `src/lib/corpus-adapter.ts` — `corpusEntryToTeaPreset` for the brewing handoff
- New `/api/guide/search` route exposing `searchTeas` in explore mode (top-k, no confidence gate)
- Dynamic import of `src/data/corpus/entries` on first guide open
- Cross-link from `TeaDetail` → reference card when a preset maps to a corpus entry
- Cross-link from the existing in-list Search (AIAdvisor) result → reference card, gated on `source === "corpus"`
- `AIResult` + `/api/identify` response gain `corpusId?: string` so the cross-link has a target

**Out of scope:**

- Multi-essay series. One primer, hand-written, full stop.
- New corpus fields. Work with what the JSON has today.
- Photos or stock imagery. SVG diagrams only.
- User accounts, bookmarks, notes, comments, history
- A separate CMS. The primer is TSX in the repo.
- Finnish translations. The `feat/i18n-finnish-english` branch is unmerged and the primer is English-only on first ship.
- Region maps, flavor-graph visualizations, or other visual-data ambitions
- AI-generated prose. The primer is written by hand.

## Framing (the constraint that shapes everything else)

The Tea Guide is a **dry-hands, between-sessions surface**. It's read while the kettle boils or on the couch — not mid-brew with wet fingers. This relaxes the wet-handed rule that governs the brewing flow. Touch targets stay generous, but one-handed reachability during active brewing is not a concern here.

Reference cards are **read-scroll-absorb**, not glance. A reference card will be roughly two phone-screens tall. That's fine for a field-guide read; it would not be fine for a brewing-flow card.

On mobile, **chip-filter is the primary affordance** and the search box is secondary. Typing is a worse input mode than tapping.

## Corpus Categories ≠ App Categories

The corpus and the app use different category taxonomies. This matters because the Guide's chip filter is driven by the corpus, not the app.

| Corpus category | App equivalent | Notes |
|---|---|---|
| `green` | `green` | Aligned |
| `white` | `white` | Aligned |
| `yellow` | — | **No app equivalent.** Four corpus entries (huoshan-huang-ya, junshan-yin-zhen, mengding-huang-ya, mo-gan-huang-ya) |
| `oolong` | `oolong` | Aligned |
| `red` | `black` | 红茶 in Chinese taxonomy is "black" in Western convention. Same tea. |
| `dark` | `puerh` | Corpus groups all heicha (puerh + liu bao + fu zhuan + anhua hei cha etc.); app names the subset |

**Resolution:** a new `src/data/corpus-categories.ts` file with six entries matching the corpus vocabulary exactly. The Guide uses these for its chip filter, reference-card category dot, and any category-dependent colors. It does **not** modify `tea-categories.ts`.

Suggested palette (extending the existing harmony arc from `tea-categories.ts`):

- `green` — `#7A9E6B` (reuse existing sage)
- `white` — `#B5A890` (reuse existing dried leaf)
- `yellow` — **new**, `#C9A94E` or similar warm gold (coordinate with the arc)
- `oolong` — `#A8884A` (reuse existing amber)
- `red` — `#945046` (reuse existing copper-red — same as app "black")
- `dark` — `#7B6B4D` (reuse existing earth — same as app "puerh")

Two helpers live in this file:
- `corpusCategoryToAppCategory(c: CorpusCategory): AppCategory | null` — for handoff points where an app category is required (e.g., brewing view badges). `yellow → null` since no app equivalent exists.
- `getCorpusCategory(id: CorpusCategory): CorpusCategory` — straight lookup for the Guide's own rendering.

## User Flow

```
TeaList
  └── SecondaryPaths
        ├── Tea guide ────────→ guide-index
        │                         ├── "New to gongfu? Start here →" ──→ guide-primer
        │                         ├── search box (RAG explore)
        │                         ├── category chips (green/white/yellow/oolong/red/dark)
        │                         └── scrollable list of 84 entries
        │                               └── tap entry ──→ guide-entry
        │                                                   └── "Brew this →" ──→ brewing (same path as TeaDetail → Start Brewing)
        └── Custom brew (existing)
```

Entry point from `TeaDetail`: when a preset's id matches a corpus entry id (e.g., `long-jing`), show a subtle **"About this tea →"** link that opens the matching reference card. Back returns to `TeaDetail`.

Entry point from the in-list Search accordion: when the Search accordion returns an identified tea, add a subtle **"Read more →"** link on the result card that opens the matching reference card.

## View State Machine

`src/app/page.tsx` already manages `ViewState = "list" | "enter-brewing" | "brewing" | "exit-brewing"`.

Add three guide states:

```ts
type ViewState =
  | "list"
  | "enter-brewing"
  | "brewing"
  | "exit-brewing"
  | "guide-index"
  | "guide-primer"
  | "guide-entry";
```

Transitions:

- `list → guide-index` — triggered by `SecondaryPaths` "Tea guide" tap. Crossfade.
- `guide-index → guide-primer` — "Start here" link. Crossfade.
- `guide-index → guide-entry` — tap on an entry row. Crossfade.
- `guide-primer → guide-index` — back arrow (`InlineViewHeader`).
- `guide-entry → {origin}` — back arrow; destination depends on where the user came from (see **Entry return context** below).
- `guide-entry → enter-brewing` — "Brew this" button. Adapts the corpus entry to a `TeaPreset`-shaped object via `corpusEntryToTeaPreset`, calls `buildBrewParams(preset, vesselMl, leafOverride)`, and follows the same `onStartBrewing` path as `TeaDetail`. No Custom-mode detour.
- `guide-index → list` — back arrow from `guide-index`'s `InlineViewHeader`.

### Entry return context

`guide-entry` is reachable from three places: `guide-index` (primary), `TeaDetail → "About this tea →"`, and the in-list Search result → `"Read more →"`. Back-arrow behavior depends on origin.

`page.tsx` tracks a return target alongside the selected entry:

```ts
type GuideEntryOrigin = "guide-index" | "tea-detail" | "in-list-search";

const [guideSelectedEntryId, setGuideSelectedEntryId] = useState<string | null>(null);
const [guideEntryOrigin, setGuideEntryOrigin] = useState<GuideEntryOrigin>("guide-index");
```

Set together whenever an entry opens. Back from `guide-entry`:
- `origin === "guide-index"` → `viewState = "guide-index"` (scroll restored)
- `origin === "tea-detail"` → `viewState = "list"` with the same preset/group still expanded (`expandedGroupId` and `selectedVariantId` are untouched, so the user returns to exactly where they were)
- `origin === "in-list-search"` → `viewState = "list"` with the Search accordion still expanded (`aiExpanded` untouched)

Scroll position on `guide-index` is preserved across entry round-trips via a single `useRef<number>` captured on leave, restored on return.

## Components (new)

All in `src/components/guide/` to keep the surface isolated.

### `GuideIndex.tsx`

The landing screen. Renders:

- `InlineViewHeader` with title "Tea guide" and back arrow → `list`
- "A short primer on gongfu cha" link row (opens `guide-primer`)
- Search input (secondary affordance, de-emphasized visually — still present and functional in Phase 1)
- Horizontal row of **six** category chips driven by `corpus-categories.ts`: Green / White / Yellow / Oolong / Red / Dark
- Filtered, scrollable list of entries, alphabetical by English name — each row is a category dot + English name + (optional) Chinese name in smaller type, ~56px tall

State:
- `query: string` — bound to search input, empty by default
- `activeCategory: CategoryId | null` — selected chip or null for all
- `results: CorpusEntry[]` — computed from query + activeCategory

When `query` is empty: show filtered (by category) alphabetical list of all matching entries. When `query` is non-empty (≥2 chars): call the RAG `explore` mode for top-k and merge with alphabetical as fallback.

**Search debounce:** 250ms. Cancel in-flight requests on new keystroke. Treat network failure as empty-state and fall back to plain substring match over loaded entry metadata.

### `GuidePrimer.tsx`

Static TSX. `InlineViewHeader` + the hand-written primer text below. No props. Hard-coded content.

Body uses Noto Serif SC. Generous line-height (1.7+). Max content width ~65ch on desktop; fills viewport with padding on mobile. Semantic headings: `<h1>` for the title, `<h2>` for each section. Chinese characters wrapped in `<span lang="zh">`. Not MDX, not markdown-parsed — just TSX.

**Fact-checked against:** white2tea brewing guides, Mei Leaf educational content, Yunnan Sourcing brewing guide, Teasenz (gaiwan vs yixing). First-steep times corrected from 30s → 5–15s (flash steep). Leaf ratio corrected from 4–6 g → 5–8 g per 100 ml. Yixing teapot added as a legitimate second vessel after originally recommending gaiwan only.

---

#### Primer text (final, 608 words)

# A short primer on gongfu cha

Gongfu cha means "tea with effort" or "tea with skill" (功夫茶). Both translations work. The short version: small vessel, a lot of leaf, short steeps, and you drink the same tea over and over in one sitting.

## What it actually is

You take a small pot or gaiwan, maybe 100 ml. You put in more leaf than seems reasonable, 5 to 8 grams. Hot water goes in. Five to fifteen seconds later you pour it all out into a small cup and drink it.

Then you do it again. And again. Five, six, sometimes eight infusions from the same leaves. Each round steeps a little longer than the last.

It's a different way of drinking tea, not just "stronger tea." The first infusion tastes one way; the third tastes different; the fifth different again. The leaves open slowly, release different things each round, and you taste the whole arc. Some teas (good oolongs, pu-erh, aged whites) only really make sense this way. You can't get them from a teabag.

Western brewing isn't wrong. It's faster and less attentive, which is sometimes what you want. Gongfu is the slower option. An hour, a dozen small cups, one batch of leaves.

## How to read a brewing schedule

Every tea in this app shows four numbers. They look fussy but they're not.

- **Temperature.** Greens want it coolest, around 80°C. Roasted oolongs and pu-erh want it hot, 95°C or off the boil. Everything else lands in between. Too hot makes things bitter. Too cool keeps the tea thin.
- **Ratio.** How much leaf for how much water, in grams per 100 ml. 5 to 8 g/100 ml is the normal range. Closer to 7 for oolongs and pu-erh, lighter for delicate greens.
- **Infusions.** How many rounds the leaves will give you, usually five or six, sometimes more.
- **Times.** How long each steep runs. Very short at first (five to fifteen seconds), getting longer as the leaves fatigue.

You don't have to memorize any of this. The app does the math when you change your vessel or leaf amount. The numbers are starting points, not laws. After a few sessions you'll want to steep some teas longer or shorter than the app suggests. That's the whole idea.

## What gear you actually need

A gaiwan, to start.

A gaiwan is a small lidded porcelain cup, around 100 ml. Porcelain doesn't hold flavor, so you can brew any tea in it and clean it with water. A decent one costs ten or fifteen euros online.

The other traditional gongfu vessel is the yixing teapot. Yixing pots are unglazed clay that seasons slowly with the tea you brew in them, which means one pot, one kind of tea. That's a commitment. Yixing is wonderful if you've settled into drinking one tea a lot; it's fiddly if you're still trying things out. Come back to it later.

Everything else is optional: a small pitcher (cha hai, or "fairness pitcher") for pouring evenly into multiple cups; small cups, 30 to 50 ml, any shape; a kettle with temperature control (nice but not required; boiling water rested for a minute gets you close enough for most teas).

What you don't need: a bamboo tea tray, matching porcelain, artisan tongs. None of this makes the tea better. Buy beautiful things later if you want them. But the person telling you that you need a $300 pot to brew properly is selling you a pot.

### `GuideEntry.tsx`

Reference card for a single corpus entry. Props:

```ts
interface GuideEntryProps {
  entry: CorpusEntry;
  vesselMl: number;
  onVesselChange: (ml: number) => void;
  onStartBrewing: (params: BrewParams) => void;
  onBack: () => void;
}
```

Mirroring the `TeaDetail` interface where it overlaps, plus an explicit `onBack` because the return target is context-dependent (see **Entry return context** above) and the parent decides where back goes. Structure (top to bottom):

- `InlineViewHeader` — back arrow calls `onBack`; the parent (`page.tsx`) routes to the correct return state based on `guideEntryOrigin`
- Name block: English name (large serif), Chinese (中文) below, pinyin below that
- Region line, one-line terroir sketch
- Category dot + family placement
- Flavor profile (the existing paragraph from JSON) — the reading core of the card
- **Brewing schedule** rendered as a small SVG timeline (`BrewingTimeline`)
- Vessel + Leaf `StepperControl`s (reused from `src/components/StepperControl.tsx`, same pattern as `TeaDetail`)
- Aroma / taste notes as small pills
- **Brew this →** button (primary action, thumb-zone)
- Sources disclosure: `Sources (n) ▾` — collapsed by default, tap to expand into a list of `<a>` tags

The card is deliberately a read-scroll-absorb surface *that also has brewing controls*, in the same way `TeaDetail` mixes reading (tea name, category) with controls (vessel, leaf, Start Brewing). The reading content dominates visually; controls sit in a dedicated block, not scattered.

**Brewing handoff:** internally, `GuideEntry` adapts the `CorpusEntry` to a `TeaPreset` shape via `corpusEntryToTeaPreset` (new, see below), then calls `buildBrewParams(preset, vesselMl, leafOverride)` and invokes `onStartBrewing`. This is identical to `TeaDetail`'s handoff — the brewing flow does not know or care that the request came from the guide.

Loading: the full entries map is dynamically imported by `page.tsx` on first guide-view entry and passed to `GuideEntry` as a prop (see **Loading corpus entries on the client**).

### `src/lib/corpus-adapter.ts` (new)

Single function: `corpusEntryToTeaPreset(entry: CorpusEntry): TeaPreset`.

Reading `src/data/teas.ts`, the `TeaPreset` shape is:

```ts
interface TeaPreset {
  id: string;
  name: string;
  color: string;
  subtitle: string;
  ratioGPerMl: number;
  tempC: number;
  rinse: boolean;
  doubleRinse: boolean;
  rinseHint?: string;
  baselineSchedule: number[];
  maxAdjust: number;
  brewNote: string;
  seasons: ("spring" | "summer" | "autumn" | "winter")[];
}
```

Field mapping (brewing-critical fields are bolded — these come straight from the corpus and are never defaulted):

| TeaPreset field | Source | Notes |
|---|---|---|
| `id` | `entry.id` | |
| `name` | `entry.name` | |
| `color` | `corpus-categories.ts` lookup by `entry.category` | |
| `subtitle` | derived: category label (e.g., `"Green tea"`) | Not shown in the reference card; included for TeaPreset-shape compatibility |
| **`ratioGPerMl`** | `entry.brewing.ratio_g_per_100ml / 100` | **Unit conversion.** Corpus stores grams per 100 ml; preset stores grams per ml. Verify against a known preset during implementation (Long Jing is in both — `teas.ts` value vs corpus/100 must match). |
| **`tempC`** | `entry.brewing.temp_c` | |
| **`rinse`** | `entry.brewing.rinse` | |
| **`doubleRinse`** | `false` | Corpus doesn't currently track double-rinse. V1 limitation — documented. |
| `rinseHint` | `undefined` | Corpus has no equivalent. |
| **`baselineSchedule`** | `entry.brewing.schedule_s` | |
| `maxAdjust` | category lookup: `green` / `yellow` / `sheng` → `1.3`; `white` / `oolong` → `1.5`; `red` / `dark` → `1.8` | Controls how much the schedule can stretch when leaf amount deviates. Defaults are conservative; hand-tuned per category based on existing `teas.ts` values. |
| `brewNote` | `entry.brewing.tips` ?? `entry.flavor_profile.slice(0, 120)` | |
| `seasons` | category lookup: `green` / `white` / `yellow` → `["spring", "summer"]`; `oolong` → `["spring", "summer", "autumn", "winter"]`; `red` / `dark` → `["autumn", "winter"]` | Used by existing season-filtering logic in `lib/seasons.ts`. Corpus doesn't track seasons; defaults match common practice. |

**Correctness test** (in `tests/corpus-adapter.test.ts`):
1. Adapter runs over all 84 entries without throwing
2. For every entry, all required `TeaPreset` fields are populated
3. **Long Jing fixture**: the adapted `TeaPreset` feeds into `buildBrewParams` and produces identical output to the hand-written `long-jing` preset in `teas.ts` for brewing-critical fields (`tempC`, `ratioGPerMl`, `rinse`, `baselineSchedule`). This is the check that catches unit-conversion bugs.

If the Long Jing fixture fails, the unit conversion or a field mapping is wrong — fix it before shipping.

### `BrewingTimeline.tsx`

Small SVG component. Props: `{ temp_c, ratio_g_per_100ml, schedule_s: number[] }`. Renders:

```
80°C  ·  4g/100ml
▭  ▭  ▭  ▭  ▭
25s 20 20 30 45
```

Full content-width, ~40px tall for the bar row. Segment widths proportional to seconds with a minimum-width clamp so short steeps are still tappable-sized visually. No interactivity — this is a diagram, not a control.

## Components (changed)

### `src/components/SecondaryPaths.tsx`

Currently renders one button (`Custom brew`). Add a second button (`Tea guide`) above or below it with the same structure:

```
Tea guide
Origins, flavors, brewing
```

Primary label 15px/medium, subtitle 12px/tertiary. Same icon style as Custom (line art, 18px square, `var(--color-tertiary)` stroke). Icon suggestion: an open-book silhouette or a stacked-lines "list" mark. Keep it geometric, not illustrated.

Props: add `onOpenGuide: () => void`.

### `src/components/TeaDetail.tsx`

When `tea.id` matches a corpus entry id, render a subtle "About this tea →" link row below the existing content. On tap: `onOpenGuideEntry?.(tea.id)`. Prop is optional so the component still works in isolation.

The check needs to happen *before* the guide's entries chunk has been dynamically loaded (the brewing flow is users' primary surface). Introduce a tiny eager-loaded constant:

- `src/data/corpus/ids.ts` — exports `CORPUS_IDS: ReadonlySet<string>` listing the 84 corpus entry ids as string literals. ~2 KB in the main bundle, no runtime file IO. Maintained manually for now (or regenerated by a one-line script during corpus edits — out of scope for this spec).

`TeaDetail` imports `CORPUS_IDS` and checks `CORPUS_IDS.has(tea.id)` to decide whether to show the link.

### `src/components/AIAdvisor.tsx` — Search result "Read more →"

The in-list Search accordion's result UI lives in `AIAdvisor.tsx`, not `TeaList.tsx`. `AIResult` already carries `source?: "corpus" | "llm"` — the "Read more →" link is rendered **only when `result.source === "corpus"`**, because LLM-fallback results have no corpus entry to open.

**Required backend change:** the `/api/identify` route currently returns an `AIResult` without a corpus id. To link to a reference card, the response must include `corpusId?: string` when `source === "corpus"`. Two changes:

1. `AIResult` interface in `AIAdvisor.tsx` gains `corpusId?: string`
2. `/api/identify` route passes the matched entry's id through on corpus hits

New prop on `AIAdvisor`: `onOpenGuideEntry?: (id: string) => void`. Called when the user taps "Read more →". Optional so the component still works in isolation.

This resolves the overlap between the in-list Search (action-first: single best match, returns brewing params inline) and the Tea Guide (learning-first: browse, read, learn). They're different modes; "Read more →" connects them without merging them.

### `src/app/page.tsx`

- Add the three new `ViewState` values (`guide-index`, `guide-primer`, `guide-entry`)
- Add state: `guideSelectedEntryId: string | null`, `guideEntryOrigin: GuideEntryOrigin`, `guideScrollY: number` (via `useRef`)
- Add handlers:
  - `openGuide()` — from `SecondaryPaths`; transitions `list → guide-index`
  - `openGuideEntryFrom(id, origin)` — sets id + origin, transitions to `guide-entry`
  - `openGuidePrimer()` — transitions `guide-index → guide-primer`
  - `backFromGuideEntry()` — reads `guideEntryOrigin`, dispatches to the correct return state (see Entry return context)
  - `backFromGuidePrimer()` — returns to `guide-index`
  - `backFromGuideIndex()` — returns to `list`
  - `brewFromGuide(entry)` — runs `corpusEntryToTeaPreset`, `buildBrewParams`, then the existing `onStartBrewing` path
- Route rendering: when `viewState` starts with `guide-`, render the guide view stack instead of `TeaList`. The existing brewing transition is untouched.

### `src/i18n/messages.ts` (EN only)

Add keys:
- `secondary.teaGuide: "Tea guide"`
- `secondary.teaGuideDesc: "Origins, flavors, brewing"`
- `guide.title: "Tea guide"`
- `guide.primerLink: "New to gongfu? Start here"`
- `guide.primerTitle: "A short primer on gongfu cha"`
- `guide.searchPlaceholder: "Search by name, flavor, region…"`
- `guide.brewThis: "Brew this"`
- `guide.aboutThisTea: "About this tea"`
- `guide.readMore: "Read more"`
- `guide.sources: "Sources"`
- `guide.emptyResults: "No teas match that."`

Finnish translations are deferred until the i18n branch is merged.

## RAG — Explore mode

Existing: `searchTeas(query, topK = 3)` returns top-k scored results with name-alias boosting. Confidence threshold gates the advisor's retrieval-vs-LLM decision.

For explore mode, we need top-k over a larger k (e.g., 10) and no confidence gate — every result is shown, ranked. Options:

1. **Reuse `searchTeas` as-is** and call with `topK: 10`. No code change in `retrieve.ts`. The Tea Guide just uses the existing function. **Chosen.**
2. Add a new `exploreTeas(query, topK)` wrapper. Rejected — it's `searchTeas` with a different `topK`, no new logic.

New call site: `src/app/api/guide/search/route.ts` (or reuse `api/identify` with a mode flag — see below).

### API route

**Option A:** new route `/api/guide/search` — POST `{ query, topK }` → top-k results.

**Option B:** extend `/api/identify` with a `mode: "identify" | "explore"` parameter.

**Chosen:** Option A. New route. Reasoning: `identify` has specific behavior (confidence gate, LLM fallback, badge) that doesn't apply to explore. Bundling them creates conditional complexity that will be painful later. A second route is cheaper.

Route implementation:

- Input: `{ query: string, topK?: number }` — `query` ≤ 200 chars (same hard cap as identify), `topK` default 10, max 20
- Output: `{ results: ScoredTeaResult[] }` — no confidence filtering, no LLM fallback
- Error handling: 400 on invalid input, 500 on Qdrant failure. Client falls back to client-side substring match over the dynamically-loaded entries map (already available because the user is inside a guide view).

Client-side fallback is important because the Tea Guide must be *usable* without Qdrant. A working app offline (or when the Qdrant instance is down) is more valuable than a better-ranked search. The fallback is: substring match over `{ name, aliases, category, aroma_notes, taste_notes }` joined as a single string per entry, case-insensitive.

### Loading corpus entries on the client

The Guide needs the full corpus (all 84 entries) on the client for: the index list, the reference card view, and the client-side fallback search. Approaches considered:

1. **Build-time slim index + static full entries.** Two files, bundled everywhere. Rejected — two sources of truth, and the slim index is redundant with the full entries already loaded.
2. **Static import of all entries, bundled on every page.** Simple but adds ~40–60 KB gzipped to the brewing flow, which never needs it.
3. **Dynamic import on guide entry.** One chunk, loaded the first time the user taps "Tea guide". Subsequent guide opens are cached by the bundler. The brewing flow is unaffected. **Chosen.**

Implementation:

- `src/data/corpus/entries/index.ts` — a barrel file that re-exports all 84 JSON entries as a single object keyed by id. One-time manual write (or a trivial codegen script checked into the repo).
- `GuideIndex`, `GuideEntry`, and the client-side fallback all receive the loaded entries map as a prop from `page.tsx`.
- `page.tsx` dynamically imports `src/data/corpus/entries` when `viewState` first transitions to a guide state. The import returns a promise; the guide renders a minimal loading state until resolved (one paint, typically <50ms on cached navigations).
- No `guide-index.json`, no `scripts/build-guide-index.ts`, no `npm run guide:index`. Simpler.

**Bundle size impact:** ~40–60 KB gzipped added as a separate chunk, loaded only when the user enters the guide. Zero impact on the brewing flow's initial load.

**Server-side search** (`/api/guide/search`) doesn't need the local entries at all — it calls `searchTeas` which hits Qdrant, and Qdrant returns full payloads.

## Typography & Visual Direction

This is where the project lives or dies. The constraints:

- **Typography-led, not card-led.** No stacked cards. No shadows. No gradients. No rounded-rectangle-on-rounded-rectangle.
- **Serif display** (Noto Serif SC, already loaded in `layout.tsx`) for: guide title, primer headings, entry name, primer body.
- **DM Sans** for: secondary text, chips, buttons, metadata lines.
- **`bg-surface` everywhere.** Existing rule. Category dots are the only color accents. Never `bg-warm` or alternate sections.
- **No photos.** No stock imagery. SVG diagrams only (the timeline, possibly a minimal gaiwan silhouette in the primer).
- **Reading column** ~65ch max-width on desktop; fills viewport with padding on mobile.
- **Generous line-height** (1.7+) in the primer. Normal (1.5) in reference cards.
- **Animations** match the rest of the app: <300ms, `--ease-out` for enters, `--ease-in-out` for on-screen movement. `prefers-reduced-motion` honored.
- **Press feedback** `scale(0.97)` at 160ms (existing global pattern).

The visual test for the primer: when you read it on a phone, does it feel like a small paper zine or does it feel like a web page? Paper is the target.

The visual test for reference cards: when you see three in a row (imagined, since you only see one at a time), do they feel templated like a blog, or do they feel like entries in a hand-bound guide? Guide is the target. The SVG timeline is the only illustrative element and it earns its place by being functional.

## Accessibility

The Guide is a reading-focused surface and must work for keyboard and screen-reader users, not just touch.

- **Category chips** — rendered as a `role="radiogroup"` with `aria-label="Filter by category"`. Each chip is a `<button role="radio" aria-checked>`, tab-navigable, space/enter to toggle, left/right arrow to move between chips.
- **Search input** — labeled with an explicit `<label>` (visually hidden via `sr-only` if the design calls for no visible label). `aria-describedby` pointing to the hint text if any.
- **Entry list rows** — `<button>` elements, not `<div onClick>`. Tab-focusable. Focus ring uses the existing app token.
- **Primer and reference card** — semantic headings: `<h1>` for the title, `<h2>` for each section/beat. Reference card uses an `<article>` wrapper. Flavor profile is a `<p>`, not a `<div>`.
- **`Sources ▾` disclosure** — native `<details>`/`<summary>` if typography allows; otherwise a `<button aria-expanded>` with proper state.
- **Back arrows** (`InlineViewHeader`) — already have `aria-label` in the existing component; Guide views reuse it unchanged.
- **"Brew this →"**, **"About this tea →"**, **"Read more →"** — all `<button>` or `<a>` depending on semantics (brew this triggers an action → button; read more navigates within the SPA → button that changes viewState).
- **Color contrast** — category dots are decorative; the category name is always adjacent in text form so colorblind users are not locked out. No information is conveyed by color alone.
- **`prefers-reduced-motion`** — all enter/exit transitions honor the existing media query (already a global rule; just don't forget in the new components).
- **Language attributes** — Chinese names rendered with `lang="zh"` so screen readers use the correct pronunciation engine.

## Data Flow Summary

```
First guide-view open:
  page.tsx → dynamic import src/data/corpus/entries
          → entries map { [id]: CorpusEntry } available
          → passed to GuideIndex / GuideEntry as prop

Index list render:
  entries → filter by activeCategory → alphabetical → list rows

Search (query non-empty):
  query → POST /api/guide/search
        → searchTeas(query, 10)
        → Qdrant → top-10 ScoredTeaResult
        → client renders list
  On error / offline:
  query → substring match over entries map (local, no network)

Reference card render:
  GuideEntry receives entries[id] directly — no fetch
```

## Testing

New tests under `tests/`:

- `tests/guide-index.test.ts` — substring-match fallback returns expected entries for known queries
- `tests/guide-entry.test.tsx` — component renders entry fields, SVG timeline handles edge cases (1 infusion, 10 infusions)
- `tests/guide-api.test.ts` — API route validates input, rejects over-long queries, returns expected shape
- `tests/corpus-adapter.test.ts` — `corpusEntryToTeaPreset`:
  1. Runs over all 84 entries without throwing; every required `TeaPreset` field is populated
  2. **Long Jing fixture**: adapted output's brewing-critical fields (`tempC`, `ratioGPerMl`, `rinse`, `baselineSchedule`) match the hand-written `long-jing` preset in `teas.ts`. Catches unit-conversion bugs and missing mappings.

Manual checks:
- Primer readability on a real phone (not just devtools)
- Back-navigation preserves scroll position in `guide-index`
- `TeaDetail → About this tea →` opens correct reference card for each of the 8 presets that map to corpus entries
- "Brew this →" from a reference card starts brewing with the corpus entry's schedule and currently-selected vessel/leaf
- RAG search with common queries: "long jing", "oolong", "nutty", "autumn"
- RAG offline (kill Qdrant): fallback search still works

## Phasing

**Phase 1 — Shippable MVP.** Everything in this spec. One branch, `feat/field-guide` (already created), merged when the primer is written and manual checks pass on a real device.

**No Phase 2.** If the primer needs more than one piece, that's a separate spec written later against the shipped feature.

Small polishes that are explicitly allowed *inside* Phase 1 (not punted):

- `About this tea →` link on `TeaDetail` for the matching 8 presets
- `Read more →` link on the in-list Search result card
- `SecondaryPaths` icon design for the new entry
- `guide-index` scroll-restoration

## Open Questions

1. **Which presets map to corpus entries?** Need to audit `src/data/teas.ts` against corpus ids. Confirmed matches so far: `long-jing`. Likely additional: `bai-mu-dan`, `tie-guan-yin`, `da-hong-pao`, `sheng-pu-erh`, `shou-pu-erh`, `dian-hong`. Full audit resolves during implementation — it's a 5-minute scan over two files.
2. **Chinese name extraction.** Corpus entries don't have a dedicated `chineseName` field — the Chinese characters live inside `aliases`. A helper `extractChineseName(entry): string | undefined` picks the first alias matching `/^[\u4e00-\u9fff]+$/`. The reference card and index list gracefully show English only when no match exists.
3. **Icon for the `SecondaryPaths` Tea guide entry.** Open book? Stacked lines? Leaf-with-lines? Decide visually during build; not spec-blocking.
4. **`maxAdjust` defaults per category.** The adapter uses a category lookup table (green/yellow/sheng → 1.3, white/oolong → 1.5, red/dark → 1.8). Implementation should sanity-check these against existing `teas.ts` values — if hand-tuned presets use different numbers, align the defaults.

## Non-Goals (restated, because these are the easiest things to accidentally build)

- Not a blog
- Not a Wikipedia clone
- Not a brand content site
- Not a tea shop
- Not a social surface
- Not a visual encyclopedia with photos

---

**End of spec.**
