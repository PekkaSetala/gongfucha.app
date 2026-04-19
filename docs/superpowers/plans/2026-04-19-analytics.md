# Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up privacy-respecting, self-hosted analytics for gongfucha.app — traffic, product events, and RAG query intelligence — with zero new services, no client-side trackers, and no recurring cost.

**Architecture:** Three data streams, all captured by infrastructure that already exists. (1) Nginx access logs on the VPS → GoAccess HTML reports for traffic/referrer/device data. (2) Structured JSONL log lines written to stdout from `/api/identify` and a new `/api/event` route → Docker's `json-file` log driver retains them → a local `scripts/analytics-rollup.ts` parses and aggregates into markdown. (3) A thin client emit helper posts events to `/api/event` with `sendBeacon` fallback. No external SaaS, no cookies, no cross-session IDs.

**Tech Stack:** Next.js 16 App Router route handlers (Node runtime), TypeScript, Vitest, tsx, GoAccess (installed on laptop or VPS), Docker json-file log driver, existing nginx config pattern. No new npm dependencies.

---

## Scope

**In scope**

- Server-side traffic analytics from nginx logs
- Structured telemetry for `/api/identify` (query, strategy, confidence, latency, outcome) — feeds `scripts/rag-eval.ts` with real-world queries
- Product events: `tea_selected`, `brew_started`, `brew_completed`, `brew_aborted`, `session_ended`, `ai_query`
- Local rollup script producing markdown summary
- Privacy charter baked into the event schema (allow-list fields only)
- `/api/event` endpoint with the same rate-limit pattern as `/api/identify`
- VPS log rotation caps so the VPS does not fill its 40 GB disk
- Docs: what is collected, why, how to read it, retention policy

**Out of scope**

- Real-time dashboards (markdown reports are enough for solo-dev weekly review)
- Session replay, heatmaps, scroll maps
- A/B testing framework
- User accounts, login, cross-device tracking
- PII collection of any kind (including raw IP storage by the app itself)
- Retention longer than 30 days
- Cookie banner (not needed — no cookies, no fingerprinting)

## Privacy charter (baked into the design)

This is load-bearing — the event schema and route validation enforce it.

1. **No cookies.** The emit helper never reads or sets `document.cookie`.
2. **No cross-session ID.** A per-page-load ephemeral `sessionId` (random 8-char base36, in-memory only, regenerates on reload) is included in events so we can group events within one visit, but cannot link visits.
3. **No free text except identify queries.** Every non-identify event carries only enum-validated fields (tea slug from the corpus, phase name, infusion index, booleans). Identify queries are inherently free text — the user typed them — and are needed for RAG eval. This is explicit in `docs/analytics.md`.
4. **No IPs stored by the app.** Nginx logs have IPs for rate-limit purposes; those rotate at 14 days. The app's stdout logs never include IP.
5. **No user agent parsing beyond "mobile yes/no".** The raw UA is dropped at the edge; only `isMobile` (boolean) reaches the log.
6. **Client opt-out.** `localStorage.setItem('gfc:analytics-off', '1')` suppresses all emits. No banner; the setting is discoverable in docs.
7. **Nginx does not log identify request bodies.** Only the route path.

## File structure

**New files**

| Path | Responsibility |
|---|---|
| `src/lib/analytics/schema.ts` | Event type discriminated union + validation (hand-written, no Zod) |
| `src/lib/analytics/log-event.ts` | Server-side: emit JSONL line to stdout with ISO timestamp |
| `src/lib/analytics/emit.ts` | Client-side: POST to `/api/event` with `sendBeacon` fallback and opt-out |
| `src/app/api/event/route.ts` | POST handler: rate-limit, validate, call `logEvent` |
| `scripts/analytics-rollup.ts` | Parse JSONL from stdin/file, aggregate, emit markdown |
| `scripts/goaccess-report.sh` | Pull nginx logs via scp, run GoAccess, open HTML |
| `tests/analytics/log-event.test.ts` | Unit tests for structured logger |
| `tests/analytics/schema.test.ts` | Schema validation tests |
| `tests/analytics/event-route.test.ts` | `/api/event` handler tests |
| `tests/analytics/emit.test.ts` | Client emit + opt-out tests |
| `tests/analytics/rollup.test.ts` | Rollup script tests with fixture data |
| `tests/fixtures/analytics-log.jsonl` | Test fixture: representative log lines |
| `docs/analytics.md` | User-facing docs: what/why/how/retention |

**Modified files**

| Path | Change |
|---|---|
| `src/app/api/identify/route.ts` | Call `logEvent` at each exit point (corpus hit, LLM fallback, rate-limit, validation fail, error) |
| `src/app/page.tsx` | Emit `tea_selected` when `selectedVariantId` changes to a non-null value |
| `src/components/BrewingTimer.tsx` | Emit `brew_started` on timer start, `brew_completed` at end of session, `brew_aborted` on end-session confirmation |
| `src/components/SessionSummary.tsx` | Emit `session_ended` with session stats |
| `src/components/AIAdvisor.tsx` | Emit `ai_query` on submit (mirrors server-side log, gives client latency) |
| `package.json` | Add `"analytics:rollup"` and `"analytics:report"` scripts |
| `docs/security-audit.md` | Add `/api/event` row to the rate-limited-routes table |

**VPS-side changes (not in git, done via SSH)**

| Where | Change |
|---|---|
| `/home/servaaja/apps/gongfucha/docker-compose.yml` | Add `logging.driver: json-file` with `max-size: 10m`, `max-file: 5` to the `app` service |
| `/etc/nginx/sites-available/gongfucha.app` | Add `limit_req_zone gongfucha_event` + `location = /api/event { limit_req ... }`, 30r/m per IP burst 10 |

---

## Events — canonical schema

This is the allow-list. The route and the client helper both validate against it.

```ts
export type AnalyticsEvent =
  | { name: "tea_selected"; sessionId: string; teaSlug: string; source: "list" | "ai" | "custom" }
  | { name: "brew_started"; sessionId: string; teaSlug: string; leafG: number; vesselMl: number; ratioG100ml: number }
  | { name: "brew_completed"; sessionId: string; teaSlug: string; infusions: number; elapsedMs: number }
  | { name: "brew_aborted"; sessionId: string; teaSlug: string; infusions: number; elapsedMs: number }
  | { name: "session_ended"; sessionId: string; teaSlug: string; infusions: number; elapsedMs: number }
  | { name: "ai_query"; sessionId: string; latencyMs: number; source: "client" };
```

