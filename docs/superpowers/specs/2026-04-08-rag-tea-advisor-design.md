# RAG Tea Advisor — Design Spec

## Purpose

Replace the AI advisor's pure-LLM approach with retrieval over a curated corpus of 84 gongfu tea entries. When a user queries a tea, the system searches the corpus first and returns real, hand-researched brewing data. Falls back to LLM generation only when no good match exists.

Portfolio goal: demonstrate embedding, vector search, hybrid retrieval, confidence-based routing, and prompt augmentation — built from primitives, no framework.

## How It Works Today

```
User types "Da Hong Pao"
  → LLM invents brewing params from training data
  → app uses those params (may be inaccurate)
```

The LLM generates steep times as geometric curves (`first × multiplier^n`). Real gongfu schedules aren't geometric — they vary by tea character and infusion stage.

## How It Will Work

```
User types "Da Hong Pao"
  → embed query locally (all-MiniLM-L6-v2, ~10ms)
  → cosine search over 84 vectors in Qdrant
  → boost results where query matches name/alias substring
  → top result score > 0.6?
     YES → return corpus entry directly
           UI shows "From our library" badge
     NO  → fall back to LLM via OpenRouter (current behavior)
           UI shows "AI estimate" badge
```

### Why This Architecture

The corpus already has structured brewing data — temperatures, ratios, explicit steep schedules, rinse hints. There's no reason to ask an LLM to re-invent these. RAG here means "retrieve and use," not "retrieve and feed to an LLM for rephrasing."

The LLM fallback exists for teas not in the corpus. A user asking about a tea we don't have still gets a response, just flagged as an estimate.

## Components

### `src/lib/rag/embed.ts` — Embedding

Loads `all-MiniLM-L6-v2` via `@huggingface/transformers`. Runs locally in Node.js (WASM), no API key needed.

- `embedText(text: string): Promise<number[]>` — returns a 384-dimension vector
- Lazy-loads the model on first call, caches in memory
- ~80MB model download on first run, cached locally after that
- ~10ms per embedding on CPU

Used by both the indexing script (build time) and the query path (runtime).

**Why local instead of OpenAI API:** The corpus is 84 entries. API latency and cost aren't justified. Local embeddings are 50-100x faster than an API round-trip, need no extra API key, and demonstrate understanding of the tradeoff — good portfolio signal.

### `src/lib/rag/index.ts` — Indexing Script

CLI script run with `npx tsx src/lib/rag/index.ts`. Reads all 84 corpus JSONs, builds embedding text, generates vectors, upserts to Qdrant.

Steps:
1. Read all `src/data/corpus/entries/*.json`
2. For each entry, build embedding text (see Embedding Text Composition below)
3. Call `embedText()` for each entry
4. Upsert to Qdrant: vector + structured payload
5. Report: entries indexed, time elapsed, any errors

Idempotent — safe to re-run. Uses entry `id` as Qdrant point ID.

### `src/lib/rag/retrieve.ts` — Search

`searchTeas(query: string, topK?: number): Promise<ScoredTeaEntry[]>`

Steps:
1. Embed the query with `embedText()`
2. Search Qdrant for nearest neighbors (cosine similarity)
3. For each result, check if query substring-matches any name/alias — if so, boost score by +0.15
4. Re-sort by boosted score
5. Return top-k results with scores

Returns the full `TeaEntry` plus a `score` field. The caller decides what to do based on score.

### `src/app/api/identify/route.ts` — Modified API Route

New flow:
1. Call `searchTeas(query, 3)`
2. If top result `score >= 0.6`:
   - Map corpus `TeaEntry` to API response format (see Response Mapping)
   - Set `source: "corpus"`
3. If top result `score < 0.6`:
   - Fall back to existing OpenRouter LLM call
   - Set `source: "llm"`
4. Return response with `source` field

The existing LLM prompt, clamping, and schedule generation remain as the fallback path. No code deleted — just wrapped in a conditional.

### `src/components/AIAdvisor.tsx` — Minor UI Change

Reads the new `source` field from the response. Displays:
- **Corpus match**: subtle "From our library" text below the tea name
- **LLM fallback**: subtle "AI estimate" text below the tea name

Same layout, steppers, schedule pills, and Start Brewing button. No structural UI changes.

## Embedding Text Composition

Per entry, concatenate these fields into a single string for embedding:

```
{name} {aliases.join(" ")} {subcategory ?? ""} {region} {processing_summary} {flavor_profile} {brewing.tips ?? ""} {aroma_notes.join(" ")} {taste_notes.join(" ")}
```

Where `processing_summary` is derived: `"{oxidation} oxidation{roast ? ', ' + roast + ' roast' : ''}{aging?.viable ? ', aging-viable' : ''}"`.

### Why These Fields

- **name + aliases**: exact name matching ("Da Hong Pao", "大红袍", "DHP")
- **subcategory**: gongfu hobbyists search by style — "yan cha", "dan cong", "gushu". Not embedding this would miss the second most common query pattern.
- **region**: "Wuyi tea", "something from Yunnan", "Taiwanese oolong" are common queries. Region is identity for tea people.
- **processing_summary**: "heavy roast", "aged", "lightly oxidized" describe fundamental character. People search this way.
- **flavor_profile + tips**: the richest text — flavor descriptions, brewing guidance
- **aroma_notes + taste_notes**: individual tasting descriptors

