# Security Audit — gongfucha.app

**Date:** 2026-04-11
**Trigger:** Making the GitHub repository public.
**Author:** Pekka Setälä (with Claude).
**Scope:** Everything the repo ships, the public endpoint surface, and the infrastructure that serves the app.

---

## TL;DR

**One thing blocks making the repo public.** Everything else is defense-in-depth.

> **P0 blocker:** `/api/identify` has no rate limiting. The moment the repo is public, anyone can read the endpoint from the source, write a trivial `curl` loop, and drain your OpenRouter balance overnight. *This is the single concrete harm that flipping the repo visibility creates.*

Everything in this document other than Finding 1 should be fixed — but none of the rest are made meaningfully worse by public source code. They were always latent.

**Go-live order:**
1. Fix P0.
2. Add security headers (P1 — missing entirely in production).
3. Add the remaining P1 items (LLM timeout, dev-dep CVE, header cleanup).
4. Make the repo public.
5. P2 items can land post-flip.

---

## Ground truth collected during the audit

All of the following were verified directly, not assumed:

| Check | Method | Result |
|---|---|---|
| Secrets in HEAD | Regex scan on every tracked file | **Clean** — no API keys, tokens, or private keys |
| Secrets in git history | `git log -p -S 'sk-or-v1'` across all 129 commits; `git log --all -p -- .env .env.local` | **Clean** — no .env ever committed, no key ever appeared in any diff |
| Production security headers | `curl -sI https://gongfucha.app` (full headers) | **None set** — no HSTS, no CSP, no X-Frame-Options, no X-Content-Type-Options, no Referrer-Policy, no Permissions-Policy |
| `X-Powered-By` leak | Same `curl -sI` | Present: `X-Powered-By: Next.js` |
| Server version leak | Same `curl -sI` | Present: `Server: nginx/1.24.0 (Ubuntu)` |
| `dangerouslySetInnerHTML` usage | Grep across `src/` | **Zero hits** — no React XSS surface from that vector |
| Dependency CVEs | `npm audit --json` | 1 high-severity in `vite` (transitive dev-dep via vitest); 0 in production deps |
| Qdrant fetch timeout | Read `src/lib/rag/qdrant.ts:83` | Present: `AbortSignal.timeout(5000)` |
| OpenRouter fetch timeout | Read `src/app/api/identify/route.ts:73–92` | **Missing** — no `AbortSignal.timeout` or equivalent |
| Query length cap | Read `route.ts:136` | Present: 500 char limit, non-string rejected |
| LLM response validation | Read `route.ts:108–129` | Numeric fields clamped; string fields `String()`-coerced; `categoryId` not whitelisted |
| Non-root in Docker | Read `Dockerfile:16–20` | Present: dedicated `app:app` user |

---

## Ranked findings

| # | Severity | Area | Finding | Blocks public repo? |
|---|---|---|---|---|
| **1** | **P0 — Critical** | `/api/identify` | No rate limiting. Public-repo exposure turns this into cost-drain attack vector. | **YES** |
| 2 | P1 — High | HTTP headers | Zero security headers in production (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) | No, but fix before flip |
| 3 | P1 — High | `/api/identify` | No timeout on OpenRouter fetch — hanging upstream ties up the function indefinitely. Amplifies Finding 1. | No, but fix before flip |
| 4 | P1 — Medium | Dependencies | `vite@8.0.0–8.0.4` has 3 CVEs (high) via `vitest → vite`. Dev-dep only, not in production bundle, but present in the public `package-lock.json`. | No, but fix before flip |
| 5 | P1 — Medium | Documentation | `docs/2026-04-10-go-live.md` describes a Caddy-based setup with security headers. Production actually runs nginx with none of those headers. The public repo would ship a misleading runbook. | No, but fix before flip |
| 6 | P2 — Low | HTTP headers | `X-Powered-By: Next.js` and `Server: nginx/1.24.0 (Ubuntu)` leak stack/version info. Low impact; fingerprinting defense only. | No |
| 7 | P2 — Low | `/api/identify` | `categoryId` returned from the LLM is passed to the client without whitelist validation. Worst case is a broken UI lookup, not a security issue. | No |
| 8 | P2 — Low | `/api/identify` | `console.warn` on RAG failure leaks error text to server logs only. Not sensitive, but logs on the VPS should be reviewed for log-injection potential. | No |
| 9 | P2 — Low | CORS | No CORS headers set. Browser-origin cross-site POSTs are preflight-blocked by default, so this is not a vulnerability — just noted for completeness. | No |
| 10 | P2 — Low | Dockerfile | Base image `node:22-slim` floats (not digest-pinned); no `HEALTHCHECK` directive | No |
| 11 | P2 — Low | Dockerfile | `npm ci` in `deps` stage pulls dev dependencies. Harmless because the runner stage only copies `.next/standalone` (self-contained, no `node_modules`), but extra build-time attack surface. | No |