Server-emitted (from `/api/identify`, not through `/api/event`):

```ts
export type ServerEvent =
  | { name: "identify.hit"; queryLen: number; query: string; slug: string; strategy: "lex" | "dense"; score: number; latencyMs: number }
  | { name: "identify.llm"; queryLen: number; query: string; latencyMs: number }
  | { name: "identify.rate_limited"; }
  | { name: "identify.invalid"; reason: "empty" | "too_long" | "wrong_type" }
  | { name: "identify.error"; stage: "rag" | "llm" | "parse" };
```

All events carry `ts` (ISO string) and `event` (name) at the top level when logged. See `src/lib/analytics/log-event.ts`.

---

## Task breakdown

### Task 1: Structured logger primitive

**Files:**
- Create: `src/lib/analytics/log-event.ts`
- Test: `tests/analytics/log-event.test.ts`

- [ ] **Step 1: Write the failing test**

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

  it("emits a single JSON line with ts, event, and payload fields", () => {
    logEvent({ event: "identify.hit", queryLen: 12, query: "da hong pao", slug: "da-hong-pao", strategy: "lex", score: 5.2, latencyMs: 18 });
    expect(logSpy).toHaveBeenCalledTimes(1);
    const [line] = logSpy.mock.calls[0];
    expect(typeof line).toBe("string");
    const parsed = JSON.parse(line as string);
    expect(parsed).toEqual({
      ts: "2026-04-19T10:00:00.000Z",
      event: "identify.hit",
      queryLen: 12,
      query: "da hong pao",
      slug: "da-hong-pao",
      strategy: "lex",
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

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/analytics/log-event.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/analytics/log-event.ts
type LogPayload = { event: string } & Record<string, unknown>;

export function logEvent(payload: LogPayload): void {
  if (process.env.GFC_ANALYTICS_DISABLED === "1") return;
  const line = JSON.stringify({ ts: new Date().toISOString(), ...payload });
  console.log(line);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/analytics/log-event.test.ts`
Expected: PASS, 2/2.

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics/log-event.ts tests/analytics/log-event.test.ts
git commit -m "feat(analytics): structured JSONL logger primitive"
```

---

### Task 2: Event schema and validator

**Files:**
- Create: `src/lib/analytics/schema.ts`
- Test: `tests/analytics/schema.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/analytics/schema.test.ts
import { describe, it, expect } from "vitest";
import { validateEvent } from "@/lib/analytics/schema";

describe("validateEvent", () => {
  it("accepts a valid tea_selected event", () => {
    const result = validateEvent({
      name: "tea_selected",
      sessionId: "a1b2c3d4",
      teaSlug: "da-hong-pao",
      source: "list",
    });
    expect(result.ok).toBe(true);
  });

  it("accepts a valid brew_completed event", () => {
    const result = validateEvent({
      name: "brew_completed",
      sessionId: "a1b2c3d4",
      teaSlug: "long-jing",
      infusions: 6,
      elapsedMs: 420000,
    });
    expect(result.ok).toBe(true);
  });

  it("rejects unknown event names", () => {
    const result = validateEvent({ name: "hacked", sessionId: "a1b2c3d4" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/unknown event/i);
  });

  it("rejects missing required fields", () => {
    const result = validateEvent({ name: "tea_selected", sessionId: "a1b2c3d4" });
    expect(result.ok).toBe(false);
  });

  it("rejects sessionId that is not 8 lowercase base36 chars", () => {
    const result = validateEvent({
      name: "tea_selected",
      sessionId: "TOOLONG!!",
      teaSlug: "da-hong-pao",
      source: "list",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects teaSlug not matching corpus slug pattern", () => {
    const result = validateEvent({
      name: "tea_selected",
      sessionId: "a1b2c3d4",
      teaSlug: "../../etc/passwd",
      source: "list",
    });
    expect(result.ok).toBe(false);
  });

  it("rejects extra fields (strict)", () => {
    const result = validateEvent({
      name: "tea_selected",
      sessionId: "a1b2c3d4",
      teaSlug: "da-hong-pao",
      source: "list",
      email: "leak@example.com",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/unknown field/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/analytics/schema.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/analytics/schema.ts
export type ClientEvent =
  | { name: "tea_selected"; sessionId: string; teaSlug: string; source: "list" | "ai" | "custom" }
  | { name: "brew_started"; sessionId: string; teaSlug: string; leafG: number; vesselMl: number; ratioG100ml: number }
  | { name: "brew_completed"; sessionId: string; teaSlug: string; infusions: number; elapsedMs: number }
  | { name: "brew_aborted"; sessionId: string; teaSlug: string; infusions: number; elapsedMs: number }
  | { name: "session_ended"; sessionId: string; teaSlug: string; infusions: number; elapsedMs: number }
  | { name: "ai_query"; sessionId: string; latencyMs: number; source: "client" };

type ValidationResult = { ok: true; event: ClientEvent } | { ok: false; error: string };

const SESSION_ID_RE = /^[0-9a-z]{8}$/;
const TEA_SLUG_RE = /^[a-z0-9][a-z0-9-]{1,40}$/;

const SCHEMAS: Record<ClientEvent["name"], { required: string[]; optional?: string[]; enums?: Record<string, readonly string[]> }> = {
  tea_selected: {
    required: ["sessionId", "teaSlug", "source"],
    enums: { source: ["list", "ai", "custom"] },
  },
  brew_started: {
    required: ["sessionId", "teaSlug", "leafG", "vesselMl", "ratioG100ml"],
  },
  brew_completed: {
    required: ["sessionId", "teaSlug", "infusions", "elapsedMs"],
  },
  brew_aborted: {
    required: ["sessionId", "teaSlug", "infusions", "elapsedMs"],
  },
  session_ended: {
    required: ["sessionId", "teaSlug", "infusions", "elapsedMs"],
  },
  ai_query: {
    required: ["sessionId", "latencyMs", "source"],
    enums: { source: ["client"] },
  },
};

export function validateEvent(input: unknown): ValidationResult {
  if (typeof input !== "object" || input === null) return { ok: false, error: "event must be an object" };
  const obj = input as Record<string, unknown>;
  const name = obj.name;
  if (typeof name !== "string") return { ok: false, error: "name required" };
  const schema = SCHEMAS[name as ClientEvent["name"]];
  if (!schema) return { ok: false, error: `unknown event: ${name}` };

  const allowed = new Set(["name", ...schema.required, ...(schema.optional ?? [])]);
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) return { ok: false, error: `unknown field: ${key}` };
  }

  for (const key of schema.required) {
    if (!(key in obj)) return { ok: false, error: `missing field: ${key}` };
  }

  if (typeof obj.sessionId !== "string" || !SESSION_ID_RE.test(obj.sessionId)) {
    return { ok: false, error: "invalid sessionId" };
  }
  if ("teaSlug" in obj && (typeof obj.teaSlug !== "string" || !TEA_SLUG_RE.test(obj.teaSlug))) {
    return { ok: false, error: "invalid teaSlug" };
  }

  if (schema.enums) {
    for (const [key, values] of Object.entries(schema.enums)) {
      if (!values.includes(obj[key] as string)) return { ok: false, error: `invalid ${key}` };
    }
  }

  for (const key of ["leafG", "vesselMl", "ratioG100ml", "infusions", "elapsedMs", "latencyMs"]) {
    if (key in obj && (typeof obj[key] !== "number" || !Number.isFinite(obj[key] as number) || (obj[key] as number) < 0)) {
      return { ok: false, error: `invalid ${key}` };
    }
  }

  return { ok: true, event: obj as unknown as ClientEvent };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/analytics/schema.test.ts`
Expected: PASS, 7/7.

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics/schema.ts tests/analytics/schema.test.ts
git commit -m "feat(analytics): client event schema and strict validator"
```

---

### Task 3: `/api/event` route handler

**Files:**
- Create: `src/app/api/event/route.ts`
- Create: `src/lib/analytics/rate-limit.ts` (extracted shared pattern)
- Test: `tests/analytics/event-route.test.ts`

**Refactor note:** The rate-limit logic in `src/app/api/identify/route.ts:11-41` is duplicated by copy-paste if we inline it here. Extract once into `src/lib/analytics/rate-limit.ts` (despite the module name — it is used by both routes) and import from both. Separate task below handles the identify-side refactor; for this task, import the extracted version.

- [ ] **Step 1: Extract rate limiter first — write test**

```ts
// tests/analytics/rate-limit.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { createRateLimiter } from "@/lib/analytics/rate-limit";

describe("createRateLimiter", () => {
  let now = 0;
  const clock = () => now;

  beforeEach(() => {
    now = 1_000_000;
  });

  it("allows up to max requests in the window", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 3, clock });
    expect(limiter.exceeded("1.2.3.4")).toBe(false);
    expect(limiter.exceeded("1.2.3.4")).toBe(false);
    expect(limiter.exceeded("1.2.3.4")).toBe(false);
    expect(limiter.exceeded("1.2.3.4")).toBe(true);
  });

  it("expires entries outside the window", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2, clock });
    limiter.exceeded("1.2.3.4");
    limiter.exceeded("1.2.3.4");
    expect(limiter.exceeded("1.2.3.4")).toBe(true);
    now += 61_000;
    expect(limiter.exceeded("1.2.3.4")).toBe(false);
  });

  it("scopes per key", () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1, clock });
    expect(limiter.exceeded("a")).toBe(false);
    expect(limiter.exceeded("a")).toBe(true);
    expect(limiter.exceeded("b")).toBe(false);
  });
});
```

- [ ] **Step 2: Run — fails (module missing)**

Run: `npx vitest run tests/analytics/rate-limit.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// src/lib/analytics/rate-limit.ts
export type Limiter = { exceeded: (key: string) => boolean };
type Opts = { windowMs: number; max: number; clock?: () => number };

