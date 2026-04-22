# Analytics Implementation Plan — Umami + minimal server logging

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** v2 — supersedes the v1 custom `/api/event` stack.
**Date:** 2026-04-19

## Context

v1 of this plan was a 13-task custom build — hand-rolled event schema, `/api/event` route, JSONL rollup, markdown reports. It produced no real dashboard (only static markdown + a GoAccess HTML report for traffic), was overscoped for a solo-dev portfolio app with low-double-digit DAU, and had concrete bugs (ESM `require.main` in the rollup CLI, silent ~50MB retention dressed up as "30 days", opt-out gap for identify queries).

**Revised goal:** ship a real dashboard in hours, not days, while keeping the one thing a client-side analytics tool cannot do — log raw RAG queries server-side for `scripts/rag-eval.ts`.

**Approach:** self-host [Umami](https://umami.is) on the same Hetzner VPS as the app. Umami is cookie-free, GDPR-compliant, DNT-respected, has a clean UI, and supports custom events via `window.umami.track()`. Plus a thin server-side JSONL logger for `/api/identify` exit paths — the RAG eval feed that Umami can't replace.

## Architecture

```
Hetzner VPS (CX22, 4 GB RAM)
├── Existing nginx (host) + certbot
├── gongfucha.app vhost                    → 127.0.0.1:3000 (app)
├── stats.gongfucha.app vhost (new)        → 127.0.0.1:3001 (umami)
│
├── Docker Compose (/home/servaaja/apps/gongfucha/)
│   ├── app          (unchanged, binds :3000, new log rotation caps)
│   ├── qdrant       (unchanged)
│   ├── umami        (new, binds :3001)    → umami-db (internal)
│   └── umami-db     (new, Postgres 16, volume-backed)
```

**Data flow:**
- Traffic + product events → Umami → dashboard at `stats.gongfucha.app`.
- Identify query logs → app stdout → `docker logs` → local extraction script → feeds `scripts/rag-eval.ts`.

**Resource cost:** Umami ~100 MB RAM, Postgres ~150 MB. VPS has 4 GB with ~1 GB currently used — fits comfortably.

## Scope

**In scope**
- Umami self-hosted on VPS, TLS via certbot, subdomain `stats.gongfucha.app`.
- Tracking snippet in `src/app/layout.tsx`, env-gated so it no-ops when unconfigured (dev, tests).
- Client-side `track()` wrapper + custom events: `tea_selected`, `brew_started`, `brew_completed`, `brew_aborted`, `ai_query`.
- Server-side JSONL logger for `/api/identify` (hit / llm / rate_limited / invalid / error), stdout only.
- Docker log rotation cap on the `app` service.
- RAG query extraction helper (one bash script).
- Docs + security-audit update.

**Out of scope**
- `/api/event` endpoint (Umami replaces it).
- Custom rate-limiter extraction (existing `/api/identify` limiter is fine).
- Rollup / markdown report scripts (Umami UI replaces them).
- Client `sendBeacon` emit helper (Umami SDK handles this).
- GoAccess (defer — Umami covers traffic).
- A/B testing, session replay, heatmaps, cross-session identification.

## Privacy

- Umami: no cookies, no cross-session IDs, no fingerprinting, DNT-respected by default. Daily-rotating salt on IP+UA+domain hash means identity cannot span days.
- Identify queries logged in full server-side. 200-char cap already enforced upstream. Documented in `docs/analytics.md` — the AI-identification feature is inherently free-text and the user has consented by typing into it.
- No client-side opt-out toggle needed — Umami honors `Do Not Track`.
- Raw IPs remain in nginx logs for rate-limit diagnostics (unchanged, 14-day rotation).

## File structure

**New files (in repo)**

| Path | Purpose |
|---|---|
| `src/lib/analytics/track.ts` | Typed wrapper around `window.umami.track` |
| `src/lib/analytics/log-event.ts` | Server-side `logEvent` — structured JSONL to stdout |
| `tests/analytics/track.test.ts` | Unit tests for `track()` |
| `tests/analytics/log-event.test.ts` | Unit tests for `logEvent()` |
| `tests/analytics/identify-log.test.ts` | Smoke test: identify route emits JSONL at hit path |
| `scripts/identify-queries.sh` | Pulls identify JSONL from VPS docker logs |
| `docs/analytics.md` | What's collected, dashboard URL, opt-out, retention |

**Modified files (in repo)**

| Path | Change |
|---|---|
| `src/app/layout.tsx` | Inject Umami script tag when `NEXT_PUBLIC_UMAMI_SRC` + `NEXT_PUBLIC_UMAMI_ID` set |
| `src/app/api/identify/route.ts` | Emit `logEvent(...)` at each exit path (hit, llm, rate_limited, invalid, error) |
| `src/app/page.tsx` | Track `tea_selected` from list taps and AI advisor result |
| `src/components/BrewingTimer.tsx` | Track `brew_started`, `brew_completed`, `brew_aborted` |
| `src/components/AIAdvisor.tsx` | Track `ai_query` with client-observed latency |
| `.env.example` | Document `NEXT_PUBLIC_UMAMI_SRC`, `NEXT_PUBLIC_UMAMI_ID` |
| `docs/security-audit.md` | Add `stats.gongfucha.app` row to infra table |

**VPS-only (not in repo)**

| Path | Change |
|---|---|
| `/home/servaaja/apps/gongfucha/docker-compose.yml` | Add `umami` + `umami-db` services; add `logging` block to `app` |
| `/home/servaaja/apps/gongfucha/.env` | Add `UMAMI_APP_SECRET`, `UMAMI_DB_PASSWORD` |
| `/etc/nginx/sites-available/stats.gongfucha.app` | New vhost proxying to `127.0.0.1:3001` |
| certbot | Issue cert for `stats.gongfucha.app` |

---

## Event schema (canonical)

```ts
// src/lib/analytics/track.ts — client events via Umami
export type TrackEvent =
  | { name: "tea_selected";   teaSlug: string; source: "list" | "ai" | "custom" }
  | { name: "brew_started";   teaSlug: string; leafG: number; vesselMl: number; ratioG100ml: number }
  | { name: "brew_completed"; teaSlug: string; infusions: number; elapsedMs: number }
  | { name: "brew_aborted";   teaSlug: string; infusions: number; elapsedMs: number }
  | { name: "ai_query";       latencyMs: number };
```

```ts
// src/lib/analytics/log-event.ts — server JSONL, /api/identify only
export type IdentifyLogEvent =
  | { event: "identify.hit";           query: string; slug: string; score: number; latencyMs: number }
  | { event: "identify.llm";           query: string; latencyMs: number }
  | { event: "identify.rate_limited" }
  | { event: "identify.invalid";       reason: "empty" | "too_long" | "wrong_type" }
  | { event: "identify.error";         stage: "rag" | "llm" };
```

Every server log line additionally carries a top-level `ts` (ISO string).

---

## Task breakdown

### Task 1: Deploy Umami on VPS

**Goal:** `https://stats.gongfucha.app` reachable, empty dashboard visible.

- [ ] **Step 1: Add services to VPS `docker-compose.yml`**

SSH to VPS. Edit `/home/servaaja/apps/gongfucha/docker-compose.yml`. Add:

```yaml
  umami-db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: umami
      POSTGRES_USER: umami
      POSTGRES_PASSWORD: ${UMAMI_DB_PASSWORD}
    volumes:
      - umami_db_data:/var/lib/postgresql/data
    networks:
      - internal

  umami:
    image: ghcr.io/umami-software/umami:postgresql-latest
    restart: unless-stopped
    ports:
      - "127.0.0.1:3001:3000"
    environment:
      DATABASE_URL: postgresql://umami:${UMAMI_DB_PASSWORD}@umami-db:5432/umami
      DATABASE_TYPE: postgresql
      APP_SECRET: ${UMAMI_APP_SECRET}
    depends_on:
      - umami-db
    networks:
      - internal
```

And append to the existing `volumes:` block:

```yaml
  umami_db_data:
```

Also add a `logging` block to the existing `app` service:

```yaml
    logging:
      driver: json-file
      options:
        max-size: "20m"
        max-file: "7"
```

- [ ] **Step 2: Generate secrets**

On VPS in `/home/servaaja/apps/gongfucha/`:

```bash
echo "UMAMI_DB_PASSWORD=$(openssl rand -hex 24)" >> .env
echo "UMAMI_APP_SECRET=$(openssl rand -hex 32)"  >> .env
chmod 600 .env
```

- [ ] **Step 3: Bring up Umami, then restart app for log caps**

```bash
docker compose up -d umami-db
sleep 5
docker compose up -d umami
docker compose up -d app
docker compose ps
```

Verify `umami-db` and `umami` are `healthy` / `Up`.

- [ ] **Step 4: nginx vhost**

Create `/etc/nginx/sites-available/stats.gongfucha.app`. Copy the existing `gongfucha.app` vhost as a template. Change:
- `server_name` → `stats.gongfucha.app`
- `proxy_pass` → `http://127.0.0.1:3001`
- Remove `/api/identify` rate-limit block (Umami has its own auth)

Symlink:
```bash
sudo ln -s /etc/nginx/sites-available/stats.gongfucha.app /etc/nginx/sites-enabled/
sudo nginx -t
```

- [ ] **Step 5: DNS**

Add an `A` record for `stats.gongfucha.app` → VPS IP at the registrar. Wait for `dig stats.gongfucha.app` to resolve before Step 6.

- [ ] **Step 6: Cert + reload**

```bash
sudo certbot --nginx -d stats.gongfucha.app
sudo systemctl reload nginx
```

- [ ] **Step 7: First login + website**

Visit `https://stats.gongfucha.app`. Log in with default `admin` / `umami`. **Change the admin password immediately** (Profile → Password).

Create a website entry:
- Name: `gongfucha.app`
- Domain: `gongfucha.app`

Copy the generated `data-website-id` (UUID) from the tracking-code snippet. The script src will be `https://stats.gongfucha.app/script.js`.

- [ ] **Step 8: Verification**

```bash
curl -I https://stats.gongfucha.app                              # 200, valid cert
docker inspect gongfucha-app-1 | grep -A3 LogConfig              # max-size: 20m, max-file: 7
```

---

### Task 2: Inject tracking script

**Files:** `src/app/layout.tsx`, `.env.example`

- [ ] **Step 1: Read current layout**

Read `src/app/layout.tsx` to find the right spot (after fonts, before `</head>` or at the end of the body — a `<script defer>` can go in either).

- [ ] **Step 2: Add env-gated tag**

```tsx
// near the top of layout.tsx
const UMAMI_SRC = process.env.NEXT_PUBLIC_UMAMI_SRC;
const UMAMI_ID  = process.env.NEXT_PUBLIC_UMAMI_ID;

// inside the <head> (or just before </body>):
{UMAMI_SRC && UMAMI_ID && (
  <script defer src={UMAMI_SRC} data-website-id={UMAMI_ID} />
)}
```

- [ ] **Step 3: Update `.env.example`**

```
# Analytics (Umami self-hosted). Leave unset in dev to disable.
NEXT_PUBLIC_UMAMI_SRC=https://stats.gongfucha.app/script.js
NEXT_PUBLIC_UMAMI_ID=<uuid-from-umami-dashboard>
```

- [ ] **Step 4: Set on VPS**

Edit `/home/servaaja/apps/gongfucha/docker-compose.yml` `app.environment`:

```yaml
      - NEXT_PUBLIC_UMAMI_SRC=https://stats.gongfucha.app/script.js
      - NEXT_PUBLIC_UMAMI_ID=<paste-the-uuid>
```

(These are public, fine to commit to the compose file.)

Then `docker compose up -d --build app`.

- [ ] **Step 5: Verify**

```bash
curl -s https://gongfucha.app | grep -o 'stats.gongfucha.app/script.js'
```

Expected: one match. Open `https://gongfucha.app` in a browser, DevTools → Network, filter `send` — expect a POST to `stats.gongfucha.app/api/send` on page load. Umami dashboard shows one Visitor within ~30 s.

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.tsx .env.example
git commit -m "feat(analytics): inject Umami tracking script (env-gated)"
```

---

### Task 3: Client-side `track()` wrapper

**Files:** `src/lib/analytics/track.ts`, `tests/analytics/track.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/analytics/track.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { track } from "@/lib/analytics/track";

describe("track", () => {
  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it("is a no-op when window.umami is absent", () => {
    (globalThis as unknown as { window: object }).window = {};
    expect(() => track({ name: "tea_selected", teaSlug: "da-hong-pao", source: "list" })).not.toThrow();
  });

  it("calls umami.track with name and data stripped of name", () => {
    const spy = vi.fn();
    (globalThis as unknown as { window: { umami: { track: typeof spy } } }).window = { umami: { track: spy } };
    track({ name: "tea_selected", teaSlug: "long-jing", source: "ai" });
    expect(spy).toHaveBeenCalledWith("tea_selected", { teaSlug: "long-jing", source: "ai" });
  });

  it("swallows errors thrown by umami", () => {
    const boom = vi.fn(() => { throw new Error("blocked"); });
    (globalThis as unknown as { window: { umami: { track: typeof boom } } }).window = { umami: { track: boom } };
    expect(() => track({ name: "ai_query", latencyMs: 42 })).not.toThrow();
  });
});
```

- [ ] **Step 2: Run — fails (module missing)**

`npx vitest run tests/analytics/track.test.ts`

- [ ] **Step 3: Implement**

```ts
// src/lib/analytics/track.ts
type UmamiWindow = Window & {
  umami?: { track: (name: string, data?: Record<string, unknown>) => void };
};

export type TrackEvent =
  | { name: "tea_selected";   teaSlug: string; source: "list" | "ai" | "custom" }
  | { name: "brew_started";   teaSlug: string; leafG: number; vesselMl: number; ratioG100ml: number }
  | { name: "brew_completed"; teaSlug: string; infusions: number; elapsedMs: number }
  | { name: "brew_aborted";   teaSlug: string; infusions: number; elapsedMs: number }
  | { name: "ai_query";       latencyMs: number };

export function track(event: TrackEvent): void {
  if (typeof window === "undefined") return;
  const umami = (window as UmamiWindow).umami;
  if (!umami) return; // script not loaded, DNT on, or blocked — silent no-op
  const { name, ...data } = event;
  try {
    umami.track(name, data);
  } catch {
    /* best-effort; never throw into the app */
  }
}
```

- [ ] **Step 4: Passes**

`npx vitest run tests/analytics/track.test.ts` → PASS, 3/3.

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics/track.ts tests/analytics/track.test.ts
git commit -m "feat(analytics): typed client track() wrapper around Umami"
```

---

### Task 4: Instrument UI

**Files:** `src/app/page.tsx`, `src/components/BrewingTimer.tsx`, `src/components/AIAdvisor.tsx`

- [ ] **Step 1: `page.tsx`**

Add `import { track } from "@/lib/analytics/track";`

Find every `setSelectedVariantId(slug)` call. Next to each, add:

```ts
track({ name: "tea_selected", teaSlug: slug, source: "list" });
```

For the AI advisor path (where the identified tea gets passed into selected state), use `source: "ai"` instead.

- [ ] **Step 2: `BrewingTimer.tsx`**

Add the import. Add a ref:

```ts
const startedAtRef = useRef<number | null>(null);
```

When the first timer fires (initial `start()` call or mount-time effect):

```ts
startedAtRef.current = Date.now();
track({
  name: "brew_started",
  teaSlug: preset.slug,
  leafG: leafGrams,
  vesselMl: vesselMl,
  ratioG100ml: (leafGrams / vesselMl) * 100,
});
```

On confirmed end-session:

```ts
track({
  name: "brew_aborted",
  teaSlug: preset.slug,
  infusions: completedInfusions,
  elapsedMs: Date.now() - (startedAtRef.current ?? Date.now()),
});
```

On natural completion (final infusion → summary):

```ts
track({
  name: "brew_completed",
  teaSlug: preset.slug,
  infusions: completedInfusions,
  elapsedMs: Date.now() - (startedAtRef.current ?? Date.now()),
});
```

- [ ] **Step 3: `AIAdvisor.tsx`**

Add the import. Wrap the existing `/api/identify` fetch:

```ts
const t0 = Date.now();
const res = await fetch("/api/identify", { /* existing */ });
track({ name: "ai_query", latencyMs: Date.now() - t0 });
```

- [ ] **Step 4: Smoke test in dev**

`npm run dev`. Set the two `NEXT_PUBLIC_UMAMI_*` env vars in `.env.local` pointing to the prod Umami (or a local one). Perform: tap tea → brew → end. Check Umami Events feed (within ~30 s) for `tea_selected`, `brew_started`, `brew_completed`.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/components/BrewingTimer.tsx src/components/AIAdvisor.tsx
git commit -m "feat(analytics): track tea selection, brew lifecycle, and ai_query"
```

---

### Task 5: Server-side identify logging

**Files:** `src/lib/analytics/log-event.ts`, `src/app/api/identify/route.ts`, `tests/analytics/log-event.test.ts`, `tests/analytics/identify-log.test.ts`

- [ ] **Step 1: Logger test**

```ts
// tests/analytics/log-event.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logEvent } from "@/lib/analytics/log-event";

describe("logEvent", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-19T10:00:00.000Z"));
  });

  afterEach(() => {
    logSpy.mockRestore();
    vi.useRealTimers();
  });

  it("emits one JSON line with ts and payload", () => {
    logEvent({ event: "identify.hit", query: "da hong pao", slug: "da-hong-pao", score: 5.2, latencyMs: 18 });
    expect(logSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(parsed).toEqual({
      ts: "2026-04-19T10:00:00.000Z",
      event: "identify.hit",
      query: "da hong pao",
      slug: "da-hong-pao",
      score: 5.2,
      latencyMs: 18,
    });
  });

  it("does not emit when GFC_ANALYTICS_DISABLED=1", () => {
    process.env.GFC_ANALYTICS_DISABLED = "1";
    logEvent({ event: "identify.rate_limited" });
    expect(logSpy).not.toHaveBeenCalled();
    delete process.env.GFC_ANALYTICS_DISABLED;
  });
});
```

- [ ] **Step 2: Implement**

```ts
// src/lib/analytics/log-event.ts
export type IdentifyLogEvent =
  | { event: "identify.hit";           query: string; slug: string; score: number; latencyMs: number }
  | { event: "identify.llm";           query: string; latencyMs: number }
  | { event: "identify.rate_limited" }
  | { event: "identify.invalid";       reason: "empty" | "too_long" | "wrong_type" }
  | { event: "identify.error";         stage: "rag" | "llm" };