### Explicitly **not** findings — downgraded on review

These came up during scoping but the audit concluded they are not exploitable or meaningfully improvable:

- **Prompt injection** into the LLM system prompt. The LLM response is JSON-parsed; every numeric field is clamped to a valid range (`route.ts:108–115`); string fields are `String()`-coerced; React auto-escapes on render. Worst case: wrong brewing parameters get shown. That's a UX bug, not a security exploit. Not a finding.
- **XSS on LLM-returned strings.** No `dangerouslySetInnerHTML` anywhere in `src/`. React escapes all rendered text by default. Not a finding.
- **Missing CORS.** For cross-origin browser attacks, the absence of an `Access-Control-Allow-Origin` header is a *feature* — it blocks cross-site XHR by default. For non-browser attackers (curl, scripts, bots), CORS is irrelevant. The real mitigation for non-browser abuse is rate limiting, not CORS. Not a finding.
- **`.claude/` directory exposure.** Verified via `git ls-files` to be untracked. Not a finding.

---

## Detailed findings and fixes

### P0 — Finding 1: Rate limiting on `/api/identify`

**Current state:** `route.ts:132–173` validates input length but has no request rate control. A naive script hitting the endpoint in a loop triggers uncapped OpenRouter calls (each one costs money) until the OpenRouter key hits its per-minute or per-day limit.

**Threat model:**
- Public-source actor writes `while true; curl -X POST https://gongfucha.app/api/identify -d '{"query":"x"}'; done`.
- At ~2 req/s and ~$0.0001 per LLM call (gpt-4o-mini input), 100k unique queries overnight ≈ $10 direct cost. Higher with a worse model.
- Cost is the concrete harm. No data is exfiltrated, no system is compromised — the attacker just burns your OpenRouter balance.

**Fix:** IP-based rate limit **in front of the Next.js function**, not inside it. Two realistic options:

**Option A — nginx `limit_req` (recommended).**
Add a `limit_req_zone` + `limit_req` directive to the gongfucha.app vhost on the VPS. Shared state is free, no new code, survives function cold-starts, and rejects at the edge before the request hits Node. Example:

```nginx
# In /etc/nginx/nginx.conf http { } block:
limit_req_zone $binary_remote_addr zone=gongfucha_api:10m rate=10r/m;

# In /etc/nginx/sites-available/gongfucha vhost, inside server { }:
location = /api/identify {
    limit_req zone=gongfucha_api burst=5 nodelay;
    limit_req_status 429;
    proxy_pass http://127.0.0.1:3000;
    # ... existing proxy headers
}
```

10 req/min per IP with a burst of 5 is generous for a human user (one brew session = a few queries at most) and destroys the economics of a scripted attack.

**Option B — Application-level (fallback if nginx change is too invasive):**
Add an in-memory sliding-window limiter inside the route handler keyed on `request.headers.get("x-forwarded-for")`. Works, but: loses state on container restart, doesn't help if multiple app replicas are ever added, costs Node CPU per-request. Use only if nginx can't be modified for some reason.

**Recommendation:** Option A. Single edit to one nginx config file, `nginx -t && systemctl reload nginx`, done.

**Verification:**
```bash
# Should succeed rapidly up to burst size, then 429:
for i in $(seq 1 20); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://gongfucha.app/api/identify \
    -H 'Content-Type: application/json' \
    -d '{"query":"da hong pao"}'
done
# Expected: first ~15 succeed (10 rate + 5 burst), rest return 429.
```

---

### P1 — Finding 2: Missing security headers

**Current state:** `curl -sI https://gongfucha.app` shows zero security headers in the response.

**Fix:** Set them in the nginx vhost (they apply to both static and dynamic routes, avoid the "did I set them in Next.js headers()?" foot-gun, and match whatever `selkokielelle.fi` uses so the box is consistent).

