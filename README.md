# 功夫茶 — Gongfu Cha

A gongfu-style brewing timer for the tea table.

**[gongfucha.app →](https://gongfucha.app)**

---

Pick a tea. Set your vessel. The app walks you through every infusion — rinse, steep, rest — with timings that scale to how much leaf you actually used. Built for one hand, wet fingers, and the corner of a wet tea board.

## What it does

- **8 curated presets** across 5 tea families — Green, White (Fresh / Aged), Oolong (Light / Dark), Pu-erh (Sheng / Shou), Black. Curated, not exhaustive.
- **Per-infusion brewing timer.** Schedules adjust proportionally when you change leaf, so a half-dose still produces a coherent session.
- **Mid-brew ±3s adjusters.** Your kettle is always the variable.
- **Custom mode** for everything off the menu — pick tea type, temperature, vessel, leaf, infusion count.
- **AI tea advisor.** Describe a tea in plain language ("fruity oolong from Taiwan", "2020 Yiwu sheng"). A hand-curated corpus of 84 tea entries is searched first via local embeddings; an LLM falls in only when confidence is low.
- **Weather-aware moods.** The header notices the weather and suggests *qualities* (cooling, warming, roasted) — never specific teas. You pick the tea.
- **Session summary** with totals and a soft close.
- **PWA.** Installable. The timer works offline.

## What it isn't

No accounts. No cloud sync. No suggestions feed. No notifications. No leaderboards. No social. No upsells. No AI everywhere — just the one place it earns its keep.

Brewing tea is a small ritual. The app sits inside it without making noise.

## Design principles

- **Mobile-first, wet-handed.** Inline views only. No modals, no bottom sheets, no overlays. Large touch targets, two-tap confirmations, no accidental exits.
- **No auto-start.** You pour water, then you tap. The app does not assume your kettle's state.
- **Restraint over polish.** Handmade. No gradient stacks. No generic card layouts. Color dots, not bars. The five tea-color dots follow a deliberate harmony arc — sage → dried leaf → amber → earth → copper-red.
- **g/100ml ratio display.** How the Western gongfu community actually thinks.
- **Weather suggests qualities, never teas.** The app does not pretend to know what you want to drink.
- **Mid-brew tempo respected.** Every animation under 300ms. Press feedback is `scale(0.97)` at 160ms — perceptible, never theatrical.

## Built from primitives

The RAG pipeline is hand-built. No LangChain, no LlamaIndex, no vector framework. Just:

- **Local embeddings** via `all-MiniLM-L6-v2` (HuggingFace Transformers, ONNX runtime). No API cost, no third party for the embedding step.
- **Qdrant** as the vector store. A thin HTTP client, ~80 lines.
- **Hybrid retrieval** — name/alias boost layered on cosine similarity, with a confidence threshold that gates the LLM fallback.
- **OpenRouter** for the fallback only, when retrieval is genuinely unsure.

The whole pipeline lives in `src/lib/rag/` and is small enough to read in one sitting. That was the point.

## Stack

Next.js 16 · React 19 · Tailwind CSS 4 · TypeScript · Vitest · Qdrant · OpenRouter

Self-hosted on a Hetzner CX22 in Helsinki, behind nginx + Let's Encrypt. Docker Compose for app + vector DB. No serverless, no edge, no vendor lock.

## Project layout

```
src/
  app/          page.tsx, layout, api/identify
  components/   TeaList, TeaDetail, BrewingTimer, AIAdvisor, CustomMode, …
  data/         teas, tips, categories, corpus/  (84 hand-written entries)
  lib/          brewing math, rag/, weather, seasons
  hooks/        useTimer, useBrewSound
tests/          Vitest
```

Architecture notes live in `CLAUDE.md`. The RAG spec is in `docs/rag-spec.md`.

---

Built solo by [Pekka Setälä](https://github.com/PekkaSetala). Tea over code. Always.