export function logEvent(payload: IdentifyLogEvent): void {
  if (process.env.GFC_ANALYTICS_DISABLED === "1") return;
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...payload }));
}
```

- [ ] **Step 3: Passes**

`npx vitest run tests/analytics/log-event.test.ts` → PASS, 2/2.

- [ ] **Step 4: Wire into `/api/identify/route.ts`**

Add `import { logEvent } from "@/lib/analytics/log-event";`.

Add emissions at each exit path. Reference `src/app/api/identify/route.ts:168-217`.

- Rate-limited (before `return`): `logEvent({ event: "identify.rate_limited" });`
- Invalid query (before `return 400`): compute `reason` — `!query ? "empty" : typeof query !== "string" ? "wrong_type" : "too_long"` — then `logEvent({ event: "identify.invalid", reason });`
- Around `searchTeas`: `const ragStart = Date.now();` before the call. On non-empty result: `logEvent({ event: "identify.hit", query, slug: entry.slug, score: results[0].score, latencyMs: Date.now() - ragStart });` before `return`.
- RAG catch: `logEvent({ event: "identify.error", stage: "rag" });` alongside the existing `console.warn`.
- LLM fallback: `const llmStart = Date.now();` before `llmFallback(query)`. After: `logEvent({ event: "identify.llm", query, latencyMs: Date.now() - llmStart });` before `return`.
- Outer catch: `logEvent({ event: "identify.error", stage: "llm" });` at the start of the `catch` block.

- [ ] **Step 5: Integration smoke test**

```ts
// tests/analytics/identify-log.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/identify/route";

