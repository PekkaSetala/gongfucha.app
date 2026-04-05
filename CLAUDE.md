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
```

## Architecture

**Single-page client app.** The entire UI lives in `src/app/page.tsx` as a `"use client"` component. No routing — view state (`list | ai | custom`) is managed via React state. When brewing starts, the page swaps entirely to `BrewingTimer`.

```
src/
  app/
    page.tsx              # Root — all view switching, vessel state, brew param assembly
    layout.tsx            # Fonts (DM Sans, Noto Serif SC), metadata, viewport
    api/identify/route.ts # POST endpoint — OpenRouter LLM call for tea identification
    globals.css           # Tailwind v4 @theme tokens, animations, easing vars
  components/
    TeaList.tsx           # Scrollable tea preset list
    TeaDetail.tsx         # Tea info + leaf/vessel config + "start brewing" (inline on mobile, side panel on desktop)
    BrewingTimer.tsx      # Full-screen timer — phases: rinse → rinse2 → brewing → between
    TimerRing.tsx         # SVG circular progress
    AIAdvisor.tsx         # Text input → /api/identify → brew from AI result
    CustomMode.tsx        # Manual temp/ratio/schedule entry
    Header.tsx            # App header with season hint
    SecondaryPaths.tsx    # Links to AI and Custom views
    InlineViewHeader.tsx  # Back-arrow header for inline views
  data/
    teas.ts               # 8 tea presets (TeaPreset type) with ratios, temps, schedules
  lib/
    brewing.ts            # Pure functions: leaf calc, schedule adjustment, extension
    seasons.ts            # Season detection, seasonal tea filtering
  hooks/
    useTimer.ts           # Countdown timer hook (play/pause/reset/progress)
tests/
    brewing.test.ts       # Vitest tests for brewing.ts
```

## Key Patterns

- **Responsive split**: mobile gets inline detail below list; desktop gets sticky side panel. Breakpoint is `md:`.
- **Brewing flow**: `page.tsx` builds `BrewParams` → passes to `BrewingTimer` → timer manages phase state machine (rinse → brewing → between → next infusion). Schedule auto-extends via 1.35x factor.
- **Schedule adjustment**: when user changes leaf amount from recommended, `brewing.ts` scales all steep times proportionally (capped 0.5x–2.0x).
- **AI identify**: `AIAdvisor` → POST `/api/identify` → OpenRouter API → matches response to closest `TeaPreset` by `categoryId`. Requires `OPENROUTER_API_KEY` env var.
- **Design tokens**: defined as CSS custom properties in `globals.css` via Tailwind v4 `@theme inline`. Colors: `bg`, `surface`, `border`, `primary`, `secondary`, `tertiary`, `clay`, `gold`. Easing: `--ease-out`, `--ease-in-out`, `--ease-drawer`.
- **Vessel persistence**: `localStorage` key `gongfucha-vessel-ml`, default 120ml.
- **Animations**: `tea-stagger` (list items), `detail-enter` (cards). Respects `prefers-reduced-motion`.

## Testing

Tests use Vitest with path alias `@` → `./src`. Test files go in `tests/`. Only `brewing.ts` pure functions are tested currently.
