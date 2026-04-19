# GongfuchaAI — Code Audit (2026-04-19)

## Summary

1 critical, 3 high, 9 medium, 7 low. Working tree is green (lint clean, 98 tests pass, build succeeds, no design-constraint violations) — but a critical RCE-class CVE is pulled in transitively, the AI identify endpoint is unrate-limited and accepts queries 2.5× longer than the documented cap, and several orphan modules (including an abandoned Finnish i18n surface and a documented-but-ignored `QDRANT_API_KEY`) have accumulated since the last sweep.

## Critical findings

### C1 — protobufjs arbitrary-code-execution CVE pulled in transitively

- **Where:** `node_modules/protobufjs/**` (via `@huggingface/transformers` → `onnxruntime-node`), `package-lock.json`
- **Evidence:**
  ```
  $ npm audit --production
  protobufjs  <7.5.5
  Severity: critical
  Arbitrary code execution in protobufjs — GHSA-xq3m-2v4x-88gg
  fix available via `npm audit fix`
  ```
- **Why it matters:** Runs in the production RAG image (`/api/identify` executes onnxruntime-node → protobufjs on every cold start). Severity "critical" with RCE disposition is not something to leave in a public-repo deploy.
- **Fix direction:** Run `npm audit fix`, re-run `npx vitest run` and `npm run build`, rebuild the Docker image, redeploy. If the fix bumps a non-breaking minor, ship it; if it forces an `@huggingface/transformers` major, pin a known-safe `protobufjs` via an `overrides` block in `package.json` and document why.

## High findings

### H1 — `/api/identify` has no rate limiting; OpenRouter is a trust-open passthrough

- **Where:** `src/app/api/identify/route.ts:72-131`, `src/app/api/identify/route.ts:133-175`
- **Evidence:** The handler accepts any `POST /api/identify` body, tries corpus retrieval, and on fallthrough calls `fetch("https://openrouter.ai/api/v1/chat/completions", … Bearer ${OPENROUTER_API_KEY})` with only a 15 s timeout (`AbortSignal.timeout(15_000)`). There is no IP-, session-, or token-bucket check; no Cloudflare/edge rate-limit config is checked in.
- **Why it matters:** A bot loop can burn the OpenRouter key against any attacker-chosen prompt. The prompt the LLM sees is concatenated with a system prompt; users can trivially smuggle instructions like "ignore the above" — currently defanged only by `JSON.parse` + `clamp` on numeric fields, but `teaName`/`summary` pass through as `String(…)` verbatim and end up in the UI. Cost exposure + reputational passthrough.
- **Fix direction:**
  1. Put a per-IP rate limit in front of the route (host nginx `limit_req_zone` is simplest — you are already behind nginx per `docs/2026-04-10-go-live.md`).
  2. Return 429 from the route itself for the same request-coalescing reason (edge functions can still hammer the route).
  3. Keep the 200-char input cap (see H2) and sanitize/escape `teaName`/`summary` before rendering if they are ever inserted via `dangerouslySetInnerHTML` (currently they are not — good — but lock it down explicitly).

### H2 — Query length cap diverges from the documented contract (500 in code, 200 in docs)

- **Where:** `src/app/api/identify/route.ts:137`
- **Evidence:**
  ```ts
  if (!query || typeof query !== "string" || query.length > 500) {
    return NextResponse.json(
      { error: "Query is required (max 500 characters)" },
  ```
  `CLAUDE.md` line quoting the hardening contract:
  ```
  Hardening: query length capped 200 chars, Qdrant timeout 5s
  ```
- **Why it matters:** A 2.5× wider input surface than documented. For this RAG corpus nothing legitimate needs more than ~80 chars; the extra 420 chars mostly exist to help prompt-injection and cost amplification. It is also a silent drift from the spec — exactly the kind of discrepancy the audit is supposed to catch before it compounds.
- **Fix direction:** Tighten to `> 200`, update the error message, or update `CLAUDE.md` with a justification for the larger cap. Pick one — don't leave the gap.

