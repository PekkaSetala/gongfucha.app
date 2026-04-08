# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Gongfu Cha — a gongfu-style tea brewing timer and guide. Single-page PWA targeting mobile (wet-handed use). Next.js 16 + React 19 + Tailwind CSS 4 + TypeScript.

## Next.js 16 Warning

@AGENTS.md

Read `node_modules/next/dist/docs/` before writing any Next.js code. APIs differ from training data.

## Commands

```bash
npm run dev          # Dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npx vitest run       # All tests
npx vitest run tests/brewing.test.ts  # Single test file
npm run rag:index    # Index tea corpus into Qdrant
npx tsx scripts/rag-eval.ts           # Evaluate RAG retrieval quality
```

## Architecture

**Single-page client app.** The entire UI lives in `src/app/page.tsx` as a `"use client"` component. No routing — view state (`list | ai | custom`) is managed via React state. When brewing starts, the page swaps entirely to `BrewingTimer`.

```
src/
  app/
    page.tsx              # Root — group/variant selection, vessel state, view switching, brew param assembly
    layout.tsx            # Fonts (DM Sans, Noto Serif SC), metadata, viewport
    api/identify/route.ts # POST endpoint — RAG retrieval first, OpenRouter LLM fallback
    globals.css           # Tailwind v4 @theme tokens, animations, easing vars
  components/
    TeaList.tsx           # Grouped tea list — 5 rows (3 with variant pills, 2 standalone), accordion detail
    TeaDetail.tsx         # Tea info + leaf/vessel config + "start brewing" + reset defaults
    BrewingTimer.tsx      # Full-screen timer — phases: rinse → rinse2 → brewing → between, session summary
    TimerRing.tsx         # SVG circular progress with completion pulse
    AIAdvisor.tsx         # Text input → /api/identify → brew from AI result
    CustomMode.tsx        # Tea type selector, temp presets, vessel/leaf steppers, schedule preview, rinse toggle
    SessionSummary.tsx    # End-of-session stats screen (infusions, time, leaf, vessel)
    Header.tsx            # App header — 功夫茶 masthead, weather mood, "pick your tea" label
    StepperControl.tsx    # Reusable ±stepper for vessel, leaf, time, infusions
    SecondaryPaths.tsx    # Links to AI and Custom views
    InlineViewHeader.tsx  # Back-arrow + view title header for inline views
  data/
    teas.ts               # 8 tea presets (TeaPreset) + teaGroups display structure (5 groups: 3 with variants, 2 standalone)
    tips.ts               # 24 rotating daily gongfu tips for Western hobbyists
    tea-categories.ts     # Category ID → label/color map (green, white, oolong, puerh, black) with harmonized palette
    brew-tips.ts          # 120 contextual brewing tips with tea type + infusion range metadata
    greetings.ts          # 20 rotating headlines with time-band tags (morning/afternoon/evening/anytime)
  lib/
    brewing.ts            # Pure functions: leaf calc, schedule adjustment, extension
    brew-tips.ts          # Tip selection algorithm (filter, weight by tea type, no-repeat)
    pick.ts               # seededPick + getSessionSeed — stable per-visit array selection
    seasons.ts            # Season detection, seasonal tea filtering
    weather.ts            # Weather fetch (wttr.in), condition mapping, mood expressions
    rag/
      build-embedding-text.ts  # Compose embedding text from tea entry fields
      embed.ts                 # Local embedding via all-MiniLM-L6-v2 (HuggingFace Transformers)
      index.ts                 # Corpus indexing script — embeds all entries, upserts to Qdrant
      qdrant.ts                # Thin Qdrant HTTP client (search, upsert, collection ops)
      retrieve.ts              # Hybrid search: name/alias boost + cosine similarity + confidence threshold
  hooks/
    useTimer.ts           # Countdown timer hook (play/pause/reset/progress)
    useBrewSound.ts       # AudioContext sound with iOS unlock + HTMLAudio fallback
scripts/
    rag-eval.ts           # RAG retrieval evaluation — tests query→result quality
tests/
    brewing.test.ts       # Vitest tests for brewing.ts
    brew-tips.test.ts     # Tests for tip selection algorithm
    greetings.test.ts     # Tests for headline time-band filtering
    pick.test.ts          # Tests for seededPick determinism
    weather-moods.test.ts # Tests for expanded weather mood selection
    tea-groups.test.ts    # Tests for teaGroups structure and variant references
    rag-integration.test.ts # Tests for RAG retrieval pipeline (Qdrant, embedding, search)
```

