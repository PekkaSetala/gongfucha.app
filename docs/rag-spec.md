# RAG Tea Advisor — Design Reference

> This document describes the RAG pipeline as it ships. For the original
> design proposal (which targeted OpenAI embeddings and a different hybrid
> scheme) see the "Original plan — superseded" section at the end.

## Purpose

The "describe your tea" field on gongfucha.app takes a free-text query and
returns brewing parameters. It tries the curated tea corpus first via
retrieval; if no document in the corpus is a confident match, it falls
back to an LLM.

Portfolio goal: demonstrate retrieval-augmented generation built from
primitives — no framework (no LangChain, no LlamaIndex) — with calibrated
two-tier scoring, local embeddings, and an eval harness that drives the
calibration. The whole pipeline is ~300 lines of code across
`src/lib/rag/`.

## Pipeline at a glance

```
User query
  ├─→ lexical search  (substring + IDF over identity fields)
  └─→ dense search    (local embedding + Qdrant cosine)

Two-tier gate:
  Tier 1: lex top-1 score ≥ 4.0   → return lex results
  Tier 2: dense top-1 cosine ≥ 0.55 → return dense results
  Else:                            → return []  → caller falls back to LLM

API route (/api/identify):
  if retrieval returns a result → map corpus entry to brew params
  else → call OpenRouter (gpt-4o-mini by default), parse + clamp JSON
```

No metadata filter. No re-ranker. No second-pass LLM summariser over
corpus hits. The corpus entry carries its own `flavor_profile` text,
which becomes the `summary` shown to the user.

## Code layout

```
src/
  data/corpus/
    schema.ts                      # TeaEntry interface (shipped)
    entries/*.json                 # 84 entries (shipped)
    index.ts                       # getAllEntries / getEntryById
    wikidata.ts                    # Optional Wikidata sameAs URLs
    category-slugs.ts              # Slug ↔ TeaCategory mapping
  lib/rag/
    embed.ts                       # Local embedding via @huggingface/transformers
    build-embedding-text.ts        # Compose embedding text from TeaEntry fields
    index.ts                       # Indexer script — reads corpus, embeds, upserts
    lexical.ts                     # Substring + IDF scorer over identity fields
    qdrant.ts                      # Thin REST client for Qdrant
    retrieve.ts                    # Two-tier hybrid retrieval (searchTeas)
    point-id.ts                    # slug → stable UUID for Qdrant point IDs
  app/api/identify/
    route.ts                       # POST handler: retrieval → corpus map or LLM fallback
scripts/
  rag-eval.ts                      # Eval harness — exact / descriptive / out-of-corpus queries
```

## Corpus

**84 entries** across 6 categories:

| Category | Count |
|----------|-------|
| Oolong   | 35    |
| Green    | 21    |
| Dark     | 11    |
| White    | 7     |
| Red      | 6     |
| Yellow   | 4     |

All entries live in `src/data/corpus/entries/`. Each is a self-contained
JSON file following the schema in `src/data/corpus/schema.ts`.

Every entry has a `tasting_notes` field (~150 words, firsthand
observational voice) that also powers the `/tea/[slug]` static pages.
376 source URLs cited across the corpus; one entry (`pinglin-oolong`)
sourced from personal experience and flagged as such.

### Schema highlights

```typescript
interface TeaEntry {
  id: string;                    // slug: "da-hong-pao"
  name: string;                  // "Da Hong Pao"
  aliases: string[];             // ["大红袍", "Big Red Robe", "DHP"]
  category: TeaCategory;         // 6 values, Chinese taxonomy
  subcategory?: string;          // "Yan Cha", "Dan Cong", ...
  region: string;
  terroir?: string;
  cultivar?: string;
  processing: string[];
  oxidation: "none"|"light"|"medium"|"heavy"|"full"|"post-fermented";
  roast?: "none"|"light"|"medium"|"heavy";
  aging?: { viable: boolean; sweet_spot?: string };
  flavor_profile: string;        // 2-3 sentences, original text
  tasting_notes: string;         // ~150 words, observational voice
  body: "light"|"medium"|"full";
  aroma_notes: string[];
  taste_notes: string[];
  brewing: {
    temp_c: number;
    ratio_g_per_100ml: number;
    schedule_s: number[];        // explicit per-infusion seconds
    max_infusions: number;
    rinse: boolean;
    rinse_hint?: string;
    tips?: string;
  };
  price_range?: "budget"|"mid"|"premium"|"collector";
  beginner_friendly: boolean;
  sources: string[];
  updated: string;
}
```