export function createRateLimiter({ windowMs, max, clock = Date.now }: Opts): Limiter {
  const buckets = new Map<string, number[]>();
  return {
    exceeded(key) {
      const now = clock();
      const bucket = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
      if (bucket.length >= max) {
        buckets.set(key, bucket);
        return true;
      }
      bucket.push(now);
      buckets.set(key, bucket);
      if (buckets.size > 1000) {
        for (const [k, ts] of buckets) {
          if (ts.every((t) => now - t > windowMs)) buckets.delete(k);
        }
      }
      return false;
    },
  };
}
```

- [ ] **Step 4: Passes**

Run: `npx vitest run tests/analytics/rate-limit.test.ts`
Expected: PASS, 3/3.

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics/rate-limit.ts tests/analytics/rate-limit.test.ts
git commit -m "feat(analytics): extract sliding-window rate limiter"
```

- [ ] **Step 6: Now write route test**

```ts
// tests/analytics/event-route.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/event/route";

function makeRequest(body: unknown, ip = "9.9.9.9"): Request {
  return new Request("http://localhost/api/event", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

describe("POST /api/event", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it("returns 204 and logs a valid event", async () => {
    const res = await POST(makeRequest({
      name: "tea_selected",
      sessionId: "a1b2c3d4",
      teaSlug: "da-hong-pao",
      source: "list",
    }));
    expect(res.status).toBe(204);
    expect(logSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(logSpy.mock.calls[0][0] as string);
    expect(parsed.event).toBe("tea_selected");
    expect(parsed.teaSlug).toBe("da-hong-pao");
  });

  it("returns 400 on invalid body", async () => {
    const res = await POST(makeRequest({ name: "tea_selected", sessionId: "a1b2c3d4" }));
    expect(res.status).toBe(400);
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("returns 400 on non-JSON body", async () => {
    const req = new Request("http://localhost/api/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 429 after rate limit", async () => {
    const validBody = { name: "tea_selected", sessionId: "a1b2c3d4", teaSlug: "da-hong-pao", source: "list" };
    for (let i = 0; i < 30; i++) {
      const r = await POST(makeRequest(validBody, "7.7.7.7"));
      expect(r.status).toBe(204);
    }
    const blocked = await POST(makeRequest(validBody, "7.7.7.7"));
    expect(blocked.status).toBe(429);
  });
});
```

- [ ] **Step 7: Run — fails (route missing)**

Run: `npx vitest run tests/analytics/event-route.test.ts`
Expected: FAIL.

- [ ] **Step 8: Implement route**

```ts
// src/app/api/event/route.ts
import { NextResponse } from "next/server";
import { validateEvent } from "@/lib/analytics/schema";
import { logEvent } from "@/lib/analytics/log-event";
import { createRateLimiter } from "@/lib/analytics/rate-limit";

export const runtime = "nodejs";

const limiter = createRateLimiter({ windowMs: 60_000, max: 30 });

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}

export async function POST(request: Request): Promise<Response> {
  if (limiter.exceeded(clientIp(request))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const result = validateEvent(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  logEvent({ event: result.event.name, ...result.event, name: undefined });
  return new Response(null, { status: 204 });
}
```