## Design Decisions

These are constraints that prevent wrong code. They reflect deliberate choices, not defaults.

- **Mobile-first, wet-handed use.** No bottom sheets, modals, or overlays — everything is inline in a single centered column. Touch targets must be large.
- **No auto-start timer.** User pours water before timing. Timer starts on manual tap only.
- **Ratio display is g/100ml** — how the Western gongfu community thinks, not raw g/ml.
- **5 tea groups, 8 presets.** The list shows 5 rows: Green and Black are standalone; White (Fresh/Aged), Oolong (Light/Dark), and Pu-erh (Sheng/Shou) are grouped with inline variant pills. Don't add new presets or groups. The RAG corpus (84 entries) handles breadth; presets are curated starting points.
- **Weather moods suggest qualities only** (cooling, warming, light, roasted) — never name specific teas.
- **No AI slop.** Design must feel handmade. No gradients-on-gradients, no generic card layouts. Restraint and authenticity.
- **All surfaces use `bg-surface`.** Never differentiate sections with `bg-warm` or alternate backgrounds.
- **Color dots, not bars.** Tea category dots are personal and handmade — don't replace with color bars or corporate patterns.
- **Color harmony arc.** Dot colors follow a deliberate progression: sage green (#7A9E6B) → dried leaf (#B5A890) → amber (#A8884A) → earth (#7B6B4D) → copper-red (#945046). Black tea is 红茶 (red tea) — the copper-red reflects liquor color. Don't change individual colors without considering the full arc.
- **No frameworks for RAG.** Built from primitives (no LangChain/LlamaIndex) — this is a portfolio project demonstrating understanding.
- **Local embeddings** (all-MiniLM-L6-v2) chosen over OpenAI API — no cost, no external dependency for embeddings.
- **Service workers: production only.** Never register in dev mode — breaks HMR.

## Key Patterns

- **View state machine**: `page.tsx` manages `list | ai | custom` views via React state. Brewing uses a 4-state machine (`list → enter-brewing → brewing → exit-brewing`) with opacity/pointer-events crossfade. Enter transition uses tea-color bridge overlay.
- **Tea group selection**: `page.tsx` uses `expandedGroupId` + `selectedVariantId` (not a single selectedId). Standalone teas auto-set `selectedVariantId` on expand. Grouped teas show variant pills first, then TeaDetail after pill selection. Variant switching uses a crossfade with blur bridge (100ms exit, 150ms enter).
- **Tea-colored timer**: accent color threads through the entire timer view via `color-mix()`. Color wash deepens with steep progress (quadratic ease-out, 8%→18%).
- **Schedule adjustment**: changing leaf amount from recommended scales all steep times proportionally (capped 0.5x–2.0x) in `brewing.ts`.
- **AI identify**: RAG retrieval first (Qdrant), LLM fallback below confidence threshold. Env vars: `QDRANT_URL`, `QDRANT_API_KEY`, `OPENROUTER_API_KEY`.
- **Design tokens**: CSS custom properties in `globals.css` via Tailwind v4 `@theme inline`.
- **Animations**: defined in `globals.css`, all respect `prefers-reduced-motion`. Easing: `--ease-out` for enters, `--ease-in-out` for on-screen movement. UI animations stay under 300ms. Press feedback is `scale(0.97)` at 160ms globally.
- **Seeded randomness**: `seededPick` ensures stable per-visit selection (weather moods, greetings) within 30-min windows.
- **End session**: two-tap confirmation to prevent accidental exits.

## Testing

Vitest with path alias `@` → `./src`. Test files in `tests/`. Run `npx vitest run`.

## RAG Pipeline

Full spec: `docs/rag-spec.md`. 84 tea entries in `src/data/corpus/entries/*.json`.

- **Flow**: query → name/alias boost + cosine similarity → confidence threshold → result or LLM fallback
- **Indexing**: `npm run rag:index` embeds corpus and upserts to Qdrant
- **Evaluation**: `scripts/rag-eval.ts` tests retrieval quality
- **Hardening**: query length capped 200 chars, Qdrant timeout 5s
- **Deploy**: Docker Compose (Qdrant + app + nginx) on Hetzner VPS — not yet deployed
- **Next**: deploy Qdrant on Hetzner, run `npm run rag:index` against live instance, end-to-end test AI advisor with real retrieval
