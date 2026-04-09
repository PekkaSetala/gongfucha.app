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
- An `explore` mode on the existing RAG retrieval (`searchTeas` → top-k)
- Cross-link from `TeaDetail` → reference card when a preset maps to a corpus entry
- Cross-link from the existing in-list Search accordion result → reference card

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

## User Flow

```
TeaList
  └── SecondaryPaths
        ├── Tea guide ────────→ guide-index
        │                         ├── "New to gongfu? Start here →" ──→ guide-primer
        │                         ├── search box (RAG explore)
        │                         ├── category chips (green/white/oolong/red/dark)
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
- `guide-entry → guide-index` — back arrow.
- `guide-entry → enter-brewing` — "Brew this" button. Adapts the corpus entry to a `TeaPreset`-shaped object via `corpusEntryToTeaPreset`, calls `buildBrewParams(preset, vesselMl, leafOverride)`, and follows the same `onStartBrewing` path as `TeaDetail`. No Custom-mode detour.
- `guide-* → list` — back arrow from `guide-index`, or a full reset.

Page scroll position on `guide-index` should be preserved when returning from `guide-entry`. A simple `useRef<number>` capture on leave, restore on return, is sufficient.

## Components (new)

All in `src/components/guide/` to keep the surface isolated.

### `GuideIndex.tsx`

The landing screen. Renders:

- `InlineViewHeader` with title "Tea guide" and back arrow → `list`
- "A short primer on gongfu cha" link row (opens `guide-primer`)
- Search input (optional — mobile secondary)
- Horizontal row of five category chips (reuse `tea-categories.ts` colors)
- Filtered, scrollable list of entries — each row is a category dot + Chinese name (if present) + English name, ~56px tall

State:
- `query: string` — bound to search input, empty by default
- `activeCategory: CategoryId | null` — selected chip or null for all
- `results: CorpusEntry[]` — computed from query + activeCategory

When `query` is empty: show filtered (by category) alphabetical list of all matching entries. When `query` is non-empty (≥2 chars): call the RAG `explore` mode for top-k and merge with alphabetical as fallback.

**Search debounce:** 250ms. Cancel in-flight requests on new keystroke. Treat network failure as empty-state and fall back to plain substring match over loaded entry metadata.

### `GuidePrimer.tsx`

Static TSX. `InlineViewHeader` + ~600 words of hand-written serif prose. No props. Hard-coded content. Sections:

1. What gongfu actually is
2. How to read a brewing schedule
3. What gear you actually need

Body uses Noto Serif SC. Generous line-height (1.7+). Max content width ~65ch (on mobile, fills the viewport minus padding — this is a desktop concern only).

The primer is static content, not MDX, not markdown-parsed. One TSX file. Easiest to typeset well and easiest to version-control as craft.

### `GuideEntry.tsx`

Reference card for a single corpus entry. Props: `entry: CorpusEntry`, `vesselMl`, `onVesselChange`, `onStartBrewing` — mirroring the `TeaDetail` interface where it overlaps. Structure (top to bottom):

- `InlineViewHeader` — back arrow returns to `guide-index`
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

Loading: corpus entries are statically imported from `src/data/corpus/entries/` — 84 JSON files at ~2KB each is fine to bundle. No fetch, no lazy load on first version.

### `src/lib/corpus-adapter.ts` (new)

Single function: `corpusEntryToTeaPreset(entry: CorpusEntry): TeaPreset`. Maps corpus fields to the shape `buildBrewParams` expects:

- `id` ← `entry.id`
- `name` ← `entry.name`
- `category` ← `entry.category`
- `temp` ← `entry.brewing.temp_c`
- `ratio` ← `entry.brewing.ratio_g_per_100ml`
- `schedule` ← `entry.brewing.schedule_s`
- `rinse` ← `entry.brewing.rinse`
- `maxInfusions` ← `entry.brewing.max_infusions`
- any other fields `TeaPreset` requires — determined at build time by reading `src/data/teas.ts`

If `TeaPreset` has fields the corpus doesn't provide (description, display color, etc.), the adapter fills them with sensible defaults derived from `tea-categories.ts`. No brewing-critical field is defaulted — those come straight from the corpus.

### `BrewingTimeline.tsx`

Small SVG component. Props: `{ temp_c, ratio_g_per_100ml, schedule_s: number[] }`. Renders:

```
80°C  ·  4g/100ml
▭  ▭  ▭  ▭  ▭
25s 20 20 30 45
```

Full content-width, ~40px tall for the bar row. Segment widths proportional to seconds with a minimum-width clamp so short steeps are still tappable-sized visually. No interactivity — this is a diagram, not a control.

### `TypeLabel.tsx` (optional, if the pattern repeats)

Small component for the category dot + family-name pattern, if it's used in more than one place. Otherwise inline.

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

When `selectedTea.id` matches a corpus entry id (check against a statically imported set of corpus ids), render a subtle "About this tea →" link row below the existing content. On tap: `onOpenGuideEntry?.(teaId)`. Prop is optional so the component still works in isolation.

### `src/components/TeaList.tsx` — Search accordion result

When the existing Search (formerly Ask AI) accordion returns a result that matches a corpus entry, add a subtle "Read more →" link on the result card that opens the matching reference card.

This is the cleanest way to resolve the overlap between the existing in-list Search (single-best-match, returns brewing params inline) and the Tea Guide (browse, read, learn). They're different modes: the in-list Search is action-first ("I want to brew this now"), the Tea Guide is learning-first ("I want to understand this"). The "Read more →" link connects them without merging them.

### `src/app/page.tsx`

- Add the three new `ViewState` values
- Add state: `guideSelectedEntryId: string | null`, `guideScrollY: number`
- Add handlers: `openGuide`, `openGuideEntry(id)`, `openGuidePrimer`, `backToGuideIndex`, `backToList`, `brewFromGuide(entry)`
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
- Error handling: 400 on invalid input, 500 on Qdrant failure. Client falls back to client-side substring match over a preloaded entry metadata array.

Client-side fallback is important because the Tea Guide must be *usable* without Qdrant. A working app offline (or when the Qdrant instance is down) is more valuable than a better-ranked search. The fallback is: substring match over `{ name, aliases, category, aroma_notes, taste_notes }` joined as a single string per entry, case-insensitive.

### Preloading entry metadata

For the index list and the client-side fallback, we need a lightweight metadata array: `{ id, name, chineseName, category, aliases, aromaNotes, tasteNotes }` for all 84 entries. Two options:

1. Build-time JSON: a script that reads all corpus entries and emits `src/data/corpus/index.json` with the slim metadata. Script runs in `prebuild` or manually.
2. Static import from TS: `import * as entries from "./entries/*.json"` — depends on bundler glob support. Next.js with Turbopack supports this but it's bundler-specific.

**Chosen:** Option 1. A small build script, checked-in output. Predictable, bundler-agnostic, cacheable. The script lives at `scripts/build-guide-index.ts` and writes `src/data/corpus/guide-index.json`. Also runs as part of `npm run rag:index` (or as a separate `npm run guide:index` script — to be decided in the implementation plan).

Full entries (`src/data/corpus/entries/<id>.json`) remain statically importable at runtime for the reference card view.

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

## Data Flow Summary

```
Static:
  corpus/entries/*.json   ──→ GuideEntry render
  corpus/guide-index.json ──→ GuideIndex list + client-side fallback search

Dynamic (on search):
  query → POST /api/guide/search
        → searchTeas(query, 10)
        → Qdrant
        → top-10 ScoredTeaResult
        → client renders list
  On error:
  query → substring match over guide-index.json (local)
```

## Testing

New tests under `tests/`:

- `tests/guide-index.test.ts` — substring-match fallback returns expected entries for known queries
- `tests/guide-entry.test.tsx` — component renders entry fields, SVG timeline handles edge cases (1 infusion, 10 infusions)
- `tests/guide-api.test.ts` — API route validates input, rejects over-long queries, returns expected shape
- `tests/corpus-adapter.test.ts` — `corpusEntryToTeaPreset` produces valid `TeaPreset` output for all 84 entries (loop over every file, assert no thrown errors, assert required fields populated)

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

1. **Which 8 presets map to corpus entries?** Need to audit `src/data/teas.ts` against corpus ids. Likely: `long-jing`, `bai-mu-dan`, `tie-guan-yin`, `da-hong-pao`, `sheng-pu-erh`, `shou-pu-erh`, `dian-hong`, and one more. Resolved during implementation.
2. **Chinese name field in corpus JSON.** Not all entries have a structured `chineseName` field — some only have `aliases` containing the Chinese characters. The reference card and index list need to handle "no Chinese name" gracefully (just show English). Resolved at render time.
3. **Primer length.** ~600 words is the target. If the writing comes in at 400 or 900, accept it — craft over wordcount. Hard cap 1000.
4. **Icon for the `SecondaryPaths` Tea guide entry.** Open book? Stacked lines? Leaf-with-lines? Decide visually during build; not spec-blocking.

## Non-Goals (restated, because these are the easiest things to accidentally build)

- Not a blog
- Not a Wikipedia clone
- Not a brand content site
- Not a recommendation engine
- Not a tea shop
- Not a social surface
- Not a visual encyclopedia with photos

---

**End of spec.**