- [ ] **Step 9: Passes**

Run: `npx vitest run tests/analytics/event-route.test.ts`
Expected: PASS, 4/4.

- [ ] **Step 10: Commit**

```bash
git add src/app/api/event/route.ts tests/analytics/event-route.test.ts
git commit -m "feat(analytics): /api/event endpoint with rate-limit and strict validation"
```

---

### Task 4: Refactor `/api/identify` to use shared rate limiter + emit structured logs

**Files:**
- Modify: `src/app/api/identify/route.ts`
- Modify: tests (if any rely on the old inline limiter — currently no tests touch that internal)

- [ ] **Step 1: Replace inline limiter with `createRateLimiter`**

Edit `src/app/api/identify/route.ts`:
- Delete lines 8–41 (the `RATE_WINDOW_MS`, `RATE_MAX`, `rateBuckets`, `rateLimitExceeded`).
- Keep `clientIp` — it's the same in both routes; leave it local (DRY-optional; duplicating a 6-line helper is fine).
- Add at top near imports: `import { createRateLimiter } from "@/lib/analytics/rate-limit";` and `import { logEvent } from "@/lib/analytics/log-event";`
- Add below imports: `const limiter = createRateLimiter({ windowMs: 60_000, max: 20 });`
- Replace the call `rateLimitExceeded(clientIp(request))` with `limiter.exceeded(clientIp(request))`.

- [ ] **Step 2: Add event emissions at every exit path**

In the `POST` handler, add `logEvent(...)` calls:

```ts
// After rate-limit check — before returning 429:
if (limiter.exceeded(clientIp(request))) {
  logEvent({ event: "identify.rate_limited" });
  return NextResponse.json({ error: "Rate limit exceeded. Try again in a minute." }, { status: 429 });
}

// After query validation fails:
if (!query || typeof query !== "string" || query.length > 200) {
  const reason = !query ? "empty" : typeof query !== "string" ? "wrong_type" : "too_long";
  logEvent({ event: "identify.invalid", reason });
  return NextResponse.json({ error: "Query is required (max 200 characters)" }, { status: 400 });
}

// Around the RAG block — capture latency and strategy:
const ragStart = Date.now();
try {
  const results = await searchTeas(query, 3);
  if (results.length > 0) {
    const top = results[0];
    const entry = JSON.parse(top.payload.entry as string) as TeaEntry;
    logEvent({
      event: "identify.hit",
      queryLen: query.length,
      query,
      slug: entry.slug,
      strategy: (top.payload.strategy as string) ?? "dense",
      score: top.score,
      latencyMs: Date.now() - ragStart,
    });
    return NextResponse.json(mapCorpusEntry(entry));
  }
} catch (err) {
  logEvent({ event: "identify.error", stage: "rag" });
  console.warn("RAG retrieval failed, falling back to LLM:", err);
}

// LLM fallback path:
const llmStart = Date.now();
try {
  const result = await llmFallback(query);
  logEvent({ event: "identify.llm", queryLen: query.length, query, latencyMs: Date.now() - llmStart });
  return NextResponse.json(result);
} catch {
  logEvent({ event: "identify.error", stage: "llm" });
  // existing 500 response
}
```

**Note:** `top.payload.strategy` requires the retrieve module to set this. Check `src/lib/rag/retrieve.ts` — if the current payload does not include a `strategy` field, add a simple follow-up step that tags each returned point in `retrieve.ts` with `strategy: "lex" | "dense"` at the call site. Use `"dense"` as the default if unknown.

- [ ] **Step 3: Write a smoke test — existing identify tests (if any)**

Run: `npx vitest run`
Expected: all existing tests still pass. If `tests/rag-integration.test.ts` mocks `console.log`, the new log lines might trigger assertions — inspect and adjust if so.

- [ ] **Step 4: Verify manually in dev**

```bash
npm run dev &
DEV_PID=$!
sleep 3
curl -s -X POST http://localhost:3000/api/identify \
  -H "content-type: application/json" \
  -d '{"query":"da hong pao"}' | head -c 200
echo
# In dev server stdout, expect: {"ts":"...","event":"identify.hit",...}
kill $DEV_PID
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/identify/route.ts src/lib/rag/retrieve.ts
git commit -m "feat(analytics): structured logs at every /api/identify exit path"
```

---

### Task 5: Client emit helper

**Files:**
- Create: `src/lib/analytics/emit.ts`
- Test: `tests/analytics/emit.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/analytics/emit.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { emit, getSessionId, resetSessionForTest } from "@/lib/analytics/emit";

describe("emit", () => {
  beforeEach(() => {
    resetSessionForTest();
    // jsdom-like globals
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      _s: new Map<string, string>(),
      getItem(k: string) { return this._s.get(k) ?? null; },
      setItem(k: string, v: string) { this._s.set(k, v); },
      removeItem(k: string) { this._s.delete(k); },
      clear() { this._s.clear(); },
      key() { return null; },
      length: 0,
    } as unknown as Storage;
    (globalThis as unknown as { navigator: Navigator }).navigator = { sendBeacon: vi.fn(() => true) } as unknown as Navigator;
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(null, { status: 204 }))));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends a POST to /api/event with sessionId attached", async () => {
    await emit({ name: "tea_selected", teaSlug: "da-hong-pao", source: "list" });
    const send = (globalThis as unknown as { navigator: { sendBeacon: ReturnType<typeof vi.fn> } }).navigator.sendBeacon;
    expect(send).toHaveBeenCalledTimes(1);
    const [url, payload] = send.mock.calls[0] as [string, Blob];
    expect(url).toBe("/api/event");
    const text = await (payload as Blob).text();
    const parsed = JSON.parse(text);
    expect(parsed.name).toBe("tea_selected");
    expect(parsed.sessionId).toMatch(/^[0-9a-z]{8}$/);
  });

  it("falls back to fetch if sendBeacon unavailable", async () => {
    (globalThis as unknown as { navigator: Partial<Navigator> }).navigator = {};
    await emit({ name: "tea_selected", teaSlug: "long-jing", source: "list" });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("is a no-op when opt-out flag set", async () => {
    (globalThis as unknown as { localStorage: Storage }).localStorage.setItem("gfc:analytics-off", "1");
    await emit({ name: "tea_selected", teaSlug: "da-hong-pao", source: "list" });
    const send = (globalThis as unknown as { navigator: { sendBeacon: ReturnType<typeof vi.fn> } }).navigator.sendBeacon;
    expect(send).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("getSessionId is stable within a page lifetime", () => {
    const a = getSessionId();
    const b = getSessionId();
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-z]{8}$/);
  });
});
```