Minimum set:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header X-Frame-Options "DENY" always;
```

**Not setting CSP yet** — CSP requires careful work (Next.js inlines scripts for hydration, Tailwind v4 has specific needs, the service worker has its own) and a misconfigured CSP breaks the app silently. CSP belongs in a dedicated follow-up pass, not this audit.

**Verification:**
```bash
curl -sI https://gongfucha.app | grep -Ei 'strict-transport|content-type-options|referrer|permissions|frame-options'
# All five headers should appear.
```

---

### P1 — Finding 3: OpenRouter fetch has no timeout

**Current state:** `route.ts:73` calls `fetch("https://openrouter.ai/...")` with no `signal`/timeout. If OpenRouter hangs, so does the function, indefinitely.

**Combined risk:** Without rate limiting (Finding 1), an attacker who can trigger slow LLM responses ties up multiple concurrent function invocations, turning cost-drain into a soft-DoS. Even after Finding 1 is fixed, a legitimately slow LLM response still blocks one function slot for as long as OpenRouter takes.

**Fix:** Add an `AbortSignal.timeout(15_000)` to the fetch — match the `max_tokens: 400` + `temperature: 0.3` expected latency with a generous ceiling.

```ts
const response = await fetch(
  "https://openrouter.ai/api/v1/chat/completions",
  {
    method: "POST",
    headers: { ... },
    body: JSON.stringify({ ... }),
    signal: AbortSignal.timeout(15_000),
  }
);
```

Match `qdrant.ts:83` pattern — same primitive already in use.

**Verification:** Unit test with a mocked `fetch` that never resolves; assert the route returns an error within ~15s.

---

### P1 — Finding 4: `vite` high-severity CVE (dev-dep)

**Current state:** `npm audit` reports `vite@8.0.0–8.0.4` pulled via `vitest`. Three advisories:
- `GHSA-4w7w-66w2-5vf9` — path traversal in optimized deps `.map` handling (moderate)
- `GHSA-v2wj-q39q-566r` — `server.fs.deny` bypassed (high)
- `GHSA-p9ff-h696-f583` — arbitrary file read via dev server WebSocket (high)

All three only affect the Vite **dev server** (`vitest` runs tests via a Vite dev server in-process). None reach production — the runner Docker image never executes `vitest`, and the `.next/standalone` bundle doesn't include Vite.

**Public-repo impact:** The CVEs show up in a `npm audit` run against the public `package-lock.json`. Not exploitable remotely, but a "badge-shopper" viewing the repo on GitHub will see a security alert. Worth fixing for reputational reasons alone.

**Fix:**
```bash
npm audit fix
# Should bump vite to ≥8.0.5 transitively via vitest.
```

If `vitest` hasn't cut a release that pulls the patched vite, run `npm audit fix --force` only after reviewing the proposed major-version bumps. Do not accept a major-version bump of vitest without a local test-suite run.

**Verification:**
```bash
npm audit --json | grep -c '"severity": "high"'
# Should return 0.
npx vitest run
# Must stay green — 55 passed, 4 skipped.
```

---

### P1 — Finding 5: Go-live runbook describes Caddy; production uses nginx

**Current state:** `docs/2026-04-10-go-live.md` (just committed) describes:
- A Caddy reverse proxy (§ Architecture, § Phase 2.4)
- Security headers set in a `Caddyfile`
- `caddy` as one of three compose services

Actual production:
- nginx reverse proxy (confirmed via `curl -sI` → `Server: nginx/1.24.0`)
- No security headers currently set
- `docker compose ps` on the VPS shows two services: `app` and `qdrant`. No `caddy`.

**Public-repo impact:** A reader of the public repo gets a misleading architecture picture. Worse, if the reader is *you in six months*, you'd assume the headers are set.

**Fix:** Add a short "Actual production" section to the runbook noting the Caddy plan was superseded by using the existing host nginx (shared with selkokielelle.fi), and that the security headers described in the Caddyfile need to be added to the nginx vhost instead (which Finding 2 does). Cross-link Finding 2's nginx edit as the canonical source.

Alternative: rewrite the runbook entirely to match reality. The minimal "add a note" version is lower-effort for equal truth value; pick based on how much energy you have.

**Verification:** Re-read the doc as if you were a stranger. Does it tell you what actually runs in production? If yes, done.

---

### P2 findings — fix post-flip, or accept

Briefly, for completeness. None of these block a public repo.

**Finding 6 — Header leaks.** Remove `X-Powered-By` via `poweredByHeader: false` in `next.config.ts`. Suppress nginx server version via `server_tokens off;` in the main nginx config. Both are one-liners.

**Finding 7 — `categoryId` not whitelisted.** Add `const VALID_CATEGORIES = ["green","white","oolong","puerh","black"] as const;` and validate in `llmFallback()`. Not a security fix; it's a UX robustness fix that also happens to reduce trust in LLM output. Worth doing.

**Finding 8 — Log review.** On the VPS, `docker compose logs app | grep -Ei 'error|warn' | head` and confirm nothing sensitive is being logged per-request. Quick check, no code change.

**Finding 9 — CORS.** Non-finding; see "Explicitly not findings" above.

**Finding 10 — Dockerfile hardening.** Pin `node:22-slim` to a specific digest, add a `HEALTHCHECK` that curls `127.0.0.1:3000`. Non-urgent. Digest pinning helps supply-chain reproducibility; healthcheck helps Compose detect a stuck container.

**Finding 11 — Multi-stage dev-deps.** Acceptable as-is. The runner stage is self-contained via Next.js standalone output, so dev deps don't reach runtime. Only matters if the build stage itself were compromised.

---

## Implementation order

Execute top-to-bottom. Each step has its own commit and is independently verifiable.

### Step 1 — Fix Finding 3 (LLM timeout) — 5 min

Pure code change, no infra touch. Do this first because it's reversible and unblocks the rest of the mental model.

- Edit `src/app/api/identify/route.ts` to add `signal: AbortSignal.timeout(15_000)` to the OpenRouter fetch.
- Add a Vitest unit test that mocks `fetch` to never resolve; assert a 500 is returned within ~16s.
- `npx vitest run && npm run lint && npm run build`.
- Commit: `fix(api): add 15s timeout to OpenRouter fetch`.

### Step 2 — Fix Finding 4 (dev-dep CVE) — 5 min

- `npm audit fix`.
- Review the resulting diff in `package-lock.json` — no major-version bumps of vitest, please.
- `npx vitest run` — must stay at 55 passed / 4 skipped.
- Commit: `chore: bump vite via vitest to patch GHSA-v2wj-q39q-566r`.

### Step 3 — Fix Finding 1 (rate limiting) — 15 min

This is the P0 blocker. Touches production infrastructure.

- SSH into `webserve`.
- Locate the gongfucha nginx vhost. Likely `/etc/nginx/sites-available/gongfucha` or similar; confirm with `sudo nginx -T | grep -B2 gongfucha.app`.
- Add `limit_req_zone` to the main `http { }` block (once per box — check it doesn't already exist for selkokielelle).
- Add `limit_req` to a new `location = /api/identify` block in the gongfucha vhost.
- `sudo nginx -t` → must say "syntax is ok".
- `sudo systemctl reload nginx`.
- Run the verification `for` loop from above and confirm 429s appear.
- **Commit the nginx config change** if the host keeps its nginx config in a repo (check `/etc/nginx` for a `.git` directory). If not, at least `sudo cp /etc/nginx/sites-available/gongfucha /etc/nginx/sites-available/gongfucha.bak.$(date +%F)`.

### Step 4 — Fix Finding 2 (security headers) — 5 min

Continues the same nginx edit session as Step 3.

- In the same vhost, add the five `add_header` lines inside `server { }`.
- `sudo nginx -t && sudo systemctl reload nginx`.
- Verify with `curl -sI https://gongfucha.app | grep -Ei 'strict-transport|content-type-options|referrer|permissions|frame-options'`.
- All five must be present.