### H3 — Orphaned Finnish i18n surface still compiled into the tree

- **Where:** `src/i18n/context.tsx` (94 lines), `src/i18n/messages.ts`
- **Evidence:** `rg "i18n" src/` returns zero files-with-matches outside the `src/i18n/` directory itself; memory note `project_i18n_finnish.md` records the decision to ship English-only. The `LocaleProvider` is never rendered (no reference in `src/app/layout.tsx` or anywhere else). `knip` flags both files as unused.
- **Why it matters:** `context.tsx` still ships `createContext`/`useSyncExternalStore` and a "fi" default — if someone re-imports it they will bring the Finnish drift back. Also a misleading signal for any reader trying to understand the architecture: the folder looks like a feature.
- **Fix direction:** Delete `src/i18n/` entirely. If any translation strings are being kept as "seed" material, move them to a doc, not an importable module.

## Medium findings

### M1 — `fetchWeather()` has no timeout; a slow wttr.in blocks the browser thread indefinitely

- **Where:** `src/lib/weather.ts:69-76`
- **Evidence:**
  ```ts
  export async function fetchWeather(): Promise<WeatherData> {
    const res = await fetch("https://wttr.in/?format=j1");
    const json = await res.json();
    …
  }
  ```
  No `AbortSignal.timeout`, no `try`/`catch`. Compare with `qdrant.ts:83` which does use a 5 s signal.
- **Why it matters:** `wttr.in` is flaky. On a bad day the header weather mood slot hangs its caller; on mobile behind poor coverage the whole header-render chain stalls. No caller I can find in `src/hooks/useWeatherMood.ts` wraps it in a timeout either.
- **Fix direction:** Add `signal: AbortSignal.timeout(3000)` and a `try/catch` that resolves to a neutral default (or returns `null` and lets the caller fall through to a generic mood). Mirror the retrieve.ts graceful-degradation pattern.

### M2 — Orphan component/data files, some untracked

- **Where:**
  - `src/components/SecondaryPaths.tsx` — untracked, no imports anywhere (`rg "SecondaryPaths" src/`).
  - `src/data/greetings.ts` — untracked, no imports of `getHeadline`/`greetings`/`TimeBand`.
  - `src/components/InlineViewHeader.tsx` — tracked, no imports (`rg "InlineViewHeader" src/`).
  - `src/data/tips.ts` — tracked, `getDailyTip` has no external caller; only internal references to `tips`.
- **Evidence:** `knip` flags all four. Cross-checked with `rg` in `src/` — confirmed no dynamic imports, no string references.
- **Why it matters:** `CLAUDE.md` already notes "Rotating tips" is the pattern of choice (`feedback_rotating_tips.md`), and `brew-tips.ts` supersedes `tips.ts`. Two untracked files add noise to `git status` every session. Dead UI building-blocks mislead future work.
- **Fix direction:** Decide intent. For untracked files: either wire in or delete. For tracked orphans (`InlineViewHeader`, `tips`): delete — they duplicate functionality already in `guide/GuidePrimer` and `data/brew-tips` respectively.

### M3 — `__resetLexicalCache` exported but never called from tests

- **Where:** `src/lib/rag/lexical.ts:114`; `tests/rag/lexical.test.ts` searched — no hit.
- **Evidence:**
  ```
  $ rg __resetLexicalCache tests/
  (no output)
  ```
  The existing test isolates by passing `entries` override (`lexicalSearch(q, k, corpus)`) which bypasses the cache entirely. The reset hook is unreachable in practice.
- **Why it matters:** Exporting an `__` prefixed helper advertises a test seam that isn't actually used. Adds surface area.
- **Fix direction:** Delete the export. Or add a test that exercises the default-cached path and needs the reset — but don't keep it as an exported-but-unused leak.

### M4 — Stale/drifted docs: `docs/rag-spec.md` still describes the OpenAI embedding plan

