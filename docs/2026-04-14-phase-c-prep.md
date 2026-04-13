# Phase C deploy prep — 2026-04-14

Notes for shipping the Phase B SEO routes to production. Companion to
`~/.claude/plans/nifty-chasing-nest.md` Phase C and to `docs/2026-04-10-go-live.md`.

## Gate 9 — nginx audit

**Result: no nginx changes required.**

Reasoning: per `docs/security-audit.md`, the gongfucha.app vhost on the Hetzner
host has two location blocks:

```nginx
location = /api/identify { limit_req ...; proxy_pass http://127.0.0.1:3000; }
location /                { proxy_pass http://127.0.0.1:3000; }
```

The catch-all `location /` already proxies every path to the container, so
the new routes flow through with no edit:

- `/tea/*` (84 SSG)
- `/category/*` (6 SSG)
- `/teas`
- `/brewing` (already exists from Phase A)
- `/about/methodology` (already exists from Phase A)
- `/sitemap.xml`
- `/robots.txt`

`/corpus` is intentionally returning `notFound()` until the open-source
GitHub repo is live — see `src/app/corpus/page.tsx`. It is omitted from
`sitemap.ts` for the same reason.

**One thing to verify post-deploy** (Gate 10): a curl as Googlebot should
return rendered HTML, not the homepage app shell.

```bash
curl -A "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" \
  https://gongfucha.app/tea/da-hong-pao | grep -c "TechArticle"
# Expected: 1 (the JSON-LD line). If 0, the SW v1 → v2 migration didn't
# take on that client and stale shell is being served.
```

If stale-shell HTML is served to crawlers, the SW fix in `public/sw.js`
(CACHE_NAME bumped to `gongfucha-v2`, navigation requests now network-first)
needs the deploy to land before the activate handler clears v1.

## Service worker migration note

`public/sw.js` was rewritten in Phase B. Existing PWA-installed users on
v1 will:

1. Pull the new sw.js on next page load (browsers always re-check the SW
   script, ignoring HTTP cache).
2. Run the v2 install handler, which precaches the static allowlist.
3. Run v2 activate, which deletes the v1 cache.
4. From then on, navigation requests bypass the cache entirely.

There is **no offline fallback** for navigation requests in v2 — if the
user is offline and hits a tea page, they get `Response.error()`. This is
correct: serving stale app-shell HTML to crawlers was the bug we are fixing,
and that exact behaviour was the only thing the v1 cache fallback provided
for navigation. The PWA still works offline for the homepage on a hot SW
because Next pre-renders it; refresh of an SSG route while offline now
fails cleanly instead of showing stale content.

## What to run on prod after deploy (Gate 10)

```bash
# Reachability + content type
curl -I https://gongfucha.app/sitemap.xml          # 200, application/xml
curl -I https://gongfucha.app/robots.txt           # 200, text/plain
curl -I https://gongfucha.app/tea/da-hong-pao      # 200, text/html
curl -I https://gongfucha.app/category/oolong      # 200
curl -I https://gongfucha.app/teas                 # 200

# Stale-shell test (most important)
curl -s -A "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" \
  https://gongfucha.app/tea/long-jing | grep -o '"@type":"TechArticle"'
# Expected: "@type":"TechArticle"

# Sitemap URL count
curl -s https://gongfucha.app/sitemap.xml | grep -c "<url>"
# Expected: 94
```

## What was deferred / not run from Claude's environment

- **CWV / Lighthouse field data (Gate 8 partial).** I cannot reach
  PageSpeed Insights from this session. Run after deploy:
  `https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fgongfucha.app%2Ftea%2Fda-hong-pao`
  Targets per plan: LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1, SEO = 100.
- **Rich Results Test.** Paste `https://gongfucha.app/tea/da-hong-pao`
  into `https://search.google.com/test/rich-results` after deploy. Expected
  parses: `TechArticle`, `BreadcrumbList`. Also test `/brewing` (Article)
  and `/category/oolong` (Article + CollectionPage).
- **Search Console (C.3).** Submit sitemap, request indexing for the
  crown jewel pages: `/brewing`, `/teas`, `/tea/da-hong-pao`,
  `/category/oolong`, `/about/methodology`.

## Wikidata sparseness

`src/data/corpus/wikidata.ts` is intentionally sparse (5 verified entries:
da-hong-pao, long-jing, tie-guan-yin, sheng-pu-erh, shou-pu-erh). Per the
plan: "honesty over coverage." The remaining 79 entries will get `sameAs`
when verified, not before. No tooling debt — just add to the map.