vi.mock("@/lib/rag/retrieve", () => ({
  searchTeas: vi.fn().mockResolvedValue([
    {
      score: 5.2,
      payload: { entry: JSON.stringify({
        slug: "da-hong-pao",
        name: "Da Hong Pao",
        flavor_profile: "roasted, mineral",
        category: "oolong",
        brewing: { temp_c: 95, ratio_g_per_100ml: 6, rinse: true, rinse_hint: "quick rinse", schedule_s: [10, 12, 15] },
      }) },
    },
  ]),
}));

describe("POST /api/identify — logging", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => { logSpy = vi.spyOn(console, "log").mockImplementation(() => {}); });
  afterEach(() => { logSpy.mockRestore(); });

  it("emits identify.hit on corpus match", async () => {
    const req = new Request("http://localhost/api/identify", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
      body: JSON.stringify({ query: "da hong pao" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const hitLine = logSpy.mock.calls.map((c) => c[0] as string).find((s) => s.includes('"identify.hit"'));
    expect(hitLine).toBeDefined();
    const parsed = JSON.parse(hitLine!);
    expect(parsed.slug).toBe("da-hong-pao");
    expect(parsed.query).toBe("da hong pao");
    expect(typeof parsed.latencyMs).toBe("number");
  });
});
```

Run: `npx vitest run tests/analytics/identify-log.test.ts` → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/analytics/log-event.ts src/app/api/identify/route.ts \
        tests/analytics/log-event.test.ts tests/analytics/identify-log.test.ts
git commit -m "feat(analytics): structured JSONL logging at /api/identify exit paths"
```

---

### Task 6: RAG query extraction helper

**File:** `scripts/identify-queries.sh`

- [ ] **Step 1: Write the script**

```bash
#!/usr/bin/env bash
# scripts/identify-queries.sh — pull identify JSONL from the VPS for RAG eval.
# Usage: ./scripts/identify-queries.sh [days]   > queries.jsonl
set -euo pipefail

DAYS="${1:-30}"

ssh webserve "docker logs --since ${DAYS}d gongfucha-app-1 2>/dev/null" \
  | grep -E '"event":"identify\.(hit|llm)"' \
  | sed '/^$/d'
```

- [ ] **Step 2: Make executable**

```bash
chmod +x scripts/identify-queries.sh
```

- [ ] **Step 3: Smoke test (after some real traffic exists)**

```bash
./scripts/identify-queries.sh 7 | head
```

Expect JSONL lines with `query` text.

- [ ] **Step 4: Commit**

```bash
git add scripts/identify-queries.sh
git commit -m "feat(analytics): helper to pull identify JSONL from VPS"
```

---

### Task 7: Documentation

**Files:** `docs/analytics.md` (new), `docs/security-audit.md` (modify)

- [ ] **Step 1: Write `docs/analytics.md`**

```markdown
# Analytics

Self-hosted on the same Hetzner VPS as the app. No cookies, DNT-respected, GDPR-compliant.

## Dashboard

https://stats.gongfucha.app — Umami. Traffic, referrers, devices, custom product events.

## What gets collected

### Pageviews (via Umami)
Path, referrer, screen size, browser, country (coarse IP→country only). No IP stored.

### Product events (via Umami — schema in `src/lib/analytics/track.ts`)

| Event | Fields | When |
|---|---|---|
| `tea_selected`   | `teaSlug`, `source` (`list` \| `ai` \| `custom`) | User taps a tea, or AI returns a tea |
| `brew_started`   | `teaSlug`, `leafG`, `vesselMl`, `ratioG100ml`    | First timer fires |
| `brew_completed` | `teaSlug`, `infusions`, `elapsedMs`              | Final infusion reached |
| `brew_aborted`   | `teaSlug`, `infusions`, `elapsedMs`              | User confirms end-session early |
| `ai_query`       | `latencyMs`                                       | Client-observed latency for `/api/identify` |

### Server-side identify logs (app stdout → `docker logs`)

Raw queries to `/api/identify` are logged for RAG evaluation. This is the product's most valuable signal. Pull with `./scripts/identify-queries.sh [days]`.

| Event | Fields |
|---|---|
| `identify.hit`          | `query`, `slug`, `score`, `latencyMs` |
| `identify.llm`          | `query`, `latencyMs` |
| `identify.rate_limited` | — |
| `identify.invalid`      | `reason` |
| `identify.error`        | `stage` |

## What we never collect

- Cookies
- Cross-session IDs or fingerprints
- User accounts (there are none)
- Email, name, precise location
- Free text anywhere except identify queries (which the user typed into an AI-identify box)

## Opt out

Enable "Do Not Track" in your browser. Umami honors it.

## Retention

- Umami events: kept indefinitely; prune via Umami admin if needed.
- Nginx access logs: 14 days (logrotate default).
- Docker app stdout (includes identify logs): 20 MB × 7 files ≈ 140 MB, rotated in place.

## Reading product events

`stats.gongfucha.app` → Websites → gongfucha.app → Events tab. Filter by event name.

## Reading identify queries

```bash
./scripts/identify-queries.sh 30 > queries.jsonl
```

Output feeds `scripts/rag-eval.ts` directly (after a follow-up change to that script to accept JSONL input).
```

- [ ] **Step 2: Update `docs/security-audit.md`**

In the infra table, add a row for `stats.gongfucha.app`:

| Component | Where |
|---|---|
| Analytics dashboard | Umami (`gongfucha-umami-1`) bound to `127.0.0.1:3001`, nginx vhost `stats.gongfucha.app`, same certbot flow as gongfucha.app |

- [ ] **Step 3: Commit**

```bash
git add docs/analytics.md docs/security-audit.md
git commit -m "docs: document Umami + identify-log analytics stack"
```

---

## Verification checklist (top-to-bottom before calling it done)

- [ ] `https://stats.gongfucha.app` loads, cert valid, login works, admin password changed from default.
- [ ] `docker inspect gongfucha-app-1 | grep -A3 LogConfig` shows `max-size: 20m, max-file: 7`.
- [ ] `curl -s https://gongfucha.app | grep -o stats.gongfucha.app/script.js` returns one match.
- [ ] Loading `gongfucha.app` in a browser results in a POST to `stats.gongfucha.app/api/send` (DevTools → Network).
- [ ] Umami "Events" feed shows `tea_selected` within ~30 s of tapping a tea.
- [ ] A full brewing session produces `brew_started` + `brew_completed` events with correct `teaSlug` and `elapsedMs`.
- [ ] An AI query produces `ai_query` (Umami) and `identify.hit` or `identify.llm` (VPS docker logs).
- [ ] `docker logs gongfucha-app-1 2>&1 | grep '"identify.hit"' | tail` shows JSONL with `query` text.
- [ ] `./scripts/identify-queries.sh 1` runs cleanly.
- [ ] `npx vitest run` — all green.
- [ ] `npm run build` — no type errors.
- [ ] `free -h` on VPS shows comfortable RAM headroom after all services up.

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Umami container dies → tracking silently off | `restart: unless-stopped`; `track()` is a no-op when `window.umami` absent |
| Postgres data loss | Volume-mounted; daily backup out of scope for v1 (tracking data is not load-bearing) |
| Adblockers block `stats.gongfucha.app/script.js` | Self-hosted path rarely blocked; loss acceptable |
| Umami default admin password stays `umami` | **Change at first login — in the checklist** |
| Identify query logs contain sensitive text | Documented; 200-char cap upstream; users consent by typing into an AI-identify box |
| VPS RAM pressure (app + qdrant + umami + postgres) | CX22 has 4 GB, combined ~1 GB; monitor with `free -h` post-deploy |
| Subdomain certbot issuance fails | Standard flow; rerun `certbot --nginx -d stats.gongfucha.app`; check DNS propagation first |
| `track()` called before Umami script loaded | Silent no-op by design; early events are lost. Acceptable for this product. |

---

## Rollback

- **Disable tracking, keep Umami data:** remove `NEXT_PUBLIC_UMAMI_*` from VPS compose, `docker compose up -d --build app`. Tracking stops immediately; app unaffected.
- **Full teardown:** `docker compose rm -sf umami umami-db && docker volume rm gongfucha_umami_db_data`. Remove nginx vhost, revoke cert.
- **Repo changes:** each task is a separate commit; `git revert <hash>` as needed. No data migrations, no irreversible state.

---

## Effort estimate

| Task | Est. |
|---|---|
| 1. VPS deploy (Umami + DB + nginx + cert) | 60–90 min |
| 2. Script injection | 10 min |
| 3. `track()` wrapper + tests | 20 min |
| 4. UI instrumentation (3 files) | 45 min |
| 5. Server identify logging + tests | 30 min |
| 6. Extraction script | 10 min |
| 7. Docs | 20 min |

**Total: 3–4 hours of focused work.** vs ~10–15 hours for the original v1 plan.

---

## Critical files

- `src/app/layout.tsx` — script injection (env-gated).
- `src/lib/analytics/track.ts` — new, typed wrapper.
- `src/lib/analytics/log-event.ts` — new, server JSONL.
- `src/app/api/identify/route.ts:168-217` — add `logEvent(...)` at exit paths.
- `/home/servaaja/apps/gongfucha/docker-compose.yml` — VPS Umami services + log caps.
- `/etc/nginx/sites-available/stats.gongfucha.app` — VPS nginx vhost.

---

## Open question

**Basic Auth on `stats.gongfucha.app`?** Umami has its own login — redundant. But adds defense-in-depth if Umami has a CVE. Cost: one `htpasswd` file, 5 min. Recommendation: **skip for v1, add if a CVE appears**.