- **Where:** `docs/rag-spec.md:11-17` ("embed query (OpenAI text-embedding-3-small)"), line 117 ("OpenAI `text-embedding-3-small` (1536 dimensions). Chosen for…")
- **Evidence:** Actual implementation: `src/lib/rag/embed.ts:17` uses `onnx-community/all-MiniLM-L6-v2-ONNX` (384-dim, local). `CLAUDE.md` design decisions now document this ("Local embeddings (all-MiniLM-L6-v2) chosen over OpenAI API"). Spec and code disagree.
- **Why it matters:** First stop for anyone understanding the RAG design. Mis-describes the implementation, the dimensionality, and the cost story. Also invalidates the "Phase 1" checklist at the bottom of the spec since all five phases are complete.
- **Fix direction:** Rewrite `docs/rag-spec.md` to match what is built, or prepend a "this spec is archived; see `CLAUDE.md` + retrieve.ts" header. Do not leave the old OpenAI text in place as if it were accurate.

### M5 — `rag-eval.ts` is in `scripts/` but has no package.json script entry and `knip` flags it

- **Where:** `scripts/rag-eval.ts`, `package.json:5-11`
- **Evidence:** `package.json` exposes only `rag:index` — `rag-eval.ts` is invoked only as `npx tsx scripts/rag-eval.ts` in `CLAUDE.md`. knip lists it under "Unused files". Memory note `project_rag_threshold.md` says tuning was supposed to be eval-driven, but the eval is neither in CI nor in a saved npm script.
- **Why it matters:** If nobody runs it, the tier thresholds in `retrieve.ts` (LEX_STRONG=4.0, DENSE_STRONG=0.55) regress silently on corpus edits. The calibration comment at `src/lib/rag/retrieve.ts:31-43` claims eval provenance — that claim has no recurring check.
- **Fix direction:** Add `"rag:eval": "tsx scripts/rag-eval.ts"` to `package.json`, then either (a) run it as part of a pre-deploy checklist and paste output into a dated `docs/` entry, or (b) add a much smaller sanity-check version to the Vitest suite that runs against a dev Qdrant when available. Either way, close the "tuning is eval-driven" loop.

### M6 — `scheduleAdjust` spec/code mismatch: audit doc says 0.5×–2.0×, code allows up to per-tea ceiling of 3.0×

- **Where:** `src/lib/brewing.ts:40-64`, `src/data/teas.ts:176` (shou `maxAdjust: 3.0`)
- **Evidence:** Code: `const multiplier = Math.max(0.5, Math.min(maxAdjust, deviation));` where `maxAdjust` defaults to 3.0 and is overridden per-preset (0.6–3.0). `CLAUDE.md:96` says "scales all steep times proportionally (capped 0.5x–2.0x)". The audit system prompt inherits the 0.5–2.0 wording.
- **Why it matters:** The code is the safer, more correct design (delicate greens cap at 1.4, robust shou caps at 3.0) — but `CLAUDE.md` is wrong, which means future work might "fix" the code to match the docs.
- **Fix direction:** Update `CLAUDE.md` to describe the per-tea ceiling honestly: "clamped 0.5×–`tea.maxAdjust`×, where `maxAdjust` is 0.6–3.0 per preset."

### M7 — `public/sw.js` is a hand-written service worker with no test coverage and a cache-name bump discipline that is easy to forget

