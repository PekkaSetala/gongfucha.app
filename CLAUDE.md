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
    TeaList.tsx           # Accordion tea list — detail expands inline below selected tea
    TeaDetail.tsx         # Tea info + leaf/vessel config + "start brewing" + reset defaults
    BrewingTimer.tsx      # Full-screen timer — phases: rinse → rinse2 → brewing → between, session summary
    TimerRing.tsx         # SVG circular progress with completion pulse
    AIAdvisor.tsx         # Text input → /api/identify → brew from AI result
    CustomMode.tsx        # Tea type selector, temp presets, vessel/leaf steppers, schedule preview, rinse toggle
    SessionSummary.tsx    # End-of-session stats screen (infusions, time, leaf, vessel)
    Header.tsx            # App header with rotating daily tip
    StepperControl.tsx    # Reusable ±stepper for vessel, leaf, time, infusions
    SecondaryPaths.tsx    # Links to AI and Custom views
    InlineViewHeader.tsx  # Back-arrow + view title header for inline views
  data/
    teas.ts               # 8 tea presets (TeaPreset type) with ratios, temps, schedules, rinseHints
    tips.ts               # 24 rotating daily gongfu tips for Western hobbyists
    tea-categories.ts     # Category ID → label/color map (green, white, oolong, puerh, black)
    brew-tips.ts          # 120 contextual brewing tips with tea type + infusion range metadata
  lib/
    brewing.ts            # Pure functions: leaf calc, schedule adjustment, extension
    brew-tips.ts          # Tip selection algorithm (filter, weight by tea type, no-repeat)
    seasons.ts            # Season detection, seasonal tea filtering
  hooks/
    useTimer.ts           # Countdown timer hook (play/pause/reset/progress)
    useBrewSound.ts       # AudioContext sound with iOS unlock + HTMLAudio fallback
tests/
    brewing.test.ts       # Vitest tests for brewing.ts
    brew-tips.test.ts     # Tests for tip selection algorithm
```

## Key Patterns

- **Accordion selection**: clicking a tea in `TeaList` expands detail inline below that row (CSS grid height animation). No side panel — single centered column for all views.
- **Brewing flow**: `page.tsx` builds `BrewParams` → passes to `BrewingTimer` via a 4-state view machine (`list → enter-brewing → brewing → exit-brewing`). Both views mount simultaneously; opacity + pointer-events control visibility. Enter uses a tea color bridge overlay (radial gradient crossfade); exit is a plain crossfade. Timer manages phase state machine (rinse → brewing → between → next infusion → session summary). Schedule auto-extends via 1.35x factor.
- **Tea-colored timer**: timer view threads the tea's accent color through title, phase labels, info cards, buttons via `color-mix()`. Color wash (radial gradient) deepens proportionally with steep progress (quadratic ease-out curve, 8%→18% tea color). Each tea tints the whole screen.
- **Schedule adjustment**: when user changes leaf amount from recommended, `brewing.ts` scales all steep times proportionally (capped 0.5x–2.0x).
- **AI identify**: `AIAdvisor` → POST `/api/identify` → OpenRouter API → matches response to closest `TeaPreset` by `categoryId`. Requires `OPENROUTER_API_KEY` env var.
- **Design tokens**: defined as CSS custom properties in `globals.css` via Tailwind v4 `@theme inline`. Colors: `bg`, `surface`, `border`, `primary`, `secondary`, `tertiary`, `clay`, `gold`. Easing: `--ease-out`, `--ease-in-out`, `--ease-drawer`.
- **Vessel persistence**: `localStorage` key `gongfucha-vessel-ml`, default 120ml.
- **Animations**: `tea-stagger` (list items), `detail-enter` (cards), `view-enter` (AI/Custom crossfade), `phase-enter`/`phase-exit` (timer phases), `ring-complete`/`ring-glow-complete` (timer ring pulse), `wash-breathe` (8s color wash cycle), `wash-flash` (completion bloom), `digit-settle` (serif number tick), `wisp-rise` (steam wisps, between state), `ring-idle-breathe` (dashed ring, between state), `between-enter` (fade-only phase transition), `view-fade-out`/`view-fade-in`/`bridge-overlay` (tea color bridge enter), `view-fade-out-slow`/`view-fade-in-slow` (plain crossfade exit). Respects `prefers-reduced-motion`.
- **End session**: two-tap confirmation — first tap reveals "Yes, end session" + "Cancel" to prevent accidental exits.
- **Brew tips**: 120 contextual tips in `brew-tips.ts`, selected by `selectTip()` based on tea type and infusion number. Shown on between-infusion screen. Tea-specific tips weighted 3x over universal.
- **Sound & haptic**: `useBrewSound` hook plays ceramic-tap.wav via AudioContext (iOS unlock on first tap). Haptic via `navigator.vibrate()` on timer complete.
- **Ratio display**: shown as g/100ml (how the Western gongfu community thinks), not raw g/ml.
- **Rinse hints**: per-tea `rinseHint` field on `TeaPreset` — shown during rinse phase instead of generic text.
- **Daily tips**: `tips.ts` rotates by day-of-year. Replaces seasonal TCM hints in header. Aimed at Western hobbyists.

## Testing

Tests use Vitest with path alias `@` → `./src`. Test files go in `tests/`. Tests cover `brewing.ts` pure functions and `brew-tips.ts` selection algorithm.