### Step 5 — Fix Finding 5 (runbook) — 5 min

- Edit `docs/2026-04-10-go-live.md` to add an "Actual production" section noting the nginx-not-Caddy reality, point at the nginx vhost location, and cross-link this audit doc.
- Commit: `docs: reconcile go-live runbook with actual nginx production setup`.
- Push.

### Step 6 — Final sanity sweep — 5 min

Run the full verification checklist below. Every line must pass.

### Step 7 — Flip the repo to public — 30 seconds

Only after the verification checklist is 100% green.

```
GitHub → Settings → General → Danger Zone → Change repository visibility → Make public.
```

---

## Verification checklist

Run top-to-bottom before flipping. Zero skips.

**Repo hygiene**
- [ ] `git ls-files | grep -E '\\.env($|\\.)|files\\.zip'` returns nothing.
- [ ] `npm audit --json` shows zero high/critical in `prod` deps (dev is OK post-fix).
- [ ] `git log --all -p -S 'sk-or-v1' | head` is empty.
- [ ] README does not reference any internal path, hostname, or personal detail you don't want public.
- [ ] `CLAUDE.md` has been re-read with "public repo" eyes. (The current version references Hetzner, `/home/servaaja/...`, `selkokielelle.fi` — all fine; no secrets.)
- [ ] The go-live runbook is internally consistent with actual production (Finding 5 fixed).

