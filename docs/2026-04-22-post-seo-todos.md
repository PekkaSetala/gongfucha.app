# Post-SEO to-dos — 2026-04-22

Consolidates every pending item surfaced during the 2026-04-22 SEO pre-flight. Source docs: `docs/superpowers/plans/2026-04-22-seo-preflight-findings.md`, `docs/2026-04-14-phase-c-prep.md`, `~/.claude/plans/nifty-chasing-nest.md`.

Owner legend: **U** = user action (auth-gated / external platform), **C** = Claude-doable (in repo), **U+C** = user decides, Claude executes.

---

## P0 — Phase C monitoring (browser, ~15 min total)

These are the final, unverified items from the 2026 SEO program. They're read-only externals — they don't change code, they tell you whether Google is doing its job.

### 1. Rich Results Test  ·  **U**  ·  ~5 min
Paste each URL into <https://search.google.com/test/rich-results>. Each should parse without errors.
- `https://gongfucha.app/tea/da-hong-pao` → expects TechArticle + BreadcrumbList
- `https://gongfucha.app/brewing` → expects Article + BreadcrumbList
- `https://gongfucha.app/category/oolong` → expects CollectionPage + Article + BreadcrumbList
- `https://gongfucha.app/about/methodology` → expects Article + BreadcrumbList

### 2. Search Console  ·  **U**  ·  ~5 min
At <https://search.google.com/search-console>. If property isn't verified yet, add via DNS TXT on Cloudflare or drop a `google-site-verification` meta in `src/app/layout.tsx` (I can do the meta path — paste the verification code).
- Submit `https://gongfucha.app/sitemap.xml`.
- Request indexing for the five crown-jewel URLs:
  - `/brewing`, `/teas`, `/tea/da-hong-pao`, `/category/oolong`, `/about/methodology`.
- Record sitemap acceptance + initial indexation count in a follow-up doc dated today.

### 3. PageSpeed Insights — field data (CrUX)  ·  **U**  ·  ~3 min
<https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fgongfucha.app%2Ftea%2Fda-hong-pao>. Repeat for `/brewing` and `/`. Targets: LCP ≤ 2500ms / INP ≤ 200ms / CLS ≤ 0.1. Lab is green (scores 100/99/100 — see findings doc), field data is what matters long-term.

---

## P1 — Feature work, spec+plan ready

### 4. Execute `feat/field-guide`  ·  **U+C**  ·  ~1 session
Branch: `feat/field-guide`. Spec: `docs/superpowers/specs/2026-04-09-tea-guide-design.md`. Plan: `docs/superpowers/plans/2026-04-09-tea-guide.md` (15 tasks, self-contained).

**Pre-check before dispatching subagents (Claude, ~10 min):** read the plan end-to-end; the plan was written when corpus entries only had thin `flavor_profile` text. With 84 × 140–170-word `tasting_notes` now shipped, any plan step that says "use `flavor_profile` as card excerpt" should read `tasting_notes`. Produce a delta note before execution; don't execute stale prescriptions.

Recommendation reason: biggest unit of user-facing value that's execution-ready; the just-shipped `tasting_notes` upgrade the planned field-guide cards for free; demonstrates a second RAG use-case (explore mode via `/api/guide/search`) — good portfolio beat.

---

## P2 — SEO program follow-ups (post-monitoring)

### 5. Open-source corpus repo + `/corpus` activation  ·  **U+C**  ·  ~30 min
Plan's B.11. `github.com/PekkaSetala/gongfucha-corpus` doesn't exist; `src/app/corpus/page.tsx` is gated via `notFound()` until it does. Activation unlocks Google Dataset Search (niche but real `.edu` backlink path).

Steps:
- Create repo locally (outside `GongfuchaAI/`); copy `src/data/corpus/entries/*.json` + `schema.ts` (→ `schema.d.ts`); add `LICENSE` (CC-BY-4.0) + `README.md`; push.
- Remove `notFound()` from `src/app/corpus/page.tsx`; implement the Dataset-JSON-LD page with `distribution` → raw GitHub tarball.
- Add `/corpus` to `src/app/sitemap.ts` and link from `src/app/about/methodology/page.tsx` + `src/app/layout.tsx` if desired.
- Gate verified: repo 200 OK before the page goes live — the existing `TODO(seo)` comment in `src/app/corpus/page.tsx` is explicit about the 404 risk.

**Hold until P0 monitoring shows healthy baseline indexation.** If GSC shows Google is not crawling the 94 URLs yet, Dataset Search won't help — fix indexation first.

### 6. Wikidata `sameAs` expansion  ·  **C**  ·  ~30 min
`src/data/corpus/wikidata.ts` currently has 5 verified QIDs (da-hong-pao, long-jing, tie-guan-yin, sheng-pu-erh, shou-pu-erh). Plan's rule is "honesty over coverage" — only add verified QIDs, never guess. Can be done as a single agent task: verify QIDs for the remaining 79 entries via Wikidata SPARQL, add the clear matches, skip ambiguous ones. Low-priority drip improvement.

---

## P3 — Polish / cosmetic

### 7. Header-horizontal-storefront redesign  ·  **C**  ·  ~30 min
Spec (untracked): `docs/superpowers/specs/2026-04-10-header-horizontal-storefront-design.md`. One file: `src/components/Header.tsx`. Removes out-of-vocabulary type sizes; rebuilds as a single horizontal row. Ship when next in that area; not worth a dedicated session.

### 8. `pinglin-oolong.json` filename / `id` mismatch  ·  **C**  ·  ~5 min
Filename `pinglin-oolong.json` has `id: "pinglin-ball-rolled-oolong"`. URL slug (live sitemap + 200 response) matches `id` — no SEO regression. Cosmetic: filename should match `id` for consistency with the rest of the corpus. Rename to `pinglin-ball-rolled-oolong.json` in a chore commit. Display name "Pinglin Oolong" is unaffected.

---

## Not doing (explicit no)

- `feat/i18n-finnish-english` branch — won't merge (product is English-only).
- New SEO plan — the existing `~/.claude/plans/nifty-chasing-nest.md` is executed and shipped; monitoring is what's needed, not more plan.
- Audit re-run — pre-flight confirmed the program is healthy; redoing audits without new evidence is waste.

---

## Suggested order of operations

1. **Today (~15 min, you):** P0 items 1–3. Close out Phase C monitoring.
2. **Next session (~1 session, me under your direction):** P1 item 4 — field-guide, preceded by stale-content pre-check.
3. **Week 2 (you + me, conditional on P0 numbers):** decide whether P2 corpus repo / Wikidata expansion are worth it.
4. **Whenever you're in `Header.tsx` anyway:** P3 item 7.
5. **Chore moment:** P3 item 8.
