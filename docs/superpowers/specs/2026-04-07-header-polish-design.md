# Header Polish — Design Spec

## Overview

Polish the app header with three changes: a 功夫茶 watermark behind the header area, rotating time-aware headlines replacing the static "What are we brewing?", and a richer pool of weather mood expressions.

## 1. 功夫茶 Watermark

A large, faint rendering of 功夫茶 behind the header area — decorative texture, not readable text.

**Positioning:**
- Noto Serif SC (already loaded), ~120–140px font size
- Opacity 0.045–0.06, tuned by eye against the existing paper texture (0.03)
- Rotated 2–3° counter-clockwise
- Bleeds off the left edge of the viewport — cropped, not fully visible
- Vertically centered on the header area
- `pointer-events: none`, `user-select: none`, `aria-hidden="true"`

**Why tilted and cropped:** A perfectly aligned watermark reads as a layout element. Tilted and bleeding off-edge reads as a seal impression — handmade, not templated.

**Implementation:** CSS `::after` pseudo-element on the `<header>`, or a dedicated `<span>` with absolute positioning. No new font load required.

## 2. Rotating Headlines

Replace the static "What are we brewing?" with a pool of ~20–25 lines, selected per visit.

### Selection logic

- On mount, pick a line based on `Date.now()` floored to a session-granularity seed (e.g., timestamp rounded to 30-minute windows, so reopening quickly gives the same line)
- Filter by time band before selecting:
  - **Morning** (5:00–11:59): morning-tagged + anytime lines
  - **Afternoon** (12:00–16:59): afternoon-tagged + anytime lines
  - **Evening** (17:00–4:59): evening-tagged + anytime lines

### Headline pool (draft — final copy tuned during implementation)

**Morning:**
- A slow morning steep
- What's the first pour of the day?
- Morning light, hot water, good leaves
- The kettle's almost there

**Afternoon:**
- Midday pause — what are we steeping?
- Something light? Something roasted?
- A few grams and a free afternoon
- Time between meetings deserves good tea

**Evening:**
- The evening steep is the honest one
- Dark leaves for a dark sky
- End the day slower than you started it
- Nothing left to do but pour

**Anytime:**
- What are we brewing?
- Every steep tells you something new
- Same leaves, different steep
- The cup doesn't rush
- Tried a wulong lately?
- Something familiar or something new?
- Water's ready
- Good tea doesn't need an occasion
- Leaves first, then patience
- The second steep is where it opens up

### Typography

Same container as current headline: 26px, `font-light`, `leading-tight`. No forced bold word — emphasis is per-line where it's natural. Some lines will have a `<strong className="font-medium">` on one word, some won't.

### Entrance animation

Subtle 200ms fade-in on the headline text only (no translateY). Signals freshness without being theatrical.

```css
@keyframes headline-arrive {
  from { opacity: 0; }
  to { opacity: 1; }
}

.headline-enter {
  animation: headline-arrive 200ms var(--ease-out) forwards;
}
```

## 3. Richer Weather Moods

Expand from ~12 to ~25–30 expressions. Multiple options per condition, with some time-gated.

### Structure change

Current `moods` object returns a single string per condition. Change to return an array of candidates, then pick one (seeded by visit, same as headline).

### Expanded pool (draft)

**Clear:**
- Sun's out — keep it cool and green *(summer)*
- Clear and cold — a day for aged pu-erh *(winter)*
- Bright sky — something floral to match *(spring)*
- Clear autumn air — roasted oolong weather *(autumn)*
- Blue sky, no wind — steep outside if you can *(anytime)*
- Sunlight on the cup — watch the color change *(anytime)*

**Cloudy:**
- Clouds drifting — a session with no rush
- Overcast and still — good steeping weather
- Grey enough to stay in — perfect

**Overcast:**
- Grey skies — let the kettle do the talking
- Low ceiling, warm cup — nowhere better to be
- The light is flat — the tea doesn't need it

**Fog:**
- Fog rolling in — something dark and warming
- Can't see far — focus on what's in the cup
- Mist outside, steam inside

**Light rain:**
- Soft rain outside — a light oolong kind of day *(spring/summer)*
- Rain on the window — time for something roasted *(autumn/winter)*
- Drizzle and tea — a pairing that needs no argument
- Light rain tapping — the kettle harmonizes

**Heavy rain:**
- Heavy rain — steep it slow, nowhere to be
- Pouring outside — pour inside
- The rain says stay — the tea agrees

**Storm:**
- Thunder outside — brew something you can feel
- Storm rolling through — dark tea, strong pours
- Lightning weather — something bold to match

**Snow:**
- Snow falling — dark tea, thick pours
- White outside, amber inside
- Snow muffles everything — the pour sounds louder

## Files Touched

| File | Change |
|------|--------|
| `src/components/Header.tsx` | Watermark element, headline rotation, entrance animation |
| `src/data/greetings.ts` | **New** — headline pool with time-band tags, selector function |
| `src/lib/weather.ts` | Expand moods to arrays, add selection logic |
| `src/app/globals.css` | `headline-enter` keyframe, watermark positioning styles |

## What Stays the Same

- "Gongfu Cha" label text, position, typography
- Overall header spacing (`px-5 pt-14 pb-6`)
- Weather mood position (below headline, italic tertiary)
- `useWeatherMood` hook interface (still returns `string | null`)

## Accessibility

- Watermark: `aria-hidden="true"`, not selectable, no semantic content
- Headlines: still an `<h1>`, still descriptive — just varied
- All text meets existing contrast ratios (tertiary on bg)
- `prefers-reduced-motion`: headline fade-in skipped