- **Where:** `public/sw.js:1`, `src/components/ServiceWorkerRegistration.tsx:7`
- **Evidence:** `CACHE_NAME = "gongfucha-v2"`. Registered only in production (`process.env.NODE_ENV === "production"` check ✓). No automated check that static asset adds land in `STATIC_ASSETS`.
- **Why it matters:** Forgetting to bump `CACHE_NAME` after changing `/sounds/*` or icons means old clients will keep stale assets forever (navigation is network-first, so HTML is fine — but cached assets aren't). This is load-bearing for PWA behavior.
- **Fix direction:** Either (a) move SW cache-busting to a build-time generated hash (small pre-build script reads `public/` and injects a hash), or (b) document the bump discipline in a comment at the top of `sw.js` ("bump CACHE_NAME before every static-asset release"). The latter is lower effort and consistent with the "no frameworks, read-through-once" ethos.

### M8 — `QDRANT_API_KEY` documented as a required env var but never read in code

- **Where:** `.env.example:6`, `CLAUDE.md:103`, `docs/2026-04-10-go-live.md:106`; code: `src/lib/rag/qdrant.ts:17-93`, `src/lib/rag/retrieve.ts:29`, `src/lib/rag/index.ts:17`
- **Evidence:**
  ```
  $ rg QDRANT_API_KEY src/
  (no output)
  ```
  `CLAUDE.md:103` lists it alongside `QDRANT_URL` and `OPENROUTER_API_KEY`: "Env vars: `QDRANT_URL`, `QDRANT_API_KEY`, `OPENROUTER_API_KEY`." `qdrant.ts` sends no auth header on any of `ensureCollection`, `upsert`, or `search`.
- **Why it matters:** Today production binds Qdrant to `127.0.0.1:6333` inside the Docker network and runs with auth disabled — so the missing header is moot. The day someone points the app at a managed Qdrant (or turns on auth inside the compose file), retrieval will silently start returning 401s and the app will fall back to the LLM on every query with zero surfacing.
- **Fix direction:** Either wire the env var through — in `qdrant.ts` check `process.env.QDRANT_API_KEY` and add `"api-key": key` to the headers when present — or remove it from `CLAUDE.md` and `.env.example`. Don't keep a documented contract the code ignores.

### M9 — `knip` flags `@vitejs/plugin-react` unused, `postcss` unlisted

- **Where:** `package.json:23` (`@vitejs/plugin-react`), `postcss.config.mjs:3`
- **Evidence:**
  ```
  Unused devDependencies (1)
  @vitejs/plugin-react  package.json:23:6
  Unlisted dependencies (1)
  postcss  postcss.config.mjs
  ```
  `vitest.config.ts` does not import `@vitejs/plugin-react`. `postcss.config.mjs` refs `@tailwindcss/postcss` — Tailwind 4's PostCSS plugin bundles postcss transitively, but relying on that is fragile.
- **Why it matters:** Dead devDep bloats install + locks the supply chain surface unnecessarily. "Unlisted" postcss can break the day Tailwind 4 stops re-exporting it.
- **Fix direction:** Remove `@vitejs/plugin-react` from `package.json`, add `postcss` to devDependencies explicitly with the version currently resolved.

## Low findings

### L1 — Unused exports on `data/teas.ts` (`teas`, `getTeas`)

- **Where:** `src/data/teas.ts:63` (`export const teas`), `src/data/teas.ts:182` (`export function getTeas`)
- **Evidence:** Only `getTeaById` and `teaGroups` are consumed by `src/app/page.tsx:4`. `knip` confirms.
- **Fix direction:** Drop the two exports or keep one and inline the other. Minor.

### L2 — Dead CSS variable `--color-bg-warm`

- **Where:** `src/app/globals.css:5`
- **Evidence:** `rg "bg-warm" src/` returns only the CSS definition itself — never consumed via `var()` or Tailwind class. `CLAUDE.md` bans alternate backgrounds, so its reason for existing is gone.
- **Fix direction:** Delete the variable. Four lines saved, zero risk.

### L3 — Unused exported types (8)

- **Where:** `src/data/tea-categories.ts:1` (`TeaCategory`), `src/lib/jsonld.ts:43` (`BreadcrumbSegment`), `src/lib/jsonld.ts:61` (`ArticleInput`), `src/lib/jsonld.ts:118` (`DatasetInput`), `src/lib/rag/qdrant.ts:5` (`QdrantPoint`), `src/lib/rag/retrieve.ts:48` (`ScoredTeaResult`), `src/lib/weather.ts:3` (`WeatherCondition`), `src/lib/weather.ts:13` (`WeatherData`).
- **Evidence:** `knip` flags each. `rg` confirms each is consumed only internally.
- **Fix direction:** For types that look like library surface (`QdrantPoint`, `ScoredTeaResult`) — keep, but comment why. For purely internal types (`BreadcrumbSegment`, `ArticleInput`, `DatasetInput`) — drop the `export`.

### L4 — `WIKIDATA_BY_ID` in `src/data/corpus/wikidata.ts` exported, never imported

- **Where:** `src/data/corpus/wikidata.ts:4`
- **Evidence:** knip flag, cross-checked with `rg "WIKIDATA_BY_ID" src/`.
- **Fix direction:** Check whether the SEO static pages (`app/tea/[slug]/page.tsx`, etc.) intend to emit JSON-LD with Wikidata references. If yes, wire it in; if not, delete.

### L5 — `isInSeason` in `src/lib/seasons.ts:24` unused

- **Where:** `src/lib/seasons.ts:24`
- **Evidence:** knip flag, no callers in `src/`.
- **Fix direction:** Delete or wire into `Header`/tea-group filtering. The corpus has `seasons` hints — this is a feature never hooked up.

### L6 — `extendSchedule` has no upper bound on `additionalCount`

- **Where:** `src/lib/brewing.ts:82-93`
- **Evidence:** The function appends `additionalCount` entries to the schedule array with no cap. Caller `BrewingTimer.handleBrewNext` (`src/components/BrewingTimer.tsx:149`) calls the single-step `nextExtendedTime` indirectly — so today's user path tops out naturally — but `extendSchedule` itself is unguarded if called directly.
- **Why it matters:** Low practical risk (no caller passes large values), but an `additionalCount` of `Infinity` or an absurd integer would grow the array unbounded. Defensive programming gap.
- **Fix direction:** Add `additionalCount = Math.min(additionalCount, 20)` or similar. One line, eliminates a class of abuse.

### L7 — `src/app/corpus/page.tsx` carries a TODO to not link from sitemap

- **Where:** `src/app/corpus/page.tsx:1`
- **Evidence:** `// TODO(seo): Do NOT link from sitemap or layout until the open-source…` (truncated). `src/app/sitemap.ts` does not reference `/corpus` — consistent with the TODO — but nothing enforces it.
- **Fix direction:** Add one assertion in `tests/` that `sitemap()` does not include `/corpus` until the TODO is resolved, or convert the TODO into a dated decision in docs.

## What I checked

- `git status`, `git log --oneline -20`
- `CLAUDE.md`, `AGENTS.md`, `package.json`, `docs/rag-spec.md`, `docs/2026-04-10-go-live.md` (not re-read in detail; referenced)
- `Glob src/**/*.{ts,tsx}` (52 files), `Glob tests/**/*.ts` (13 files), `Glob scripts/**/*`, `Glob public/**/*`
- Config: `tsconfig.json`, `eslint.config.mjs`, `next.config.ts`, `vitest.config.ts`, `postcss.config.mjs`, `Dockerfile`, `docker-compose.yml`
- Source read in full:
  - `src/app/page.tsx`
  - `src/app/layout.tsx`
  - `src/app/api/identify/route.ts`
  - `src/components/ServiceWorkerRegistration.tsx`
  - `src/components/BrewingTimer.tsx`
  - `src/components/AIAdvisor.tsx`
  - `src/components/SecondaryPaths.tsx` (untracked)
  - `src/components/InlineViewHeader.tsx`
  - `src/data/teas.ts` (selected ranges)
  - `src/data/greetings.ts` (untracked)
  - `src/data/tips.ts`
  - `src/hooks/useTimer.ts`
  - `src/i18n/context.tsx`, `src/i18n/messages.ts` (first 20 lines)
  - `src/lib/brewing.ts`
  - `src/lib/pick.ts`
  - `src/lib/weather.ts`
  - `src/lib/rag/embed.ts`, `retrieve.ts`, `lexical.ts`, `qdrant.ts`, `index.ts`, `point-id.ts`
  - `scripts/rag-eval.ts`
  - `src/app/globals.css`
  - `public/sw.js`
- Next 16 docs: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` (first 150 lines) — confirmed `POST(request: Request)` is the documented route handler signature ✓
- Tests read: `tests/rag-integration.test.ts`, `tests/rag/lexical.test.ts`, `tests/rag/retrieve.test.ts`
- Commands run:
  - `npm run lint` — 0 issues
  - `npx vitest run` — 98 passed, 4 skipped, 0 failed. The 4 skipped are the `RAG integration` suite in `tests/rag-integration.test.ts` — 4 `it()` blocks gated on `describe.skipIf(!qdrantAvailable)` (file header comment: "This test will NOT run in standard CI — only when Qdrant is available locally"). Intentional.
  - `npm run build` — clean, 101 static pages + 1 dynamic route, Turbopack
  - `npm audit --production` — 1 critical (C1)
  - `npx knip` — 10 unused files, 6 unused exports, 8 unused types, 1 unused devDep, 1 unlisted dep
  - `npx depcheck` — conflicting (sees tailwindcss/react-dom/postcss as unused; knip disagrees — depcheck is wrong here, Tailwind 4 + vitest/jsdom pipeline consume them transitively)
  - `npx ts-prune` — ETIMEDOUT (ts-morph network-driven, unreliable on this machine); knip coverage is sufficient
- Grep sweeps: `bg-warm|bg-muted|bg-\[`, `bottom.?sheet|modal|overlay|dialog`, `LangChain|LlamaIndex|@langchain`, `serviceWorker`, `NEXT_PUBLIC_`, `TODO|FIXME|HACK|XXX`, `\.only\b|\.skip\b`, etc.

## What I did NOT check (deferred)

- **Performance numbers in real load.** `npm run build` reports per-route sizes but I did not run Lighthouse against a staged production deploy. Defer to next pass with a browser MCP session.
- **Accessibility against a real AT.** Grep confirmed `aria-live="polite"` on phase announcements, `role="timer"`, `aria-label`, `sr-only skip-link`, and 44 px minimum touch targets on end-session buttons. No VoiceOver / TalkBack walkthrough. Defer.
- **Corpus integrity.** Did not open all 84 JSON entries; spot-checked two. A dedicated corpus pass would verify `schedule_s.length === max_infusions`, `temp_c ∈ [70,100]`, `ratio_g_per_100ml ∈ [3,8]`, and source URL reachability.
- **Tests for `useTimer` reset-between-same-duration fix (f495036).** The code at `src/hooks/useTimer.ts:35-39` implements the fix, but I did not find a dedicated unit test asserting the regression is covered. Worth adding.
- **Live RAG eval numbers.** Running `scripts/rag-eval.ts` requires a populated Qdrant; did not tunnel to prod (stop condition — destructive-adjacent) or spin up local.
- **Docker image build from scratch.** Dockerfile reviewed statically; not rebuilt.
- **CSP / security headers on the host nginx.** Out of this repo's scope.

## Unverified claims

- **L4 / WIKIDATA_BY_ID intent.** I cannot tell whether the SEO static pages were meant to emit Wikidata JSON-LD. Confirm with the author or drop the symbol.
- **M7 / SW cache discipline.** Described as load-bearing based on normal PWA behavior; did not reproduce a stale-asset scenario in a browser. Promote to confirmed only after seeing it bite.
- **`depcheck` / `knip` disagreement** on `@tailwindcss/postcss`, `@types/react-dom`, `tailwindcss`. I trust `knip` here (config-aware), but have not manually traced every resolution. If you clean up devDeps, do it behind `npm run build` + `npx vitest run` + visual smoke.
