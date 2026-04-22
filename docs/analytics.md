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

Raw queries to `/api/identify` are logged for RAG evaluation. Pull with `./scripts/identify-queries.sh [days]`.

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
