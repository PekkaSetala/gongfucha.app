# SEO pre-flight findings — 2026-04-22

**Purpose:** intended as delta-verification of `~/.claude/plans/nifty-chasing-nest.md` before execution. Actual finding: **the plan is already executed and deployed.** This doc repurposes to "state of the SEO program" so the next-step decision rests on ground truth.

## Top finding

Two commits shipped the SEO program before today's analytics push:

- `0776052 content(corpus): hand-written tasting notes, brewing pillar, methodology` — Phase A (content).
- `a1c3a8a feat(seo): 2026 SEO program — static tea pages, pillar, methodology, schema` — Phase B (code).

Follow-up: `efaeb2d test: sitemap guard + cross-reference nginx rate-limit snippet`.

All three predate the analytics work (commits `14735ee` onwards). The `project_current_state` memory that said "nothing built yet" was stale.

## Verified live (curl against production)

| URL | Status | Notes |
|---|---|---|
| `https://gongfucha.app/sitemap.xml` | 200, `application/xml` | 94 `<loc>` entries (plan target: 91–95) |
| `https://gongfucha.app/robots.txt` | 200 | — |
| `https://gongfucha.app/tea/da-hong-pao` | 200 | Emits `TechArticle` JSON-LD with Person + Organization; `about.sameAs` resolves to Wikidata |
| `https://gongfucha.app/brewing` | 200 | Pillar article live |

## Verified shipped (code)

- `src/app/sitemap.ts`, `src/app/robots.ts` — present.
- `src/app/tea/[slug]/page.tsx`, `src/app/category/`, `src/app/teas/`, `src/app/brewing/`, `src/app/about/`, `src/app/corpus/` — all present.
- `src/lib/jsonld.ts` — full builder set: `buildPerson`, `buildOrganization`, `buildWebSite`, `buildBreadcrumbs`, `buildArticle`, `buildTechArticle`, `buildDataset`.
- `src/data/corpus/category-slugs.ts`, `src/data/corpus/wikidata.ts` — present.
- `public/sw.js` — already on `CACHE_NAME = "gongfucha-v2"`, navigation requests are network-first (lines 42–46). Matches plan prescription.
- `src/app/layout.tsx` — emits `WebSite + Organization + Person` JSON-LD; Umami `<script defer>` gated on `NEXT_PUBLIC_UMAMI_*`.
- 84/84 corpus entries have populated `tasting_notes` (sample word counts: 143, 157, 147 — all within 130–180 target).
- Tests: 107 pass, 4 skipped, 0 fail (`tests/jsonld.test.ts`, `tests/sitemap.test.ts`, `tests/corpus-index.test.ts` included).

## Gaps / deferred items

1. **B.11 open-source corpus repo — not done.** `github.com/PekkaSetala/gongfucha-corpus` returns 404. Plan flagged this as a gate on `/corpus`: "Do NOT ship `/corpus` live until the repo exists, or the Dataset JSON-LD `distribution` URL will 404." Action: either create the repo, remove `distribution` from the `Dataset` JSON-LD on `/corpus`, or take `/corpus` down until the repo exists. Check current `/corpus` payload for the `distribution` URL before deciding.
2. **Phase C monitoring — unverified.** Plan's Day 1 / Day 7 / Day 30 checks (Search Console sitemap acceptance, indexation count, Dataset Search listing) have not been recorded. Status unknown.
3. **CWV/INP launch gate — verified 2026-04-22 (lab).** Lighthouse mobile, devtools throttling:

   | URL | Score | LCP | CLS | TBT (INP proxy) |
   |---|---|---|---|---|
   | `/` | 100 | 1424ms | 0.035 | 60ms |
   | `/brewing` | 99 | 1269ms | 0.001 | 104ms |
   | `/tea/da-hong-pao` | 100 | 1256ms | 0.002 | 3ms |

   Plan gates (LCP ≤ 2500ms, INP ≤ 200ms, CLS ≤ 0.1) all cleared with margin. No opportunities > 100ms savings reported. Field data (CrUX via PageSpeed Insights) still pending — user action, see Phase C prep doc.

## Stale assumptions corrected

- Plan's A.1 lists untracked `SecondaryPaths.tsx` and `greetings.ts` — neither exists.
- Plan's A.3 category batch list is filename-guessed. Real partition (verified today):

  | Category | Count |
  |---|---|
  | green | 21 |
  | oolong | 35 |
  | dark | 11 |
  | white | 7 |
  | red | 6 |
  | yellow | 4 |
  | **Total** | **84** |

  Irrelevant now (Phase A shipped), kept for the record.

## Recommendation — real next step

Given the SEO program is shipped, pre-flight is complete, and field-guide is queued:

1. **First:** verify `/corpus` Dataset `distribution` URL behavior — fix or retract before any external link resolves to a 404 on the creator's site. ~15 min.
2. **Then:** run Phase C monitoring — Search Console status, indexation count, Dataset Search. ~15 min read-only. This converts "shipped but invisible" into either "working" or "flagged."
3. **Then:** pick between CWV/INP audit, field-guide execution, or leaving the SEO program alone for 1–2 weeks to gather signal before spending more effort.

Writing new corpus prose or rebuilding server routes is not the next step.
