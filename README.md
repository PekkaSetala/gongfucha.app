# 功夫茶 — Gongfu Cha

A gongfu-style brewing timer for the tea table.

**[gongfucha.app →](https://gongfucha.app)**

---

Pick a tea. Set your vessel. The app walks you through every infusion — rinse, steep, rest — with timings that scale to how much leaf you actually used. Built for one hand, wet fingers, and the corner of a wet tea board.

## What it does

- **8 curated presets** across 5 tea families — Green, White, Oolong, Pu-erh, Black.
- **Per-infusion timer.** Schedules scale proportionally when you change leaf.
- **Mid-brew ±3s adjusters.** Your kettle is always the variable.
- **Custom mode** for everything off the menu.
- **Search by description.** "Fruity oolong from Taiwan", "2020 Yiwu sheng". A hand-curated corpus of 84 entries is searched first via local embeddings; an LLM fills in only when confidence is low. Spec: [`docs/rag-spec.md`](docs/rag-spec.md).
- **Weather-aware moods.** The header notices the weather and suggests *qualities* — cooling, warming, roasted — never specific teas.
- **Session summary.** Totals and a soft close.
- **PWA.** Installable. The timer works offline.

## What it isn't

No accounts. No cloud sync. No feed. No notifications. No social. No upsells. Brewing tea is a small ritual — the app sits inside it without making noise.

## How it's designed

- **Mobile-first, wet-handed.** Inline views only. No modals, no bottom sheets, no overlays. Large touch targets, two-tap confirmations.
- **No auto-start.** You pour water, then you tap.
- **Restraint over polish.** Handmade. No gradient stacks, no generic card layouts. Color dots, not bars — five tea colors on a deliberate harmony arc: sage → dried leaf → amber → earth → copper-red.
- **g/100ml ratio display.** How the Western gongfu community actually thinks.
- **Every animation under 300ms.** Press feedback is `scale(0.97)` at 160ms — perceptible, never theatrical.

## How it's built

Next.js 16 · React 19 · Tailwind CSS 4 · TypeScript · Vitest · Qdrant · OpenRouter

The RAG pipeline is hand-built — no LangChain, no LlamaIndex. Local embeddings (`all-MiniLM-L6-v2` via HuggingFace Transformers), Qdrant as the vector store, cosine similarity with a name/alias boost, and an LLM fallback only below the confidence threshold. The whole thing lives in `src/lib/rag/` and is small enough to read in one sitting.

Self-hosted on a Hetzner CX22 in Helsinki, behind nginx + Let's Encrypt. Docker Compose for app + vector DB.

Architecture notes: [`CLAUDE.md`](CLAUDE.md). RAG spec: [`docs/rag-spec.md`](docs/rag-spec.md).

---

Built with Claude Code by [Pekka Setälä](https://github.com/PekkaSetala). MIT.
