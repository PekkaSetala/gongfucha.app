# Gongfu Cha

A gongfu-style tea brewing timer and guide. Single-page PWA built for mobile, wet-handed use at the tea table.

Pick a tea, set your vessel and leaf, and the app walks you through each infusion — rinse, steep, rest — with timings that adjust to how much leaf you're actually using. An AI advisor identifies teas from a description and suggests brewing parameters, backed by a hand-curated corpus of 84 teas retrieved via local embeddings.

## Features

- **8 curated presets** across 5 tea groups: Green, White (Fresh/Aged), Oolong (Light/Dark), Pu-erh (Sheng/Shou), Black
- **Gongfu brewing timer** with per-infusion schedules, rinse phases, and proportional time scaling when you change leaf amount
- **Custom mode** — pick tea type, temperature, vessel size, leaf, and infusion count manually
- **AI tea advisor** — describe a tea in plain language, get identification and brew parameters (RAG retrieval → LLM fallback)
- **Weather-aware moods** suggesting tea qualities (cooling, warming, roasted) based on local conditions
- **Session summary** with total time, infusions, leaf and vessel used
- **PWA** — installable, works offline for the timer

## Stack

- Next.js 16 + React 19 (App Router, single-page client)
- Tailwind CSS 4 with `@theme` tokens
- TypeScript
- Vitest for tests
- Qdrant + local `all-MiniLM-L6-v2` embeddings for RAG (no LangChain, built from primitives)
- OpenRouter for LLM fallback

## Getting Started

```bash
npm install
npm run dev          # localhost:3000
```

Other commands:

```bash
npm run build        # production build
npm run lint         # ESLint
npx vitest run       # all tests
npm run rag:index    # index the tea corpus into Qdrant
npx tsx scripts/rag-eval.ts   # evaluate RAG retrieval quality
```

## Environment

For the AI advisor, set:

```
QDRANT_URL=
QDRANT_API_KEY=
OPENROUTER_API_KEY=
```

## Design Principles

- **Mobile-first, wet-handed.** Inline views only — no modals, sheets, or overlays. Large touch targets.
- **No auto-start.** You pour water, then tap to start the timer.
- **Restraint over polish.** Handmade feel, no gradient stacks or generic card layouts.
- **g/100ml ratio display** — how the Western gongfu community thinks.
- **Weather moods suggest qualities, never specific teas.**

## Project Layout

```
src/
  app/          # page.tsx (root), layout, api/identify route
  components/   # TeaList, TeaDetail, BrewingTimer, AIAdvisor, CustomMode, ...
  data/         # teas, tips, categories, greetings, corpus/
  lib/          # brewing math, rag/, weather, seasons
  hooks/        # useTimer, useBrewSound
tests/          # Vitest
scripts/        # rag-eval
```

See `CLAUDE.md` for architecture notes and `docs/rag-spec.md` for the RAG pipeline spec.