- [ ] **Step 2: Run — fails**

Run: `npx vitest run tests/analytics/emit.test.ts`
Expected: FAIL, module missing.

- [ ] **Step 3: Implement**

```ts
// src/lib/analytics/emit.ts
type Base = { teaSlug?: string };
type TeaSelected = { name: "tea_selected"; teaSlug: string; source: "list" | "ai" | "custom" };
type BrewStarted = { name: "brew_started"; teaSlug: string; leafG: number; vesselMl: number; ratioG100ml: number };
type BrewDone = { name: "brew_completed" | "brew_aborted" | "session_ended"; teaSlug: string; infusions: number; elapsedMs: number };
type AiQuery = { name: "ai_query"; latencyMs: number; source: "client" };

export type EmitPayload = TeaSelected | BrewStarted | BrewDone | AiQuery;

let sessionId: string | null = null;

function makeSessionId(): string {
  return Math.random().toString(36).slice(2, 10).padEnd(8, "0").slice(0, 8);
}

export function getSessionId(): string {
  if (!sessionId) sessionId = makeSessionId();
  return sessionId;
}

export function resetSessionForTest(): void {
  sessionId = null;
}

function isDisabled(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem("gfc:analytics-off") === "1";
  } catch {
    return false;
  }
}

export async function emit(payload: EmitPayload): Promise<void> {
  if (typeof window === "undefined") return;
  if (isDisabled()) return;
  const body = JSON.stringify({ ...payload, sessionId: getSessionId() });
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon("/api/event", new Blob([body], { type: "application/json" }));
      return;
    }
    await fetch("/api/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // analytics is best-effort; never throw into the app
  }
}
```

- [ ] **Step 4: Passes**

Run: `npx vitest run tests/analytics/emit.test.ts`
Expected: PASS, 4/4.

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics/emit.ts tests/analytics/emit.test.ts
git commit -m "feat(analytics): client emit helper with beacon fallback and opt-out"
```

---

### Task 6: Instrument tea selection in `page.tsx`

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Identify where selection changes**

Read `src/app/page.tsx` and find the state setter that updates `selectedVariantId`. Typically there is a `setSelectedVariantId(id)` call in a tap handler for the tea list and another for the AI advisor result.

- [ ] **Step 2: Add emit calls**

At the top of `page.tsx`, add:

```ts
import { emit } from "@/lib/analytics/emit";
```

Next to each `setSelectedVariantId(someSlug)` call in the list/grouped-list tap handler, add:

```ts
void emit({ name: "tea_selected", teaSlug: someSlug, source: "list" });
```

For the AI advisor result path (wherever the identified tea is passed into the brewing state), emit:

```ts
void emit({ name: "tea_selected", teaSlug: identifiedSlug, source: "ai" });
```

For custom mode (when user starts brewing from CustomMode without choosing a named tea), skip — there is no slug. (Alternatively, add a separate `custom_brew_started` event later; not in scope for v1.)

- [ ] **Step 3: Smoke test manually**

```bash
npm run dev
```

Open `http://localhost:3000`, tap a tea. Check dev-server stdout for `{"event":"tea_selected",...}`. If nothing, verify the new import compiled without error and `navigator.sendBeacon` is available in your browser (Safari/Chrome both support it).

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(analytics): emit tea_selected on tea pick"
```

---

### Task 7: Instrument BrewingTimer

**Files:**
- Modify: `src/components/BrewingTimer.tsx`
- Modify: `src/components/SessionSummary.tsx`

- [ ] **Step 1: Find the brewing lifecycle hooks**

Read `src/components/BrewingTimer.tsx`. Look for:
- The moment the first timer starts → `brew_started`
- The moment the session completes (last infusion reached or user ends) → `brew_completed` or `brew_aborted`

- [ ] **Step 2: Import and emit**

Add import:

```ts
import { emit } from "@/lib/analytics/emit";
```

At the point where the first timer fires (useEffect on mount with the initial phase or on the first `start()` call):

```ts
void emit({
  name: "brew_started",
  teaSlug: preset.slug,     // whatever the field is in the component's props
  leafG: leafGrams,
  vesselMl: vesselMl,
  ratioG100ml: (leafGrams / vesselMl) * 100,
});
```

Record session start time (`const startedAtRef = useRef(Date.now())`) so we can compute `elapsedMs`.

At the session-end handler (the confirmed "end session" tap):

```ts
void emit({
  name: "brew_aborted",
  teaSlug: preset.slug,
  infusions: completedInfusions,
  elapsedMs: Date.now() - startedAtRef.current,
});
```

At the natural completion path (final infusion reached, transitioning to SessionSummary):

```ts
void emit({
  name: "brew_completed",
  teaSlug: preset.slug,
  infusions: completedInfusions,
  elapsedMs: Date.now() - startedAtRef.current,
});
```

In `SessionSummary.tsx`, on mount emit the close-out:

```ts
useEffect(() => {
  void emit({
    name: "session_ended",
    teaSlug,
    infusions,
    elapsedMs,
  });
}, [teaSlug, infusions, elapsedMs]);
```

**Note:** `brew_completed` and `session_ended` are a pair — `brew_completed` fires when the timer finishes, `session_ended` when the summary screen is shown. They are intentionally separate so we can measure how often the summary is viewed vs skipped (future: summary skipped if user closes the tab).

- [ ] **Step 3: Smoke test manually**

Run a full brewing session in dev. Check stdout for all three events in order.

- [ ] **Step 4: Commit**

```bash
git add src/components/BrewingTimer.tsx src/components/SessionSummary.tsx
git commit -m "feat(analytics): emit brew lifecycle events"
```

---

### Task 8: Instrument AIAdvisor with client-side latency

**Files:**
- Modify: `src/components/AIAdvisor.tsx`

- [ ] **Step 1: Wrap the identify fetch with timing**

Add import:

```ts
import { emit } from "@/lib/analytics/emit";
```

Around the existing `fetch("/api/identify", ...)` call:

```ts
const started = Date.now();
const res = await fetch("/api/identify", { ... });
void emit({ name: "ai_query", latencyMs: Date.now() - started, source: "client" });
```

This captures client-observed latency (includes network), whereas the server emits its own `identify.hit` / `identify.llm` with server-side latency. The pair lets us see network vs compute cost.

- [ ] **Step 2: Smoke test**

Submit an AI query in dev; confirm both `ai_query` (browser emit → server log) and `identify.hit` or `identify.llm` lines appear.

- [ ] **Step 3: Commit**

```bash
git add src/components/AIAdvisor.tsx
git commit -m "feat(analytics): emit ai_query with client-side latency"
```

---

### Task 9: Rollup script

**Files:**
- Create: `scripts/analytics-rollup.ts`
- Create: `tests/fixtures/analytics-log.jsonl`
- Create: `tests/analytics/rollup.test.ts`

- [ ] **Step 1: Fixture**

Create `tests/fixtures/analytics-log.jsonl`:

```jsonl
{"ts":"2026-04-18T09:00:00.000Z","event":"tea_selected","sessionId":"s1000001","teaSlug":"da-hong-pao","source":"list"}
{"ts":"2026-04-18T09:00:30.000Z","event":"brew_started","sessionId":"s1000001","teaSlug":"da-hong-pao","leafG":5,"vesselMl":100,"ratioG100ml":5}
{"ts":"2026-04-18T09:10:00.000Z","event":"brew_completed","sessionId":"s1000001","teaSlug":"da-hong-pao","infusions":6,"elapsedMs":570000}
{"ts":"2026-04-18T09:10:05.000Z","event":"session_ended","sessionId":"s1000001","teaSlug":"da-hong-pao","infusions":6,"elapsedMs":575000}
{"ts":"2026-04-18T10:00:00.000Z","event":"identify.hit","queryLen":11,"query":"da hong pao","slug":"da-hong-pao","strategy":"lex","score":5.2,"latencyMs":18}
{"ts":"2026-04-18T10:01:00.000Z","event":"identify.llm","queryLen":18,"query":"moroccan mint tea","latencyMs":1420}
{"ts":"2026-04-18T10:02:00.000Z","event":"identify.rate_limited"}
{"ts":"2026-04-18T11:00:00.000Z","event":"tea_selected","sessionId":"s2000002","teaSlug":"long-jing","source":"list"}
{"ts":"2026-04-18T11:00:30.000Z","event":"brew_started","sessionId":"s2000002","teaSlug":"long-jing","leafG":3,"vesselMl":100,"ratioG100ml":3}
{"ts":"2026-04-18T11:05:00.000Z","event":"brew_aborted","sessionId":"s2000002","teaSlug":"long-jing","infusions":2,"elapsedMs":270000}
```

- [ ] **Step 2: Write the failing test**

```ts
// tests/analytics/rollup.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { rollup } from "../../scripts/analytics-rollup";