### What Stays as Metadata Only (Not Embedded)

These go into Qdrant payload for potential future filtering but aren't in the embedding text:

- `category` — too generic alone ("oolong"), but already covered by subcategory and flavor text
- `temp_c`, `ratio_g_per_100ml`, `schedule_s` — numeric brewing data, not searchable by meaning
- `body`, `price_range`, `beginner_friendly` — structured filters, not prose
- `cultivar`, `terroir` — too technical for typical queries, and often mentioned in flavor_profile anyway

## Confidence Threshold

**0.6 cosine similarity** is the initial threshold for accepting a corpus match.

- The name/alias substring boost adds +0.15, so an exact name match on a mediocre vector match still clears the threshold
- Below 0.6 (after boost), results are unreliable — wrong teas returned
- This is tunable; we'll adjust during evaluation

## Response Mapping (Corpus → API Response)

```
TeaEntry.name                            → teaName
TeaEntry.flavor_profile                  → summary
TeaEntry.brewing.temp_c                  → tempC
TeaEntry.brewing.ratio_g_per_100ml / 100 → ratioGPerMl
TeaEntry.brewing.rinse                   → rinse
false                                    → doubleRinse (always false; rinseHint handles guidance)
TeaEntry.brewing.schedule_s              → schedule (explicit, not generated)
categoryMapping[TeaEntry.category]       → categoryId
"corpus"                                 → source (new field)
```

### Category Mapping

The corpus uses accurate Chinese tea terminology. The app uses simplified Western labels. A mapping function bridges them:

```typescript
const categoryMap: Record<string, string> = {
  green: "green",
  white: "white",
  yellow: "green",   // app has no yellow category; closest is green
  oolong: "oolong",
  red: "black",      // Chinese "red tea" = Western "black tea"
  dark: "puerh",     // app labels all dark tea as puerh
};
```

## Rinse Handling

Simplified. The corpus has `rinse: boolean` and `rinseHint?: string` per entry. The rinse hint is shown to the user as guidance — they decide what to do. No programmatic single/double rinse tracking.

Example hints from corpus entries:
- Da Hong Pao: "One quick rinse opens the heavy charcoal roast and primes the leaves."
- Shou Pu-erh: will have a hint mentioning that compressed leaves may benefit from a longer or second rinse

The `doubleRinse` field in the API response is always `false` for corpus matches. The hint text does the real work.

## Infrastructure

- **Local dev**: Qdrant Docker container (`docker run -p 6333:6333 qdrant/qdrant`)
- **Production**: Docker Compose on Hetzner VPS — Qdrant + Next.js app + nginx
- **Embedding model**: downloaded and cached locally on first run (~80MB)
- **Env vars**:
  - `QDRANT_URL` — defaults to `http://localhost:6333`
  - `OPENROUTER_API_KEY` — existing, still needed for LLM fallback

## Known Limitation: Chinese Tasting Terms

Some corpus entries use Chinese tasting vocabulary (e.g., "huigan" for returning sweetness) without English equivalents. A Western hobbyist searching "sweet aftertaste" won't semantically match "huigan." 

Pre-build task: audit the 84 entries and ensure embedded text uses both Chinese terms and English descriptions where applicable. This is a corpus quality pass, not a code change.

## Evaluation Plan

20-30 test queries across three categories:

**Exact name** (expect: rank 1 corpus match, score > 0.75)
- "Da Hong Pao"
- "Tie Guan Yin"
- "大红袍"
- "Big Red Robe"

**Descriptive** (expect: correct tea in top 3, score > 0.6)
- "roasty Wuyi cliff tea"
- "light floral Taiwanese oolong"
- "smooth earthy pu-erh"
- "a good dan cong"

**Out-of-corpus** (expect: score < 0.6, LLM fallback triggered)
- "Kenyan purple tea"
- "Japanese matcha"
- "English breakfast"
- "chamomile"

Metrics: hit rate at k=1, hit rate at k=3, false positive rate (wrong tea returned with high confidence).

## Phases

### Phase 1: Embedding Pipeline
- `embed.ts` — local embedding function
- `index.ts` — corpus indexing script
- Test with local Qdrant Docker

### Phase 2: Retrieval
- `retrieve.ts` — search function with name/alias boosting
- Test queries against indexed corpus

### Phase 3: Integration
- Modify `route.ts` — retrieval-first with LLM fallback
- Update `AIAdvisor.tsx` — source badge
- Handle category mapping

### Phase 4: Evaluation
- Build test query set
- Measure retrieval quality
- Tune threshold and boost values

### Phase 5: Deploy
- Docker Compose (Qdrant + app + nginx) on Hetzner VPS
- SSL via Let's Encrypt
- Environment variables

## Dependencies

- `@huggingface/transformers` — local embedding model runtime
- No Qdrant client library — use raw `fetch()` against Qdrant's REST API. Fewer dependencies, and you'll understand exactly what's happening at the HTTP level. Qdrant's REST API is simple: PUT to upsert points, POST to search.
