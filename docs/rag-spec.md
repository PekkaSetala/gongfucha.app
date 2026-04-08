# RAG Tea Advisor — Implementation Spec

## Purpose

Add a RAG (Retrieval-Augmented Generation) system to the gongfu tea app. The AI advisor currently matches LLM output to 8 hardcoded presets. RAG replaces this with retrieval over a curated corpus of 84 tea entries, grounding LLM responses in real data.

Portfolio goal: demonstrate chunking strategy, embedding model selection, hybrid search, retrieval evaluation, and prompt augmentation — built from primitives, no framework (no LangChain/LlamaIndex).

## Architecture

```
User query
  → embed query (OpenAI text-embedding-3-small)
  → hybrid search: keyword match (name/aliases) + cosine similarity (Qdrant)
  → metadata filter (category, beginner_friendly, etc.)
  → top-k entries retrieved
  → augmented prompt (query + retrieved entries) → OpenRouter LLM
  → grounded response
```

### Components

```
src/
  data/corpus/
    schema.ts              # TypeScript interface (DONE)
    entries/*.json          # 84 tea entries (DONE)
  lib/rag/
    embed.ts               # Generate embeddings via OpenAI API
    index.ts               # Script: read corpus → embed → upsert to Qdrant
    retrieve.ts            # Query: embed input → hybrid search → top-k
    augment.ts             # Build prompt with retrieved context + user query
  app/api/identify/
    route.ts               # Existing — add retrieval step before LLM call
```

### Infrastructure (Hetzner VPS)

```
Docker Compose
├── qdrant          # Vector DB (port 6333)
├── app             # Next.js app (port 3000)
└── nginx           # Reverse proxy + SSL (Let's Encrypt)
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

All entries in `src/data/corpus/entries/`. Each is a self-contained JSON file following the schema in `src/data/corpus/schema.ts`.

376 source URLs recorded across entries. One entry (pinglin-oolong.json) has no sources — authored from personal experience.

### Data Schema (key fields)

```typescript
interface TeaEntry {
  id: string;                    // "da-hong-pao"
  name: string;                  // "Da Hong Pao"
  aliases: string[];             // ["大红袍", "Big Red Robe"]
  category: TeaCategory;         // "oolong"
  subcategory?: string;          // "Yan Cha"
  region: string;
  terroir?: string;
  cultivar?: string;
  processing: string[];
  oxidation: "none"|"light"|"medium"|"heavy"|"full"|"post-fermented";
  roast?: "none"|"light"|"medium"|"heavy";
  aging?: { viable: boolean; sweet_spot?: string };
  flavor_profile: string;        // 2-3 sentences, original text
  body: "light"|"medium"|"full";
  aroma_notes: string[];
  taste_notes: string[];
  brewing: {
    temp_c: number;
    ratio_g_per_100ml: number;   // Single recommended value
    schedule_s: number[];        // Explicit steep times per infusion
    max_infusions: number;       // = schedule_s.length
    rinse: boolean;
    rinse_hint?: string;
    tips?: string;
  };
  price_range?: "budget"|"mid"|"premium"|"collector";
  beginner_friendly: boolean;
  sources: string[];
  updated: string;               // ISO date
}
```

### What gets embedded

Concatenate for embedding vector: `name + aliases.join(" ") + flavor_profile + brewing.tips + aroma_notes.join(" ") + taste_notes.join(" ")`

Structured fields (`category`, `region`, `temp_c`, `beginner_friendly`) are stored as Qdrant payload for metadata filtering — not embedded.

### Chunking strategy

One entry = one chunk. Each entry is ~200-300 tokens, naturally self-contained. No splitting needed.

## Hybrid Search Design

1. **Keyword match** on `name` + `aliases` — catches exact tea names ("Tie Guan Yin") that embeddings handle poorly
2. **Metadata filter** on structured fields — pre-filters before vector search (e.g., `category=oolong AND beginner_friendly=true`)
3. **Cosine similarity** on embedded text — semantic matching for flavor/description queries
4. **Merge and re-rank** — combine keyword and semantic results, deduplicate, return top-k

## Embedding Model

OpenAI `text-embedding-3-small` (1536 dimensions). Chosen for: low cost, good quality for this corpus size, wide recognition on CV.

Alternative considered: HuggingFace `all-MiniLM-L6-v2` (384 dims, free, local). Could switch later for cost savings.

## Key Design Decisions

1. **No framework** — RAG built from primitives (~50 lines of retrieval code). Better portfolio signal than "I imported LangChain."
2. **Explicit steep schedules** over multiplier — real gongfu schedules aren't geometric progressions. `schedule_s: [20, 13, 13, 16, 16, 19, 21, 24, 27]` is more accurate than `first_steep: 20, extension: 1.35`.
3. **Single ratio value** over min/max range — user reported no noticeable difference within the 5-7g range. Simpler schema = more entries authored.
4. **Gongfu teas only** — Japanese, Korean, Indian, African teas excluded. Non-gongfu queries should be answered with "this tea isn't traditionally brewed gongfu style."
5. **Facts extracted, not scraped** — no verbatim vendor text stored. Flavor profiles written in original words. Sources cited for provenance.
6. **Qdrant on Hetzner VPS** — full control, Docker Compose, no managed service costs. More portfolio-relevant than pgvector.

## Legal Approach

- Facts extracted from reputable sources (vendors, TeaDB, Mei Leaf), not prose copied
- All sources cited in `sources` array per entry
- Flavor profiles and tips are original text
- No bulk scraping — manual research per entry

## Next Steps (for fresh session)

### Phase 1: Embedding Pipeline
- [ ] Create `src/lib/rag/embed.ts` — function to call OpenAI embeddings API
- [ ] Create `src/lib/rag/index.ts` — script that reads all corpus JSON, concatenates embeddable fields, generates vectors, upserts to Qdrant
- [ ] Test locally with Qdrant Docker container

### Phase 2: Retrieval
- [ ] Create `src/lib/rag/retrieve.ts` — embed query, search Qdrant, return top-k with scores
- [ ] Implement hybrid search (keyword + semantic)
- [ ] Create `src/lib/rag/augment.ts` — build LLM prompt with retrieved context

### Phase 3: Integration
- [ ] Modify `/api/identify/route.ts` to use retrieval before LLM call
- [ ] Update `AIAdvisor.tsx` UI to show sources/citations
- [ ] Handle queries where no good match exists

### Phase 4: Evaluation
- [ ] Build test query set (20-30 questions with expected answers)
- [ ] Measure retrieval quality (MRR, hit rate)
- [ ] Iterate on embedding text composition and search params

### Phase 5: Deploy
- [ ] Docker Compose for Qdrant + app on Hetzner VPS
- [ ] Nginx reverse proxy + Let's Encrypt SSL
- [ ] Environment variables for OpenAI API key, Qdrant URL