describe("rollup", () => {
  it("aggregates counts from a JSONL fixture", () => {
    const raw = readFileSync(resolve(__dirname, "../fixtures/analytics-log.jsonl"), "utf8");
    const report = rollup(raw);
    expect(report.totals.sessionsStarted).toBe(2);
    expect(report.totals.sessionsCompleted).toBe(1);
    expect(report.totals.sessionsAborted).toBe(1);
    expect(report.totals.identifyHit).toBe(1);
    expect(report.totals.identifyLlmFallback).toBe(1);
    expect(report.totals.identifyRateLimited).toBe(1);
    expect(report.topTeas[0]).toEqual({ slug: "da-hong-pao", count: 1 });
    expect(report.avgSessionMs).toBe(570000); // only completed sessions
  });

  it("produces markdown when format=markdown", () => {
    const raw = readFileSync(resolve(__dirname, "../fixtures/analytics-log.jsonl"), "utf8");
    const md = rollup(raw, { format: "markdown" }) as string;
    expect(md).toMatch(/^# Gongfucha analytics/);
    expect(md).toMatch(/Sessions completed: 1/);
    expect(md).toMatch(/da-hong-pao/);
  });
});
```

- [ ] **Step 3: Run — fails**

Run: `npx vitest run tests/analytics/rollup.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement**

```ts
// scripts/analytics-rollup.ts
export type Report = {
  totals: {
    sessionsStarted: number;
    sessionsCompleted: number;
    sessionsAborted: number;
    identifyHit: number;
    identifyLlmFallback: number;
    identifyRateLimited: number;
    identifyError: number;
  };
  topTeas: { slug: string; count: number }[];
  avgSessionMs: number;
  identifyQueries: { query: string; outcome: "hit" | "llm"; latencyMs: number }[];
};

export function rollup(jsonl: string, opts?: { format?: "json" | "markdown" }): Report | string {
  const lines = jsonl.split("\n").filter(Boolean);
  const totals: Report["totals"] = {
    sessionsStarted: 0,
    sessionsCompleted: 0,
    sessionsAborted: 0,
    identifyHit: 0,
    identifyLlmFallback: 0,
    identifyRateLimited: 0,
    identifyError: 0,
  };
  const teaCounts = new Map<string, number>();
  const completedElapsed: number[] = [];
  const queries: Report["identifyQueries"] = [];

  for (const line of lines) {
    let obj: Record<string, unknown>;
    try { obj = JSON.parse(line); } catch { continue; }
    const e = obj.event as string;
    switch (e) {
      case "brew_started":
        totals.sessionsStarted++;
        if (typeof obj.teaSlug === "string") teaCounts.set(obj.teaSlug, (teaCounts.get(obj.teaSlug) ?? 0) + 1);
        break;
      case "brew_completed":
        totals.sessionsCompleted++;
        if (typeof obj.elapsedMs === "number") completedElapsed.push(obj.elapsedMs);
        break;
      case "brew_aborted":
        totals.sessionsAborted++;
        break;
      case "identify.hit":
        totals.identifyHit++;
        queries.push({ query: String(obj.query ?? ""), outcome: "hit", latencyMs: Number(obj.latencyMs ?? 0) });
        break;
      case "identify.llm":
        totals.identifyLlmFallback++;
        queries.push({ query: String(obj.query ?? ""), outcome: "llm", latencyMs: Number(obj.latencyMs ?? 0) });
        break;
      case "identify.rate_limited":
        totals.identifyRateLimited++;
        break;
      case "identify.error":
        totals.identifyError++;
        break;
    }
  }

  const topTeas = [...teaCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([slug, count]) => ({ slug, count }));

  const avgSessionMs =
    completedElapsed.length > 0
      ? Math.round(completedElapsed.reduce((a, b) => a + b, 0) / completedElapsed.length)
      : 0;

  const report: Report = { totals, topTeas, avgSessionMs, identifyQueries: queries };

  if (opts?.format === "markdown") {
    return [
      `# Gongfucha analytics`,
      ``,
      `- Sessions started: ${totals.sessionsStarted}`,
      `- Sessions completed: ${totals.sessionsCompleted}`,
      `- Sessions aborted: ${totals.sessionsAborted}`,
      `- Avg completed session: ${Math.round(avgSessionMs / 1000)}s`,
      ``,
      `## Identify`,
      `- Corpus hits: ${totals.identifyHit}`,
      `- LLM fallbacks: ${totals.identifyLlmFallback}`,
      `- Rate-limited: ${totals.identifyRateLimited}`,
      `- Errors: ${totals.identifyError}`,
      ``,
      `## Top teas`,
      ...topTeas.slice(0, 10).map((t) => `- ${t.slug}: ${t.count}`),
      ``,
      `## Recent identify queries`,
      ...queries.slice(-20).map((q) => `- \`${q.query}\` → ${q.outcome} (${q.latencyMs}ms)`),
      ``,
    ].join("\n");
  }

  return report;
}