Structured fields (`temp_c`, `ratio_g_per_100ml`, `schedule_s`, etc.)
are stored as Qdrant payload — not embedded. The embedding text is
identity + origin + processing + flavour, composed by
`buildEmbeddingText()` in `src/lib/rag/build-embedding-text.ts`.

### Chunking

One entry = one chunk. Each is ~200–300 tokens, naturally self-contained.
No splitting.

## Retrieval — implementation detail

### Dense retrieval (`retrieve.ts` → `denseSearch`)

1. Embed the query via `embedText()` (local,
   `onnx-community/all-MiniLM-L6-v2-ONNX`, 384 dimensions, mean-pooled,
   unit-normalised). Cosine similarity reduces to dot product after
   normalisation.
2. Query Qdrant's `search` endpoint with `with_payload: true` and a
   5-second `AbortSignal.timeout`.
3. Return the top-20 points with scores and payload.

If Qdrant throws (network, timeout, 4xx/5xx), the error is caught and
the retriever falls back to lex-only — exact-name queries still resolve.

### Lexical retrieval (`lexical.ts` → `lexicalSearch`)

IDF-weighted substring match over the tea's identity text:
`name + aliases + category + subcategory + region`. Flavour and tasting
text are deliberately **excluded** — that's what the dense retriever
handles. Cultivar is excluded because cultivar names often reference
other tea names (e.g., `huang-guan-yin` lists "Huang Jin Gui × Tie
Guan Yin hybrid" as its cultivar — including this would out-rank the
real Tie Guan Yin entry for the query "Tie Guan Yin").

- Tokenize query by Unicode-letter + whitespace, lowercase, drop tokens
  shorter than 3 chars (to stop "the", "of", "an" from matching
  "heavens" or "oolong").
- Compute `idf(t) = ln(1 + N / df(t))` where `df(t)` is the number of
  corpus docs whose identity text contains `t` as a **substring**.
- Score each doc by summing IDF of matched tokens.

Why substring rather than BM25 over whitespace tokens: queries like
`"wuyi"` must match the region string `"Wuyishan, Fujian, China"`.
Whitespace-tokenized BM25 would never connect them. For an 84-doc
corpus, substring runs in sub-millisecond — complexity-performance
tradeoff pays.

### Two-tier gate (`retrieve.ts` → `searchTeas`)

```typescript
export const LEX_STRONG_SCORE   = 4.0;
export const DENSE_STRONG_SCORE = 0.55;
```

Both retrievers run on every query. The gate picks the stronger signal:

- **Tier 1 — lexical strong:** if `lex[0].score ≥ LEX_STRONG_SCORE`,
  return lex results. Single rare identity token (df=1) scores ~4.44 on
  N=84 (`ln(1 + 84/1) ≈ 4.44`); two medium-common tokens (df≈6) sum to
  ~4.2. Out-of-corpus queries like "tea" top out at ~1.73 — well below
  the gate.
- **Tier 2 — dense strong:** if no lex win and `dense[0].score ≥
  DENSE_STRONG_SCORE`, return dense results. Rich descriptive
  in-corpus queries land at 0.55+ on this model; out-of-corpus queries
  (Japanese matcha, English breakfast, herbal) top out around 0.49.
- **Else:** return `[]`. The caller interprets empty as "fall back to
  LLM". No magic threshold tuning downstream.

Both gates are calibrated against `scripts/rag-eval.ts` on the 84-doc
corpus. Re-run after meaningful corpus edits.

## Embedding model

**`onnx-community/all-MiniLM-L6-v2-ONNX`** — 384-dim, MiniLM-L6-v2 via
ONNX runtime, loaded through `@huggingface/transformers` v4 on Node.
Runs locally (no external API), `onnxruntime-node` CPU backend.

Chosen over OpenAI `text-embedding-3-small` for:

- **Zero cost.** No per-embedding API spend, no rate limits, no key
  to rotate or leak. Matters more than quality on an 84-doc corpus
  where the retrieval task is easy.
- **Zero external dependency on query path.** `/api/identify` doesn't
  need a second provider to be reachable.
- **Portfolio signal.** "Loaded a local ONNX model into Node, pooled
  and normalised the outputs" is a clearer demonstration than "called
  an API."