**Code changes**
- [ ] `npx vitest run` → 55 passed / 4 skipped (or higher if new tests added for Finding 3).
- [ ] `npm run lint` → clean.
- [ ] `npm run build` → clean.
- [ ] OpenRouter fetch in `route.ts` has `AbortSignal.timeout`.

**Production infrastructure**
- [ ] `curl -sI https://gongfucha.app` shows all five security headers.
- [ ] Rate-limit verification loop returns 429s after the burst.
- [ ] `ssh webserve 'sudo nginx -t'` → syntax is ok.
- [ ] `ssh webserve 'docker compose -f /home/servaaja/apps/gongfucha/docker-compose.yml ps'` → both `app` and `qdrant` are `Up`.
- [ ] `ssh webserve 'sudo ufw status'` → only 22, 80, 443 open (sanity, not audit-blocking).
- [ ] `curl https://gongfucha.app` in a browser — app still works end-to-end: pick tea → brew → AI identify. (Catches misconfiguration from the nginx edits.)

---

## Rollback plan

**If nginx changes break the site:**
```
ssh webserve
sudo cp /etc/nginx/sites-available/gongfucha.bak.<date> /etc/nginx/sites-available/gongfucha
sudo nginx -t && sudo systemctl reload nginx
```

**If the code change (Finding 3) causes issues:** it's a single-line revert, plus re-deploy via `git reset --hard <prev> && docker compose up -d --build app` on the VPS.

**If the `vite` bump breaks tests:** revert the lockfile change, leave the CVE in place, flip to public anyway. The CVE is dev-only; reputational concern is real but not a launch-blocker.

---

## Post-flip monitoring

First 48 hours after the repo goes public:

- Check OpenRouter usage dashboard once on day one, once on day two. If cost spikes, tighten the nginx `rate=10r/m` to `rate=5r/m`.
- Watch `docker compose logs app | grep -i 'openrouter\\|429\\|rate'` on the VPS occasionally.
- Check GitHub repo insights for unusual traffic patterns.

No alerting needed — manual spot checks are proportionate for a solo portfolio project at this scale.

---

## What this audit deliberately does not cover

- **Database and corpus integrity.** Qdrant is localhost-bound; re-indexable from repo in ~30s. Not a security concern.
- **CSP.** Requires dedicated follow-up pass. Out of scope here.
- **Backups.** Corpus is in-repo. Qdrant data is reproducible. No user data exists. Not a scope expansion.
- **DDoS at the transport layer.** The CX22 VPS will fall over at ~1k req/s regardless of any app-level protection. Accepted risk for a portfolio project on a €4.50/mo box. If this becomes a problem, put Cloudflare in front and call it a day.
- **Secret rotation discipline.** Out of scope; tracked separately by user.
- **Compliance (GDPR, etc.).** No user accounts, no tracking, no cookies except Next's own. No compliance surface.

---

## Appendix: commands used to produce this audit

```bash
# Repo scan
git ls-files | xargs -0 grep -lE 'sk-or-[A-Za-z0-9]|sk-proj-|sk-ant-|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{20}|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY' 2>/dev/null
git log --all -p -S 'sk-or-v1' | head
git log --all --full-history -p -- .env .env.local | head

# Dependency check
npm audit --json

# Runtime check
curl -sI https://gongfucha.app

# Code smell check
grep -r dangerouslySetInnerHTML src/

# Infrastructure sanity
ssh webserve "cd /home/servaaja/apps/gongfucha && docker compose ps"
```