// CLI entry
if (require.main === module) {
  const chunks: Buffer[] = [];
  process.stdin.on("data", (c: Buffer) => chunks.push(c));
  process.stdin.on("end", () => {
    const raw = Buffer.concat(chunks).toString("utf8");
    const fmt = process.argv.includes("--json") ? "json" : "markdown";
    const out = rollup(raw, { format: fmt as "json" | "markdown" });
    process.stdout.write(typeof out === "string" ? out : JSON.stringify(out, null, 2));
  });
}
```

- [ ] **Step 5: Passes**

Run: `npx vitest run tests/analytics/rollup.test.ts`
Expected: PASS, 2/2.

- [ ] **Step 6: Add package.json script**

Edit `package.json` — add to `scripts`:

```json
"analytics:rollup": "tsx scripts/analytics-rollup.ts"
```

- [ ] **Step 7: Manual verification with fixture**

```bash
cat tests/fixtures/analytics-log.jsonl | npm run analytics:rollup
```

Expected: markdown report printed to stdout.

- [ ] **Step 8: Commit**

```bash
git add scripts/analytics-rollup.ts tests/analytics/rollup.test.ts tests/fixtures/analytics-log.jsonl package.json
git commit -m "feat(analytics): rollup script aggregates JSONL into markdown report"
```

---

### Task 10: GoAccess traffic report script

**Files:**
- Create: `scripts/goaccess-report.sh`

- [ ] **Step 1: Write the script**

```bash
#!/usr/bin/env bash
# scripts/goaccess-report.sh — pull nginx logs from webserve and generate a GoAccess HTML report.
# Usage: ./scripts/goaccess-report.sh [days]
set -euo pipefail

DAYS="${1:-30}"
HOST="webserve"
REMOTE_LOG="/var/log/nginx/access.log"
OUT_DIR="$(pwd)/docs/analytics-reports"
OUT_FILE="${OUT_DIR}/gongfucha-$(date +%Y-%m-%d).html"

if ! command -v goaccess >/dev/null 2>&1; then
  echo "goaccess not installed. Run: brew install goaccess" >&2
  exit 1
fi

mkdir -p "${OUT_DIR}"

# Pull the current + rotated logs, stream through goaccess
ssh "${HOST}" "sudo zcat -f ${REMOTE_LOG}* | tail -n 200000" \
  | goaccess \
      --log-format=COMBINED \
      --ignore-crawlers \
      --restore \
      --persist \
      --db-path="${OUT_DIR}/.gacache" \
      -o "${OUT_FILE}" \
      -

echo "Report written to ${OUT_FILE}"
open "${OUT_FILE}"
```

- [ ] **Step 2: Make executable**

```bash
chmod +x scripts/goaccess-report.sh
```

- [ ] **Step 3: Add package.json script**

Edit `package.json`:

```json
"analytics:report": "bash scripts/goaccess-report.sh"
```

- [ ] **Step 4: Verify requirements on laptop**

```bash
command -v goaccess || brew install goaccess
ssh webserve 'echo ok'
```

- [ ] **Step 5: Dry run**

```bash
npm run analytics:report
```

Expected: HTML file written to `docs/analytics-reports/gongfucha-YYYY-MM-DD.html` and opened in browser.

- [ ] **Step 6: Add output dir to `.gitignore`**

Edit `.gitignore`, add:

```
docs/analytics-reports/
```

- [ ] **Step 7: Commit**

```bash
git add scripts/goaccess-report.sh package.json .gitignore
git commit -m "feat(analytics): GoAccess nginx log report script"
```

---

### Task 11: VPS log rotation caps

**Not a code commit — documented as a runbook step.**

On the VPS, edit `/home/servaaja/apps/gongfucha/docker-compose.yml`, add to the `app` service:

```yaml
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"
```

And to the `qdrant` service:

```yaml
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

Then:

```bash
ssh webserve
cd /home/servaaja/apps/gongfucha
docker compose up -d
```

Verify:

```bash
docker inspect gongfucha-app-1 | grep -A3 LogConfig
```

Expected: `max-size: 10m`, `max-file: 5`.

**Commit is on the VPS-local compose file only** (not this repo) — that file has been documented as VPS-local in `docs/2026-04-10-go-live.md:20`.

---

### Task 12: Nginx rate limit for `/api/event`

**Runbook step, not in repo.**

On the VPS, edit `/etc/nginx/sites-available/gongfucha.app`. In the `http` context (or reuse the existing zone file), add:

```nginx
limit_req_zone $binary_remote_addr zone=gongfucha_event:10m rate=30r/m;
```

Inside the `server { ... }` block:

```nginx
location = /api/event {
    limit_req zone=gongfucha_event burst=10 nodelay;
    limit_req_status 429;
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Real-IP $remote_addr;
}
```

Test config and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Verify:

```bash
for i in $(seq 1 50); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST https://gongfucha.app/api/event \
    -H "content-type: application/json" \
    -d '{"name":"tea_selected","sessionId":"a1b2c3d4","teaSlug":"da-hong-pao","source":"list"}'
done | sort | uniq -c
```

Expected: mostly `204` then `429` after burst exhausted.