Tradeoff: cold start. On the Hetzner ARM64 VPS the first query of a
cold process pays ~1.5 s to load the model. Subsequent queries are
fast because `embed.ts` memoises the pipeline.

## API route (`/api/identify`)

1. Rate-limit check: 20 req/min per IP (in-process sliding window,
   defense-in-depth — primary rate limit belongs in host nginx).
2. Input validation: `query` must be a non-empty string ≤ 200 chars.
3. Call `searchTeas(query, 3)`.
4. If non-empty → parse the first result's `payload.entry`, map corpus
   fields to brew-param shape via `mapCorpusEntry`, return with
   `source: "corpus"`.
5. If empty → if `OPENROUTER_API_KEY` is set, call OpenRouter (default
   `openai/gpt-4o-mini`) with a 15-second `AbortSignal.timeout`. Parse
   the JSON response, clamp all numeric fields to known-safe ranges,
   generate a synthetic schedule from `firstSteepSeconds` + `steepCurve`,
   return with `source: "llm"`.
6. Any other error → 500 with a user-friendly message steering them
   to Custom Mode.

## Evaluation (`scripts/rag-eval.ts`)

21 queries across three categories:

- **Exact name** (8) — tea name, English alias, or abbreviation. Expects
  the named tea at rank 1.
- **Descriptive** (8) — natural-language queries that should find the
  tea in the top 3, with or without a specific expected match.
- **Out-of-corpus** (5) — queries for teas the corpus doesn't cover
  (Japanese matcha, English breakfast, herbal). Expected to return `[]`
  so the API route falls back to the LLM.

The harness logs per-query outcomes and prints hit rates. Run via
`npx tsx scripts/rag-eval.ts` against a Qdrant with the indexed
corpus — local Docker or SSH-tunnelled from the VPS. Current tier
thresholds were calibrated against this output.

## Infrastructure

Production: Hetzner ARM64 VPS, Docker Compose.

```
Docker Compose (on Hetzner)
├── qdrant    127.0.0.1:6333   # localhost-only; SSH-tunnelled for re-indexing
└── app       127.0.0.1:3000   # Next.js standalone, reverse-proxied by host nginx
```

Host nginx + certbot (same box as selkokielelle.fi) terminates TLS and
proxies to the app. `/api/identify` rate limit should be enforced at
the nginx layer — the in-process limiter in the route is
defense-in-depth only.

Re-indexing Qdrant from a laptop:

```bash
ssh -fN -L 6333:localhost:6333 webserve
QDRANT_URL=http://localhost:6333 npm run rag:index
```

See `docs/2026-04-10-go-live.md` for the full deploy runbook.

## Hardening

- Query length capped at 200 chars (`src/app/api/identify/route.ts`).
- Qdrant search timeout: 5 s.
- OpenRouter fallback timeout: 15 s.
- All LLM JSON fields clamped server-side before use.
- `QDRANT_API_KEY` threaded through `QdrantClient` headers if set.
- Point IDs in Qdrant are deterministic UUIDs derived from the slug via
  SHA-1 (`src/lib/rag/point-id.ts`), so re-indexing is idempotent.

## Legal / provenance

- Facts extracted from reputable sources (vendors, TeaDB, Mei Leaf,
  others), not prose copied.
- All sources cited per entry in the `sources` array.
- Flavour profiles and tasting notes are original text, written in
  the author's voice.
- No bulk scraping — manual research per entry.
- Corpus is published under CC-BY 4.0 (see `src/lib/jsonld.ts`
  `buildDataset`).

## Original plan — superseded

The original spec targeted **OpenAI `text-embedding-3-small` (1536 dims)**
with a hybrid search design that merged keyword matches, metadata
filters, and cosine similarity before re-ranking. Over the course of
implementation:

- Embeddings moved to local ONNX (cost, no external dependency, better
  portfolio signal).
- Keyword match grew into a real lexical retriever (substring + IDF
  over identity fields) strong enough to stand alone for exact-name
  queries.
- Metadata filters were dropped — the corpus is small enough that
  pre-filtering rarely helps, and it complicates the "no-framework"
  pitch.
- Re-ranking was replaced by the two-tier gate, which is simpler to
  reason about and maps cleanly to the "give up and fall back to LLM"
  exit.

The spec above describes what actually shipped. Keeping the original
plan here as provenance.