---

### Task 13: Documentation

**Files:**
- Create: `docs/analytics.md`
- Modify: `docs/security-audit.md`

- [ ] **Step 1: Write `docs/analytics.md`**

```markdown
# Analytics

Gongfucha's analytics is self-hosted, cookie-free, and keeps every byte on infrastructure we already run.

## What gets collected

### Traffic (nginx access log)
- Path, status code, bytes, referer, user agent — whatever the `COMBINED` log format captures.
- IP is present in the log for rate-limit diagnostics. Logs rotate on the VPS at 14 days.
- We do **not** enrich, geocode, or export. GoAccess reads them locally on Pekka's laptop.

### Product events (`/api/event`, client-emitted)
Allow-list in `src/lib/analytics/schema.ts`:

| Event | Fields | When |
|---|---|---|
| `tea_selected` | `teaSlug`, `source` (`list`|`ai`|`custom`) | User taps a tea to expand or AI returns a tea |
| `brew_started` | `teaSlug`, `leafG`, `vesselMl`, `ratioG100ml` | First timer fires |
| `brew_completed` | `teaSlug`, `infusions`, `elapsedMs` | Final infusion reached |
| `brew_aborted` | `teaSlug`, `infusions`, `elapsedMs` | User confirms "end session" before completion |
| `session_ended` | `teaSlug`, `infusions`, `elapsedMs` | SessionSummary mounts |
| `ai_query` | `latencyMs`, `source: "client"` | Client-observed latency for `/api/identify` call |

Every event also carries a short `sessionId` — random 8-char base36, **in-memory only**, regenerated on every reload. It cannot link visits.

### Server-emitted (from `/api/identify`)
| Event | Fields |
|---|---|
| `identify.hit` | `query`, `queryLen`, `slug`, `strategy`, `score`, `latencyMs` |
| `identify.llm` | `query`, `queryLen`, `latencyMs` |
| `identify.rate_limited` | — |
| `identify.invalid` | `reason` |
| `identify.error` | `stage` |

Raw queries **are** logged — they are the product's most valuable signal (drives RAG eval). Every other event uses enum-validated fields only.

## What we never collect

- Cookies
- Cross-session IDs / fingerprints
- User accounts (there are none)
- Email, name, location, device model beyond the nginx log
- Free-text anywhere except identify queries

## Opt out

```js
localStorage.setItem("gfc:analytics-off", "1");
```

No banner. This is documented here and in the repo README.

## Retention

- Nginx logs on VPS: 14 days (default logrotate)
- Docker json-file logs on VPS: 5 files × 10 MB per service (≈ 50 MB), rotated in-place
- Local reports (GoAccess HTML, rollup markdown): on Pekka's laptop, not synced

## How to read it

### Traffic
```bash
npm run analytics:report
```

Pulls nginx logs via SSH, generates HTML, opens it.

### Product + RAG
```bash
ssh webserve 'docker logs --since 30d gongfucha-app-1 2>&1 | grep "^{"' \
  | npm run analytics:rollup
```

Pipes JSONL events from Docker through the rollup script into a markdown summary.
```

- [ ] **Step 2: Update `docs/security-audit.md`**

In the rate-limited-routes section near line 93, add a row for `/api/event`:

| Route | Zone | Rate | Burst | Notes |
|---|---|---|---|---|
| `/api/event` | `gongfucha_event` | 30r/m | 10 | Product telemetry, strict event schema, 204 on success |

- [ ] **Step 3: Commit**

```bash
git add docs/analytics.md docs/security-audit.md
git commit -m "docs: document analytics stack, schema, retention, and opt-out"
```

---

## Verification checklist (run top-to-bottom before calling done)

- [ ] `npx vitest run` — all analytics tests pass
- [ ] `npm run build` — no type errors
- [ ] `npm run dev` — submitting a tea, running a brew, using AI advisor all emit events to dev stdout
- [ ] `/api/event` rejects an invalid body with 400 (manual curl)
- [ ] `/api/event` returns 429 after ~30 rapid posts (manual curl)
- [ ] Opt-out flag in localStorage silences all client emits (manual inspection in DevTools → Network)
- [ ] `npm run analytics:rollup` produces valid markdown against the fixture
- [ ] `npm run analytics:report` produces a GoAccess HTML report from the live VPS logs
- [ ] VPS Docker log rotation caps are in effect: `docker inspect gongfucha-app-1 | grep -A3 LogConfig`
- [ ] VPS nginx rate limit fires for `/api/event`: `429`s appear after burst
- [ ] `docs/analytics.md` lists every event, every field, retention
- [ ] `docs/security-audit.md` mentions `/api/event`

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Logs fill VPS disk | Docker `max-size: 10m, max-file: 5` (Task 11); nginx logrotate default 14d |
| Event schema drift silently accepts PII | Strict allow-list + "unknown field" rejection + unit tests |
| Client emit blocks UI if slow | `sendBeacon` is non-blocking; `fetch` fallback uses `keepalive: true`; all wrapped in try/catch |
| Adblockers block `/api/event` | Self-hosted path is rarely blocked; loss is acceptable |
| Identify query log contains sensitive text | Documented in `docs/analytics.md`; users warned by nature of AI-query feature; 200-char cap already in place |
| Rate-limit bypass via spoofed `x-forwarded-for` | Defense-in-depth: nginx limits by `$binary_remote_addr` (real IP), the in-process limiter is secondary |
| Tests rely on `console.log` spy and a future change uses `process.stdout.write` | Low risk; if it happens, update the spy |

---

## Rollback

Every task is a separate commit. To back out:

```bash
git revert <commit-hash>
```

For VPS-side changes:
- Remove `logging` block from `docker-compose.yml` and `docker compose up -d`
- Remove `limit_req` lines from nginx vhost and `systemctl reload nginx`

No data migration, no state to unwind.

---

## Open question — please decide before execution

**Should identify queries be logged in full or hashed?**
- Full: best for RAG eval, matches project goal of improving retrieval from real queries. Cost: queries can contain anything the user types, including PII if they choose.
- Hashed (SHA-1 first 8 chars): unique-query count and hit-rate analysis still work. Cost: cannot see the query text, so RAG eval loses its most valuable input.

Recommendation: **log in full**, note it in `docs/analytics.md`, rely on the 200-char cap. The whole purpose of this endpoint is to let the user type free text into a tea-identification box; they have already consented to that text being processed server-side.

Confirm before Task 4.
